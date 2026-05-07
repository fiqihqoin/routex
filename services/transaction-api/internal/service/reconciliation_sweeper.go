package service

import (
	"context"
	"log"
	"time"

	"github.com/truechain/ptms/transaction-api/internal/domain"
)

type reconciliationSweeper struct {
	repo    domain.TransactionRepository
	service domain.TransactionService
}

func NewReconciliationSweeper(repo domain.TransactionRepository, service domain.TransactionService) domain.ReconciliationSweeper {
	return &reconciliationSweeper{
		repo:    repo,
		service: service,
	}
}

func (s *reconciliationSweeper) Start(ctx context.Context) {
	log.Println("Starting Reconciliation Sweeper...")
	
	// PRD: Every 10-15 minutes
	ticker := time.NewTicker(10 * time.Minute)
	defer ticker.Stop()

	// Initial run
	s.sweep(ctx)

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			s.sweep(ctx)
		}
	}
}

func (s *reconciliationSweeper) sweep(ctx context.Context) {
	log.Println("Running reconciliation sweep...")

	// 1. Get transactions pending for more than 30 minutes
	transactions, err := s.repo.GetPendingForReconciliation(ctx, 30*time.Minute, 100)
	if err != nil {
		log.Printf("Error fetching transactions for sweep: %v", err)
		return
	}

	for _, tx := range transactions {
		// 2. Check Safety-Net Expiration (PRD: > 24h AND >= 3 attempts)
		if time.Since(tx.CreatedAt) > 24*time.Hour && tx.ReconciliationAttempts >= 3 {
			s.markAsExpiredStale(ctx, tx)
			continue
		}

		// 3. Increment Attempt Count
		s.repo.IncrementReconciliationAttempt(ctx, tx.TransactionID)
		s.repo.StoreEvent(ctx, tx.TransactionID, domain.EventSweeperChecked, nil)

		// 4. Reconcile with Vendor
		if err := s.service.ReconcileStatus(ctx, tx.TransactionID); err != nil {
			log.Printf("Error reconciling tx %s: %v", tx.TransactionID, err)
			continue
		}
	}
}

func (s *reconciliationSweeper) markAsExpiredStale(ctx context.Context, tx domain.Transaction) {
	log.Printf("ALERT: Transaction %s is expired_stale (>24h, no resolution).", tx.TransactionID)
	
	tx.Status = domain.StatusExpiredStale
	if err := s.repo.UpdateReadModel(ctx, &tx); err != nil {
		log.Printf("Error updating status to expired_stale for %s: %v", tx.TransactionID, err)
		return
	}

	s.repo.StoreEvent(ctx, tx.TransactionID, domain.EventExpiredStale, map[string]string{
		"reason": "safety_net_triggered",
		"actor":  "system_reconciliation_sweeper",
	})
}
