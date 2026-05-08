# Integrasi QRIS Xendit dengan Golang (Test Mode)

Panduan lengkap step-by-step integrasi pembayaran **QRIS** menggunakan **Xendit Payment Gateway** dengan **Golang**, lengkap dengan testing di test mode.

---

## Daftar Isi
1. [Persiapan Akun & API Key](#step-1-persiapan-akun--api-key)
2. [Setup Project Golang](#step-2-setup-project-golang)
3. [Setup Webhook & Callback URL](#step-3-setup-webhook--callback-url)
4. [Membuat QR Code (Create QRIS)](#step-4-membuat-qr-code-create-qris)
5. [Menampilkan QR Code di Frontend](#step-5-menampilkan-qr-code-di-frontend)
6. [Handle Webhook Callback](#step-6-handle-webhook-callback)
7. [Simulasi Pembayaran di Test Mode](#step-7-simulasi-pembayaran-di-test-mode)
8. [Cek Status Pembayaran (Polling)](#step-8-cek-status-pembayaran-polling)
9. [Testing End-to-End](#step-9-testing-end-to-end)
10. [Go Live Checklist](#step-10-go-live-checklist)

---

## Step 1: Persiapan Akun & API Key

### 1.1 Daftar Akun Xendit
- Buka https://dashboard.xendit.co/register
- Daftar gratis (testing QRIS **tidak perlu** akun teraktivasi/KYC)

### 1.2 Generate Secret Key (Test Mode)
1. Login ke dashboard
2. Pastikan toggle di kanan atas pada mode **Test Mode**
3. Buka **Settings → Developers → API Keys**
4. Klik **Generate Secret Key**
5. Beri nama key (mis. `qris-dev`)
6. Set permission:
   - **Money-In: WRITE** (wajib untuk create QR)
   - **Money-In: READ** (untuk cek status)
7. **Copy & simpan** secret key — formatnya: `xnd_development_xxxxxxxxxxxx`

> ⚠️ Secret key hanya muncul sekali. Simpan di tempat aman (password manager / `.env`).

### 1.3 Catat Webhook Verification Token
- Buka **Settings → Developers → Webhooks**
- Catat **Verification Token** untuk validasi callback nanti

---

## Step 2: Setup Project Golang

### 2.1 Inisialisasi Project

```bash
mkdir xendit-qris-demo
cd xendit-qris-demo
go mod init github.com/yourname/xendit-qris-demo
```

### 2.2 Install Dependencies

Kita pakai pendekatan **HTTP client native** supaya jelas mekanismenya. Untuk routing pakai `chi` (atau `gin`/`echo` sesuai preferensi):

```bash
go get github.com/go-chi/chi/v5
go get github.com/joho/godotenv
```

> Alternatif: kalau mau pakai SDK resmi: `go get github.com/xendit/xendit-go/v6`

### 2.3 Struktur Folder

```
xendit-qris-demo/
├── .env
├── .gitignore
├── go.mod
├── go.sum
├── main.go
├── handlers/
│   ├── qris.go
│   └── webhook.go
├── services/
│   └── xendit.go
└── models/
    └── qris.go
```

### 2.4 File `.env`

```env
XENDIT_SECRET_KEY=xnd_development_xxxxxxxxxxxx
XENDIT_CALLBACK_TOKEN=your_webhook_verification_token
XENDIT_BASE_URL=https://api.xendit.co
PORT=3000
```

### 2.5 File `.gitignore`

```
.env
*.log
tmp/
```

---

## Step 3: Setup Webhook & Callback URL

Saat pembayaran sukses, Xendit akan POST ke endpoint Anda. Saat development, expose `localhost` ke internet pakai **ngrok**.

### 3.1 Install & Run ngrok

```bash
# Install (Mac)
brew install ngrok

# Atau download dari https://ngrok.com/download

# Jalankan tunnel
ngrok http 3000
```

ngrok akan kasih URL seperti: `https://abc123.ngrok-free.app`

### 3.2 Daftarkan Callback URL di Xendit Dashboard

1. Buka **Settings → Developers → Webhooks**
2. Cari section **QR Code**
3. Set **QR Code Paid URL**: `https://abc123.ngrok-free.app/webhook/xendit/qris-paid`
4. Klik **Test and save** — server lokal Anda harus return **HTTP 2XX**

> Pastikan server Go Anda sudah jalan sebelum klik "Test and save", atau Xendit akan dapat error.

---

## Step 4: Membuat QR Code (Create QRIS)

### 4.1 Model — `models/qris.go`

```go
package models

import "time"

// CreateQRISRequest payload yang kita kirim ke Xendit
type CreateQRISRequest struct {
    ReferenceID string    `json:"reference_id"`
    Type        string    `json:"type"`     // "DYNAMIC" atau "STATIC"
    Currency    string    `json:"currency"` // "IDR"
    Amount      int64     `json:"amount"`
    ExpiresAt   time.Time `json:"expires_at,omitempty"`
}

// CreateQRISResponse respons dari Xendit
type CreateQRISResponse struct {
    ID          string    `json:"id"`
    ReferenceID string    `json:"reference_id"`
    Type        string    `json:"type"`
    Currency    string    `json:"currency"`
    Amount      int64     `json:"amount"`
    QRString    string    `json:"qr_string"`
    Status      string    `json:"status"`
    ExpiresAt   time.Time `json:"expires_at"`
    Created     time.Time `json:"created"`
    Updated     time.Time `json:"updated"`
}

// XenditError respons error dari Xendit
type XenditError struct {
    ErrorCode string `json:"error_code"`
    Message   string `json:"message"`
}
```

### 4.2 Service — `services/xendit.go`

```go
package services

import (
    "bytes"
    "encoding/base64"
    "encoding/json"
    "fmt"
    "io"
    "net/http"
    "time"

    "github.com/yourname/xendit-qris-demo/models"
)

type XenditService struct {
    SecretKey string
    BaseURL   string
    Client    *http.Client
}

func NewXenditService(secretKey, baseURL string) *XenditService {
    return &XenditService{
        SecretKey: secretKey,
        BaseURL:   baseURL,
        Client: &http.Client{
            Timeout: 30 * time.Second,
        },
    }
}

// authHeader build Basic Auth: secretKey:<empty> di-encode base64
func (s *XenditService) authHeader() string {
    auth := s.SecretKey + ":"
    return "Basic " + base64.StdEncoding.EncodeToString([]byte(auth))
}

// CreateQRIS membuat QR Code dinamis di Xendit
func (s *XenditService) CreateQRIS(req models.CreateQRISRequest) (*models.CreateQRISResponse, error) {
    body, err := json.Marshal(req)
    if err != nil {
        return nil, fmt.Errorf("marshal request: %w", err)
    }

    url := s.BaseURL + "/qr_codes"
    httpReq, err := http.NewRequest("POST", url, bytes.NewBuffer(body))
    if err != nil {
        return nil, fmt.Errorf("create request: %w", err)
    }

    httpReq.Header.Set("Authorization", s.authHeader())
    httpReq.Header.Set("Content-Type", "application/json")
    httpReq.Header.Set("api-version", "2022-07-31")

    resp, err := s.Client.Do(httpReq)
    if err != nil {
        return nil, fmt.Errorf("do request: %w", err)
    }
    defer resp.Body.Close()

    respBody, err := io.ReadAll(resp.Body)
    if err != nil {
        return nil, fmt.Errorf("read response: %w", err)
    }

    // Cek status code
    if resp.StatusCode >= 400 {
        var xerr models.XenditError
        if err := json.Unmarshal(respBody, &xerr); err == nil {
            return nil, fmt.Errorf("xendit error [%s]: %s", xerr.ErrorCode, xerr.Message)
        }
        return nil, fmt.Errorf("xendit returned status %d: %s", resp.StatusCode, string(respBody))
    }

    var result models.CreateQRISResponse
    if err := json.Unmarshal(respBody, &result); err != nil {
        return nil, fmt.Errorf("unmarshal response: %w", err)
    }

    return &result, nil
}

// GetQRIS cek detail/status QR Code
func (s *XenditService) GetQRIS(qrID string) (*models.CreateQRISResponse, error) {
    url := fmt.Sprintf("%s/qr_codes/%s", s.BaseURL, qrID)
    httpReq, err := http.NewRequest("GET", url, nil)
    if err != nil {
        return nil, err
    }
    httpReq.Header.Set("Authorization", s.authHeader())

    resp, err := s.Client.Do(httpReq)
    if err != nil {
        return nil, err
    }
    defer resp.Body.Close()

    respBody, _ := io.ReadAll(resp.Body)

    if resp.StatusCode >= 400 {
        return nil, fmt.Errorf("xendit returned %d: %s", resp.StatusCode, string(respBody))
    }

    var result models.CreateQRISResponse
    if err := json.Unmarshal(respBody, &result); err != nil {
        return nil, err
    }
    return &result, nil
}

// SimulatePayment hanya untuk test mode — simulasi user bayar
func (s *XenditService) SimulatePayment(qrID string, amount int64) ([]byte, error) {
    url := fmt.Sprintf("%s/qr_codes/%s/payments/simulate", s.BaseURL, qrID)

    payload := map[string]int64{"amount": amount}
    body, _ := json.Marshal(payload)

    httpReq, err := http.NewRequest("POST", url, bytes.NewBuffer(body))
    if err != nil {
        return nil, err
    }
    httpReq.Header.Set("Authorization", s.authHeader())
    httpReq.Header.Set("Content-Type", "application/json")

    resp, err := s.Client.Do(httpReq)
    if err != nil {
        return nil, err
    }
    defer resp.Body.Close()

    return io.ReadAll(resp.Body)
}
```

### 4.3 Handler — `handlers/qris.go`

```go
package handlers

import (
    "encoding/json"
    "fmt"
    "net/http"
    "time"

    "github.com/yourname/xendit-qris-demo/models"
    "github.com/yourname/xendit-qris-demo/services"
)

type QRISHandler struct {
    Xendit *services.XenditService
}

func NewQRISHandler(x *services.XenditService) *QRISHandler {
    return &QRISHandler{Xendit: x}
}

type CreateQRISBody struct {
    OrderID string `json:"order_id"`
    Amount  int64  `json:"amount"`
}

func (h *QRISHandler) Create(w http.ResponseWriter, r *http.Request) {
    var body CreateQRISBody
    if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
        http.Error(w, "invalid body", http.StatusBadRequest)
        return
    }

    // Validasi minimal
    if body.OrderID == "" || body.Amount < 1 {
        http.Error(w, "order_id and amount required", http.StatusBadRequest)
        return
    }

    req := models.CreateQRISRequest{
        ReferenceID: body.OrderID,
        Type:        "DYNAMIC",
        Currency:    "IDR",
        Amount:      body.Amount,
        ExpiresAt:   time.Now().Add(30 * time.Minute), // expire 30 menit
    }

    resp, err := h.Xendit.CreateQRIS(req)
    if err != nil {
        http.Error(w, fmt.Sprintf("failed to create QRIS: %v", err), http.StatusInternalServerError)
        return
    }

    // TODO: simpan ke DB — order_id, qr_id, amount, status PENDING

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(resp)
}

func (h *QRISHandler) GetStatus(w http.ResponseWriter, r *http.Request) {
    qrID := r.URL.Query().Get("qr_id")
    if qrID == "" {
        http.Error(w, "qr_id required", http.StatusBadRequest)
        return
    }

    resp, err := h.Xendit.GetQRIS(qrID)
    if err != nil {
        http.Error(w, err.Error(), http.StatusInternalServerError)
        return
    }

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(resp)
}

// Endpoint khusus untuk simulasi pembayaran (HANYA test mode!)
func (h *QRISHandler) SimulatePayment(w http.ResponseWriter, r *http.Request) {
    var body struct {
        QRID   string `json:"qr_id"`
        Amount int64  `json:"amount"`
    }
    json.NewDecoder(r.Body).Decode(&body)

    result, err := h.Xendit.SimulatePayment(body.QRID, body.Amount)
    if err != nil {
        http.Error(w, err.Error(), http.StatusInternalServerError)
        return
    }

    w.Header().Set("Content-Type", "application/json")
    w.Write(result)
}
```

---

## Step 5: Menampilkan QR Code di Frontend

`qr_string` dari Xendit adalah **payload teks QRIS** yang harus di-encode jadi gambar QR. Ada 2 opsi:

### 5.1 Opsi A — Generate gambar QR di backend Go

Install library:
```bash
go get github.com/skip2/go-qrcode
```

Tambahkan handler:

```go
package handlers

import (
    "net/http"

    "github.com/skip2/go-qrcode"
)

func (h *QRISHandler) RenderQRImage(w http.ResponseWriter, r *http.Request) {
    qrString := r.URL.Query().Get("qr_string")
    if qrString == "" {
        http.Error(w, "qr_string required", http.StatusBadRequest)
        return
    }

    png, err := qrcode.Encode(qrString, qrcode.Medium, 256)
    if err != nil {
        http.Error(w, err.Error(), http.StatusInternalServerError)
        return
    }

    w.Header().Set("Content-Type", "image/png")
    w.Write(png)
}
```

Frontend tinggal pakai `<img src="/qris/image?qr_string=...">`.

### 5.2 Opsi B — Generate di frontend

Pakai library JavaScript seperti `qrcode.js`:

```html
<canvas id="qris-canvas"></canvas>
<script src="https://cdn.jsdelivr.net/npm/qrcode@1.5.3/build/qrcode.min.js"></script>
<script>
  const qrString = "00020101021226570011ID.DANA.WWW..."; // dari API
  QRCode.toCanvas(document.getElementById('qris-canvas'), qrString, { width: 256 });
</script>
```

---

## Step 6: Handle Webhook Callback

Saat pembayaran sukses (atau di-simulate), Xendit akan POST ke callback URL Anda dengan payload + header `x-callback-token`. **Wajib** validasi token ini.

### 6.1 Handler — `handlers/webhook.go`

```go
package handlers

import (
    "encoding/json"
    "io"
    "log"
    "net/http"
    "time"
)

type WebhookHandler struct {
    CallbackToken string
}

func NewWebhookHandler(token string) *WebhookHandler {
    return &WebhookHandler{CallbackToken: token}
}

// QRISCallbackPayload struktur payload dari Xendit
type QRISCallbackPayload struct {
    Event   string    `json:"event"`
    ID      string    `json:"id"`
    Created time.Time `json:"created"`
    Data    struct {
        ID          string `json:"id"`
        QRID        string `json:"qr_id"`
        ReferenceID string `json:"reference_id"`
        Amount      int64  `json:"amount"`
        Status      string `json:"status"`
        Currency    string `json:"currency"`
        ChannelCode string `json:"channel_code"`
    } `json:"data"`
}

func (h *WebhookHandler) HandleQRISPaid(w http.ResponseWriter, r *http.Request) {
    // 1. Validasi callback token (WAJIB)
    token := r.Header.Get("x-callback-token")
    if token != h.CallbackToken {
        log.Printf("Invalid callback token: %s", token)
        http.Error(w, "unauthorized", http.StatusUnauthorized)
        return
    }

    // 2. Baca body
    body, err := io.ReadAll(r.Body)
    if err != nil {
        http.Error(w, "cannot read body", http.StatusBadRequest)
        return
    }
    log.Printf("Webhook payload: %s", string(body))

    // 3. Parse payload
    var payload QRISCallbackPayload
    if err := json.Unmarshal(body, &payload); err != nil {
        http.Error(w, "invalid payload", http.StatusBadRequest)
        return
    }

    // 4. Proses berdasarkan status
    if payload.Data.Status == "SUCCEEDED" {
        log.Printf("✅ Payment success! Order: %s, Amount: %d, Channel: %s",
            payload.Data.ReferenceID, payload.Data.Amount, payload.Data.ChannelCode)

        // TODO: 
        //   - Update status order di DB jadi PAID
        //   - Kirim notif ke user (email/push)
        //   - Trigger fulfillment (kirim barang/aktivasi service)
        //
        // PENTING: idempotent! Cek apakah order sudah pernah di-process
        //          (Xendit bisa retry kalau response Anda gagal/timeout)
    }

    // 5. WAJIB return 200 — kalau tidak, Xendit akan retry
    w.WriteHeader(http.StatusOK)
    w.Write([]byte(`{"received":true}`))
}
```

### 6.2 Idempotency

Webhook bisa di-trigger **lebih dari sekali** untuk transaksi yang sama (misal saat retry). Selalu cek di DB:

```go
// pseudo-code
order, _ := db.GetOrder(payload.Data.ReferenceID)
if order.Status == "PAID" {
    // sudah pernah diproses, skip
    w.WriteHeader(http.StatusOK)
    return
}
db.UpdateOrderStatus(payload.Data.ReferenceID, "PAID")
```

---

## Step 7: Simulasi Pembayaran di Test Mode

Karena test mode tidak ada uang asli, Xendit menyediakan endpoint untuk simulasi.

### 7.1 Endpoint Simulasi

```
POST https://api.xendit.co/qr_codes/{qr_id}/payments/simulate
```

Body:
```json
{ "amount": 15000 }
```

Untuk **DYNAMIC QR**: amount opsional (auto pakai amount saat create).
Untuk **STATIC QR**: amount **wajib** karena nominal terbuka.

### 7.2 Cara Memanggil

Sudah disiapkan di `XenditService.SimulatePayment()` (Step 4.2). Trigger via:

```bash
curl -X POST http://localhost:3000/qris/simulate \
  -H "Content-Type: application/json" \
  -d '{"qr_id":"qr_xxxxxxxx","amount":15000}'
```

Atau langsung hit Xendit:

```bash
curl -X POST https://api.xendit.co/qr_codes/qr_xxxxxxxx/payments/simulate \
  -u xnd_development_YOUR_KEY: \
  -H "Content-Type: application/json" \
  -d '{"amount":15000}'
```

Setelah simulasi sukses, Xendit akan **kirim webhook** ke callback URL yang Anda daftarkan (Step 3.2). Cek log server Anda — pasti ada log `✅ Payment success!`.

### 7.3 Skenario Negative Testing

Anda bisa trigger error scenario dengan amount tertentu:

| Amount | Skenario |
|--------|----------|
| `1000` (default) | Sukses |
| Sesuai docs Xendit | Berbagai error code (EXPIRED_QR, CHANNEL_UNAVAILABLE, dll) |

Cek detail di: https://docs.xendit.co/qr-codes/integrations/test-scenarios

---

## Step 8: Cek Status Pembayaran (Polling)

Webhook bisa miss/delay. Sediakan endpoint untuk frontend polling status:

```go
// handlers/qris.go (sudah ada di Step 4.3)
GET /qris/status?qr_id=qr_xxxx
```

Frontend polling tiap 3-5 detik selama user di halaman QR:

```html
<script>
  const qrId = "qr_xxxxxxxx";
  const interval = setInterval(async () => {
    const res = await fetch(`/qris/status?qr_id=${qrId}`);
    const data = await res.json();
    
    if (data.status === "COMPLETED" || data.status === "INACTIVE") {
      clearInterval(interval);
      window.location.href = "/payment/success";
    }
  }, 3000);
</script>
```

---

## Step 9: Testing End-to-End

### 9.1 File `main.go`

```go
package main

import (
    "log"
    "net/http"
    "os"

    "github.com/go-chi/chi/v5"
    "github.com/go-chi/chi/v5/middleware"
    "github.com/joho/godotenv"

    "github.com/yourname/xendit-qris-demo/handlers"
    "github.com/yourname/xendit-qris-demo/services"
)

func main() {
    if err := godotenv.Load(); err != nil {
        log.Println("No .env file found, using system env")
    }

    secretKey := os.Getenv("XENDIT_SECRET_KEY")
    callbackToken := os.Getenv("XENDIT_CALLBACK_TOKEN")
    baseURL := os.Getenv("XENDIT_BASE_URL")
    if baseURL == "" {
        baseURL = "https://api.xendit.co"
    }
    port := os.Getenv("PORT")
    if port == "" {
        port = "3000"
    }

    if secretKey == "" {
        log.Fatal("XENDIT_SECRET_KEY is required")
    }

    xenditSvc := services.NewXenditService(secretKey, baseURL)
    qrisHandler := handlers.NewQRISHandler(xenditSvc)
    webhookHandler := handlers.NewWebhookHandler(callbackToken)

    r := chi.NewRouter()
    r.Use(middleware.Logger)
    r.Use(middleware.Recoverer)

    // QRIS endpoints
    r.Post("/qris/create", qrisHandler.Create)
    r.Get("/qris/status", qrisHandler.GetStatus)
    r.Get("/qris/image", qrisHandler.RenderQRImage)
    r.Post("/qris/simulate", qrisHandler.SimulatePayment) // testing only!

    // Webhook
    r.Post("/webhook/xendit/qris-paid", webhookHandler.HandleQRISPaid)

    // Health check
    r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
        w.Write([]byte("OK"))
    })

    log.Printf("🚀 Server running on port %s", port)
    log.Fatal(http.ListenAndServe(":"+port, r))
}
```

### 9.2 Jalankan Server

```bash
go run main.go
```

### 9.3 Jalankan ngrok (terminal terpisah)

```bash
ngrok http 3000
```

Update callback URL di Xendit dashboard pakai URL ngrok terbaru.

### 9.4 Test Skenario Lengkap

**Step 1: Create QRIS**
```bash
curl -X POST http://localhost:3000/qris/create \
  -H "Content-Type: application/json" \
  -d '{"order_id":"order-001","amount":15000}'
```

Response:
```json
{
  "id": "qr_b649ad60-ffec-474c-ae9e-f0b48b618768",
  "reference_id": "order-001",
  "type": "DYNAMIC",
  "amount": 15000,
  "qr_string": "00020101021226570011ID.DANA.WWW...",
  "status": "ACTIVE"
}
```

**Step 2: Render QR Image (browser)**
```
http://localhost:3000/qris/image?qr_string=00020101021226570011ID.DANA.WWW...
```

**Step 3: Simulasi Pembayaran**
```bash
curl -X POST http://localhost:3000/qris/simulate \
  -H "Content-Type: application/json" \
  -d '{"qr_id":"qr_b649ad60-ffec-474c-ae9e-f0b48b618768","amount":15000}'
```

**Step 4: Cek Log Server**

Anda akan lihat log webhook masuk:
```
Webhook payload: {"event":"qr.payment","data":{...}}
✅ Payment success! Order: order-001, Amount: 15000, Channel: ID_LINKAJA
```

**Step 5: Cek Status (Polling)**
```bash
curl "http://localhost:3000/qris/status?qr_id=qr_b649ad60-ffec-474c-ae9e-f0b48b618768"
```

---

## Step 10: Go Live Checklist

Setelah test mode lancar, untuk pindah ke production:

- [ ] **Lengkapi KYC** di dashboard Xendit (upload dokumen bisnis)
- [ ] **Aktivasi QR Code** di **Configuration → Payment Methods → QR Codes**
- [ ] Generate **secret key live mode** (format: `xnd_production_xxxxx`)
- [ ] Update env variable di server production
- [ ] Set **callback URL production** (HTTPS domain Anda, bukan ngrok)
- [ ] Test 1-2 transaksi kecil di live mode untuk confirm end-to-end
- [ ] Setup **monitoring & alerting** (Sentry, log aggregator)
- [ ] **Enable rate limiting** di endpoint create QRIS (cegah abuse)
- [ ] **Backup database** sebelum go-live
- [ ] Hapus/disable endpoint `/qris/simulate` di production!

---

## Tips & Best Practices

### Security
- ✅ **Jangan hardcode API key** — selalu via env variable
- ✅ **Validasi `x-callback-token`** di setiap webhook
- ✅ **Gunakan HTTPS** di production (Xendit hanya kirim webhook ke HTTPS)
- ✅ **Rate limit** endpoint create QRIS (cegah spam)

### Reliability
- ✅ **Idempotent webhook handler** — cek status order sebelum update
- ✅ **Set timeout** pada HTTP client (30 detik cukup)
- ✅ **Retry mechanism** di sisi Anda untuk error transient (network)
- ✅ **Logging** semua request/response untuk debugging

### UX
- ✅ Set `expires_at` realistis (15-30 menit)
- ✅ Tampilkan **countdown timer** ke user
- ✅ Polling status di frontend untuk UI responsive
- ✅ Sediakan **fallback** kalau QR expired (regenerate)

### Database Schema (Saran)

```sql
CREATE TABLE qris_orders (
    id BIGSERIAL PRIMARY KEY,
    order_id VARCHAR(255) UNIQUE NOT NULL,    -- reference_id ke Xendit
    qr_id VARCHAR(255) UNIQUE NOT NULL,        -- id dari Xendit
    amount BIGINT NOT NULL,
    status VARCHAR(20) NOT NULL,                -- PENDING/PAID/EXPIRED/FAILED
    qr_string TEXT NOT NULL,
    channel_code VARCHAR(50),                   -- terisi setelah dibayar
    paid_at TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_qris_status ON qris_orders(status);
CREATE INDEX idx_qris_expires ON qris_orders(expires_at);
```

---

## Referensi Resmi

- **Xendit Docs (QR Codes)**: https://docs.xendit.co/qr-codes
- **API Reference**: https://developers.xendit.co/api-reference/#qr-codes
- **Testing Guidelines**: https://docs.xendit.co/qr-codes/integrations/test-guideline
- **Testing Scenarios**: https://docs.xendit.co/qr-codes/integrations/test-scenarios
- **Go SDK Resmi**: https://github.com/xendit/xendit-go
- **Help Center (Test Mode)**: https://help.xendit.co/hc/en-us/articles/11663847733785

---

## Troubleshooting

| Masalah | Solusi |
|---------|--------|
| `401 Unauthorized` | Cek format API key (`xnd_development_xxx`) & Basic Auth (key + `:`) |
| `API_VALIDATION_ERROR amount must be within range` | Amount minimal `1500`, maximal `10_000_000` per transaksi |
| Webhook tidak masuk | Cek ngrok masih hidup, URL di dashboard sudah di-update, return status 2XX |
| `x-callback-token` mismatch | Refresh token di dashboard, update di `.env` |
| QR Code di test mode tidak bisa di-scan via app real | Normal — test mode cuma bisa di-simulate via API endpoint |

---

**Selamat coding! 🚀**
