package repository

import (
	"context"
	"fmt"
	"log"
	"sort"
	"sync"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/truechain/caishenengine/transaction-api/internal/domain"
	"github.com/truechain/caishenengine/transaction-api/pkg/metrics"
)

type basketSizeRouter struct {
	db   *pgxpool.Pool
	repo domain.TransactionRepository
	mu   sync.RWMutex
	rules []domain.RoutingRule
}

func NewBasketSizeRouter(db *pgxpool.Pool, repo domain.TransactionRepository) domain.Router {
	return &basketSizeRouter{
		db:   db,
		repo: repo,
	}
}

func (r *basketSizeRouter) Load(ctx context.Context) error {
	log.Println("Loading basket-size routing rules...")

	var newRules []domain.RoutingRule
	query := "SELECT vendor_id, min_amount, max_amount, priority, environment FROM routing_rules_global WHERE is_active = true ORDER BY min_amount ASC, priority DESC"
	rows, err := r.db.Query(ctx, query)
	if err != nil {
		return fmt.Errorf("failed to query routing rules: %w", err)
	}
	defer rows.Close()

	for rows.Next() {
		var rule domain.RoutingRule
		if err := rows.Scan(&rule.VendorID, &rule.MinAmount, &rule.MaxAmount, &rule.Priority, &rule.Environment); err != nil {
			return err
		}
		newRules = append(newRules, rule)
	}

	r.mu.Lock()
	r.rules = newRules
	r.mu.Unlock()

	log.Printf("Loaded %d routing rules into memory", len(newRules))
	return nil
}

func (r *basketSizeRouter) Route(ctx context.Context, amount float64, environment string, eligibleVendors []domain.Vendor) []domain.Vendor {
	start := time.Now()
	defer func() {
		metrics.RoutingDuration.Observe(time.Since(start).Seconds())
	}()

	r.mu.RLock()
	defer r.mu.RUnlock()

	// 1. Get Effective Penalties from Repository (Decay is calculated on DB read)
	penalties, err := r.repo.GetEffectivePenalties(ctx)
	if err != nil {
		log.Printf("Warning: failed to fetch penalties: %v. Proceeding without penalty data.", err)
		penalties = make(map[string]int)
	}

	// 2. Get bracket priorities
	vendorPriorities := make(map[string]int)
	for _, rule := range r.rules {
		if rule.Environment != environment {
			continue
		}
		if amount >= rule.MinAmount && amount <= rule.MaxAmount {
			vendorPriorities[rule.VendorID] = rule.Priority
		}
	}

	// 3. Filter & Sort eligible vendors based on:
	// Priority (Primary) DESC, Effective Penalty (Secondary) ASC
	type rankedVendor struct {
		vendor   domain.Vendor
		priority int
		penalty  int
	}

	var ranked []rankedVendor
	for _, v := range eligibleVendors {
		priority := 0
		if p, ok := vendorPriorities[v.ID]; ok {
			priority = p
		}
		penalty := penalties[v.ID] // Default 0 from map lookup
		
		ranked = append(ranked, rankedVendor{
			vendor:   v,
			priority: priority,
			penalty:  penalty,
		})
	}

	// Sort: Higher priority first, then lower penalty first
	sort.Slice(ranked, func(i, j int) bool {
		if ranked[i].priority != ranked[j].priority {
			return ranked[i].priority > ranked[j].priority
		}
		return ranked[i].penalty < ranked[j].penalty
	})

	// 4. Return sorted list
	var result []domain.Vendor
	for _, rv := range ranked {
		result = append(result, rv.vendor)
	}

	return result
}
