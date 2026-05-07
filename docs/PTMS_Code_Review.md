# PTMS Code Review Report
**Reviewer:** Senior Engineer Audit  
**Version:** v1.2  
**Date:** 2026-04-30  
**Scope:** Go Transaction API + Laravel Admin + Infra

---

## Ringkasan Eksekutif

Secara keseluruhan struktur codebase sudah **solid dan searah dengan PRD**. Domain-driven structure di Go, CQRS pattern, circuit breaker, sliding window rate limiter dengan Lua script, dan SSRF protection semuanya hadir. Ini jauh di atas rata-rata vibecoded project. Namun ada **8 bug kritis** dan **11 masalah medium** yang harus diselesaikan sebelum production.

| Severity | Jumlah | Status |
|---|---|---|
| 🔴 KRITIS (harus fix sebelum prod) | 8 | Belum fix |
| 🟡 MEDIUM (harus fix sebelum launch) | 11 | Belum fix |
| 🔵 MINOR (nice to have) | 6 | Opsional |

---

## 🔴 BUG KRITIS

### K-1: UserID selalu hardcoded `"user-123"` — ZERO auth enforcement

**File:** `internal/service/transaction_service.go` baris 54  
**Code bermasalah:**
```go
userID := "user-123" // Should be resolved from middleware
```

**Dampak:** Semua transaksi dari semua API key akan dianggap milik user yang sama. Rate limit, volume tracking, account pool isolation, dan reporting semuanya rusak total.

**Fix:**
```go
// Tambah middleware di main.go:
func APIKeyMiddleware(db *pgxpool.Pool, rdb *redis.Client) func(http.Handler) http.Handler {
    return func(next http.Handler) http.Handler {
        return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
            apiKey := r.Header.Get("X-API-Key")
            if apiKey == "" {
                respondError(w, 401, "MISSING_API_KEY", "API key required")
                return
            }
            // Lookup user dari Redis cache, fallback ke DB
            cacheKey := "apikey:" + apiKey
            userID, err := rdb.Get(r.Context(), cacheKey).Result()
            if err == redis.Nil {
                var id string
                var isActive bool
                err = db.QueryRow(r.Context(),
                    "SELECT id, is_active FROM users WHERE api_key = $1", apiKey,
                ).Scan(&id, &isActive)
                if err != nil || !isActive {
                    respondError(w, 403, "USER_DISABLED", "Invalid or disabled API key")
                    return
                }
                userID = id
                rdb.Set(r.Context(), cacheKey, userID, 5*time.Minute)
            }
            ctx := context.WithValue(r.Context(), "userID", userID)
            next.ServeHTTP(w, r.WithContext(ctx))
        })
    }
}

// Di service, ambil dari context:
userID := ctx.Value("userID").(string)
```

---

### K-2: Error handling di handler pakai string matching — rapuh dan salah status code

**File:** `internal/handler/transaction_handler.go` baris 29–42  
**Code bermasalah:**
```go
} else if len(err.Error()) >= 10 && err.Error()[:10] == "rate limit" {
    status = http.StatusTooManyRequests
```

**Dampak:** String prefix matching ini sangat rapuh. Jika error message berubah satu karakter, client dapat 500 alih-alih 429/503. Juga tidak mengembalikan format error standar dari PRD.

**Fix — Gunakan sentinel errors:**
```go
// domain/errors.go
var (
    ErrCurrencyNotSupported  = errors.New("INVALID_CURRENCY")
    ErrRateLimited           = errors.New("RATE_LIMITED")
    ErrNoEligibleVendor      = errors.New("NO_ELIGIBLE_VENDOR")
    ErrVendorTimeout         = errors.New("VENDOR_TIMEOUT")
    ErrVendorError           = errors.New("VENDOR_ERROR")
    ErrCircuitOpen           = errors.New("CIRCUIT_OPEN")
    ErrIdempotencyConflict   = errors.New("IDEMPOTENCY_CONFLICT")
    ErrUserDisabled          = errors.New("USER_DISABLED")
)

// handler pakai errors.Is():
if errors.Is(err, domain.ErrRateLimited) {
    // return 429
} else if errors.Is(err, domain.ErrNoEligibleVendor) {
    // return 503
}
```

**Format error response harus sesuai PRD:**
```go
type ErrorResponse struct {
    Error struct {
        Code       string `json:"code"`
        Message    string `json:"message"`
        RetryAfter int    `json:"retry_after,omitempty"`
        TraceID    string `json:"trace_id"`
    } `json:"error"`
}
```

---

### K-3: `MarkEventProcessed` tidak diimplementasi — event diproses ulang selamanya

**File:** `internal/repository/postgres_transaction.go` baris ~150  
**Code bermasalah:**
```go
func (r *postgresTransactionRepo) MarkEventProcessed(ctx context.Context, eventID string) error {
    return nil // Empty!
}
```

**Dampak:** Event processor akan memproses event yang sama berulang-ulang setiap detik tanpa henti. Ini menyebabkan status transaksi dioverwrite terus, cache kacau, dan DB load meledak.

**Fix — Tambah kolom `processed_at` di schema:**
```sql
ALTER TABLE transaction_events ADD COLUMN processed_at TIMESTAMP WITH TIME ZONE;
CREATE INDEX idx_transaction_events_unprocessed ON transaction_events(created_at) 
    WHERE processed_at IS NULL;
```

```go
// GetUnprocessedEvents — filter yang belum diproses:
query := `SELECT id, transaction_id, event_type, event_data, created_at 
          FROM transaction_events 
          WHERE processed_at IS NULL 
          ORDER BY created_at ASC 
          LIMIT $1 FOR UPDATE SKIP LOCKED`

// MarkEventProcessed:
func (r *postgresTransactionRepo) MarkEventProcessed(ctx context.Context, eventID string) error {
    _, err := r.db.Exec(ctx,
        "UPDATE transaction_events SET processed_at = NOW() WHERE id = $1", eventID)
    return err
}
```

> `FOR UPDATE SKIP LOCKED` kritis untuk mencegah multiple Go workers memproses event yang sama ketika horizontal scaling.

---

### K-4: Idempotency conflict tidak dideteksi — payload berbeda dikembalikan cached response lama

**File:** `internal/service/transaction_service.go` baris ~35  
**Code bermasalah:**
```go
// Saat ini: jika key sama, langsung return cached response
// TIDAK ADA pengecekan apakah body/parameter berubah
if val, err := s.rdb.Get(ctx, fullIdempotencyKey).Result(); err == nil {
    var existing domain.Transaction
    if err := json.Unmarshal([]byte(val), &existing); err == nil {
        return &existing, nil // Selalu return cached, tidak cek conflict
    }
}
```

**PRD mensyaratkan:** Sama key + beda parameter = `IDEMPOTENCY_CONFLICT` error.

**Masalah:** `buildIdempotencyKey` sudah include SHA256 body hash, sehingga key berbeda akan dibuat untuk parameter berbeda — jadi conflict tidak akan terjadi di implementasi ini. Tapi cache idempotency menyimpan response lama dengan key lama, bukan mendeteksi reuse key UUID yang sama dengan body berbeda.

**Fix — Simpan UUID idempotency key secara terpisah:**
```go
// Cek apakah UUID key pernah dipakai dengan body berbeda
uuidKey := fmt.Sprintf("idem:uuid:%s:%s", apiKey, idempotencyKey)
existingHash, err := s.rdb.Get(ctx, uuidKey).Result()
bodyHash := hex.EncodeToString(sha256.Sum256(rawBody)[:])

if err == nil && existingHash != bodyHash {
    return nil, domain.ErrIdempotencyConflict
}

// Simpan hash untuk validasi conflict ke depan
s.rdb.Set(ctx, uuidKey, bodyHash, 24*time.Hour)
```

---

### K-5: `basket_size_router.go` tidak bisa compile — missing `time` dan `metrics` import

**File:** `internal/repository/basket_size_router.go`  
**Code bermasalah:**
```go
func (r *basketSizeRouter) Route(...) []domain.Vendor {
    start := time.Now()    // time tidak diimport!
    defer func() {
        metrics.RoutingDuration.Observe(...)  // metrics tidak diimport!
    }()
    
    r.mu.RLock()
    ...                   // ada "..." literal di kode!
    defer r.mu.RUnlock()  // defer dipanggil SETELAH RLock sudah dirilis karena "..."
```

**Dampak:** Code ini tidak akan compile. Ada juga bug logika: `r.mu.RLock()` kemudian ada code `...` kemudian `defer r.mu.RUnlock()` — urutan ini salah karena defer dieksekusi saat fungsi return, tapi RLock sudah dirilis lebih awal karena `...` adalah placeholder bukan kode nyata.

**Fix:**
```go
import (
    "time"
    "github.com/truechain/ptms/transaction-api/pkg/metrics"
)

func (r *basketSizeRouter) Route(ctx context.Context, amount float64, eligibleVendors []domain.Vendor) []domain.Vendor {
    start := time.Now()
    r.mu.RLock()
    defer func() {
        r.mu.RUnlock()
        metrics.RoutingDuration.Observe(time.Since(start).Seconds())
    }()
    // ... rest of logic
}
```

---

### K-6: Circuit breaker Open → Half-Open transition tidak pernah terjadi otomatis

**File:** `internal/repository/circuit_breaker.go` baris ~70  
**Code bermasalah:**
```go
if state == domain.StateOpen {
    // Wait for sleep window? Usually handled by TTL on OPEN state
    // If manually triggered or time elapsed, move to Half-Open
    // In this impl, we'll assume a background task or the first call after 30s moves it to Half-Open
}
```

**Dampak:** Circuit breaker di-set TTL 30s untuk OPEN state, tapi setelah TTL expire, key dihapus dari Redis. `GetState` akan return `StateClosed` (default) bukan `StateHalfOpen`. Vendor langsung di-CLOSED lagi, bukan di probe dulu — ini salah dan mengalahkan tujuan circuit breaker.

**Fix:**
```go
func (cb *redisCircuitBreaker) transitionTo(...) {
    if newState == domain.StateOpen {
        // Set ke OPEN dulu
        cb.rdb.Set(ctx, key, string(domain.StateOpen), 30*time.Second)
        // Set half-open key dengan delay 30s (akan aktif setelah OPEN expire)
        halfOpenKey := fmt.Sprintf("cb:vendor:%s:half-open-pending", vendorID)
        cb.rdb.Set(ctx, halfOpenKey, "1", 30*time.Second)
    }
}

// Di AllowRequest, cek half-open pending:
func (cb *redisCircuitBreaker) AllowRequest(ctx context.Context, vendorID string) (bool, error) {
    state, _ := cb.GetState(ctx, vendorID)
    if state == domain.StateClosed {
        // Cek apakah seharusnya Half-Open
        halfOpenKey := fmt.Sprintf("cb:vendor:%s:half-open-pending", vendorID)
        if exists, _ := cb.rdb.Exists(ctx, halfOpenKey).Result(); exists == 0 {
            // Pernah OPEN dan sudah 30s — transisi ke Half-Open
            stateKey := fmt.Sprintf("cb:vendor:%s:state", vendorID)
            if wasOpen, _ := cb.rdb.Get(ctx, stateKey+":was-open").Result(); wasOpen == "1" {
                cb.transitionTo(ctx, vendorID, domain.StateHalfOpen)
                return rand.Intn(100) < 5, nil
            }
        }
    }
    // ...
}
```

---

### K-7: Callback consumer retry menggunakan `time.Sleep` di goroutine — goroutine leak

**File:** `internal/service/callback_consumer.go` baris ~82  
**Code bermasalah:**
```go
go func() {
    time.Sleep(delay)
    // re-publish...
}()
d.Ack(false) // Message langsung di-ack sebelum retry berhasil
```

**Dampak:** Jika service restart selama `time.Sleep`, retry hilang tanpa jejak. Goroutine tidak bisa di-cancel via context. Setelah `d.Ack(false)`, message hilang dari queue — jika retry gagal, tidak ada DLQ fallback.

**Fix — Gunakan RabbitMQ delayed message exchange atau TTL queue:**
```go
// Saat setup queue, buat retry queue dengan TTL per retry count:
retryQueues := map[int]time.Duration{
    1: 1 * time.Minute,
    2: 2 * time.Minute,
    3: 5 * time.Minute,
}

// Publish ke retry queue dengan TTL, dead-letter kembali ke main queue:
args := amqp.Table{
    "x-message-ttl":          int64(delay.Milliseconds()),
    "x-dead-letter-exchange": "",
    "x-dead-letter-routing-key": "ptms.callbacks",
}

// JANGAN Ack sampai message berhasil masuk retry queue atau DLQ
```

---

### K-8: `DisableUserCallback` men-disable user, bukan hanya callback URL

**File:** `internal/repository/postgres_transaction.go` baris ~170  
**Code bermasalah:**
```go
func (r *postgresTransactionRepo) DisableUserCallback(ctx context.Context, userID string) error {
    query := `UPDATE users SET is_active = false WHERE id = $1`
    // Ini men-disable SELURUH user (akun diblokir), bukan hanya callback URL!
}
```

**PRD:** "auto-disable user's **callback URL**" — bukan disable user account-nya.

**Fix — Tambah kolom `callback_url` dan `callback_enabled` di tabel users:**
```sql
ALTER TABLE users 
    ADD COLUMN callback_url TEXT,
    ADD COLUMN callback_enabled BOOLEAN DEFAULT true;
```

```go
func (r *postgresTransactionRepo) DisableUserCallback(ctx context.Context, userID string) error {
    _, err := r.db.Exec(ctx,
        "UPDATE users SET callback_enabled = false WHERE id = $1", userID)
    return err
}
```

---

## 🟡 MASALAH MEDIUM

### M-1: `VendorRegistry.GetEligibleVendors` tidak filter per user — account isolation rusak

**File:** `internal/repository/vendor_registry.go`  
Registry load semua vendor, tapi `GetEligibleVendors` tidak filter vendor berdasarkan user's account pool. Semua user mendapat semua vendor yang aktif. Account isolation yang jadi core feature PRD tidak bekerja.

**Fix:** Load `user_account_assignments` dan filter vendor yang memiliki minimal 1 account yang di-assign ke user tersebut.

---

### M-2: Rate limiter limits hardcoded di kode

**File:** `internal/repository/rate_limiter.go` baris ~55  
```go
limits := map[string]int{
    "user_tps":    100,
    "vendor_tps":  500,
    "account_tps": 50,
}
dailyLimit := 1000000000.0
```
Limits seharusnya dibaca dari `rate_limit_configs` table di DB (via config sync), bukan hardcoded. Ini membuat fitur admin panel untuk konfigurasi limits tidak berfungsi.

---

### M-3: `transaction_service.go` mendapat accounts dari mock, bukan registry

**File:** `internal/service/transaction_service.go` baris ~75  
```go
accounts := []domain.VendorAccount{{ID: uuid.New().String(), VendorID: v.ID, AccountName: "Primary"}}
```
Accounts didapat dari mock random, bukan dari vendor registry yang sudah di-load. Account ID yang tersimpan di DB adalah UUID random baru setiap request — tidak konsisten dan tidak trackable.

---

### M-4: `nginx.conf` ada typo di path SSL key

**File:** `infra/docker/nginx/conf.d/default.conf` baris 30  
```nginx
ssl_certificate_key /etc/json/certs/ptms.key;  # /etc/json/ ← typo! harusnya /etc/nginx/
```
NGINX akan gagal start dengan config ini.

---

### M-5: `reconciliation_sweeper` increment attempt SETELAH reconcile, bukan sebelum

**File:** `internal/service/reconciliation_sweeper.go`  
Urutan saat ini: reconcile → increment. Jika reconcile gagal (network error), attempt tidak di-increment. Transaksi yang selalu gagal reconcile tidak akan pernah mencapai 3 attempts untuk trigger `expired_stale`.

**Fix:** Increment dulu, baru reconcile.

---

### M-6: SSRF protection tidak dilakukan saat delivery, hanya saat registrasi

**File:** `internal/service/transaction_service.go` — `forwardToUser()`  
PRD mensyaratkan "Double DNS resolution at delivery time (prevent DNS rebinding)". Saat ini callback URL di-fetch langsung tanpa re-validasi. Jika DNS berubah setelah registrasi, DNS rebinding attack bisa bypass proteksi.

---

### M-7: `transaction_events` tidak ada kolom `processed_at` di `init.sql`

**File:** `infra/docker/postgres/init.sql`  
Schema di init.sql tidak include `processed_at` column yang diperlukan untuk event processor (lihat K-3). Ini inkonsistensi antara migration plan dan actual schema.

---

### M-8: `PtmsUser` model pakai tabel `users` yang sama dengan Laravel auth `User`

**File:** `services/admin/app/Models/PtmsUser.php`  
```php
protected $table = 'users';
```
Laravel default `User` model juga pakai tabel `users`. Ini akan conflict karena migration pertama Laravel (`0001_01_01_000000_create_users_table`) membuat tabel dengan kolom `email`, `password`, `remember_token` yang tidak ada di PTMS users schema.

**Fix:** Pisahkan tabelnya — `ptms_users` untuk API users, `admin_users` untuk Filament login.

---

### M-9: `SyncsToRedis` trait tidak handle failure atomically

**File:** `services/admin/app/Traits/SyncsToRedis.php`  
Jika Redis publish gagal setelah DB write berhasil, Go API tidak akan reload config. Tidak ada retry mechanism atau fallback. Config antara DB dan Go API bisa tidak sinkron tanpa terdeteksi.

**Fix:** Tambah retry dengan exponential backoff dan alerting jika gagal setelah N retry.

---

### M-10: `vendor_penalties` tidak ada unique constraint `(vendor_id, account_id)`

**File:** `infra/docker/postgres/init.sql`  
Query `UpdatePenalty` menggunakan `ON CONFLICT (vendor_id, account_id)` tapi tidak ada unique constraint di schema. Query ini akan selalu INSERT baris baru, bukan UPSERT. Penalty akan terus bertambah baris, bukan di-update.

**Fix:**
```sql
ALTER TABLE vendor_penalties 
    ADD CONSTRAINT uq_vendor_account UNIQUE (vendor_id, account_id);
```

---

### M-11: Reconciliation sweeper menggunakan `updated_at < threshold` bukan `created_at`

**File:** `internal/repository/postgres_transaction.go` — `GetPendingForReconciliation`  
```sql
WHERE status = 'pending_payment' AND updated_at < $1
```
Jika transaksi statusnya di-update (misalnya event processor menulis sesuatu), `updated_at` berubah dan transaksi "menghilang" dari radar sweeper meski masih pending. Seharusnya pakai `created_at`.

---

## 🔵 MINOR

### Mi-1: `callVendorAPI` masih mock — perlu implementasi nyata per vendor
Credentials dari `vendor_accounts.credentials` (JSONB) perlu dibaca dan dipakai untuk call API vendor yang sebenarnya.

### Mi-2: `validateSignature` selalu return `true` jika signature tidak kosong
```go
return signature != "" // Ini bukan validasi!
```
Perlu implementasi HMAC atau vendor-specific signature verification.

### Mi-3: `normalizeCallback` hardcode amount `100000` dan status `"paid"`
```go
Amount: 100000,  // hardcoded!
Status: "paid",  // selalu paid, tidak membaca dari payload
```

### Mi-4: `VendorHealthWidget` pakai mock chart data `[7, 3, 4, 5, 6, 3, 5, 2]`
Perlu diganti dengan data real dari Redis/Prometheus.

### Mi-5: Docker compose tidak include Go transaction-api dan Laravel services
`docker-compose.yml` hanya define infra (postgres, redis, rabbitmq, nginx) tapi tidak ada `transaction-api` dan `admin` service. Tidak bisa `docker compose up` langsung.

### Mi-6: `go.mod` module path `github.com/truechain/ptms` — pastikan konsisten
Jika repo bukan di bawah github.com/truechain, semua import akan gagal. Sesuaikan dengan actual repo path.

---

## Hal yang Sudah Benar ✅

- Struktur domain-driven (domain/handler/repository/service/pkg) — tepat
- `sliding_window_script` Lua untuk rate limiting — atomic, correct
- `daily_volume_script` Lua dengan TTL hingga midnight Jakarta — correct
- Power of Two Choices account selector — implementasi benar
- Penalty decay `MAX(0, stored - minutes_elapsed)` di PostgreSQL — sesuai PRD Decision 4
- `unique` constraint di `user_account_assignments.account_id` — no-overlap terjaga
- SSRF protection dengan private IP blocklist + DNS resolution — PRD compliant
- Event types lengkap sesuai PRD tabel event store
- Graceful shutdown dengan 10s timeout — sesuai PRD
- Redis pub/sub untuk config hot-reload — flow sudah benar
- `SyncsToRedis` trait di Laravel triggered on `saved` dan `deleted` — correct
- `PenaltyScoreWidget` menggunakan `effective_penalty` accessor dari model — benar
- `reconciliation_sweeper` cek 24h + 3 attempts sebelum `expired_stale` — sesuai PRD Decision 5
- Prometheus metrics lengkap sesuai PRD success metrics table

---

## Prioritas Fix

**Minggu ini (sebelum testing apapun):**
1. K-1: Auth middleware + userID resolution
2. K-3: Implementasi `MarkEventProcessed`
3. K-5: Fix compile error di `basket_size_router.go`
4. M-10: Tambah unique constraint `vendor_penalties`
5. M-4: Fix typo SSL path di nginx.conf

**Sebelum integration test:**
6. K-2: Sentinel errors + standardized error format
7. K-4: Idempotency conflict detection
8. K-6: Circuit breaker Half-Open transition
9. M-1: User-scoped vendor eligibility
10. M-2: Load rate limits dari DB

**Sebelum production:**
11. K-7: RabbitMQ delayed retry (bukan sleep goroutine)
12. K-8: DisableUserCallback fix
13. M-6: Double DNS resolution saat delivery
14. Mi-2, Mi-3: Fix mock implementations
