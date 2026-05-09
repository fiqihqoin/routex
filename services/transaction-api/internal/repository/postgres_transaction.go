package repository

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

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

func (r *postgresTransactionRepo) GetMerchantVendorCredentials(ctx context.Context, credentialID string) (string, error) {
	var encrypted string
	query := "SELECT credentials_encrypted FROM merchant_vendor_credentials WHERE id = $1"
	err := r.db.QueryRow(ctx, query, credentialID).Scan(&encrypted)
	return encrypted, err
}
