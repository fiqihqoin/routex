package repository

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"
	"github.com/truechain/ptms/transaction-api/internal/domain"
	"github.com/truechain/ptms/transaction-api/pkg/crypto"
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
	query := "INSERT INTO transactions (id, transaction_id, user_id, vendor_id, account_id, amount, currency, payment_channel, status, idempotency_key, qris_code, expires_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)"
	_, err := r.db.Exec(ctx, query, tx.ID, tx.TransactionID, tx.UserID, tx.VendorID, tx.AccountID, tx.Amount, tx.Currency, tx.PaymentChannel, tx.Status, tx.IdempotencyKey, tx.QRISCode, tx.ExpiresAt)
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

	query := "SELECT id, transaction_id, user_id, vendor_id, account_id, amount, currency, payment_channel, status, qris_code, expires_at, paid_at, callback_delivered, created_at, updated_at FROM transactions WHERE transaction_id = $1"
	
	tx := &domain.Transaction{}
	err = r.db.QueryRow(ctx, query, transactionID).Scan(
		&tx.ID, &tx.TransactionID, &tx.UserID, &tx.VendorID, &tx.AccountID, &tx.Amount, &tx.Currency, &tx.PaymentChannel, &tx.Status, &tx.QRISCode, &tx.ExpiresAt, &tx.PaidAt, &tx.CallbackDelivered, &tx.CreatedAt, &tx.UpdatedAt,
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
	query := "INSERT INTO transaction_events (transaction_id, event_type, event_data) VALUES ($1, $2, $3)"
	_, err := r.db.Exec(ctx, query, transactionID, eventType, payload)
	return err
}

func (r *postgresTransactionRepo) UpdateReadModel(ctx context.Context, tx *domain.Transaction) error {
	query := "UPDATE transactions SET status = $1, paid_at = $2, callback_delivered = $3, updated_at = NOW() WHERE transaction_id = $4"
	_, err := r.db.Exec(ctx, query, tx.Status, tx.PaidAt, tx.CallbackDelivered, tx.TransactionID)
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
	query := "UPDATE transaction_events SET processed_at = NOW() WHERE id = $1"
	_, err := r.db.Exec(ctx, query, eventID)
	return err
}

func (r *postgresTransactionRepo) UpdatePenalty(ctx context.Context, vendorID string, accountID string, points int) error {
	query := "INSERT INTO vendor_penalties (vendor_id, account_id, penalty_points, last_updated_at) VALUES ($1, $2, $3, NOW()) ON CONFLICT (vendor_id, account_id) DO UPDATE SET penalty_points = vendor_penalties.penalty_points + EXCLUDED.penalty_points, last_updated_at = NOW()"
	_, err := r.db.Exec(ctx, query, vendorID, accountID, points)
	if err != nil {
		return err
	}

	if r.publisher != nil {
		r.publisher.Publish(ctx, "ptms.events", "vendor.penalty.updated", map[string]interface{}{
			"vendor_id":  vendorID,
			"account_id": accountID,
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

func (r *postgresTransactionRepo) DisableUserCallback(ctx context.Context, userID string) error {
	query := "UPDATE ptms_users SET callback_enabled = false WHERE id = $1"
	_, err := r.db.Exec(ctx, query, userID)
	return err
}

func (r *postgresTransactionRepo) GetPendingForReconciliation(ctx context.Context, olderThan time.Duration, limit int) ([]domain.Transaction, error) {
	threshold := time.Now().Add(-olderThan)
	query := "SELECT id, transaction_id, user_id, vendor_id, account_id, amount, currency, payment_channel, status, qris_code, expires_at, paid_at, callback_delivered, reconciliation_attempts, created_at, updated_at FROM transactions WHERE status = 'pending_payment' AND created_at < $1 LIMIT $2"
	
	rows, err := r.db.Query(ctx, query, threshold, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var transactions []domain.Transaction
	for rows.Next() {
		var tx domain.Transaction
		err = rows.Scan(
			&tx.ID, &tx.TransactionID, &tx.UserID, &tx.VendorID, &tx.AccountID, &tx.Amount, &tx.Currency, &tx.PaymentChannel, &tx.Status, &tx.QRISCode, &tx.ExpiresAt, &tx.PaidAt, &tx.CallbackDelivered, &tx.ReconciliationAttempts, &tx.CreatedAt, &tx.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}
		transactions = append(transactions, tx)
	}
	return transactions, nil
}

func (r *postgresTransactionRepo) IncrementReconciliationAttempt(ctx context.Context, transactionID string) error {
	query := "UPDATE transactions SET reconciliation_attempts = reconciliation_attempts + 1, updated_at = NOW() WHERE transaction_id = $1"
	_, err := r.db.Exec(ctx, query, transactionID)
	return err
}

func (r *postgresTransactionRepo) GetAccountCredentials(ctx context.Context, accountID string) (map[string]interface{}, error) {
	encrypted, err := r.GetEncryptedCredentials(ctx, accountID)
	if err != nil {
		return nil, err
	}

	return crypto.Decrypt(encrypted)
}

func (r *postgresTransactionRepo) GetEncryptedCredentials(ctx context.Context, accountID string) (string, error) {
	var encrypted string
	query := "SELECT credentials FROM vendor_accounts WHERE id = $1"
	err := r.db.QueryRow(ctx, query, accountID).Scan(&encrypted)
	return encrypted, err
}
