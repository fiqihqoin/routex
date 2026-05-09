<?php

namespace App\Http\Controllers\Portal;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class ApiKeyController extends Controller
{
    /**
     * Show API keys (masked by default, revealed with header)
     */
    public function index(Request $request)
    {
        $user = Auth::guard('portal')->user();

        // Check if client wants to reveal keys
        $reveal = $request->header('X-Reveal-Key') === 'true';

        $maskKey = function($key) {
            if (!$key) return null;
            return substr($key, 0, 8) . str_repeat('•', strlen($key) - 8);
        };

        return response()->json([
            'sandbox_api_key' => $reveal ? $user->sandbox_api_key : $maskKey($user->sandbox_api_key),
            'production_api_key' => $reveal ? $user->production_api_key : $maskKey($user->production_api_key),
            'revealed' => $reveal,
        ]);
    }

    /**
     * Regenerate sandbox API key
     */
    public function regenerateSandbox(Request $request)
    {
        $user = Auth::guard('portal')->user();

        $newKey = 'rx_sbx_' . bin2hex(random_bytes(24));

        $user->update([
            'sandbox_api_key' => $newKey,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Sandbox API key berhasil di-regenerate',
            'new_key' => $newKey,
        ]);
    }

    /**
     * Regenerate production API key
     */
    public function regenerateProduction(Request $request)
    {
        $user = Auth::guard('portal')->user();

        $newKey = 'rx_prod_' . bin2hex(random_bytes(24));

        $user->update([
            'production_api_key' => $newKey,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Production API key berhasil di-regenerate',
            'new_key' => $newKey,
        ]);
    }
}
