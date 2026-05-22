<?php

namespace App\Http\Controllers\Portal;

use App\Http\Controllers\Controller;
use App\Models\ApiKey;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Redis;

class ApiKeyController extends Controller
{
    /**
     * List API keys for the current merchant
     */
    public function index(): JsonResponse
    {
        $merchant = Auth::guard('portal')->user();
        
        $keys = ApiKey::where('merchant_id', $merchant->id)
            ->orderBy('environment')
            ->orderBy('created_at', 'desc')
            ->get(['id', 'name', 'environment', 'key_prefix', 'last_used_at', 'created_at', 'revoked_at', 'expires_at']);

        $formattedKeys = $keys->map(function ($key) {
            return [
                'id' => $key->id,
                'name' => $key->name,
                'environment' => $key->environment,
                'key_prefix' => $key->key_prefix,
                'display' => $key->key_prefix . str_repeat('•', 20),
                'status' => $key->status, // Use status accessor from model
                'last_used_at' => $key->last_used_at,
                'created_at' => $key->created_at,
                'revoked_at' => $key->revoked_at,
            ];
        });

        return response()->json([
            'keys' => $formattedKeys,
            'has_sandbox' => $keys->contains('environment', 'sandbox'),
            'has_production' => $keys->contains('environment', 'production'),
        ]);
    }

    /**
     * Generate a new API key
     */
    public function generate(Request $request): JsonResponse
    {
        $request->validate([
            'name' => 'required|string|max:100',
            'environment' => 'required|in:sandbox,production',
        ]);

        $merchant = Auth::guard('portal')->user();

        // Limit check: max 5 active keys per environment
        $activeCount = ApiKey::where('merchant_id', $merchant->id)
            ->where('environment', $request->environment)
            ->whereNull('revoked_at')
            ->where(function ($query) {
                $query->whereNull('expires_at')
                    ->orWhere('expires_at', '>', now());
            })
            ->count();

        if ($activeCount >= 5) {
            return response()->json([
                'error' => 'Maximum 5 active keys per environment'
            ], 422);
        }

        $result = ApiKey::generate(
            $merchant->id, 
            $request->environment, 
            $request->name,
            $request->ip()
        );

        return response()->json([
            'success' => true,
            'message' => 'API key generated. Save it now — you won\'t be able to see it again.',
            'plain_key' => $result['plain_key'],
            'key' => [
                'id' => $result['api_key']->id,
                'name' => $result['api_key']->name,
                'environment' => $result['api_key']->environment,
                'key_prefix' => $result['api_key']->key_prefix,
                'created_at' => $result['api_key']->created_at,
            ]
        ], 201);
    }

    /**
     * Revoke an API key
     */
    public function revoke(Request $request, string $keyId): JsonResponse
    {
        $merchant = Auth::guard('portal')->user();

        $apiKey = ApiKey::where('id', $keyId)
            ->where('merchant_id', $merchant->id)
            ->whereNull('revoked_at')
            ->firstOrFail();

        // Get key_hash before updating (it's hidden in model)
        $keyHashValue = DB::table('api_keys')
            ->where('id', $apiKey->id)
            ->value('key_hash');

        // Prevent revoking last active key
        $activeCount = ApiKey::where('merchant_id', $merchant->id)
            ->where('environment', $apiKey->environment)
            ->whereNull('revoked_at')
            ->where(function ($query) {
                $query->whereNull('expires_at')
                    ->orWhere('expires_at', '>', now());
            })
            ->count();

        if ($activeCount <= 1) {
            return response()->json([
                'error' => 'Cannot revoke your last active key for this environment. Generate a new one first.'
            ], 422);
        }

        $apiKey->update([
            'revoked_at' => now(),
            'revoked_reason' => $request->input('reason', 'Revoked by user')
        ]);

        // Soft delete to remove from UI list ('nyampah' cleanup)
        $apiKey->delete();

        // Invalidate Go API cache
        Redis::del('apikey:hash:' . $keyHashValue);

        // Publish event to Go
        Redis::publish('config:update', json_encode([
            'type' => 'api_key_revoked',
            'key_hash' => $keyHashValue
        ]));

        return response()->json(['success' => true]);
    }

    /**
     * Update key name
     */
    public function updateName(Request $request, string $keyId): JsonResponse
    {
        $request->validate([
            'name' => 'required|string|max:100',
        ]);

        $merchant = Auth::guard('portal')->user();
        
        $apiKey = ApiKey::where('id', $keyId)
            ->where('merchant_id', $merchant->id)
            ->firstOrFail();

        $apiKey->update(['name' => $request->name]);

        return response()->json(['success' => true]);
    }
}
