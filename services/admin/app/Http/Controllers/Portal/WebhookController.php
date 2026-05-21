<?php

namespace App\Http\Controllers\Portal;

use App\Http\Controllers\Controller;
use App\Models\MerchantWebhook;
use App\Services\WebhookSSRFValidator;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;

class WebhookController extends Controller
{
    /**
     * Get webhook config for the current merchant/env
     */
    public function index(Request $request): JsonResponse
    {
        $merchant = Auth::guard('portal')->user();
        $env = $request->input('env', 'sandbox');

        $webhook = MerchantWebhook::where('merchant_id', $merchant->id)
            ->where('environment', $env)
            ->first();

        return response()->json([
            'configured' => (bool)$webhook,
            'webhook' => $webhook ? $this->formatWebhook($webhook) : null
        ]);
    }

    /**
     * Create or update webhook configuration
     */
    public function upsert(Request $request): JsonResponse
    {
        $request->validate([
            'url' => 'required|url|starts_with:https',
            'env' => 'required|in:sandbox,production',
        ]);

        if (!WebhookSSRFValidator::validate($request->url)) {
            return response()->json([
                'error' => 'URL tidak valid atau merupakan alamat internal yang dilarang.'
            ], 422);
        }

        $merchant = Auth::guard('portal')->user();
        $env = $request->env;

        $existing = MerchantWebhook::where('merchant_id', $merchant->id)
            ->where('environment', $env)
            ->first();

        $secret = $existing ? $existing->secret : 'rwhk_' . bin2hex(random_bytes(32));

        $webhook = MerchantWebhook::updateOrCreate(
            ['merchant_id' => $merchant->id, 'environment' => $env],
            [
                'url' => $request->url,
                'secret' => $secret,
                'is_enabled' => true,
                'subscribed_events' => ['payment.paid', 'payment.failed'],
                'auto_disabled_at' => null,
                'consecutive_failure_days' => 0,
            ]
        );

        return response()->json([
            'success' => true,
            'message' => 'Webhook configured successfully',
            'webhook' => $this->formatWebhook($webhook)
        ]);
    }

    /**
     * Rotate webhook secret
     */
    public function rotateSecret(Request $request): JsonResponse
    {
        $request->validate([
            'env' => 'required|in:sandbox,production',
        ]);

        $merchant = Auth::guard('portal')->user();
        $webhook = MerchantWebhook::where('merchant_id', $merchant->id)
            ->where('environment', $request->env)
            ->firstOrFail();

        $newSecret = 'rwhk_' . bin2hex(random_bytes(32));
        $webhook->update(['secret' => $newSecret]);

        return response()->json([
            'success' => true,
            'message' => 'Secret rotated. Update your implementation immediately.',
            'new_secret' => $newSecret,
            'warning' => 'Save this now. You cannot see it again.'
        ]);
    }

    /**
     * Send test callback
     */
    public function sendTest(Request $request): JsonResponse
    {
        $request->validate([
            'env' => 'required|in:sandbox,production',
        ]);

        $merchant = Auth::guard('portal')->user();
        $webhook = MerchantWebhook::where('merchant_id', $merchant->id)
            ->where('environment', $request->env)
            ->where('is_enabled', true)
            ->firstOrFail();

        $testPayload = [
            'transaction_id' => 'caishenengine_test_' . Str::random(16),
            'vendor_transaction_id' => 'vendor_test_123',
            'status' => 'paid',
            'amount' => 10000,
            'paid_at' => now()->toIso8601String(),
            'payment_method' => 'qris',
            'vendor_id' => 'QOINHUB',
            'test' => true,
        ];

        $payloadJson = json_encode($testPayload);
        $timestamp = time();
        $signedString = $timestamp . '.' . $payloadJson;
        $signature = 't=' . $timestamp . ',v1=' . hash_hmac('sha256', $signedString, $webhook->secret);

        $start = microtime(true);
        try {
            $response = Http::timeout(10)
                ->withHeaders([
                    'Content-Type' => 'application/json',
                    'X-CaishenEngine-Signature' => $signature,
                    'X-CaishenEngine-Event' => 'payment.paid',
                    'X-CaishenEngine-Delivery-ID' => 'test_' . Str::random(8),
                ])
                ->post($webhook->url, $testPayload);
            
            $latency = (int)((microtime(true) - $start) * 1000);

            return response()->json([
                'success' => $response->successful(),
                'status_code' => $response->status(),
                'latency_ms' => $latency,
                'message' => $response->successful() 
                    ? 'Test delivered successfully' 
                    : 'Delivery failed: HTTP ' . $response->status()
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Connection failed: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Re-enable an auto-disabled webhook
     */
    public function reenable(Request $request): JsonResponse
    {
        $request->validate([
            'env' => 'required|in:sandbox,production',
        ]);

        $merchant = Auth::guard('portal')->user();
        $webhook = MerchantWebhook::where('merchant_id', $merchant->id)
            ->where('environment', $request->env)
            ->firstOrFail();

        $webhook->update([
            'is_enabled' => true,
            'auto_disabled_at' => null,
            'consecutive_failure_days' => 0,
        ]);

        return response()->json(['success' => true]);
    }

    /**
     * Delete webhook configuration
     */
    public function delete(Request $request): JsonResponse
    {
        $request->validate([
            'env' => 'required|in:sandbox,production',
        ]);

        $merchant = Auth::guard('portal')->user();
        $webhook = MerchantWebhook::where('merchant_id', $merchant->id)
            ->where('environment', $request->env)
            ->firstOrFail();

        $webhook->delete();

        return response()->json(['success' => true]);
    }

    private function formatWebhook(MerchantWebhook $webhook): array
    {
        return [
            'id' => $webhook->id,
            'url' => $webhook->url,
            'secret_prefix' => substr($webhook->secret, 0, 12) . str_repeat('•', 24),
            'environment' => $webhook->environment,
            'is_enabled' => $webhook->is_enabled,
            'subscribed_events' => $webhook->subscribed_events,
            'consecutive_failure_days' => $webhook->consecutive_failure_days,
            'auto_disabled_at' => $webhook->auto_disabled_at,
            'last_success_at' => $webhook->last_success_at,
            'last_failure_at' => $webhook->last_failure_at,
            'created_at' => $webhook->created_at,
        ];
    }
}
