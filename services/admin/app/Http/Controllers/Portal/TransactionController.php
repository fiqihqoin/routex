<?php

namespace App\Http\Controllers\Portal;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;

class TransactionController extends Controller
{
    /**
     * List transactions by proxying to Go API
     */
    public function index(Request $request): JsonResponse
    {
        $merchant = Auth::guard('portal')->user();
        $environment = $request->input('environment', 'sandbox');
        $goBaseUrl = env('GO_INTERNAL_URL', 'http://transaction-api:8080');

        $response = Http::withHeaders([
            'X-Internal-Secret' => env('INTERNAL_API_SECRET'),
            'X-Merchant-ID' => $merchant->id,
            'X-Environment' => $environment,
        ])->timeout(10)->get(
            $goBaseUrl . '/api/v1/internal/transactions',
            $request->only(['page', 'per_page', 'status', 'vendor_id', 'date_from', 'date_to', 'search'])
        );

        return response()->json($response->json(), $response->status());
    }

    /**
     * Get transaction detail by proxying to Go API
     */
    public function show(string $transactionId, Request $request): JsonResponse
    {
        $merchant = Auth::guard('portal')->user();
        $environment = $request->input('environment', 'sandbox');
        $goBaseUrl = env('GO_INTERNAL_URL', 'http://transaction-api:8080');

        $response = Http::withHeaders([
            'X-Internal-Secret' => env('INTERNAL_API_SECRET'),
            'X-Merchant-ID' => $merchant->id,
            'X-Environment' => $environment,
        ])->timeout(10)->get(
            $goBaseUrl . '/api/v1/internal/transactions/' . $transactionId
        );

        return response()->json($response->json(), $response->status());
    }

    /**
     * Get transaction statistics directly from DB
     */
    public function stats(Request $request): JsonResponse
    {
        $merchant = Auth::guard('portal')->user();
        $environment = $request->input('environment', 'sandbox');
        $dateFrom = $request->input('date_from', now()->subDays(30)->toDateString());

        $stats = DB::table('transactions')
            ->where('merchant_id', $merchant->id)
            ->where('environment', $environment)
            ->whereDate('created_at', '>=', $dateFrom)
            ->selectRaw("
                COUNT(*) as total,
                COUNT(*) FILTER (WHERE status = 'paid') as paid,
                COUNT(*) FILTER (WHERE status = 'pending_payment') as pending,
                COUNT(*) FILTER (WHERE status IN ('failed', 'expired', 'expired_stale')) as failed,
                COALESCE(SUM(amount) FILTER (WHERE status = 'paid'), 0) as total_volume
            ")
            ->first();

        $total = (int) $stats->total;
        $paid = (int) $stats->paid;
        $successRate = $total > 0 ? round(($paid / $total) * 100, 2) : 0;

        return response()->json([
            'total' => $total,
            'paid' => $paid,
            'pending' => (int) $stats->pending,
            'failed' => (int) $stats->failed,
            'total_volume' => (float) $stats->total_volume,
            'success_rate' => $successRate,
        ]);
    }
}
