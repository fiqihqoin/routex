<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Exception;

class ValidationResult
{
    public function __construct(
        public bool $isValid,
        public ?string $message = null
    ) {}

    public static function success(string $message = 'Credentials valid'): self
    {
        return new self(true, $message);
    }

    public static function fail(string $message): self
    {
        return new self(false, $message);
    }
}

class VendorValidationService
{
    public function validate(string $vendorCode, array $credentials): ValidationResult
    {
        try {
            return match (strtoupper($vendorCode)) {
                'QOINHUB' => $this->validateQoinhub($credentials),
                'MIDTRANS' => $this->validateMidtrans($credentials),
                'XENDIT' => $this->validateXendit($credentials),
                'PAYDIA' => $this->validatePaydia($credentials),
                'PAKAILINK' => $this->validatePakailink($credentials),
                'PAYOK' => $this->validatePayok($credentials),
                default => ValidationResult::fail("Validation logic not implemented for {$vendorCode}"),
            };
        } catch (Exception $e) {
            Log::error("Vendor validation error ({$vendorCode}): " . $e->getMessage());
            return ValidationResult::fail('Tidak bisa menghubungi vendor, coba lagi.');
        }
    }

    protected function validatePakailink(array $creds): ValidationResult
    {
        $clientId = $creds['client_id'] ?? '';
        $privateKeyRaw = $creds['private_key'] ?? '';
        $isProduction = isset($creds['is_production']) && $creds['is_production'];

        $baseUrl = $isProduction ? 'https://api.pakaidonk.id' : 'https://dev-api.pakaidonk.id';
        $endpoint = $baseUrl . '/snap/v1.0/access-token/b2b';

        // Use WIB for timestamp
        $timestamp = (new \DateTime('now', new \DateTimeZone('Asia/Jakarta')))->format('Y-m-d\TH:i:sP');

        $stringToSign = "{$clientId}|{$timestamp}";

        $privateKeyPem = $this->ensurePem($privateKeyRaw, 'private');
        $privateKey = openssl_pkey_get_private($privateKeyPem);
        if (!$privateKey) {
            return ValidationResult::fail('Format RSA Private Key tidak valid. Gunakan format PKCS#8.');
        }

        openssl_sign($stringToSign, $signatureBytes, $privateKey, OPENSSL_ALGO_SHA256);
        $signature = base64_encode($signatureBytes);
        if (is_resource($privateKey)) {
            openssl_free_key($privateKey);
        }

        $response = Http::timeout(10)
            ->withHeaders([
                'X-CLIENT-KEY' => $clientId,
                'X-TIMESTAMP' => $timestamp,
                'X-SIGNATURE' => $signature,
                'Content-Type' => 'application/json',
            ])
            ->post($endpoint, [
                'grantType' => 'client_credentials'
            ]);

        if ($response->status() === 401 || $response->status() === 403) {
            return ValidationResult::fail('Client ID atau Private Key tidak valid');
        }

        if ($response->successful() && $response->json('accessToken')) {
            return ValidationResult::success();
        }

        return ValidationResult::fail('PakaiLink validation failed: ' . $response->body());
    }

    protected function validatePaydia(array $creds): ValidationResult
    {
        $clientId = $creds['client_id'] ?? '';
        $privateKeyRaw = $creds['private_key'] ?? '';
        $isProduction = isset($creds['is_production']) && $creds['is_production'];

        $baseUrl = $isProduction ? 'https://api.paydia.id' : 'https://api.paydia.co.id';
        $endpoint = $baseUrl . '/snap/v1.0/access-token/b2b';

        // Use WIB for timestamp
        $timestamp = (new \DateTime('now', new \DateTimeZone('Asia/Jakarta')))->format('Y-m-d\TH:i:sP');

        $stringToSign = "{$clientId}|{$timestamp}";

        $privateKeyPem = $this->ensurePem($privateKeyRaw, 'private');
        $privateKey = openssl_pkey_get_private($privateKeyPem);
        if (!$privateKey) {
            return ValidationResult::fail('Format Private Key tidak valid');
        }

        openssl_sign($stringToSign, $signatureBytes, $privateKey, OPENSSL_ALGO_SHA256);
        $signature = base64_encode($signatureBytes);
        if (is_resource($privateKey)) {
            openssl_free_key($privateKey);
        }

        $response = Http::timeout(10)
            ->withHeaders([
                'X-CLIENT-KEY' => $clientId,
                'X-TIMESTAMP' => $timestamp,
                'X-SIGNATURE' => $signature,
                'Content-Type' => 'application/json',
            ])
            ->post($endpoint, [
                'grantType' => 'client_credentials'
            ]);

        if ($response->status() === 401 || $response->status() === 403) {
            return ValidationResult::fail('Client ID atau Private Key tidak valid');
        }

        if ($response->successful() && $response->json('accessToken')) {
            return ValidationResult::success();
        }

        return ValidationResult::fail('Paydia validation failed: ' . $response->body());
    }

    protected function validateQoinhub(array $creds): ValidationResult
    {
        $endpoint = 'https://api.qoinhub.id/ordersnap/api/v1.0/qr/qr-mpm-generate';
        $path = '/ordersnap/api/v1.0/qr/qr-mpm-generate';
        $timestamp = now()->toIso8601String();
        
        $body = [
            'partnerReferenceNo' => 'VAL-' . Str::random(10),
            'amount' => [
                'value' => '100.00',
                'currency' => 'IDR',
            ],
            'merchantId' => $creds['merchant_id'] ?? '',
            'terminalId' => $creds['terminal_id'] ?? '',
        ];

        $jsonBody = json_encode($body);
        $bodyHash = hash('sha256', $jsonBody);
        $stringToSign = "POST:{$path}:{$bodyHash}:{$timestamp}";
        $signature = hash_hmac('sha256', $stringToSign, $creds['client_secret'] ?? '');

        $response = Http::timeout(10)
            ->withHeaders([
                'Content-Type' => 'application/json',
                'X-TIMESTAMP' => $timestamp,
                'X-SIGNATURE' => $signature,
                'X-PARTNER-ID' => $creds['client_id'] ?? '',
            ])
            ->post($endpoint, $body);

        if ($response->status() === 401 || $response->status() === 403) {
            return ValidationResult::fail('Client ID atau Client Secret tidak valid');
        }

        // 200 is success, 400 is usually validation error of the payload but auth passed
        if ($response->successful() || $response->status() === 400) {
            return ValidationResult::success();
        }

        return ValidationResult::fail('Vendor merespon dengan error: ' . ($response->json('message') ?? 'Unknown error'));
    }

    protected function validateMidtrans(array $creds): ValidationResult
    {
        // Using /v2/token as a lightweight check for Server Key validity
        $response = Http::withBasicAuth($creds['server_key'] ?? '', '')
            ->timeout(10)
            ->get('https://api.sandbox.midtrans.com/v2/token', [
                'client_key' => 'test', // Doesn't matter, we check Server Key via Basic Auth
            ]);

        if ($response->status() === 401) {
            return ValidationResult::fail('Server Key tidak valid');
        }

        if ($response->successful() || $response->status() === 400) {
            return ValidationResult::success();
        }

        return ValidationResult::fail('Midtrans validation failed');
    }

    protected function validateXendit(array $creds): ValidationResult
    {
        $response = Http::withBasicAuth($creds['secret_key'] ?? '', '')
            ->timeout(10)
            ->get('https://api.xendit.co/balance');

        if ($response->status() === 401) {
            return ValidationResult::fail('Secret Key tidak valid');
        }

        if ($response->successful()) {
            return ValidationResult::success();
        }

        return ValidationResult::fail('Xendit validation failed');
    }

    protected function validatePayok(array $creds): ValidationResult
    {
        $merchantId = $creds['merchant_id'] ?? '';
        $privateKeyRaw = $creds['merchant_private_key'] ?? '';
        $isProduction = isset($creds['is_production']) && $creds['is_production'];

        // Auto-wrap in PEM if missing
        $privateKeyPem = $this->ensurePem($privateKeyRaw, 'private');

        // Use different base URL for sandbox vs production
        $baseUrl = $isProduction ? 'https://api-demian.com' : 'https://sit-api.payok.com';
        $endpoint = '/api-pay/payment/V3.6/merchant/paymentMethods';
        $fullUrl = $baseUrl . $endpoint;

        // Create request body with UTC timestamp
        $requestTime = (new \DateTime('now', new \DateTimeZone('UTC')))->format('Y-m-d\TH:i:s.v\Z');
        $body = [
            'requestTime' => $requestTime,
            'merchantId' => $merchantId,
            'countryCode' => 'IDN',
        ];

        $jsonBody = json_encode($body, JSON_UNESCAPED_SLASHES);

        // Generate signature: Base64(RSA-SHA256(JSON_BODY + '&' + ENDPOINT_URL))
        // Note: PAYOK requires '&' prefix before endpoint URL
        $stringToSign = $jsonBody . '&' . $endpoint;

        $privateKey = openssl_pkey_get_private($privateKeyPem);
        if (!$privateKey) {
            return ValidationResult::fail('Format Merchant Private Key tidak valid. Gunakan format PKCS#8 atau sertakan header PEM.');
        }

        openssl_sign($stringToSign, $signatureBytes, $privateKey, OPENSSL_ALGO_SHA256);
        $signature = base64_encode($signatureBytes);
        if (is_resource($privateKey)) {
            openssl_free_key($privateKey);
        }

        // Make HTTP request to validate
        $response = Http::timeout(10)
            ->withHeaders([
                'sign' => $signature,
                'Content-Type' => 'application/json;charset=utf-8',
            ])
            ->post($fullUrl, $body);

        if ($response->status() === 401 || $response->status() === 403) {
            return ValidationResult::fail('Merchant ID atau Private Key tidak valid');
        }

        $responseData = $response->json();
        if ($response->successful() && isset($responseData['code']) && $responseData['code'] === 'SUCCESS') {
            return ValidationResult::success();
        }

        // If failed, return error message from PAYOK
        $errorMessage = $responseData['message'] ?? 'PAYOK validation failed';
        return ValidationResult::fail('PAYOK validation failed: ' . $errorMessage);
    }

    protected function ensurePem(string $key, string $type): string
    {
        $key = trim($key);
        if (str_contains($key, '-----BEGIN')) {
            return $key;
        }

        $header = match ($type) {
            'private' => "-----BEGIN PRIVATE KEY-----",
            'public' => "-----BEGIN PUBLIC KEY-----",
            default => "-----BEGIN KEY-----",
        };
        $footer = match ($type) {
            'private' => "-----END PRIVATE KEY-----",
            'public' => "-----END PUBLIC KEY-----",
            default => "-----END KEY-----",
        };

        return $header . "\n" . $key . "\n" . $footer;
    }
}
