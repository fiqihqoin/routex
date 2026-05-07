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
                default => ValidationResult::fail("Validation logic not implemented for {$vendorCode}"),
            };
        } catch (Exception $e) {
            Log::error("Vendor validation error ({$vendorCode}): " . $e->getMessage());
            return ValidationResult::fail('Tidak bisa menghubungi vendor, coba lagi.');
        }
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
}
