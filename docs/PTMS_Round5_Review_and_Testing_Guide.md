# PTMS Code Review Round 5 + Testing Guide
**Date:** 2026-05-02

---

## ✅ Status Fix Round 4 — Semua LGTM

| ID | Masalah | Status | Verifikasi |
|---|---|---|---|
| F4-1 | Hardcoded rate limit di `GetEligibleVendors` | ✅ Fixed | Dihapus bersih, comment menjelaskan reasoning |
| F4-2 | `GetSet` deprecated | ✅ Fixed | Pipeline `Get + Set` atomic, handle empty oldState → default Closed |
| F4-3 | Status selalu `StatusPaid` | ✅ Fixed | `tx.Status = domain.TransactionStatus(normalized.Status)` |
| F4-4 | `TrackInFlight` tidak dipanggil | ✅ Fixed | `+1` sebelum call, `-1` setelah, pakai `context.WithoutCancel` agar cleanup tetap jalan saat ctx cancelled |
| — | Dockerfile Go & Laravel | ✅ Baru | Keduanya sudah ada, multi-stage build untuk Go |

**Tidak ada issues baru yang ditemukan. Codebase ini CLEAN.**

---

## Satu Catatan Minor di Dockerfile Laravel

**File:** `services/admin/Dockerfile`
```dockerfile
FROM php:8.3-fpm-alpine
# ...
COPY . .
# Note: composer install would typically happen here
CMD ["php", "artisan", "serve", ...]
```

`composer install` masih di-comment. Container akan gagal start karena tidak ada `vendor/` folder. Fix sebelum `docker compose up`:

```dockerfile
FROM php:8.3-fpm-alpine
WORKDIR /var/www/html
RUN apk add --no-cache libpq-dev curl unzip
RUN docker-php-ext-install pdo_pgsql
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer
COPY composer.json composer.lock ./
RUN composer install --no-dev --optimize-autoloader --no-scripts
COPY . .
RUN php artisan storage:link 2>/dev/null || true
EXPOSE 9000
CMD ["php", "artisan", "serve", "--host=0.0.0.0", "--port=9000"]
```

---

# Testing Guide Lengkap

## Prasyarat

```bash
# Yang harus sudah terinstall:
docker --version        # >= 24.x
docker compose version  # >= 2.x
curl --version
```

---

## BAGIAN 1 — Setup & Jalankan Semua Service

### Step 1.1 — Fix Dockerfile Laravel dulu

Edit `services/admin/Dockerfile`, ganti isinya dengan yang ada di atas (tambahkan composer install).

### Step 1.2 — Tambah SSL cert self-signed untuk NGINX

NGINX butuh cert file. Buat dulu:

```bash
mkdir -p infra/docker/nginx/certs

openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout infra/docker/nginx/certs/ptms.key \
  -out infra/docker/nginx/certs/ptms.crt \
  -subj "/CN=ptms.local"
```

Update `docker-compose.yml` — mount cert ke NGINX:
```yaml
nginx:
  volumes:
    - ./nginx/conf.d:/etc/nginx/conf.d:ro
    - ./nginx/certs:/etc/nginx/certs:ro   # ← tambah ini
    - ./nginx/logs:/var/log/nginx
```

### Step 1.3 — Perbaiki upstream name di nginx.conf

Di `nginx/conf.d/default.conf`, upstream admin bernama `admin-service` tapi service di compose bernama `admin`. Ganti:

```nginx
# Dari:
upstream admin_service {
    server admin-service:9000;
}
# Jadi:
upstream admin_service {
    server admin:9000;
}
```

### Step 1.4 — Build dan jalankan

```bash
cd infra/docker

# Build semua image
docker compose build

# Jalankan semua service
docker compose up -d

# Cek semua service running
docker compose ps
```

Expected output:
```
NAME                  STATUS
ptms-postgres         running (healthy)
ptms-redis            running (healthy)
ptms-rabbitmq         running (healthy)
ptms-transaction-api  running
ptms-admin            running
ptms-admin-queue      running
ptms-nginx            running
```

### Step 1.5 — Jalankan Laravel migrations

```bash
docker compose exec admin php artisan migrate --force
```

### Step 1.6 — Buat admin user untuk Filament

```bash
docker compose exec admin php artisan make:filament-user
# Masukkan: name, email, password
```

### Step 1.7 — Verifikasi semua service up

```bash
# Go API health
curl http://localhost/health
# Expected: {"status":"ok"}

# RabbitMQ Management UI
# Buka browser: http://localhost:15672
# Login: guest / guest

# Prometheus metrics
curl http://localhost/metrics | head -20
```

---

## BAGIAN 2 — Seed Data via Laravel Admin (Filament)

Buka browser: **https://localhost/admin**
(Accept self-signed cert warning)

Login dengan credentials yang dibuat di Step 1.6.

### Step 2.1 — Buat Vendor

Menu: **Vendors → Create**

| Field | Value |
|---|---|
| Code | `VENDOR_A` |
| Name | `Vendor A Test` |
| Is Active | ✅ |

Klik Save. Catat **Vendor ID** dari URL atau tabel.

### Step 2.2 — Buat Vendor Account

Menu: **Vendor Accounts → Create**

| Field | Value |
|---|---|
| Vendor | Vendor A Test |
| Account Name | `Account A-1` |
| Is Active | ✅ |
| Credentials | `{"key": "test-key-123"}` |

Klik Save. Catat **Account ID**.

### Step 2.3 — Buat PTMS User (API Consumer)

Menu: **Ptms Users → Create**

| Field | Value |
|---|---|
| Name | `Test User` |
| API Key | `test-api-key-abc123` |
| Is Active | ✅ |
| Callback URL | `https://webhook.site/YOUR-ID` (buat di webhook.site) |
| Callback Enabled | ✅ |

Klik Save. Catat **User ID**.

### Step 2.4 — Assign Account ke User

Menu: **User Account Assignments → Create**

| Field | Value |
|---|---|
| User | Test User |
| Vendor | Vendor A Test |
| Account | Account A-1 |

Klik Save.

### Step 2.5 — (Opsional) Set Rate Limits

Jika ada Rate Limit Config di admin, tambahkan:
- Entity Type: `user`, Entity ID: `{user-id}`, Limit Type: `tps`, Value: `100`
- Entity Type: `vendor`, Entity ID: `{vendor-id}`, Limit Type: `tps`, Value: `500`

---

## BAGIAN 3 — Test Go Transaction API

> Ganti `YOUR-API-KEY` dengan API key yang dibuat di Step 2.3

### Test 3.1 — Generate QRIS (Happy Path)

```bash
curl -X POST https://localhost/api/v1/transactions \
  -H "Content-Type: application/json" \
  -H "X-API-Key: test-api-key-abc123" \
  -H "X-Idempotency-Key: test-idem-001" \
  -k \
  -d '{
    "amount": 50000,
    "currency": "IDR",
    "payment_channel": "qris"
  }'
```

**Expected Response (200):**
```json
{
  "id": "...",
  "transaction_id": "...",
  "status": "pending_payment",
  "qris_code": "00020101021226660014ID.LINKAJA...",
  "amount": 50000,
  "currency": "IDR",
  "payment_channel": "qris"
}
```

Catat `transaction_id` untuk test berikutnya.

### Test 3.2 — Get Transaction Status

```bash
curl https://localhost/api/v1/transactions/{transaction_id} \
  -H "X-API-Key: test-api-key-abc123" \
  -k
```

**Expected Response (200):**
```json
{
  "transaction_id": "...",
  "status": "pending_payment",
  "amount": 50000,
  "qris_code": "00020101...",
  "callback_delivered": false
}
```

### Test 3.3 — Idempotency Replay (sama key + sama body)

```bash
# Kirim request yang identik dengan Test 3.1
curl -X POST https://localhost/api/v1/transactions \
  -H "Content-Type: application/json" \
  -H "X-API-Key: test-api-key-abc123" \
  -H "X-Idempotency-Key: test-idem-001" \
  -k \
  -d '{
    "amount": 50000,
    "currency": "IDR",
    "payment_channel": "qris"
  }'
```

**Expected:** Response identik dengan Test 3.1 (cached, bukan transaksi baru)

### Test 3.4 — Idempotency Conflict (sama key + beda body)

```bash
curl -X POST https://localhost/api/v1/transactions \
  -H "Content-Type: application/json" \
  -H "X-API-Key: test-api-key-abc123" \
  -H "X-Idempotency-Key: test-idem-001" \
  -k \
  -d '{
    "amount": 999999,
    "currency": "IDR",
    "payment_channel": "qris"
  }'
```

**Expected Response (409/400):**
```json
{
  "error": {
    "code": "IDEMPOTENCY_CONFLICT",
    "message": "..."
  }
}
```

### Test 3.5 — Invalid Currency

```bash
curl -X POST https://localhost/api/v1/transactions \
  -H "Content-Type: application/json" \
  -H "X-API-Key: test-api-key-abc123" \
  -H "X-Idempotency-Key: test-idem-002" \
  -k \
  -d '{
    "amount": 50000,
    "currency": "USD",
    "payment_channel": "qris"
  }'
```

**Expected Response (400):**
```json
{
  "error": {
    "code": "INVALID_CURRENCY",
    "message": "..."
  }
}
```

### Test 3.6 — Missing / Invalid API Key

```bash
# Tanpa API key
curl -X POST https://localhost/api/v1/transactions \
  -H "Content-Type: application/json" \
  -H "X-Idempotency-Key: test-idem-003" \
  -k \
  -d '{"amount": 50000, "currency": "IDR", "payment_channel": "qris"}'
```

**Expected Response (401):**
```json
{
  "error": {
    "code": "MISSING_API_KEY",
    "message": "API key required"
  }
}
```

### Test 3.7 — Simulasi Vendor Callback (Payment Selesai)

```bash
# Simulasi callback dari vendor ke PTMS
curl -X POST https://localhost/api/v1/callbacks/VENDOR_A \
  -H "Content-Type: application/json" \
  -H "X-API-Key: test-api-key-abc123" \
  -H "X-Vendor-Signature: mock-signature" \
  -k \
  -d '{
    "reference_id": "{transaction_id_dari_test_3.1}",
    "vendor_tx_id": "vendor-abc-999",
    "status": "paid",
    "amount": 50000
  }'
```

**Expected Response (200)**

Lalu cek status — harus berubah jadi `paid`:

```bash
curl https://localhost/api/v1/transactions/{transaction_id} \
  -H "X-API-Key: test-api-key-abc123" \
  -k
```

**Expected:** `"status": "paid"`

Cek juga di webhook.site bahwa callback sudah diterima dari PTMS.

### Test 3.8 — Vendor Health / Circuit Breaker State

```bash
curl https://localhost/api/v1/vendors/{vendor_id}/health \
  -H "X-API-Key: test-api-key-abc123" \
  -k
```

**Expected:**
```json
{
  "vendor_id": "...",
  "circuit_state": "closed",
  "allowed": true
}
```

### Test 3.9 — No Eligible Vendor (user tanpa assignment)

Buat user baru tanpa assignment apapun, lalu coba generate QRIS:

```bash
curl -X POST https://localhost/api/v1/transactions \
  -H "Content-Type: application/json" \
  -H "X-API-Key: NEW-USER-KEY-NO-VENDOR" \
  -H "X-Idempotency-Key: test-idem-004" \
  -k \
  -d '{"amount": 50000, "currency": "IDR", "payment_channel": "qris"}'
```

**Expected Response (503):**
```json
{
  "error": {
    "code": "NO_ELIGIBLE_VENDOR",
    "message": "..."
  }
}
```

---

## BAGIAN 4 — Test Observability

### Step 4.1 — Cek Prometheus Metrics

```bash
curl http://localhost/metrics | grep ptms_
```

**Expected metrics:**
```
ptms_qris_generation_total{vendor_id="...",status="success"} 1
ptms_qris_generation_duration_seconds_bucket{...}
ptms_rate_limit_rejections_total{...} 0
```

### Step 4.2 — Monitor Logs Real-time

```bash
# Go API logs
docker compose logs -f transaction-api

# Laravel admin logs
docker compose logs -f admin

# Queue worker logs
docker compose logs -f admin-queue
```

### Step 4.3 — Cek Redis State

```bash
docker compose exec redis redis-cli

# Cek API key cache
KEYS apikey:*

# Cek idempotency keys
KEYS idem:*

# Cek rate limit counters
KEYS rl:*

# Cek circuit breaker state
KEYS cb:*
```

### Step 4.4 — Cek RabbitMQ Queues

Buka: http://localhost:15672 → Queues

Pastikan ada queue:
- `ptms.callbacks` — queue utama
- `ptms.callbacks.retry` — retry dengan TTL
- `ptms.callbacks.dlq` — dead letter queue

### Step 4.5 — Cek PostgreSQL Events

```bash
docker compose exec postgres psql -U ptms_user -d ptms_db

-- Lihat transaksi
SELECT transaction_id, status, amount, created_at FROM transactions ORDER BY created_at DESC LIMIT 5;

-- Lihat event log
SELECT transaction_id, event_type, created_at FROM transaction_events ORDER BY created_at DESC LIMIT 10;

-- Lihat penalty scores
SELECT vendor_id, account_id, penalty_points, last_updated_at,
       GREATEST(0, penalty_points - EXTRACT(EPOCH FROM (NOW() - last_updated_at))/60)::INT as effective_penalty
FROM vendor_penalties;
```

---

## BAGIAN 5 — Test Config Hot-Reload

### Step 5.1 — Disable vendor via Admin, verify Go reload

1. Buka Filament, disable Vendor A
2. Cek log Go API:
   ```bash
   docker compose logs -f transaction-api | grep "hot-reload\|config"
   ```
3. Coba generate QRIS → harus dapat `NO_ELIGIBLE_VENDOR`

### Step 5.2 — Enable vendor kembali

1. Enable Vendor A di Filament
2. Coba generate QRIS → harus sukses kembali

---

## BAGIAN 6 — Troubleshooting Umum

| Gejala | Kemungkinan penyebab | Fix |
|---|---|---|
| `docker compose up` error pada `admin` | `composer install` belum ada di Dockerfile | Fix Dockerfile Laravel (lihat Step 1.1) |
| NGINX 502 pada `/api/v1/` | `transaction-api` belum ready | `docker compose logs transaction-api` |
| NGINX 502 pada `/admin` | Upstream name salah (`admin-service` vs `admin`) | Fix nginx.conf (lihat Step 1.3) |
| SSL error di curl | Self-signed cert | Tambahkan flag `-k` ke semua curl command |
| `NO_ELIGIBLE_VENDOR` padahal sudah assign | Registry belum reload | Restart `transaction-api` atau trigger config update via Filament |
| Callback tidak sampai ke webhook.site | DLQ atau SSRF block | Cek `docker compose logs admin-queue` dan pastikan webhook.site HTTPS |
| `php artisan migrate` error | DB belum siap | Tunggu postgres healthy: `docker compose ps` |

---

## Ringkasan Test Checklist

- [ ] Semua 7 service running (`docker compose ps`)
- [ ] Laravel migration sukses
- [ ] Filament admin bisa diakses di https://localhost/admin
- [ ] Test 3.1 Generate QRIS berhasil
- [ ] Test 3.2 Get Status berhasil
- [ ] Test 3.3 Idempotency replay → response sama
- [ ] Test 3.4 Idempotency conflict → error IDEMPOTENCY_CONFLICT
- [ ] Test 3.5 Invalid currency → error INVALID_CURRENCY
- [ ] Test 3.6 Missing API key → error MISSING_API_KEY
- [ ] Test 3.7 Callback → status berubah jadi `paid`
- [ ] Test 3.8 Vendor health endpoint berhasil
- [ ] Test 3.9 No vendor → error NO_ELIGIBLE_VENDOR
- [ ] Prometheus metrics terisi
- [ ] Redis keys terbentuk dengan benar
- [ ] RabbitMQ queues ada
- [ ] Hot-reload config berfungsi
