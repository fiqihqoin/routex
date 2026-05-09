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
	cb            domain.CircuitBreaker
	rdb           *redis.Client
	publisher     messaging.Publisher
	db            *pgxpool.Pool
	config        Config
}

type Config struct {
	Environment string
}

func NewTransactionService(
	repo domain.TransactionRepository,
	registry domain.VendorRegistry,
	router domain.Router,
	selector domain.AccountSelector,
	limiter domain.RateLimiter,
	vendorFactory factory.VendorFactory,
	cb domain.CircuitBreaker,
	rdb *redis.Client,
	publisher messaging.Publisher,
	db *pgxpool.Pool,
	config Config,
) domain.TransactionService {
	return &transactionService{
		repo:          repo,
		registry:      registry,
		router:        router,
		selector:      selector,
		limiter:       limiter,
		vendorFactory: vendorFactory,
		cb:            cb,
		rdb:           rdb,
		publisher:     publisher,
		db:            db,
		config:        config,
	}
}

func (s *transactionService) GenerateQRIS(ctx context.Context, apiKey string, idempotencyKey string, req domain.CreateTransactionRequest, rawBody []byte) (*domain.Transaction, error) {
	start := time.Now()
	var selectedVendorID string

	fmt.Printf("[GenerateQRIS] START - Amount: %.2f, Channel: %s, Env: %s\n", req.Amount, req.PaymentChannel, s.config.Environment)

	defer func() {
		if selectedVendorID != "" {
			metrics.QRISGenerationDuration.WithLabelValues(selectedVendorID).Observe(time.Since(start).Seconds())
		}
	}()

	if req.Currency != "IDR" && req.Currency != "" {
		fmt.Printf("[GenerateQRIS] Currency not supported: %s\n", req.Currency)
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

	merchantID, _ := ctx.Value(domain.ContextKeyMerchantID).(string)

	// Step 5: Read environment from context
	env, _ := ctx.Value(domain.ContextKeyEnvironment).(string)
	if env == "" {
		env = s.config.Environment
	}
	fmt.Printf("[GenerateQRIS] Using environment: %s for merchant: %s\n", env, merchantID)

	rlReq := domain.RateLimitRequest{
		MerchantID: merchantID,
		Amount:     req.Amount,
	}
	rlRes, _ := s.limiter.Check(ctx, rlReq)
	if rlRes != nil && !rlRes.Allowed {
		metrics.RateLimitRejections.WithLabelValues("user", merchantID, rlRes.Reason).Inc()
		return nil, domain.ErrRateLimited
	}

	// Step 6: Filter eligible vendors by environment from context
	eligible, err := s.registry.GetEligibleVendors(ctx, merchantID, req.Amount, req.PaymentChannel, env)
	if err != nil {
		fmt.Printf("[GenerateQRIS] GetEligibleVendors error: %v\n", err)
		return nil, domain.ErrNoEligibleVendor
	}
	if len(eligible) == 0 {
		fmt.Printf("[GenerateQRIS] No eligible vendors found for merchant %s in env %s\n", merchantID, env)
		return nil, domain.ErrNoEligibleVendor
	}
	fmt.Printf("[GenerateQRIS] Found %d eligible vendors\n", len(eligible))

	ranked := s.router.Route(ctx, req.Amount, eligible)
	fmt.Printf("[GenerateQRIS] After routing, %d vendors ranked\n", len(ranked))

	var selectedAccount *domain.MerchantVendorCredential
	var selectedVendor domain.Vendor

	for i, v := range ranked {
		fmt.Printf("[TxService] Trying vendor #%d: %s (ID: %s)\n", i+1, v.Code, v.ID)
		// Step 7: Filter accounts by environment
		accounts, err := s.registry.GetAccounts(ctx, v.ID, env)
		if err != nil {
			fmt.Printf("[TxService] Failed to get accounts for vendor %s: %v\n", v.Code, err)
			continue
		}
		
		// Filter for accounts owned by this merchant
		var ownedAccounts []domain.MerchantVendorCredential
		for _, acc := range accounts {
			if acc.MerchantID == merchantID {
				ownedAccounts = append(ownedAccounts, acc)
			}
		}

		if len(ownedAccounts) == 0 {
			fmt.Printf("[TxService] No accounts owned by merchant %s for vendor %s in environment %s\n", merchantID, v.Code, env)
			continue
		}
		
		fmt.Printf("[TxService] Found %d accounts for vendor %s in environment %s\n", len(ownedAccounts), v.Code, env)
		acc, err := s.selector.SelectAccount(ctx, v.ID, ownedAccounts)
		if err == nil {
			selectedAccount = acc
			selectedVendor = v
			selectedVendorID = v.ID
			fmt.Printf("[TxService] Selected vendor %s, account %s\n", v.Code, acc.ID)
			break
		}
		fmt.Printf("[TxService] Failed to select account for vendor %s: %v\n", v.Code, err)
	}

	if selectedAccount == nil {
		fmt.Printf("[TxService] ERROR: No account could be selected from %d ranked vendors\n", len(ranked))
		return nil, errors.New("failed to select an account for routing")
	}

	s.selector.TrackInFlight(ctx, selectedAccount.ID, 1)
	callStart := time.Now()
	
	qrisCode, err := s.callVendorAPI(ctx, selectedVendor, selectedAccount, req)
	
	cleanupCtx := context.WithoutCancel(ctx)
	s.selector.TrackInFlight(cleanupCtx, selectedAccount.ID, -1)
	s.selector.TrackLatency(cleanupCtx, selectedAccount.ID, time.Since(callStart))

	// Record Result to Circuit Breaker
	s.cb.RecordResult(cleanupCtx, selectedVendor.ID, env, err == nil)

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
		MerchantID:     merchantID,
		Environment:    env,
		VendorID:       selectedVendor.ID,
		VendorCredentialID: selectedAccount.ID,
		Amount:         req.Amount,
		Currency:       "IDR",
		PaymentChannel: "qris",
		Status:         domain.StatusPendingPayment,
		IdempotencyKey: idempotencyKey,
		RequestHash:    bodyHash,
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

func (s *transactionService) callVendorAPI(ctx context.Context, vendorObj domain.Vendor, creds *domain.MerchantVendorCredential, req domain.CreateTransactionRequest) (string, error) {
	encrypted, err := s.repo.GetMerchantVendorCredentials(ctx, creds.ID)
	if err != nil {
		fmt.Printf("[TxService] Failed to get encrypted credentials for record %s: %v\n", creds.ID, err)
		return "", fmt.Errorf("failed to get account credentials: %w", err)
	}

	adapter, decryptedCreds, err := s.vendorFactory.Create(vendorObj.Code, encrypted, creds.GetBaseURL())
	if err != nil {
		fmt.Printf("[TxService] Failed to create adapter for vendor %s: %v\n", vendorObj.Code, err)
		return "", fmt.Errorf("failed to create vendor adapter: %w", err)
	}

	fmt.Printf("[TxService] Calling vendor %s (credential %s) for QRIS generation\n", vendorObj.Code, creds.ID)

	adapterReq := providers.GenerateQRISRequest{
		TransactionID:  uuid.New().String(),
		Amount:         req.Amount,
		PaymentChannel: req.PaymentChannel,
		Credentials:    decryptedCreds,
	}

	resp, err := adapter.GenerateQRIS(ctx, adapterReq)
	if err != nil {
		fmt.Printf("[TxService] Vendor %s returned error: %v\n", vendorObj.Code, err)
		return "", err
	}

	fmt.Printf("[TxService] Vendor %s returned success\n", vendorObj.Code)
	return resp.QRISCode, nil
}
func (s *transactionService) GetStatus(ctx context.Context, transactionID string) (*domain.Transaction, error) {
	return s.repo.GetByID(ctx, transactionID)
}

func (s *transactionService) ListTransactions(ctx context.Context, req domain.ListTransactionRequest) (*domain.ListTransactionResponse, error) {
	merchantID, _ := ctx.Value(domain.ContextKeyMerchantID).(string)
	env, _ := ctx.Value(domain.ContextKeyEnvironment).(string)

	req.MerchantID = merchantID
	req.Environment = env

	if req.Page <= 0 {
		req.Page = 1
	}
	if req.PerPage <= 0 {
		req.PerPage = 25
	}
	if req.PerPage > 100 {
		req.PerPage = 100
	}

	data, total, err := s.repo.ListTransactions(ctx, req)
	if err != nil {
		return nil, err
	}

	totalPages := (total + req.PerPage - 1) / req.PerPage

	return &domain.ListTransactionResponse{
		Data: data,
		Meta: domain.PaginationMeta{
			Total:      total,
			Page:       req.Page,
			PerPage:    req.PerPage,
			TotalPages: totalPages,
			HasNext:    req.Page < totalPages,
			HasPrev:    req.Page > 1,
		},
	}, nil
}

func (s *transactionService) GetTransactionDetail(ctx context.Context, transactionID string) (*domain.TransactionDetail, error) {
	merchantID, _ := ctx.Value(domain.ContextKeyMerchantID).(string)
	return s.repo.GetTransactionDetail(ctx, transactionID, merchantID)
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

	adapter, err := s.vendorFactory.CreateForCallback(v.Code) 
	if err != nil {
		return fmt.Errorf("failed to get adapter for callback: %w", err)
	}

	normalized, err := adapter.NormalizeCallback(payload)
	if err != nil {
		return fmt.Errorf("failed to normalize callback: %w", err)
	}

	tx, err := s.repo.GetByID(ctx, normalized.ReferenceID)
	if err != nil {
		return fmt.Errorf("transaction not found for callback: %w", err)
	}

	creds, err := s.repo.GetMerchantVendorCredentials(ctx, tx.VendorCredentialID)
	if err != nil {
		return fmt.Errorf("failed to get credentials for verification: %w", err)
	}

	var credsMap map[string]interface{}
	if err := json.Unmarshal([]byte(creds), &credsMap); err != nil {
		return fmt.Errorf("failed to unmarshal credentials: %w", err)
	}

	var secret string
	switch v.Code {
	case "MIDTRANS":
		secret = fmt.Sprintf("%v", credsMap["server_key"]) 
	case "XENDIT":
		secret = fmt.Sprintf("%v", credsMap["webhook_token"]) 
	case "QOINHUB":
		secret = fmt.Sprintf("%v", credsMap["client_secret"]) 
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

	if tx.MerchantID != "" {
		var callbackURL string
		err := s.db.QueryRow(ctx, "SELECT url FROM merchant_webhooks WHERE merchant_id = $1 AND environment = $2 AND is_enabled = true", tx.MerchantID, tx.Environment).Scan(&callbackURL)
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
