# PTMS Code Review — Round 2
**Date:** 2026-05-01  
**Base:** Round 1 feedback sudah diapply

---

## Status Fix dari Round 1

| ID | Masalah | Status | Catatan |
|---|---|---|---|
| K-1 | UserID hardcoded | ✅ Fixed | `APIKeyMiddleware` sudah benar, context propagation OK |
| K-2 | Error handling string matching | ✅ Fixed | Sentinel errors + `ErrorResponse` struct sudah tepat |
| K-3 | `MarkEventProcessed` kosong | ✅ Fixed | Implementasi + `FOR UPDATE SKIP LOCKED` sudah benar |
| K-4 | Idempotency conflict | ✅ Fixed | `uuidKey` + `bodyHash` flow sudah correct |
| K-5 | Compile error basket_size_router | ✅ Fixed | Import `time` + `metrics` sudah ada, `...` dihapus |
| K-6 | CB Open→Half-Open tidak terjadi | ✅ Fixed | `was-open` key approach sudah implement |
| K-7 | Callback retry pakai `time.Sleep` | ⚠️ Partial | Sleep dihapus, tapi masih ada masalah baru (lihat N-1) |
| K-8 | `DisableUserCallback` disable user | ✅ Fixed | Sekarang update `callback_enabled = false` |
| M-1 | Vendor filter tidak per-user | ✅ Fixed | `userVendors` map sudah diload + digunakan |
| M-2 | Rate limits hardcoded | ✅ Fixed | `Load()` dari DB, `getConfig()` dengan default |
| M-3 | Accounts dari mock | ✅ Fixed | `registry.GetAccounts()` sudah dipakai |
| M-4 | Typo SSL path nginx | ✅ Fixed | `/etc/nginx/certs/ptms.key` sudah benar |
| M-5 | Increment setelah reconcile | ✅ Fixed | Urutan dibalik: increment dulu, baru reconcile |
| M-6 | Double DNS resolution saat delivery | ✅ Fixed | `security.ValidateCallbackURL()` dipanggil di `handleDelivery` |
| M-7 | `processed_at` tidak ada di schema | ✅ Fixed | Ada di `init.sql` + partial index |
| M-8 | PtmsUser vs Laravel User conflict | ✅ Fixed | `ptms_users` table terpisah, `User` pakai `admins` table |
| M-9 | SyncsToRedis tidak ada retry | ✅ Fixed | Dispatch ke `SyncToRedisJob` dengan `$tries = 5` + backoff |
| M-10 | Tidak ada unique constraint vendor_penalties | ✅ Fixed | `UNIQUE(vendor_id, account_id)` sudah ada di init.sql |
| M-11 | Sweeper pakai `updated_at` | ✅ Fixed | Sekarang pakai `created_at < $1` |

**Semua 19 issues dari Round 1 sudah ditangani. Kerja bagus.**

---

## Issues Baru yang Ditemukan di Round 2

### 🔴 KRITIS

---

#### N-1: `APIKeyMiddleware` tidak handle Redis error — silent auth bypass

**File:** `cmd/api/main.go` baris ~85

```go
userID, err := rdb.Get(r.Context(), cacheKey).Result()
if err == redis.Nil {
    // lookup DB...
}
// Jika err != nil && err != redis.Nil (Redis down/timeout)
// → TIDAK ADA handling, kode lanjut ke next handler dengan userID = ""
```

**Dampak:** Jika Redis timeout atau connection error (bukan `redis.Nil`), middleware tetap memanggil `next.ServeHTTP` dengan `userID = ""`. Semua request akan lolos auth check tanpa identitas valid.

**Fix:**
```go
userID, err := rdb.Get(r.Context(), cacheKey).Result()
if err != nil && err != redis.Nil {
    // Redis error — fallback langsung ke DB, JANGAN skip
    var id string
    var isActive bool
    dbErr := db.QueryRow(r.Context(),
        "SELECT id, is_active FROM ptms_users WHERE api_key = $1", apiKey,
    ).Scan(&id, &isActive)
    if dbErr != nil || !isActive {
        respondError(w, 403, "INVALID_API_KEY", "Invalid API key")
        return
    }
    userID = id
    // Jangan set cache karena Redis sedang bermasalah
} else if err == redis.Nil {
    // Normal cache miss — lookup DB seperti sebelumnya
    ...
}
```

---

#### N-2: `RateLimiter.Load()` hanya load global config — per-entity limits tidak pernah dibaca

**File:** `internal/repository/rate_limiter.go` baris ~70

```go
rows, err := rl.db.Query(ctx,
    "SELECT entity_type, limit_type, limit_value FROM rate_limit_configs WHERE entity_id IS NULL")
```

Query filter `entity_id IS NULL` — ini hanya mengambil global/default limits. Per-user, per-vendor, per-account limits yang disimpan di `rate_limit_configs` dengan `entity_id != NULL` tidak pernah dibaca.

**Dampak:** Admin bisa set limit berbeda per user/vendor lewat Filament, tapi `Check()` selalu pakai satu nilai global untuk semua. Fitur rate limit per-entity sama sekali tidak berfungsi.

**Fix:** Load semua configs dan gunakan entity-specific limit jika ada, fallback ke global:
```go
rows, err := rl.db.Query(ctx,
    "SELECT entity_type, entity_id, limit_type, limit_value FROM rate_limit_configs")

// Store dengan key: "entity_type:entity_id:limit_type" atau "entity_type:global:limit_type"
// Di checkRedis(), cari entity-specific dulu, fallback ke global:
func (rl *redisRateLimiter) getLimitFor(entityType, entityID, limitType string) float64 {
    specificKey := entityType + ":" + entityID + ":" + limitType
    if val, ok := rl.configs[specificKey]; ok {
        return val
    }
    return rl.getConfig(entityType+"_"+limitType, defaultValues[entityType+"_"+limitType])
}
```

---

#### N-3: `GetUnprocessedEvents` pakai `FOR UPDATE SKIP LOCKED` tapi di luar transaksi

**File:** `internal/repository/postgres_transaction.go` baris ~115

```go
query := `SELECT ... FROM transaction_events WHERE processed_at IS NULL 
          ORDER BY created_at ASC LIMIT $1 FOR UPDATE SKIP LOCKED`
rows, err := r.db.Query(ctx, query, limit)
```

`FOR UPDATE` harus dijalankan dalam sebuah PostgreSQL transaction (`BEGIN...COMMIT`). Jika dijalankan di luar transaksi (implicit autocommit), lock langsung dilepas setelah SELECT selesai — sehingga multiple workers bisa mengambil event yang sama sebelum `MarkEventProcessed` dipanggil.

**Fix:**
```go
func (r *postgresTransactionRepo) GetUnprocessedEvents(ctx context.Context, limit int) ([]domain.TransactionEvent, error) {
    tx, err := r.db.Begin(ctx)
    if err != nil {
        return nil, err
    }
    defer tx.Rollback(ctx)

    rows, err := tx.Query(ctx,
        `SELECT id, transaction_id, event_type, event_data, created_at
         FROM transaction_events
         WHERE processed_at IS NULL
         ORDER BY created_at ASC
         LIMIT $1 FOR UPDATE SKIP LOCKED`, limit)
    // ... scan rows
    
    return events, tx.Commit(ctx)
}
```

---

#### N-4: `main.go` menggunakan `json.NewEncoder` tapi `json` tidak diimport

**File:** `cmd/api/main.go` baris ~100

```go
func respondError(w http.ResponseWriter, status int, code string, message string) {
    ...
    json.NewEncoder(w).Encode(map[string]interface{}{...})
}
```

Package `"encoding/json"` tidak ada di import list `main.go`. File ini tidak akan compile.

**Fix:** Tambah `"encoding/json"` ke import block di `main.go`.

---

### 🟡 MEDIUM

---

#### N-5: `ptms_users` migration tidak punya kolom `callback_url` dan `callback_enabled`

**File:** `services/admin/database/migrations/2026_04_29_071603_create_ptms_users_table.php`

```php
Schema::create('ptms_users', function (Blueprint $table) {
    $table->uuid('id')->primary();
    $table->string('name');
    $table->string('api_key')->unique();
    $table->boolean('is_active')->default(true);
    $table->timestamps();
    // ← callback_url dan callback_enabled TIDAK ADA
});
```

`init.sql` sudah benar (ada kedua kolom), tapi Laravel migration tidak punya kolom ini. Jika jalankan `php artisan migrate` (bukan via init.sql), tabel `ptms_users` akan dibuat tanpa kolom yang dibutuhkan. `PtmsUser` model punya `callback_url` dan `callback_enabled` di `$fillable` tapi kolom tidak ada di DB — akan error saat save.

**Fix:**
```php
$table->text('callback_url')->nullable();
$table->boolean('callback_enabled')->default(true);
```

---

#### N-6: `SyncToRedisJob` dispatch tapi `callback_consumer` butuh queue worker aktif

**File:** `app/Jobs/SyncToRedisJob.php`

Job ini di-dispatch sebagai queued job (`ShouldQueue`). Ini bagus untuk retry, tapi artinya butuh `php artisan queue:work` berjalan. Di `docker-compose.yml` tidak ada service untuk Laravel queue worker. Jika worker tidak jalan, config changes dari admin panel tidak akan pernah sampai ke Redis/Go.

**Fix — Tambah queue worker service di docker-compose.yml:**
```yaml
admin-queue:
  build:
    context: ./services/admin
  command: php artisan queue:work --sleep=3 --tries=5 --max-time=3600
  restart: always
  depends_on:
    - postgres
    - redis
  networks:
    - ptms-network
```

---

#### N-7: `callback_consumer` tidak exponential backoff — retry langsung re-queue tanpa delay

**File:** `internal/service/callback_consumer.go` baris ~85

```go
if job.RetryCount < 3 {
    job.RetryCount++
    // Langsung publish kembali ke queue tanpa delay
    err := c.channel.PublishWithContext(ctx, "", "ptms.callbacks", ...)
    d.Ack(false)
    return
}
```

`time.Sleep` memang sudah dihapus (good), tapi sekarang retry langsung tanpa delay sama sekali. PRD mensyaratkan "exponential backoff (3 attempts over 5 minutes)". Saat ini 3 retry bisa terjadi dalam hitungan detik, bukan menit.

**Fix — Gunakan RabbitMQ per-message TTL (dead-letter pattern):**
```go
delays := []int32{60000, 120000, 300000} // 1m, 2m, 5m in ms
delayMs := delays[job.RetryCount-1]

c.channel.PublishWithContext(ctx, "", "ptms.callbacks.retry", false, false,
    amqp.Publishing{
        ContentType: "application/json",
        Body:        newBody,
        Expiration:  fmt.Sprintf("%d", delayMs), // TTL per-message
    })
```

Declare `ptms.callbacks.retry` queue dengan `x-dead-letter-exchange` dan `x-dead-letter-routing-key` pointing ke `ptms.callbacks` sehingga setelah TTL expire, message otomatis masuk ke queue utama lagi.

---

#### N-8: `APIKeyMiddleware` menggunakan string key untuk context — type-unsafe

**File:** `cmd/api/main.go` baris ~93

```go
ctx := context.WithValue(r.Context(), "userID", userID)
```

Menggunakan string primitive sebagai context key. Go best practice mensyaratkan unexported custom type untuk context keys — string keys bisa clash dengan library lain yang juga pakai `"userID"`.

**Fix:**
```go
// Di domain/context.go:
type contextKey string
const ContextKeyUserID contextKey = "userID"

// Di middleware:
ctx := context.WithValue(r.Context(), domain.ContextKeyUserID, userID)

// Di service:
userID, _ := ctx.Value(domain.ContextKeyUserID).(string)
```

---

#### N-9: `was-open` key bertahan 1 jam — vendor yang sudah pulih tetap diperlakukan seperti pernah OPEN

**File:** `internal/repository/circuit_breaker.go` baris ~110

```go
wasOpenKey := fmt.Sprintf("cb:vendor:%s:was-open", vendorID)
cb.rdb.Set(ctx, wasOpenKey, "1", 1*time.Hour)
```

Dan saat CLOSED:
```go
if newState == domain.StateClosed {
    wasOpenKey := fmt.Sprintf("cb:vendor:%s:was-open", vendorID)
    cb.rdb.Del(ctx, wasOpenKey)
}
```

`was-open` key memang dihapus saat transisi ke `CLOSED`. Tapi ada race condition: `AllowRequest` cek `was-open` key di state `CLOSED` — jika vendor sudah `CLOSED` dan `was-open` belum dihapus (karena `transitionTo(CLOSED)` belum dipanggil), vendor tetap di-treat sebagai `HALF_OPEN` dan hanya 5% traffic yang diizinkan. Vendor yang recovery normal (bukan via CB) akan ke-throttle 95%.

**Fix:** Hapus `was-open` bukan hanya saat transisi ke `CLOSED`, tapi juga saat `HALF_OPEN` berhasil penuh:
```go
// Di RecordResult, setelah count >= 10 consecutive successes:
cb.rdb.Del(ctx, consecutiveKey)
cb.rdb.Del(ctx, wasOpenKey) // Tambah ini
return cb.transitionTo(ctx, vendorID, domain.StateClosed)
```

---

#### N-10: `docker-compose.yml` masih tidak punya service untuk Go API dan Laravel Admin

Sama seperti Round 1 minor Mi-5 yang belum difix. `docker-compose.yml` hanya ada infra services (postgres, redis, rabbitmq, nginx). Tidak ada `transaction-api` dan `admin` service. `docker compose up` tidak akan menjalankan aplikasi apapun, NGINX akan 502 karena upstream tidak ada.

**Fix — tambah kedua service:**
```yaml
transaction-api:
  build:
    context: ./services/transaction-api
    dockerfile: Dockerfile
  environment:
    DATABASE_URL: postgres://ptms_user:ptms_password@postgres:5432/ptms_db
    REDIS_URL: redis:6379
    RABBITMQ_URL: amqp://guest:guest@rabbitmq:5672/
    PORT: "8080"
  depends_on:
    postgres:
      condition: service_healthy
    redis:
      condition: service_healthy
  networks:
    - ptms-network

admin:
  build:
    context: ./services/admin
    dockerfile: Dockerfile
  environment:
    DB_HOST: postgres
    DB_DATABASE: ptms_db
    DB_USERNAME: ptms_user
    DB_PASSWORD: ptms_password
    REDIS_HOST: redis
    RABBITMQ_URL: amqp://guest:guest@rabbitmq:5672/
  depends_on:
    postgres:
      condition: service_healthy
  networks:
    - ptms-network
```

---

### 🔵 MINOR (Tetap Ada dari Round 1)

#### Mi-1: `callVendorAPI` masih mock — belum baca credentials dari DB
`vendor_accounts.credentials` (JSONB) ada di schema tapi tidak digunakan. Ini wajar untuk tahap development, tapi perlu vendor-specific HTTP client implementation sebelum production.

#### Mi-2: `validateSignature` masih `return signature != ""`
Belum ada HMAC verification. Perlu implementasi per-vendor.

#### Mi-3: `userCallbackURL` hardcoded `"https://client-api.example.com/callback"`
**File:** `transaction_service.go` baris ~160.  
URL seharusnya dibaca dari `ptms_users.callback_url`. Saat ini semua callback dikirim ke URL yang sama.

```go
// Fix:
tx, err := s.repo.GetByID(ctx, normalized.TransactionID)
if err == nil && tx != nil {
    // Ambil callback URL dari user record
    var callbackURL string
    s.db.QueryRow(ctx, 
        "SELECT callback_url FROM ptms_users WHERE id = $1 AND callback_enabled = true", 
        tx.UserID).Scan(&callbackURL)
    if callbackURL != "" {
        s.forwardToUser(ctx, callbackURL, normalized)
    }
}
```

#### Mi-4: `RateLimiter` interface tidak expose `Load()` method
**File:** `internal/domain/rate_limit.go`  
`RateLimiter` interface hanya punya `Check()`. `Load()` dipanggil di `main.go` langsung tanpa type assertion — ini akan compile error karena interface tidak punya method itu.

```go
// Fix di domain/rate_limit.go:
type RateLimiter interface {
    Check(ctx context.Context, req RateLimitRequest) (*RateLimitResult, error)
    Load(ctx context.Context) error  // tambah ini
}
```

---

## Scorecard Keseluruhan

| Aspek | Round 1 | Round 2 |
|---|---|---|
| Bug kritis | 8 | 4 (N-1, N-2, N-3, N-4) |
| Bug medium | 11 | 6 (N-5 s/d N-10) |
| Minor | 6 | 4 (Mi-1 s/d Mi-4) |
| Kualitas keseluruhan | 6/10 | 8/10 |

**Progress sangat signifikan.** Semua 19 issues dari round 1 sudah ditangani dengan benar. Issues baru yang muncul di round 2 mayoritas adalah edge cases dan refinements, bukan fundamental design problems.

## Prioritas Fix Round 2

**Sebelum bisa build/run:**
1. N-4 — Import `encoding/json` di `main.go`
2. Mi-4 — Tambah `Load()` ke `RateLimiter` interface

**Sebelum integration test:**
3. N-1 — Redis error handling di middleware
4. N-3 — `FOR UPDATE SKIP LOCKED` dalam transaksi DB
5. N-5 — Tambah kolom di Laravel migration
6. N-10 — Tambah service di docker-compose

**Sebelum production:**
7. N-2 — Per-entity rate limit loading
8. N-7 — Exponential backoff yang proper
9. N-6 — Queue worker service di compose
10. Mi-3 — Baca callback URL dari DB
