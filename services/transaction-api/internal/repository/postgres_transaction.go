package repository

import (
	"context"
	"encoding/json"
	"fmt"
	"sync"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"
	"github.com/truechain/ptms/transaction-api/internal/domain"
	"github.com/truechain/ptms/transaction-api/pkg/messaging"
)

type postgresTransactionRepo struct {
	db        *pgxpool.Pool
	rdb       *redis.Client
	publisher messaging.Publisher
}

func NewPostgresTransactionRepo(db *pgxpool.Pool, rdb *redis.Client, publisher messaging.Publisher) domain.TransactionRepository {
	return &postgresTransactionRepo{db: db, rdb: rdb, publisher: publisher}
}

func (r *postgresTransactionRepo) Create(ctx context.Context, tx *domain.Transaction) error {
	query := `INSERT INTO transactions (
		id, transaction_id, merchant_id, environment, vendor_id, vendor_credential_id, 
		routing_reason, amount, currency, payment_channel, status, idempotency_key, 
		request_hash, qris_code, created_at, expires_at
	) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`
	_, err := r.db.Exec(ctx, query, 
		tx.ID, tx.TransactionID, tx.MerchantID, tx.Environment, tx.VendorID, tx.VendorCredentialID, 
		tx.RoutingReason, tx.Amount, tx.Currency, tx.PaymentChannel, tx.Status, tx.IdempotencyKey, 
		tx.RequestHash, tx.QRISCode, tx.CreatedAt, tx.ExpiresAt,
	)
	return err
}

func (r *postgresTransactionRepo) GetByID(ctx context.Context, transactionID string) (*domain.Transaction, error) {
	cacheKey := fmt.Sprintf("tx:%s", transactionID)
	val, err := r.rdb.Get(ctx, cacheKey).Result()
	if err == nil {
		var tx domain.Transaction
		if err := json.Unmarshal([]byte(val), &tx); err == nil {
			return &tx, nil
		}
	}

	query := `SELECT 
		id, transaction_id, merchant_id, environment, vendor_id, vendor_credential_id, 
		routing_reason, amount, currency, payment_channel, status, idempotency_key, 
		request_hash, qris_code, expires_at, paid_at, callback_delivered, created_at, updated_at 
		FROM transactions WHERE transaction_id = $1`
	
	tx := &domain.Transaction{}
	err = r.db.QueryRow(ctx, query, transactionID).Scan(
		&tx.ID, &tx.TransactionID, &tx.MerchantID, &tx.Environment, &tx.VendorID, &tx.VendorCredentialID, 
		&tx.RoutingReason, &tx.Amount, &tx.Currency, &tx.PaymentChannel, &tx.Status, &tx.IdempotencyKey, 
		&tx.RequestHash, &tx.QRISCode, &tx.ExpiresAt, &tx.PaidAt, &tx.CallbackDelivered, &tx.CreatedAt, &tx.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}

	r.CacheTransaction(ctx, tx)

	return tx, nil
}

func (r *postgresTransactionRepo) CacheTransaction(ctx context.Context, tx *domain.Transaction) {
	cacheKey := fmt.Sprintf("tx:%s", tx.TransactionID)
	data, _ := json.Marshal(tx)
	
	ttl := 30 * time.Second
	if tx.Status == domain.StatusPaid || tx.Status == domain.StatusFailed || tx.Status == domain.StatusExpired || tx.Status == domain.StatusExpiredStale {
		ttl = 5 * time.Minute
	}
	
	r.rdb.Set(ctx, cacheKey, data, ttl)
}

func (r *postgresTransactionRepo) StoreEvent(ctx context.Context, transactionID string, eventType domain.EventType, data interface{}) error {
	payload, _ := json.Marshal(data)
	
	// We need merchant_id and transaction_created_at for partition key
	var merchantID string
	var createdAt time.Time
	err := r.db.QueryRow(ctx, "SELECT merchant_id, created_at FROM transactions WHERE transaction_id = $1", transactionID).Scan(&merchantID, &createdAt)
	if err != nil {
		// Fallback for events that might not have a transaction yet or if pruning isn't used
		createdAt = time.Now()
	}

	query := "INSERT INTO transaction_events (transaction_id, transaction_created_at, merchant_id, event_type, event_data) VALUES ($1, $2, $3, $4, $5)"
	_, err = r.db.Exec(ctx, query, transactionID, createdAt, merchantID, eventType, payload)
	return err
}

func (r *postgresTransactionRepo) UpdateReadModel(ctx context.Context, tx *domain.Transaction) error {
	query := "UPDATE transactions SET status = $1, paid_at = $2, callback_delivered = $3, updated_at = NOW() WHERE transaction_id = $4 AND created_at = $5"
	_, err := r.db.Exec(ctx, query, tx.Status, tx.PaidAt, tx.CallbackDelivered, tx.TransactionID, tx.CreatedAt)
	if err == nil {
		r.CacheTransaction(ctx, tx)
	}
	return err
}

func (r *postgresTransactionRepo) GetUnprocessedEvents(ctx context.Context, limit int) ([]domain.TransactionEvent, error) {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	// Partition aware: querying without created_at will scan all partitions, but here we only want unprocessed ones
	query := "SELECT id, transaction_id, event_type, event_data, created_at FROM transaction_events WHERE processed_at IS NULL ORDER BY created_at ASC LIMIT $1 FOR UPDATE SKIP LOCKED"
	rows, err := tx.Query(ctx, query, limit)
	if err != nil {
		return nil, err
	}

	var events []domain.TransactionEvent
	for rows.Next() {
		var e domain.TransactionEvent
		if err := rows.Scan(&e.ID, &e.TransactionID, &e.EventType, &e.Payload, &e.CreatedAt); err != nil {
			rows.Close()
			return nil, err
		}
		events = append(events, e)
	}
	rows.Close()

	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}

	return events, nil
}

func (r *postgresTransactionRepo) MarkEventProcessed(ctx context.Context, eventID string) error {
	// Note: in high scale production, we'd need the partition key (transaction_created_at) here too.
	query := "UPDATE transaction_events SET processed_at = NOW() WHERE id = $1"
	_, err := r.db.Exec(ctx, query, eventID)
	return err
}

func (r *postgresTransactionRepo) UpdatePenalty(ctx context.Context, vendorID string, credentialID string, points int) error {
	query := "INSERT INTO vendor_penalties (vendor_id, merchant_credential_id, penalty_points, last_updated_at) VALUES ($1, $2, $3, NOW()) ON CONFLICT (vendor_id, merchant_credential_id) DO UPDATE SET penalty_points = vendor_penalties.penalty_points + EXCLUDED.penalty_points, last_updated_at = NOW()"
	_, err := r.db.Exec(ctx, query, vendorID, credentialID, points)
	if err != nil {
		return err
	}

	if r.publisher != nil {
		r.publisher.Publish(ctx, "ptms.events", "vendor.penalty.updated", map[string]interface{}{
			"vendor_id":  vendorID,
			"credential_id": credentialID,
			"points":     points,
			"timestamp":  time.Now(),
		})
	}

	return nil
}

func (r *postgresTransactionRepo) GetEffectivePenalties(ctx context.Context) (map[string]int, error) {
	query := "SELECT vendor_id, GREATEST(0, SUM(penalty_points) - SUM(EXTRACT(EPOCH FROM (NOW() - last_updated_at))/60))::INT as effective_penalty FROM vendor_penalties GROUP BY vendor_id"
	
	rows, err := r.db.Query(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	penalties := make(map[string]int)
	for rows.Next() {
		var vID string
		var p int
		if err := rows.Scan(&vID, &p); err != nil {
			return nil, err
		}
		penalties[vID] = p
	}
	return penalties, nil
}

func (r *postgresTransactionRepo) DisableMerchantCallback(ctx context.Context, merchantID string) error {
	query := "UPDATE merchant_webhooks SET is_enabled = false WHERE merchant_id = $1"
	_, err := r.db.Exec(ctx, query, merchantID)
	return err
}

func (r *postgresTransactionRepo) GetPendingForReconciliation(ctx context.Context, olderThan time.Duration, limit int) ([]domain.Transaction, error) {
	threshold := time.Now().Add(-olderThan)
	// Pruning: created_at > now - 24h
	query := `SELECT 
		id, transaction_id, merchant_id, environment, vendor_id, vendor_credential_id, 
		amount, currency, payment_channel, status, idempotency_key, request_hash, qris_code, 
		expires_at, paid_at, callback_delivered, reconciliation_attempts, created_at, updated_at 
		FROM transactions 
		WHERE status = 'pending_payment' AND created_at > NOW() - interval '24 hours' AND created_at < $1 LIMIT $2`
	
	rows, err := r.db.Query(ctx, query, threshold, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var transactions []domain.Transaction
	for rows.Next() {
		var tx domain.Transaction
		err = rows.Scan(
			&tx.ID, &tx.TransactionID, &tx.MerchantID, &tx.Environment, &tx.VendorID, &tx.VendorCredentialID, 
			&tx.Amount, &tx.Currency, &tx.PaymentChannel, &tx.Status, &tx.IdempotencyKey, &tx.RequestHash, &tx.QRISCode, 
			&tx.ExpiresAt, &tx.PaidAt, &tx.CallbackDelivered, &tx.ReconciliationAttempts, &tx.CreatedAt, &tx.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}
		transactions = append(transactions, tx)
	}
	return transactions, nil
}

func (r *postgresTransactionRepo) IncrementReconciliationAttempt(ctx context.Context, transactionID string, createdAt time.Time) error {
	query := "UPDATE transactions SET reconciliation_attempts = reconciliation_attempts + 1, updated_at = NOW() WHERE transaction_id = $1 AND created_at = $2"
	_, err := r.db.Exec(ctx, query, transactionID, createdAt)
	return err
}

func (r *postgresTransactionRepo) ListTransactions(ctx context.Context, req domain.ListTransactionRequest) ([]domain.TransactionSummary, int, error) {
	// Base criteria for partition pruning
	lookback := time.Now().Add(-90 * 24 * time.Hour)
	if req.DateFrom != nil && req.DateFrom.Before(lookback) {
		lookback = *req.DateFrom
	}

	where := "WHERE t.merchant_id = $1 AND t.environment = $2 AND t.created_at >= $3"
	args := []interface{}{req.MerchantID, req.Environment, lookback}
	argCount := 3

	if req.Status != "" {
		argCount++
		where += fmt.Sprintf(" AND t.status = $%d", argCount)
		args = append(args, req.Status)
	}

	if req.VendorID != "" {
		argCount++
		where += fmt.Sprintf(" AND t.vendor_id = $%d", argCount)
		args = append(args, req.VendorID)
	}

	if req.DateFrom != nil {
		argCount++
		where += fmt.Sprintf(" AND t.created_at >= $%d", argCount)
		args = append(args, *req.DateFrom)
	}

	if req.DateTo != nil {
		argCount++
		where += fmt.Sprintf(" AND t.created_at <= $%d", argCount)
		args = append(args, *req.DateTo)
	}

	if req.Search != "" {
		argCount++
		where += fmt.Sprintf(" AND t.transaction_id ILIKE $%d", argCount)
		args = append(args, "%"+req.Search+"%")
	}

	var (
		transactions []domain.TransactionSummary
		total        int
		errData      error
		errCount     error
		wg           sync.WaitGroup
	)

	// 1. Parallel Count Query
	wg.Add(1)
	go func() {
		defer wg.Done()
		countQuery := "SELECT COUNT(*) FROM transactions t " + where
		errCount = r.db.QueryRow(ctx, countQuery, args...).Scan(&total)
	}()

	// 2. Parallel Data Query
	wg.Add(1)
	go func() {
		defer wg.Done()
		query := `SELECT 
			t.id, t.transaction_id, t.amount, t.currency,
			t.payment_channel, t.status, t.vendor_id,
			v.code as vendor_code, t.environment,
			t.routing_reason, t.vendor_transaction_id,
			t.created_at, t.paid_at, t.expired_at
		FROM transactions t
		LEFT JOIN vendors v ON v.id = t.vendor_id ` + where + ` 
		ORDER BY t.created_at DESC LIMIT $%d OFFSET $%d`
		
		offset := (req.Page - 1) * req.PerPage
		dataArgs := append(args, req.PerPage, offset)
		dataQuery := fmt.Sprintf(query, argCount+1, argCount+2)

		var rows pgx.Rows
		rows, errData = r.db.Query(ctx, dataQuery, dataArgs...)
		if errData != nil {
			return
		}
		defer rows.Close()

		for rows.Next() {
			var t domain.TransactionSummary
			err := rows.Scan(
				&t.ID, &t.TransactionID, &t.Amount, &t.Currency,
				&t.PaymentChannel, &t.Status, &t.VendorID,
				&t.VendorCode, &t.Environment,
				&t.RoutingReason, &t.VendorTransactionID,
				&t.CreatedAt, &t.PaidAt, &t.ExpiredAt,
			)
			if err != nil {
				errData = err
				return
			}
			transactions = append(transactions, t)
		}
	}()

	wg.Wait()

	if errCount != nil {
		return nil, 0, errCount
	}
	if errData != nil {
		return nil, 0, errData
	}

	return transactions, total, nil
}

func (r *postgresTransactionRepo) GetTransactionDetail(ctx context.Context, transactionID string, merchantID string) (*domain.TransactionDetail, error) {
	query := `SELECT 
		t.id, t.transaction_id, t.amount, t.currency,
		t.payment_channel, t.status, t.vendor_id,
		v.code as vendor_code, t.environment,
		t.routing_reason, t.vendor_transaction_id,
		t.created_at, t.paid_at, t.expired_at,
		t.qris_code, t.expires_at, t.callback_delivered, t.reconciliation_attempts
	FROM transactions t
	LEFT JOIN vendors v ON v.id = t.vendor_id
	WHERE t.transaction_id = $1 AND t.merchant_id = $2`
	
	detail := &domain.TransactionDetail{}
	err := r.db.QueryRow(ctx, query, transactionID, merchantID).Scan(
		&detail.ID, &detail.TransactionID, &detail.Amount, &detail.Currency,
		&detail.PaymentChannel, &detail.Status, &detail.VendorID,
		&detail.VendorCode, &detail.Environment,
		&detail.RoutingReason, &detail.VendorTransactionID,
		&detail.CreatedAt, &detail.PaidAt, &detail.ExpiredAt,
		&detail.QRISCode, &detail.ExpiresAt, &detail.CallbackDelivered, &detail.ReconciliationAttempts,
	)
	if err != nil {
		return nil, err
	}

	// Fetch Events
	eventQuery := `SELECT id, transaction_id, event_type, event_data, created_at 
		FROM transaction_events 
		WHERE transaction_id = $1 
		ORDER BY created_at ASC`
	
	rows, err := r.db.Query(ctx, eventQuery, transactionID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	for rows.Next() {
		var e domain.TransactionEvent
		if err := rows.Scan(&e.ID, &e.TransactionID, &e.EventType, &e.Payload, &e.CreatedAt); err != nil {
			return nil, err
		}
		detail.Events = append(detail.Events, e)
	}

	return detail, nil
}

func (r *postgresTransactionRepo) GetMerchantVendorCredentials(ctx context.Context, credentialID string) (string, error) {
	var encrypted string
	query := "SELECT credentials_encrypted FROM merchant_vendor_credentials WHERE id = $1"
	err := r.db.QueryRow(ctx, query, credentialID).Scan(&encrypted)
	return encrypted, err
}

func (r *postgresTransactionRepo) IncrementWebhookFailureDay(ctx context.Context, merchantID string) error {
	query := `UPDATE merchant_webhooks 
	          SET consecutive_failure_days = consecutive_failure_days + 1, 
	              last_failure_at = NOW() 
	          WHERE merchant_id = $1`
	_, err := r.db.Exec(ctx, query, merchantID)
	return err
}

func (r *postgresTransactionRepo) GetWebhookConsecutiveFailureDays(ctx context.Context, merchantID string) (int, error) {
	var days int
	query := "SELECT consecutive_failure_days FROM merchant_webhooks WHERE merchant_id = $1 LIMIT 1"
	err := r.db.QueryRow(ctx, query, merchantID).Scan(&days)
	return days, err
}

func (r *postgresTransactionRepo) DisableMerchantWebhook(ctx context.Context, merchantID string) error {
	query := "UPDATE merchant_webhooks SET is_enabled = false, auto_disabled_at = NOW() WHERE merchant_id = $1"
	_, err := r.db.Exec(ctx, query, merchantID)
	return err
}

func (r *postgresTransactionRepo) ResetWebhookFailureDays(ctx context.Context, merchantID string) error {
	query := "UPDATE merchant_webhooks SET consecutive_failure_days = 0, last_success_at = NOW() WHERE merchant_id = $1"
	_, err := r.db.Exec(ctx, query, merchantID)
	return err
}
