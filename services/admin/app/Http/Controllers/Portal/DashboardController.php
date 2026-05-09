<?php

namespace App\Http\Controllers\Portal;

use App\Http\Controllers\Controller;
use App\Models\Transaction;
use App\Models\MerchantVendorCredential;
use App\Models\Vendor;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    /**
     * Return JSON for the React Dashboard
     */
    public function index(Request $request)
    {
        if ($request->wantsJson() || $request->is('api/*')) {
            $merchant = Auth::guard('portal')->user();
            $environment = $request->header('X-Routex-Environment', 'sandbox');

            // Fetch API keys for display
            $apiKeys = $merchant->apiKeys()
                ->whereNull('revoked_at')
                ->get();

            return response()->json([
                'user' => [
                    'name' => $merchant->name,
                    'email' => $merchant->email,
                    'company' => $merchant->company_name,
                    'sandbox_api_key' => $apiKeys->where('environment', 'sandbox')->first()?->key_prefix . '...',
                    'production_api_key' => $apiKeys->where('environment', 'production')->first()?->key_prefix . '...',
                ],
                'stats' => $this->getStats($merchant, $environment),
                'vendors' => $this->getVendorPerformance($merchant, $environment),
                'health' => $this->getVendorHealth(),
                'recent_transactions' => $this->getRecentTransactions($merchant, $environment),
            ]);
        }

        // For direct browser access, serve the SPA shell
        return file_get_contents(public_path('homepage.html'));
    }

    private function getStats($merchant, $environment)
    {
        $txQuery = Transaction::where('merchant_id', $merchant->id)
            ->where('environment', $environment);

        $total = $txQuery->count();
        
        if ($total === 0) {
            return [
                'total_transactions' => '0',
                'success_rate' => '0%',
                'total_volume' => 'Rp 0',
                'avg_response_time' => '-',
            ];
        }

        $paid = $txQuery->clone()->where('status', 'paid')->count();
        $successRate = round(($paid / $total) * 100, 1);
        $volume = $txQuery->clone()->where('status', 'paid')->sum('amount');

        // Latency placeholder
        $avgRT = '425ms';

        return [
            'total_transactions' => number_format($total),
            'success_rate' => $successRate . '%',
            'total_volume' => 'Rp ' . $this->formatVolume($volume),
            'avg_response_time' => $avgRT,
        ];
    }

    private function getVendorPerformance($merchant, $environment)
    {
        $vendorStats = DB::table('transactions')
            ->join('vendors', 'transactions.vendor_id', '=', 'vendors.id')
            ->where('transactions.merchant_id', $merchant->id)
            ->where('transactions.environment', $environment)
            ->select(
                'vendors.name',
                DB::raw('COUNT(*) as tx'),
                DB::raw('ROUND(COUNT(CASE WHEN status = \'paid\' THEN 1 END) * 100.0 / COUNT(*), 1) as rate')
            )
            ->groupBy('vendors.id', 'vendors.name')
            ->get();

        return $vendorStats->map(function ($stat) {
            return [
                'name' => $stat->name,
                'rate' => (float) $stat->rate,
                'tx' => (int) $stat->tx,
            ];
        })->toArray();
    }

    private function getVendorHealth()
    {
        $vendors = Vendor::where('is_active', true)->get();

        return $vendors->map(function ($vendor) {
            return [
                'name' => $vendor->name,
                'status' => 'success',
                'state' => 'Closed',
                'rt' => 'avg -',
                'checked' => '-',
            ];
        })->toArray();
    }

    private function getRecentTransactions($merchant, $environment)
    {
        $transactions = Transaction::with('vendor')
            ->where('merchant_id', $merchant->id)
            ->where('environment', $environment)
            ->orderBy('created_at', 'desc')
            ->limit(10)
            ->get();

        return $transactions->map(function ($tx) {
            return [
                'id' => substr($tx->transaction_id, 0, 10),
                'amount' => 'Rp ' . number_format($tx->amount, 0, ',', '.'),
                'vendor' => $tx->vendor->name ?? 'Unknown',
                'time' => $tx->created_at->diffForHumans(),
                'ok' => $tx->status === 'paid',
            ];
        })->toArray();
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
