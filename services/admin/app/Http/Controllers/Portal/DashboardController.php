<?php

namespace App\Http\Controllers\Portal;

use App\Http\Controllers\Controller;
use App\Models\Transaction;
use App\Models\Vendor;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Redis;
use Carbon\Carbon;

class DashboardController extends Controller
{
    /**
     * Serve the React SPA shell
     */
    public function serveApp(): Response
    {
        return response(
            file_get_contents(public_path('homepage.html')),
            200,
            ['Content-Type' => 'text/html']
        );
    }

    /**
     * Dedicated Dashboard Data API
     */
    public function dashboard(Request $request): JsonResponse
    {
        $merchant = Auth::guard('portal')->user();
        $env = $request->header('X-Routex-Environment', $request->query('env', 'sandbox'));
        $range = $request->query('range', '7d');

        // Logic range to dates
        $rangeDays = match($range) {
            '30d' => 30,
            '90d' => 90,
            default => 7
        };

        $dateFrom = now()->subDays($rangeDays)->startOfDay();
        $prevDateFrom = now()->subDays($rangeDays * 2)->startOfDay();
        $prevDateTo = $dateFrom;

        return response()->json([
            'stats' => $this->getStats($merchant, $env, $dateFrom, $prevDateFrom, $prevDateTo),
            'volume_chart' => $this->calculateVolumeChart($merchant, $env, $rangeDays, $dateFrom),
            'vendor_performance' => $this->getVendorPerformance($merchant, $env, $dateFrom),
            'vendor_health' => $this->getVendorHealth($merchant, $env),
            'recent_transactions' => $this->getRecentTransactions($merchant, $env),
        ]);
    }

    /**
     * Volume Chart Only API (for fast switching without full reload)
     */
    public function volumeChart(Request $request): JsonResponse
    {
        $merchant = Auth::guard('portal')->user();
        $env = $request->header('X-Routex-Environment', $request->query('env', 'sandbox'));
        $range = $request->query('range', '7d');

        $rangeDays = match($range) {
            '30d' => 30,
            '90d' => 90,
            default => 7
        };

        $dateFrom = now()->subDays($rangeDays)->startOfDay();

        return response()->json($this->calculateVolumeChart($merchant, $env, $rangeDays, $dateFrom));
    }

    private function getStats($merchant, $env, $dateFrom, $prevDateFrom, $prevDateTo)
    {
        // Query current period
        $cur = DB::table('transactions')
            ->where('merchant_id', $merchant->id)
            ->where('environment', $env)
            ->where('created_at', '>=', $dateFrom)
            ->selectRaw("
                COUNT(*) as total,
                COUNT(*) FILTER (WHERE status = 'paid') as paid,
                COUNT(*) FILTER (WHERE status = 'pending_payment') as pending,
                COUNT(*) FILTER (WHERE status IN ('failed', 'expired', 'expired_stale')) as failed,
                COALESCE(SUM(amount) FILTER (WHERE status = 'paid'), 0) as volume
            ")
            ->first();

        // Query previous period for trends
        $prev = DB::table('transactions')
            ->where('merchant_id', $merchant->id)
            ->where('environment', $env)
            ->where('created_at', '>=', $prevDateFrom)
            ->where('created_at', '<', $prevDateTo)
            ->selectRaw("
                COUNT(*) as total,
                COUNT(*) FILTER (WHERE status = 'paid') as paid,
                COALESCE(SUM(amount) FILTER (WHERE status = 'paid'), 0) as volume
            ")
            ->first();

        $calcTrend = function($curVal, $prevVal) {
            if ($prevVal == 0) return null;
            $pct = round((($curVal - $prevVal) / $prevVal) * 100, 1);
            return ['value' => abs($pct), 'up' => $pct >= 0];
        };

        $curRate = $cur->total > 0 ? round($cur->paid / $cur->total * 100, 1) : 0;
        $prevRate = $prev->total > 0 ? round($prev->paid / $prev->total * 100, 1) : 0;

        return [
            'total_transactions' => number_format($cur->total),
            'success_rate' => $curRate . '%',
            'total_volume' => 'Rp ' . $this->formatVolume($cur->volume),
            'avg_response_time' => '-',
            'trends' => [
                'total' => $calcTrend($cur->total, $prev->total),
                'rate' => $calcTrend($curRate, $prevRate),
                'volume' => $calcTrend($cur->volume, $prev->volume),
            ],
            // For mini cards
            'pending_payment' => [
                'value' => number_format($cur->pending),
                'label' => 'Awaiting payment'
            ],
            'failed_transactions' => [
                'value' => number_format($cur->failed),
                'label' => 'Failed/Expired'
            ]
        ];
    }

    private function calculateVolumeChart($merchant, $env, $rangeDays, $dateFrom)
    {
        $rawData = DB::table('transactions')
            ->where('merchant_id', $merchant->id)
            ->where('environment', $env)
            ->where('created_at', '>=', $dateFrom)
            ->selectRaw("
                DATE(created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Jakarta') as date,
                COUNT(*) as total,
                COUNT(*) FILTER (WHERE status = 'paid') as success
            ")
            ->groupByRaw("DATE(created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Jakarta')")
            ->orderBy('date', 'asc')
            ->get()
            ->keyBy('date');

        $chart = [];
        // Map date format based on range
        $dateFormat = $rangeDays <= 7 ? 'D d/m' : 'd M';

        for ($i = $rangeDays - 1; $i >= 0; $i--) {
            $dateObj = now()->subDays($i);
            $dateStr = $dateObj->toDateString();
            $label = $dateObj->translatedFormat($dateFormat);
            
            $item = $rawData->get($dateStr);
            
            $chart[] = [
                'day' => $label,
                'date' => $dateStr,
                'total' => $item ? (int)$item->total : 0,
                'success' => $item ? (int)$item->success : 0,
            ];
        }

        return $chart;
    }

    private function getVendorPerformance($merchant, $env, $dateFrom)
    {
        return DB::table('transactions')
            ->join('vendors', 'transactions.vendor_id', '=', 'vendors.id')
            ->where('transactions.merchant_id', $merchant->id)
            ->where('transactions.environment', $env)
            ->where('transactions.created_at', '>=', $dateFrom)
            ->select(
                'vendors.name',
                'vendors.code',
                DB::raw('COUNT(*) as tx'),
                DB::raw('COUNT(*) FILTER (WHERE status = \'paid\') as paid'),
                DB::raw('COALESCE(SUM(amount) FILTER (WHERE status = \'paid\'), 0) as volume'),
                DB::raw('ROUND(COUNT(CASE WHEN status = \'paid\' THEN 1 END) * 100.0 / NULLIF(COUNT(*), 0), 1) as rate')
            )
            ->groupBy('vendors.id', 'vendors.name', 'vendors.code')
            ->get()
            ->map(function($item) {
                return [
                    'name' => $item->name,
                    'code' => $item->code,
                    'rate' => (float)$item->rate,
                    'tx' => (int)$item->tx,
                    'paid' => (int)$item->paid,
                    'volume' => (float)$item->volume
                ];
            });
    }

    private function getVendorHealth($merchant, $env)
    {
        // Get vendors that this merchant has credentials for in this environment
        $vendorIds = DB::table('merchant_vendor_credentials')
            ->where('merchant_id', $merchant->id)
            ->where('environment', $env)
            ->where('is_enabled', true)
            ->pluck('vendor_id');

        if ($vendorIds->isEmpty()) {
            return [];
        }

        $vendors = Vendor::whereIn('id', $vendorIds)->get();

        return $vendors->map(function ($vendor) use ($env) {
            $vendorId = $vendor->id;
            
            // 1. Circuit Breaker State from Redis
            $stateKey = "cb:vendor:{$vendorId}:env:{$env}:state";
            $rawState = Redis::get($stateKey) ?: 'CLOSED';
            
            $statusMap = [
                'CLOSED' => ['status' => 'success', 'state' => 'Closed'],
                'OPEN' => ['status' => 'error', 'state' => 'Open'],
                'HALF_OPEN' => ['status' => 'pending', 'state' => 'Half-Open'],
            ];

            $health = $statusMap[$rawState] ?? $statusMap['CLOSED'];

            // 2. Error Rate from ZSET (sliding window)
            $failureKey = "cb:vendor:{$vendorId}:env:{$env}:stats:failure";
            $successKey = "cb:vendor:{$vendorId}:env:{$env}:stats:success";
            
            $failures = Redis::zcard($failureKey);
            $successes = Redis::zcard($successKey);
            $total = $failures + $successes;
            
            $errorRate = $total > 0 ? round($failures / $total * 100, 1) . '%' : '0%';

            return [
                'name' => $vendor->name,
                'code' => $vendor->code,
                'vendor_id' => $vendorId,
                'status' => $health['status'],
                'state' => $health['state'],
                'error_rate' => $errorRate,
                'checked' => 'just now'
            ];
        });
    }

    private function getRecentTransactions($merchant, $env)
    {
        return Transaction::with('vendor')
            ->where('merchant_id', $merchant->id)
            ->where('environment', $env)
            ->orderBy('created_at', 'desc')
            ->limit(10)
            ->get()
            ->map(function ($tx) {
                return [
                    'id' => $tx->transaction_id,
                    'id_short' => substr($tx->transaction_id, 0, 14),
                    'amount' => 'Rp ' . number_format($tx->amount, 0, ',', '.'),
                    'vendor' => $tx->vendor->code ?? 'Unknown',
                    'vendor_name' => $tx->vendor->name ?? 'Unknown',
                    'status' => $tx->status,
                    'status_color' => $tx->status_color,
                    'time' => $tx->created_at->diffForHumans(),
                    'ok' => $tx->status === 'paid',
                ];
            });
    }

    private function formatVolume($amount)
    {
        if ($amount >= 1000000000) {
            return number_format($amount / 1000000000, 1) . 'B';
        } elseif ($amount >= 1000000) {
            return number_format($amount / 1000000, 1) . 'M';
        } elseif ($amount >= 1000) {
            return number_format($amount / 1000, 0) . 'K';
        }
        return number_format($amount, 0);
    }
}
