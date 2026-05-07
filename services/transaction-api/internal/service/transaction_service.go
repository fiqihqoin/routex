package service

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"
	"github.com/truechain/ptms/transaction-api/internal/domain"
	"github.com/truechain/ptms/transaction-api/internal/factory"
	"github.com/truechain/ptms/transaction-api/internal/providers"
	"github.com/truechain/ptms/transaction-api/pkg/crypto"
	"github.com/truechain/ptms/transaction-api/pkg/messaging"
	"github.com/truechain/ptms/transaction-api/pkg/metrics"
)

type transactionService struct {
	repo          domain.TransactionRepository
	registry      domain.VendorRegistry
	router        domain.Router
	selector      domain.AccountSelector
	limiter       domain.RateLimiter
	vendorFactory factory.VendorFactory
	rdb           *redis.Client
	publisher     messaging.Publisher
	db            *pgxpool.Pool
}

func NewTransactionService(
	repo domain.TransactionRepository,
	registry domain.VendorRegistry,
	router domain.Router,
	selector domain.AccountSelector,
	limiter domain.RateLimiter,
	vendorFactory factory.VendorFactory,
	rdb *redis.Client,
	publisher messaging.Publisher,
	db *pgxpool.Pool,
) domain.TransactionService {
	return &transactionService{
		repo:          repo,
		registry:      registry,
		router:        router,
		selector:      selector,
		limiter:       limiter,
		vendorFactory: vendorFactory,
		rdb:           rdb,
		publisher:     publisher,
		db:            db,
	}
}

func (s *transactionService) GenerateQRIS(ctx context.Context, apiKey string, idempotencyKey string, req domain.CreateTransactionRequest, rawBody []byte) (*domain.Transaction, error) {
	start := time.Now()
	var selectedVendorID string
	
	defer func() {
		if selectedVendorID != "" {
			metrics.QRISGenerationDuration.WithLabelValues(selectedVendorID).Observe(time.Since(start).Seconds())
		}
	}()

	if req.Currency != "IDR" && req.Currency != "" {
		return nil, domain.ErrCurrencyNotSupported
	}

	uuidKey := fmt.Sprintf("idem:uuid:%s:%s", apiKey, idempotencyKey)
	hash := sha256.Sum256(rawBody)
	bodyHash := hex.EncodeToString(hash[:])

	if existingHash, err := s.rdb.Get(ctx, uuidKey).Result(); err == nil && existingHash != bodyHash {
		return nil, domain.ErrIdempotencyConflict
	}

	fullIdempotencyKey := s.buildIdempotencyKey(apiKey, idempotencyKey, rawBody)
	if val, err := s.rdb.Get(ctx, fullIdempotencyKey).Result(); err == nil {
		var existing domain.Transaction
		if err := json.Unmarshal([]byte(val), &existing); err == nil {
			return &existing, nil
		}
	}

	userID, _ := ctx.Value(domain.ContextKeyUserID).(string)

	rlReq := domain.RateLimitRequest{
		UserID: userID,
		Amount: req.Amount,
	}
	rlRes, _ := s.limiter.Check(ctx, rlReq)
	if rlRes != nil && !rlRes.Allowed {
		metrics.RateLimitRejections.WithLabelValues("user", userID, rlRes.Reason).Inc()
		return nil, domain.ErrRateLimited
	}

	eligible, err := s.registry.GetEligibleVendors(ctx, userID, req.Amount, req.PaymentChannel)
	if err != nil || len(eligible) == 0 {
		return nil, domain.ErrNoEligibleVendor
	}

	ranked := s.router.Route(ctx, req.Amount, eligible)

	var selectedAccount *domain.VendorAccount
	var selectedVendor domain.Vendor
	
	for _, v := range ranked {
		accounts, err := s.registry.GetAccounts(ctx, v.ID)
		if err != nil || len(accounts) == 0 {
			continue
		}
		acc, err := s.selector.SelectAccount(ctx, v.ID, accounts)
		if err == nil {
			selectedAccount = acc
			selectedVendor = v
			selectedVendorID = v.ID
			break
		}
	}

	if selectedAccount == nil {
		return nil, errors.New("failed to select an account for routing")
	}

	s.selector.TrackInFlight(ctx, selectedAccount.ID, 1)
	callStart := time.Now()
	
	qrisCode, err := s.callVendorAPI(ctx, selectedVendor, selectedAccount, req)
	
	cleanupCtx := context.WithoutCancel(ctx)
	s.selector.TrackInFlight(cleanupCtx, selectedAccount.ID, -1)
	s.selector.TrackLatency(cleanupCtx, selectedAccount.ID, time.Since(callStart))

	if err != nil {
		metrics.QRISGenerationTotal.WithLabelValues(selectedVendor.ID, "failure").Inc()
		
		penalty := 15
		if errors.Is(err, context.DeadlineExceeded) || strings.Contains(strings.ToLower(err.Error()), "timeout") {
			penalty = 10
		}
		s.repo.UpdatePenalty(ctx, selectedVendor.ID, selectedAccount.ID, penalty)
		
		return nil, domain.ErrVendorError
	}

	metrics.QRISGenerationTotal.WithLabelValues(selectedVendor.ID, "success").Inc()
	tx := &domain.Transaction{
		ID:             uuid.New().String(),
		TransactionID:  uuid.New().String(),
		UserID:         userID,
		VendorID:       selectedVendor.ID,
		AccountID:      selectedAccount.ID,
		Amount:         req.Amount,
		Currency:       "IDR",
		PaymentChannel: "qris",
		Status:         domain.StatusPendingPayment,
		IdempotencyKey: idempotencyKey,
		QRISCode:       qrisCode,
		CreatedAt:      time.Now(),
	}

	if err := s.repo.Create(ctx, tx); err != nil {
		return nil, err
	}

	s.repo.StoreEvent(ctx, tx.TransactionID, domain.EventQRGenerated, tx)

	txJSON, _ := json.Marshal(tx)
	s.rdb.Set(ctx, fullIdempotencyKey, txJSON, 24*time.Hour)
	s.rdb.Set(ctx, uuidKey, bodyHash, 24*time.Hour)

	return tx, nil
}

func (s *transactionService) callVendorAPI(ctx context.Context, vendorObj domain.Vendor, account *domain.VendorAccount, req domain.CreateTransactionRequest) (string, error) {
	encrypted, err := s.repo.GetEncryptedCredentials(ctx, account.ID)
	if err != nil {
		return "", fmt.Errorf("failed to get account credentials: %w", err)
	}

	adapter, err := s.vendorFactory.Create(vendorObj.Code, encrypted)
	if err != nil {
		return "", fmt.Errorf("failed to create vendor adapter: %w", err)
	}

	creds, err := crypto.Decrypt(encrypted)
	if err != nil {
		return "", fmt.Errorf("failed to decrypt credentials: %w", err)
	}
	credsJSON, _ := json.Marshal(creds)

	adapterReq := providers.GenerateQRISRequest{
		TransactionID:  uuid.New().String(), 
		Amount:         req.Amount,
		PaymentChannel: req.PaymentChannel,
		Credentials:    string(credsJSON),
	}

	resp, err := adapter.GenerateQRIS(ctx, adapterReq)
	if err != nil {
		return "", err
	}

	return resp.QRISCode, nil
}

func (s *transactionService) GetStatus(ctx context.Context, transactionID string) (*domain.Transaction, error) {
	return s.repo.GetByID(ctx, transactionID)
}

func (s *transactionService) ReconcileStatus(ctx context.Context, transactionID string) error {
	tx, err := s.repo.GetByID(ctx, transactionID)
	if err != nil {
		return err
	}

	status, paidAt, err := s.checkVendorStatus(ctx, tx)
	if err != nil {
		return fmt.Errorf("failed to check vendor status: %w", err)
	}

	if string(tx.Status) != status {
		tx.Status = domain.TransactionStatus(status)
		tx.PaidAt = paidAt
		if err := s.repo.UpdateReadModel(ctx, tx); err != nil {
			return err
		}
		s.repo.StoreEvent(ctx, tx.TransactionID, domain.EventStatusUpdated, tx)
	}

	return nil
}

func (s *transactionService) checkVendorStatus(ctx context.Context, tx *domain.Transaction) (string, *time.Time, error) {
	return "pending_payment", nil, nil 
}

func (s *transactionService) HandleVendorCallback(ctx context.Context, vendorID string, payload []byte, signature string) error {
	v, err := s.registry.GetVendor(ctx, vendorID)
	if err != nil {
		return fmt.Errorf("callback for unknown vendor: %w", err)
	}

	adapter, _ := s.vendorFactory.Create(v.Code, "") 
	if adapter == nil {
		return fmt.Errorf("failed to get adapter for callback")
	}

	normalized, err := adapter.NormalizeCallback(payload)
	if err != nil {
		return fmt.Errorf("failed to normalize callback: %w", err)
	}

	tx, err := s.repo.GetByID(ctx, normalized.ReferenceID)
	if err != nil {
		return fmt.Errorf("transaction not found for callback: %w", err)
	}

	creds, err := s.repo.GetAccountCredentials(ctx, tx.AccountID)
	if err != nil {
		return fmt.Errorf("failed to get credentials for verification: %w", err)
	}

	var secret string
	switch v.Code {
	case "MIDTRANS":
		secret = fmt.Sprintf("%v", creds["server_key"]) 
	case "XENDIT":
		secret = fmt.Sprintf("%v", creds["webhook_token"]) 
	case "QOINHUB":
		secret = fmt.Sprintf("%v", creds["client_secret"]) 
	}

	if !adapter.VerifyCallback(payload, signature, secret) {
		return errors.New("invalid vendor callback signature")
	}

	s.repo.StoreEvent(ctx, normalized.ReferenceID, domain.EventCallbackReceived, normalized)

	tx.Status = domain.TransactionStatus(normalized.Status)
	if normalized.Status == "paid" {
		tx.PaidAt = &normalized.PaidAt
	}
	s.repo.UpdateReadModel(ctx, tx)

	if tx.UserID != "" {
		var callbackURL string
		err := s.db.QueryRow(ctx, "SELECT callback_url FROM ptms_users WHERE id = $1 AND callback_enabled = true", tx.UserID).Scan(&callbackURL)
		if err == nil && callbackURL != "" {
			s.forwardToUser(ctx, callbackURL, normalized)
		}
	}

	return nil
}

func (s *transactionService) forwardToUser(ctx context.Context, callbackURL string, data *providers.NormalizedCallback) {
	job := domain.CallbackJob{
		TransactionID: data.ReferenceID,
		CallbackURL:   callbackURL,
		Data: domain.NormalizedCallback{
			TransactionID:       data.ReferenceID,
			VendorTransactionID: data.VendorTransactionID,
			Status:              data.Status,
			Amount:              data.Amount,
			PaidAt:              data.PaidAt,
		},
	}
	if s.publisher != nil {
		s.publisher.Publish(ctx, "", "ptms.callbacks", job)
	}
}

func (s *transactionService) buildIdempotencyKey(apiKey, key string, body []byte) string {
	hash := sha256.Sum256(body)
	return fmt.Sprintf("idem:%s:%s:%s", apiKey, key, hex.EncodeToString(hash[:]))
}
