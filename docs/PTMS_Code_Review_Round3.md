# PTMS Code Review — Round 3
**Date:** 2026-05-02  
**Base:** Round 2 feedback sudah diapply

---

## Status Fix dari Round 2

| ID | Masalah | Status | Catatan |
|---|---|---|---|
| N-1 | Redis error silent bypass | ✅ Fixed | Fallback ke DB untuk semua `err != nil`, tidak hanya `redis.Nil` |
| N-2 | Rate limiter hanya global config | ✅ Fixed | `getLimitFor()` dengan lookup per-entity → global → default |
| N-3 | `FOR UPDATE SKIP LOCKED` di luar transaksi | ✅ Fixed | Dibungkus `Begin/Commit` yang benar |
| N-4 | `encoding/json` tidak diimport | ✅ Fixed | Import sudah ada |
| N-5 | Migration ptms_users kurang kolom | ✅ Fixed | `callback_url` dan `callback_enabled` sudah ada |
| N-6 | Queue worker tidak ada di compose | ✅ Fixed | `admin-queue` service sudah ditambahkan |
| N-7 | Retry tanpa delay | ✅ Fixed | RabbitMQ TTL per-message via `ptms.callbacks.retry` queue |
| N-8 | Context key type-unsafe | ✅ Fixed | `domain.ContextKeyUserID` dengan type `contextKey` |
| N-9 | `was-open` key race condition | ✅ Fixed | `Del(wasOpenKey)` saat count >= 10 |
| N-10 | docker-compose tanpa app services | ✅ Fixed | `transaction-api`, `admin`, `admin-queue` sudah ada |
| Mi-3 | Callback URL hardcoded | ✅ Fixed | Baca dari `ptms_users.callback_url` via DB query |
| Mi-4 | `RateLimiter` interface tanpa `Load()` | ✅ Fixed | `Load(ctx)` sudah ditambahkan ke interface |

**Semua 12 issues dari Round 2 sudah di-fix. Progress luar biasa.**

---

## Issues yang Ditemukan di Round 3

Hanya **3 issues tersisa** — semuanya medium/minor. Tidak ada lagi bug kritis. Codebase ini sudah mendekati production-ready untuk fase initial deployment.

---

### 🟡 MEDIUM

---

#### R3-1: `GetUnprocessedEvents` melepas row locks saat Commit — event processor tidak benar-benar safe

**File:** `internal/repository/postgres_transaction.go`

```go
func (r *postgresTransactionRepo) GetUnprocessedEvents(...) {
    tx, err := r.db.Begin(ctx)
    defer tx.Rollback(ctx)
    rows, err := tx.Query(ctx, `... FOR UPDATE SKIP LOCKED`, limit)
    defer rows.Close()
    // scan rows...
    if err := tx.Commit(ctx); err != nil { ... }
    return events, nil
}
```

Masalahnya adalah `rows.Close()` dipanggil via `defer` — tapi `defer` dieksekusi SEBELUM `tx.Commit()` karena urutan defer LIFO. Rows di-close dulu, lock dilepas, baru Commit. Artinya window kecil di antara rows.Close() dan sebelum MarkEventProcessed dipanggil oleh caller, row bisa diambil ulang oleh worker lain.

**Fix — Close rows secara eksplisit sebelum Commit:**
```go
func (r *postgresTransactionRepo) GetUnprocessedEvents(ctx context.Context, limit int) ([]domain.TransactionEvent, error) {
    tx, err := r.db.Begin(ctx)
    if err != nil {
        return nil, err
    }
    defer tx.Rollback(ctx)

    rows, err := tx.Query(ctx, `... FOR UPDATE SKIP LOCKED`, limit)
    if err != nil {
        return nil, err
    }

    var events []domain.TransactionEvent
    for rows.Next() {
        var e domain.TransactionEvent
        if err := rows.Scan(...); err != nil {
            rows.Close()
            return nil, err
        }
        events = append(events, e)
    }
    rows.Close() // Eksplisit, SEBELUM Commit
    
    if err := tx.Commit(ctx); err != nil {
        return nil, err
    }
    return events, nil
}
```

---

#### R3-2: `admin-queue` service di docker-compose tidak punya `QUEUE_CONNECTION` env var

**File:** `infra/docker/docker-compose.yml`

```yaml
admin-queue:
  command: php artisan queue:work --sleep=3 --tries=5 --max-time=3600
  environment:
    DB_CONNECTION: pgsql
    DB_HOST: postgres
    DB_DATABASE: ptms_db
    DB_USERNAME: ptms_user
    DB_PASSWORD: ptms_password
    REDIS_HOST: redis
    # QUEUE_CONNECTION tidak di-set!
```

Laravel default `QUEUE_CONNECTION=sync` yang artinya job dijalankan synchronously, tidak via Redis queue. `SyncToRedisJob` tidak akan masuk Redis queue dan `queue:work` tidak akan memproses apa-apa.

**Fix — Tambah env vars yang diperlukan:**
```yaml
admin-queue:
  environment:
    # ...existing vars...
    QUEUE_CONNECTION: redis
    REDIS_PORT: 6379
    REDIS_PASSWORD: ""
```

Pastikan juga `admin` service punya `QUEUE_CONNECTION=redis` agar job di-dispatch ke Redis, bukan dijalankan sync.

---

### 🔵 MINOR

---

#### R3-3: `slidingWindowScript` Lua punya bug duplikat member di ZADD

**File:** `internal/repository/rate_limiter.go`

```lua
local now = tonumber(ARGV[3])
-- ...
redis.call('ZADD', key, now, now)  -- score=now, member=now
```

Score dan member keduanya menggunakan nilai `now` (epoch milliseconds). Jika dua request datang dalam millisecond yang sama (sangat mungkin di 500 TPS), `ZADD` akan update score member yang sama (karena member identik), bukan menambah entry baru. Ini menyebabkan rate limiter under-count requests di burst tinggi.

**Fix — Gunakan unique member, misalnya kombinasi timestamp + random:**
```lua
local member = now .. ":" .. math.random(1000000)
redis.call('ZADD', key, now, member)
```

Atau gunakan `uuid` yang di-pass sebagai ARGV[4] dari Go:
```go
// Di Go:
memberID := uuid.New().String()
rl.rdb.Eval(ctx, slidingWindowScript, []string{key}, limit, window, now, memberID)

// Di Lua:
redis.call('ZADD', key, now, ARGV[4])
```

---

## Scorecard Keseluruhan — 3 Rounds

| Round | Kritis | Medium | Minor | Score |
|---|---|---|---|---|
| Round 1 | 8 | 11 | 6 | 6/10 |
| Round 2 | 4 | 6 | 4 | 8/10 |
| Round 3 | 0 | 2 | 1 | 9.5/10 |

---

## Status Akhir: Production Readiness

### ✅ Sudah solid dan production-ready:
- Auth middleware dengan Redis cache + DB fallback, proper error handling
- Sentinel errors + standardized error response format
- Event sourcing dengan `FOR UPDATE SKIP LOCKED` dalam transaksi (minor fix tersisa)
- Idempotency check dengan conflict detection
- Circuit breaker Open → Half-Open → Closed flow yang benar
- Per-entity rate limits dari DB dengan proper fallback chain
- User-scoped vendor isolation via `userVendors` map
- SSRF protection saat registrasi DAN saat delivery (double DNS)
- RabbitMQ exponential backoff dengan TTL per-message (1m, 2m, 5m)
- Callback URL dari DB, bukan hardcoded
- `ptms_users` terpisah dari `admins` table — conflict resolved
- SyncToRedisJob dengan retry + backoff
- docker-compose lengkap dengan semua services
- `vendor_penalties` unique constraint — UPSERT bekerja benar
- `processed_at` partial index untuk event processor efficiency
- `context.go` type-safe context key

### ⚠️ Yang masih perlu dilakukan sebelum production:
1. **R3-1** (Medium): Fix urutan `rows.Close()` vs `tx.Commit()` di event processor
2. **R3-2** (Medium): Tambah `QUEUE_CONNECTION=redis` ke docker-compose
3. **R3-3** (Minor): Fix duplikat member di Lua sliding window script
4. **Remaining mocks** yang perlu implementasi nyata:
   - `callVendorAPI()` — integrasi dengan vendor QRIS API yang sebenarnya
   - `validateSignature()` — HMAC verification per-vendor
   - `checkAutoDisable()` — auto-disable callback URL setelah 3 hari consecutive failures
   - `checkVendorStatus()` — actual vendor status check untuk reconciliation

### Yang masih TODO tapi di luar scope review ini:
- Dockerfile untuk Go dan Laravel (belum ada di zip)
- Unit tests dan integration tests
- Grafana dashboard wiring ke metrics yang sudah ada
