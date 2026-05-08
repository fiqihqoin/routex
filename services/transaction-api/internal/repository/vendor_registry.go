package repository

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"sync"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"
	"github.com/truechain/ptms/transaction-api/internal/domain"
	"github.com/truechain/ptms/transaction-api/pkg/crypto"
)

type vendorRegistry struct {
	db    *pgxpool.Pool
	rdb   *redis.Client
	cb    domain.CircuitBreaker
	mu    sync.RWMutex
	
	vendors     map[string]domain.Vendor
	accounts    map[string][]domain.VendorAccount
	userVendors map[string]map[string]bool
}

func NewVendorRegistry(db *pgxpool.Pool, rdb *redis.Client, cb domain.CircuitBreaker) domain.VendorRegistry {
	return &vendorRegistry{
		db:          db,
		rdb:         rdb,
		cb:          cb,
		vendors:     make(map[string]domain.Vendor),
		accounts:    make(map[string][]domain.VendorAccount),
		userVendors: make(map[string]map[string]bool),
	}
}

func (r *vendorRegistry) Load(ctx context.Context) error {
	log.Println("Loading vendor configuration...")
	
	newVendors := make(map[string]domain.Vendor)
	newAccounts := make(map[string][]domain.VendorAccount)
	newUserVendors := make(map[string]map[string]bool)

	// 1. Load Vendors from DB
	rows, err := r.db.Query(ctx, "SELECT id, code, name, is_active FROM vendors WHERE is_active = true")
	if err != nil {
		return fmt.Errorf("failed to query vendors: %w", err)
	}
	defer rows.Close()

	for rows.Next() {
		var v domain.Vendor
		if err := rows.Scan(&v.ID, &v.Code, &v.Name, &v.IsActive); err != nil {
			return err
		}
		newVendors[v.ID] = v
	}

	// 2. Load Accounts from DB
	accRows, err := r.db.Query(ctx, "SELECT id, vendor_id, account_name, credentials, is_active FROM vendor_accounts WHERE is_active = true")
	if err != nil {
		return fmt.Errorf("failed to query vendor accounts: %w", err)
	}
	defer accRows.Close()

	for accRows.Next() {
		var a domain.VendorAccount
		if err := accRows.Scan(&a.ID, &a.VendorID, &a.AccountName, &a.Credentials, &a.IsActive); err != nil {
			return err
		}

		// Decrypt credentials
		if a.Credentials != "" {
			decrypted, err := crypto.Decrypt(a.Credentials)
			if err == nil {
				jsonStr, _ := json.Marshal(decrypted)
				a.Credentials = string(jsonStr)
			} else {
				log.Printf("Warning: failed to decrypt credentials for account %s: %v", a.ID, err)
			}
		}

		newAccounts[a.VendorID] = append(newAccounts[a.VendorID], a)
	}

	// 3. Load User Assignments from DB
	userRows, err := r.db.Query(ctx, "SELECT user_id, vendor_id FROM user_account_assignments")
	if err != nil {
		return fmt.Errorf("failed to query user assignments: %w", err)
	}
	defer userRows.Close()

	for userRows.Next() {
		var userID, vendorID string
		if err := userRows.Scan(&userID, &vendorID); err != nil {
			return err
		}
		if newUserVendors[userID] == nil {
			newUserVendors[userID] = make(map[string]bool)
		}
		newUserVendors[userID][vendorID] = true
	}

	r.mu.Lock()
	r.vendors = newVendors
	r.accounts = newAccounts
	r.userVendors = newUserVendors
	r.mu.Unlock()

	log.Printf("Loaded %d vendors, their accounts, and user assignments into registry", len(newVendors))
	return nil
}

func (r *vendorRegistry) GetEligibleVendors(ctx context.Context, userID string, amount float64, channel string) ([]domain.Vendor, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	log.Printf("[Registry] GetEligibleVendors for user %s, amount %.2f, channel %s", userID, amount, channel)

	assignedVendors, ok := r.userVendors[userID]
	if !ok {
		log.Printf("[Registry] No vendor assignments found for user %s", userID)
		return nil, nil
	}

	log.Printf("[Registry] User %s has %d vendor assignments", userID, len(assignedVendors))

	var eligible []domain.Vendor

	for _, v := range r.vendors {
		log.Printf("[Registry] Checking vendor %s (%s)", v.Name, v.ID)

		if !assignedVendors[v.ID] {
			log.Printf("[Registry]   - Not assigned to user")
			continue
		}

		if !v.IsActive {
			log.Printf("[Registry]   - Not active")
			continue
		}

		allowed, _ := r.cb.AllowRequest(ctx, v.ID)
		if !allowed {
			log.Printf("[Registry]   - Circuit breaker blocked")
			continue
		}

		log.Printf("[Registry]   - ELIGIBLE ✓")
		eligible = append(eligible, v)
	}

	log.Printf("[Registry] Found %d eligible vendors", len(eligible))
	return eligible, nil
}

func (r *vendorRegistry) GetAccounts(ctx context.Context, vendorID string) ([]domain.VendorAccount, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	accounts, ok := r.accounts[vendorID]
	if !ok {
		return nil, nil
	}

	return accounts, nil
}

func (r *vendorRegistry) GetVendor(ctx context.Context, vendorID string) (domain.Vendor, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	v, ok := r.vendors[vendorID]
	if ok {
		return v, nil
	}

	for _, vend := range r.vendors {
		if vend.Code == vendorID {
			return vend, nil
		}
	}

	return domain.Vendor{}, fmt.Errorf("vendor not found: %s", vendorID)
}

func (r *vendorRegistry) WatchConfigUpdates(ctx context.Context) {
	// Handled in main.go
}
