# PTMS / Routex — Code Review Final (Post-Integration)
**Date:** 2026-05-08
**Scope:** Full codebase setelah integrasi Lovable UI + vendor adapters

---

## Ringkasan Eksekutif

Integrasi Lovable UI dan vendor adapters sudah sangat baik. Arsitektur SPA (React) + Laravel backend API sudah terhubung dengan benar. Tiga vendor adapters (Qoinhub, Midtrans, Xendit) sudah terimplementasi lengkap. Namun ada **5 bug kritis** dan **8 masalah medium** yang perlu diselesaikan.

---

## 🔴 BUG KRITIS

---

### K-1: `VendorFactory.Create()` — decrypt credentials tapi hasilnya dibuang

**File:** `internal/factory/vendor_factory.go`

```go
func (f *vendorFactory) Create(vendorCode string, encryptedCredentials string) (providers.VendorAdapter, error) {
    _, err := crypto.Decrypt(encryptedCredentials)  // ← hasil decrypt dibuang!
    if err != nil {
        return nil, err
    }
    switch vendorCode {
    case "QOINHUB":
        return qoinhub_adapter.NewQoinhubAdapter(), nil
    // ...
    }
}
```

Decrypted credentials tidak di-pass ke adapter. Setiap adapter kemudian menerima `req.Credentials` yang masih dalam bentuk **encrypted** dari `callVendorAPI`, lalu mencoba `json.Unmarshal` encrypted string → gagal parsing → semua vendor call akan return error `invalid credentials`.

**Fix:**
```go
func (f *vendorFactory) Create(vendorCode string, encryptedCredentials string) (providers.VendorAdapter, string, error) {
    decrypted, err := crypto.Decrypt(encryptedCredentials)
    if err != nil {
        return nil, "", err
    }
    var adapter providers.VendorAdapter
    switch vendorCode {
    case "QOINHUB":
        adapter = qoinhub_adapter.NewQoinhubAdapter()
    case "MIDTRANS":
        adapter = midtrans_adapter.NewMidtransAdapter()
    case "XENDIT":
        adapter = xendit_adapter.NewXenditAdapter()
    default:
        return nil, "", ErrUnsupportedVendor
    }
    return adapter, decrypted, nil
}

// Di callVendorAPI:
adapter, decryptedCreds, err := s.vendorFactory.Create(vendorObj.Code, encrypted)
// ...
adapterReq := providers.GenerateQRISRequest{
    Credentials: decryptedCreds,  // ← gunakan yang sudah didekripsi
}
```

---

### K-2: `HandleVendorCallback` — `adapter.NormalizeCallback` dipanggil dengan credentials kosong

**File:** `internal/service/transaction_service.go` baris ~249

```go
adapter, _ := s.vendorFactory.Create(v.Code, "")  // ← credentials kosong!
if adapter == nil {
    return fmt.Errorf("failed to get adapter for callback")
}
normalized, err := adapter.NormalizeCallback(payload)
```

Dengan fix K-1, `Create("")` akan memanggil `crypto.Decrypt("")` yang pasti return error, sehingga adapter akan selalu `nil`. Semua vendor callback tidak akan bisa diproses.

**Fix:** Lookup vendor account untuk mendapat credentials sebelum memanggil factory, atau buat constructor factory terpisah untuk callback processing yang tidak butuh credentials:

```go
// Opsi bersih: tambahkan method ke factory untuk callback-only
func (f *vendorFactory) CreateForCallback(vendorCode string) (providers.VendorAdapter, error) {
    switch vendorCode {
    case "QOINHUB":
        return qoinhub_adapter.NewQoinhubAdapter(), nil
    case "MIDTRANS":
        return midtrans_adapter.NewMidtransAdapter(), nil
    case "XENDIT":
        return xendit_adapter.NewXenditAdapter(), nil
    default:
        return nil, ErrUnsupportedVendor
    }
}
```

`NormalizeCallback` dan `VerifyCallback` hanya butuh payload dan secret string — tidak butuh decrypt credentials dari DB, jadi tidak perlu factory penuh.

---

### K-3: `RegisterController` — mengirim hashed token ke email, bukan raw token

**File:** `app/Http/Controllers/Portal/RegisterController.php`

```php
$rawToken = Str::random(60);
$token = hash('sha256', $rawToken);      // ← hash disimpan di DB
EmailVerificationToken::create(['token' => $token, ...]);
SendVerificationEmailJob::dispatch($user, $token);  // ← hash dikirim ke email!
```

Yang seharusnya dikirim ke email adalah `$rawToken` (plain), yang disimpan di DB adalah hash-nya. Saat user klik link verifikasi, sistem akan meng-hash token dari URL dan compare dengan yang di DB.

Saat ini token yang dikirim ke email sudah dalam bentuk hash — artinya link verifikasi berisi hash SHA256, dan saat diverifikasi akan di-hash lagi (hash of hash) sehingga **tidak pernah cocok**. Tidak ada satu pun user yang bisa verifikasi email mereka.

**Fix:**
```php
$rawToken = Str::random(60);
$hashedToken = hash('sha256', $rawToken);

EmailVerificationToken::create(['token' => $hashedToken, ...]);
SendVerificationEmailJob::dispatch($user, $rawToken);  // kirim raw token

// Di EmailVerificationController::verify():
public function verify(string $token)
{
    $hashedToken = hash('sha256', $token);  // hash dulu sebelum lookup
    $verificationToken = EmailVerificationToken::where('token', $hashedToken)
        ->where('expires_at', '>', Carbon::now())
        ->whereNull('used_at')
        ->first();
    // ...
}
```

---

### K-4: `portal.blade.php` layout masih pakai Tailwind CDN dan branding lama "PTMS Portal"

**File:** `resources/views/layouts/portal.blade.php`

```html
<script src="https://cdn.tailwindcss.com"></script>  <!-- CDN, bukan compiled -->
<span class="text-xl font-bold text-indigo-600">PTMS Portal</span>  <!-- bukan Routex -->
```

Dan warnanya `indigo` bukan teal (`#00D4AA`). Layout ini dipakai oleh `pending-approval` page dan mungkin fallback pages. Ini inkonsisten dengan branding Routex dari Lovable.

**Fix:** Ganti dengan compiled CSS (sudah ada di `public/assets/`) dan update branding:
```html
<!-- Gunakan asset yang sudah di-build dari Lovable -->
<link rel="stylesheet" href="/assets/index-hra5q1hY.css">
<!-- Update branding -->
<span class="logo-text">Routex</span>
```

---

### K-5: `approved_by` FK constraint ke tabel `admins` — tabel ini tidak ada

**File:** `database/migrations/2026_05_05_074100_update_ptms_users_v2.php`

```php
$table->foreignId('approved_by')->nullable()->constrained('admins')->nullOnDelete();
```

`foreignId()` dengan `constrained('admins')` mencari tabel `admins`. Tapi dari codebase, Filament admin menggunakan tabel `users` (model `User`), bukan tabel `admins`. Migration ini akan **gagal** saat dijalankan karena foreign key constraint ke tabel yang tidak exist.

**Fix:**
```php
// Opsi 1: constraint ke tabel users (Filament admins)
$table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();

// Opsi 2: simpan sebagai uuid tanpa FK constraint (lebih fleksibel)
$table->uuid('approved_by')->nullable();
```

---

## 🟡 MASALAH MEDIUM

---

### M-1: Dashboard stats masih hardcoded — tidak membaca data real dari DB

**File:** `app/Http/Controllers/Portal/DashboardController.php`

```php
$stats = [
    'total_transactions' => '12,847',  // ← hardcoded
    'success_rate' => '99.2%',
    'total_volume' => 'Rp 4.8M',
    'avg_response_time' => '847ms',
];
```

Sama untuk vendor performance, vendor health, dan recent transactions — semua mock data. User akan selalu melihat data yang sama regardless aktivitas mereka.

**Fix — Query dari DB:**
```php
$user = Auth::guard('portal')->user();

// Ambil user_id untuk filter
$txQuery = Transaction::whereIn('account_id', 
    UserAccountAssignment::where('user_id', $user->id)->pluck('account_id')
);

$total = $txQuery->count();
$paid = $txQuery->clone()->where('status', 'paid')->count();
$successRate = $total > 0 ? round(($paid / $total) * 100, 1) . '%' : '0%';
$volume = $txQuery->clone()->where('status', 'paid')->sum('amount');

$stats = [
    'total_transactions' => number_format($total),
    'success_rate' => $successRate,
    'total_volume' => 'Rp ' . $this->formatVolume($volume),
];
```

---

### M-2: `VendorCredentialController` — tidak ada check `vendor_id` di `user_account_assignments`

**File:** `app/Http/Controllers/Portal/VendorCredentialController.php`

```php
$existingAssignment = DB::table('user_account_assignments')
    ->where('user_id', $user->id)
    ->where('vendor_id', $vendor->id)  // ← kolom ini tidak ada di tabel!
    ->first();
```

Tabel `user_account_assignments` hanya punya: `id, user_id, account_id, created_at, updated_at`. Tidak ada kolom `vendor_id`. Query ini akan throw SQL error.

**Fix — Join dengan vendor_accounts untuk dapatkan vendor_id:**
```php
$existingAssignment = DB::table('user_account_assignments as uaa')
    ->join('vendor_accounts as va', 'uaa.account_id', '=', 'va.id')
    ->where('uaa.user_id', $user->id)
    ->where('va.vendor_id', $vendor->id)
    ->select('uaa.*', 'uaa.account_id')
    ->first();
```

---

### M-3: `SendVerificationEmailJob` tidak bisa reconstruct URL verifikasi

**File:** `app/Jobs/SendVerificationEmailJob.php` + `app/Mail/VerificationEmail.php`

Job menerima `$token` tapi tidak menerima base URL. Email template perlu generate link seperti:
`https://app.routex.id/portal/verify-email/{token}`

Jika `APP_URL` di `.env` masih `http://localhost`, link di email akan salah di production.

**Fix:** Pastikan `APP_URL` di-set benar di `.env.production`, dan gunakan `route()` helper:
```php
// Di VerificationEmail.php:
public string $verificationUrl;

public function __construct(PtmsUser $user, string $token) {
    $this->verificationUrl = url('/portal/verify-email/' . $token);
    // Lebih baik: config('app.url') . '/portal/verify-email/' . $token
}
```

---

### M-4: `QUEUE_CONNECTION=database` di `.env` tapi tidak ada tabel `jobs`

**File:** `.env`

```
QUEUE_CONNECTION=database
```

`.env` sudah set `database` queue, dan ada migration `0001_01_01_000002_create_jobs_table.php`. Tapi `docker-compose.yml` tidak set `QUEUE_CONNECTION` di environment service — jika dioverride di compose, akan fallback ke `sync` dan semua email job tidak akan masuk queue.

**Fix — Verify di docker-compose.yml:**
```yaml
admin:
  environment:
    QUEUE_CONNECTION: database  # explicit, tidak rely on .env

admin-queue:
  environment:
    QUEUE_CONNECTION: database
```

---

### M-5: `Midtrans.VerifyCallback` — `secret` parameter adalah `server_key` tapi tidak didapat dari context

**File:** `internal/providers/midtrans/client.go`

```go
func (a *midtransAdapter) VerifyCallback(..., secret string) bool {
    // secret dipakai sebagai server_key untuk signing
    sha.Write([]byte(orderID + statusCode + grossAmount + secret))
}
```

Di `HandleVendorCallback` di `transaction_service.go`, `secret` diambil dari `GetAccountCredentials` lalu di-pass raw sebagai string. Tapi Midtrans `secret` untuk callback verification adalah `server_key`, bukan seluruh credentials JSON. Perlu extract dulu:

```go
// Di transaction_service.go sebelum VerifyCallback:
var midtransCreds struct { ServerKey string `json:"server_key"` }
json.Unmarshal([]byte(credsStr), &midtransCreds)
secret = midtransCreds.ServerKey
```

---

### M-6: React SPA — tidak ada CSRF protection untuk POST requests

**File:** `routes/web.php` + frontend JS

Endpoint `POST /portal/register`, `POST /portal/login`, `POST /portal/logout` diproteksi CSRF oleh Laravel secara default. Tapi React SPA tidak otomatis mengirim CSRF token.

**Fix — Dua opsi:**

Opsi 1: Exclude portal API routes dari CSRF (gunakan API guard):
```php
// bootstrap/app.php:
->withMiddleware(function (Middleware $middleware) {
    $middleware->validateCsrfTokens(except: [
        'portal/register',
        'portal/login',
        'portal/logout',
        'portal/vendors/*',
    ]);
})
```

Opsi 2: Fetch CSRF token dari `/sanctum/csrf-cookie` sebelum POST (lebih secure):
```javascript
// Di React, sebelum login/register POST:
await fetch('/sanctum/csrf-cookie', { credentials: 'include' });
// Kemudian POST dengan X-XSRF-TOKEN header dari cookie
```

---

### M-7: `portal-layout.blade.php` — logout pakai `GET /portal/logout` tapi route hanya accept `POST`

**File:** `resources/views/layouts/portal.blade.php`

```html
<a href="/portal/logout">Logout</a>  <!-- GET request -->
```

Tapi di `routes/web.php`:
```php
Route::post('/portal/logout', [PortalLoginController::class, 'destroy']);  // POST only
```

Klik logout akan return 405 Method Not Allowed.

**Fix:**
```html
<form method="POST" action="/portal/logout">
    @csrf
    <button type="submit">Logout</button>
</form>
```

---

### M-8: `.env` production values belum dikonfigurasi

Beberapa nilai di `.env` masih default yang tidak aman untuk production:

```env
APP_DEBUG=true          # harus false di production
APP_URL=http://localhost # harus https://app.routex.id
MAIL_FROM_ADDRESS="hello@example.com"  # harus email routex nyata
SESSION_DOMAIN=null     # harus .routex.id untuk cross-subdomain
```

Ini bukan bug yang crash app, tapi harus difix sebelum deploy ke production.

---

## ✅ Yang Sudah Bagus

- Arsitektur SPA React + Laravel API sudah terhubung dengan benar — `homepage.html` di-serve untuk semua routes, backend handle auth via JSON responses
- Tiga vendor adapters (Qoinhub, Midtrans, Xendit) sudah diimplementasi dengan benar — HMAC signing Qoinhub, Basic Auth Midtrans/Xendit, callback normalization masing-masing
- `EncryptedCredentials` cast sudah ada dan dipakai di `VendorAccount` model
- Filament approval workflow lengkap — approve/reject dengan notes, dispatch notification jobs
- `fix_sessions_user_id_type.php` migration untuk fix UUID sessions sudah ada — ini solve masalah yang sering muncul di portal login
- `vendor_credentials.php` config file sudah benar dengan semua fields per vendor
- `VendorValidationService` sudah implementasi lightweight validation call ke masing-masing vendor
- `SyncsToRedis` trait masih terhubung dengan benar ke Go API via Redis pub/sub

---

## Prioritas Fix

**Harus fix sebelum bisa test apapun:**
1. K-5 — FK constraint `admins` table → ganti ke `users`
2. K-3 — Token verification flow (raw vs hashed) — tidak ada user bisa verify email
3. K-2 — `CreateForCallback` method agar callback processing tidak crash

**Harus fix sebelum vendor integration bisa berjalan:**
4. K-1 — Decrypted credentials dibuang di factory — semua vendor call gagal
5. M-2 — `vendor_id` column tidak ada di `user_account_assignments`

**Harus fix sebelum UI bisa dipakai user nyata:**
6. K-4 — Branding `PTMS Portal` di portal layout
7. M-6 — CSRF protection untuk React SPA POST requests
8. M-7 — Logout GET vs POST mismatch
9. M-1 — Dashboard data real dari DB
