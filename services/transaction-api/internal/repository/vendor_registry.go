package repository

import (
	"context"
	"fmt"
	"log"
	"sync"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"
	"github.com/truechain/caishenengine/transaction-api/internal/domain"
	"github.com/truechain/caishenengine/transaction-api/pkg/crypto"
)

type vendorRegistry struct {
	db    *pgxpool.Pool
	rdb   *redis.Client
	cb    domain.CircuitBreaker
	mu    sync.RWMutex
	
	vendors     map[string]domain.Vendor
	accounts    map[string][]domain.MerchantVendorCredential
	// merchantVendors maps [merchantID][vendorID] -> true
	merchantVendors map[string]map[string]bool
}

func NewVendorRegistry(db *pgxpool.Pool, rdb *redis.Client, cb domain.CircuitBreaker) domain.VendorRegistry {
	return &vendorRegistry{
		db:              db,
		rdb:             rdb,
		cb:              cb,
		vendors:         make(map[string]domain.Vendor),
		accounts:        make(map[string][]domain.MerchantVendorCredential),
		merchantVendors: make(map[string]map[string]bool),
	}
}

func (r *vendorRegistry) Load(ctx context.Context) error {
	log.Println("Loading vendor configuration...")
	
	newVendors := make(map[string]domain.Vendor)
	newAccounts := make(map[string][]domain.MerchantVendorCredential)
	newMerchantVendors := make(map[string]map[string]bool)

	// Load Vendors from DB
	vRows, err := r.db.Query(ctx, "SELECT id, code, name, is_active FROM vendors WHERE is_active = true")
	if err != nil {
		return fmt.Errorf("failed to query vendors: %w", err)
	}
	defer vRows.Close()

	for vRows.Next() {
		var v domain.Vendor
		if err := vRows.Scan(&v.ID, &v.Code, &v.Name, &v.IsActive); err != nil {
			return err
		}
		newVendors[v.ID] = v
	}

	// Load Credentials from DB joined with vendor base URLs
	query := `
		SELECT mvc.id, mvc.merchant_id, mvc.vendor_id, mvc.environment, 
		       mvc.credentials_encrypted, mvc.is_enabled, mvc.priority,
		       v.sandbox_base_url, v.production_base_url
		FROM merchant_vendor_credentials mvc
		JOIN vendors v ON v.id = mvc.vendor_id
		WHERE mvc.is_enabled = true 
		  AND v.is_active = true`
	
	accRows, err := r.db.Query(ctx, query)
	if err != nil {
		return fmt.Errorf("failed to query vendor credentials: %w", err)
	}
	defer accRows.Close()

	for accRows.Next() {
		var a domain.MerchantVendorCredential
		if err := accRows.Scan(
			&a.ID, &a.MerchantID, &a.VendorID, &a.Environment, 
			&a.Credentials, &a.IsEnabled, &a.Priority,
			&a.SandboxBaseURL, &a.ProductionBaseURL,
		); err != nil {
			return err
		}

		if newMerchantVendors[a.MerchantID] == nil {
			newMerchantVendors[a.MerchantID] = make(map[string]bool)
		}
		newMerchantVendors[a.MerchantID][a.VendorID] = true

		// Decrypt credentials
		if a.Credentials != "" {
			decrypted, err := crypto.DecryptRaw(a.Credentials)
			if err == nil {
				a.Credentials = decrypted
			} else {
				log.Printf("Warning: failed to decrypt credentials for record %s: %v", a.ID, err)
			}
		}

		newAccounts[a.VendorID] = append(newAccounts[a.VendorID], a)
	}

	r.mu.Lock()
	r.vendors = newVendors
	r.accounts = newAccounts
	r.merchantVendors = newMerchantVendors
	r.mu.Unlock()

	log.Printf("Loaded %d vendors and their merchant-owned credentials into registry", len(newVendors))
	return nil
}

func (r *vendorRegistry) GetEligibleVendors(ctx context.Context, merchantID string, amount float64, channel string, environment string) ([]domain.Vendor, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	assignedVendors, ok := r.merchantVendors[merchantID]
	if !ok {
		return nil, nil
	}

	var eligible []domain.Vendor

	for _, v := range r.vendors {
		if !assignedVendors[v.ID] {
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

		allowed, _ := r.cb.AllowRequest(ctx, v.ID, environment)
		if !allowed {
			continue
		}

		eligible = append(eligible, v)
	}

	return eligible, nil
}

func (r *vendorRegistry) GetAccounts(ctx context.Context, vendorID string, environment string) ([]domain.MerchantVendorCredential, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	accounts, ok := r.accounts[vendorID]
	if !ok {
		return nil, nil
	}

	var filtered []domain.MerchantVendorCredential
	for _, acc := range accounts {
		if environment == "" || acc.Environment == environment {
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
