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
	// merchantVendors maps [merchantID][vendorID] -> true
	merchantVendors map[string]map[string]bool
}

func NewVendorRegistry(db *pgxpool.Pool, rdb *redis.Client, cb domain.CircuitBreaker) domain.VendorRegistry {
	return &vendorRegistry{
		db:              db,
		rdb:             rdb,
		cb:              cb,
		vendors:         make(map[string]domain.Vendor),
		accounts:        make(map[string][]domain.VendorAccount),
		merchantVendors: make(map[string]map[string]bool),
	}
}

func (r *vendorRegistry) Load(ctx context.Context) error {
	log.Println("Loading vendor configuration...")
	
	newVendors := make(map[string]domain.Vendor)
	newAccounts := make(map[string][]domain.VendorAccount)
	newMerchantVendors := make(map[string]map[string]bool)

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

	// 2. Load Credentials from DB (replaces vendor_accounts)
	accRows, err := r.db.Query(ctx, "SELECT id, merchant_id, vendor_id, environment, credentials_encrypted, is_enabled FROM merchant_vendor_credentials WHERE is_enabled = true")
	if err != nil {
		return fmt.Errorf("failed to query vendor credentials: %w", err)
	}
	defer accRows.Close()

	for accRows.Next() {
		var a domain.VendorAccount
		var merchantID *string
		if err := accRows.Scan(&a.ID, &merchantID, &a.VendorID, &a.Environment, &a.Credentials, &a.IsActive); err != nil {
			return err
		}

		if merchantID != nil {
			a.MerchantID = *merchantID
			if newMerchantVendors[*merchantID] == nil {
				newMerchantVendors[*merchantID] = make(map[string]bool)
			}
			newMerchantVendors[*merchantID][a.VendorID] = true
		}

		// Decrypt credentials
		if a.Credentials != "" {
			decrypted, err := crypto.DecryptRaw(a.Credentials)
			if err == nil {
				a.Credentials = decrypted
			} else {
				log.Printf("Warning: failed to decrypt credentials for credential record %s: %v", a.ID, err)
			}
		}

		newAccounts[a.VendorID] = append(newAccounts[a.VendorID], a)
	}

	r.mu.Lock()
	r.vendors = newVendors
	r.accounts = newAccounts
	r.merchantVendors = newMerchantVendors
	r.mu.Unlock()

	log.Printf("Loaded %d vendors and their merchant-owned accounts into registry", len(newVendors))
	return nil
}

func (r *vendorRegistry) GetEligibleVendors(ctx context.Context, merchantID string, amount float64, channel string, environment string) ([]domain.Vendor, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	log.Printf("[Registry] GetEligibleVendors for merchant %s, amount %.2f, channel %s, env %s", merchantID, amount, channel, environment)

	assignedVendors, ok := r.merchantVendors[merchantID]
	if !ok {
		log.Printf("[Registry] No vendor accounts found for merchant %s", merchantID)
		return nil, nil
	}

	var eligible []domain.Vendor

	for _, v := range r.vendors {
		if !assignedVendors[v.ID] {
			continue
		}

		if !v.IsActive {
			continue
		}

		// Filter accounts by merchant AND environment
		accounts := r.accounts[v.ID]
		hasMatchingAccount := false
		for _, acc := range accounts {
			if acc.MerchantID == merchantID && (environment == "" || acc.Environment == environment) {
				hasMatchingAccount = true
				break
			}
		}

		if !hasMatchingAccount {
			continue
		}

		allowed, _ := r.cb.AllowRequest(ctx, v.ID)
		if !allowed {
			log.Printf("[Registry]   - Vendor %s blocked by circuit breaker", v.Name)
			continue
		}

		eligible = append(eligible, v)
	}

	log.Printf("[Registry] Found %d eligible vendors", len(eligible))
	return eligible, nil
}

func (r *vendorRegistry) GetAccounts(ctx context.Context, vendorID string, environment string) ([]domain.VendorAccount, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	accounts, ok := r.accounts[vendorID]
	if !ok {
		return nil, nil
	}

	// Filter by environment if specified
	if environment == "" {
		return accounts, nil
	}

	var filtered []domain.VendorAccount
	for _, acc := range accounts {
		if acc.Environment == environment {
			filtered = append(filtered, acc)
		}
	}

	return filtered, nil
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
