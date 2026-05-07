package domain

import "errors"

var (
	ErrCurrencyNotSupported = errors.New("INVALID_CURRENCY")
	ErrRateLimited          = errors.New("RATE_LIMITED")
	ErrNoEligibleVendor     = errors.New("NO_ELIGIBLE_VENDOR")
	ErrVendorTimeout        = errors.New("VENDOR_TIMEOUT")
	ErrVendorError          = errors.New("VENDOR_ERROR")
	ErrCircuitOpen          = errors.New("CIRCUIT_OPEN")
	ErrIdempotencyConflict  = errors.New("IDEMPOTENCY_CONFLICT")
	ErrUserDisabled         = errors.New("USER_DISABLED")
	ErrInvalidAPIKey        = errors.New("INVALID_API_KEY")
	ErrMissingAPIKey        = errors.New("MISSING_API_KEY")
)
