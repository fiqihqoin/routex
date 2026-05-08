<?php

namespace App\Http\Controllers\Portal;

use App\Http\Controllers\Controller;
use App\Models\Vendor;
use App\Models\VendorAccount;
use Illuminate\Support\Facades\Auth;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    /**
     * Return JSON for the React Dashboard
     */
    public function index(Request $request)
    {
        if ($request->wantsJson() || $request->is('api/*')) {
            $user = Auth::guard('portal')->user();
            
            // Mocking some stats for now as requested by the UI design
            $stats = [
                'total_transactions' => '12,847',
                'success_rate' => '99.2%',
                'total_volume' => 'Rp 4.8M',
                'avg_response_time' => '847ms',
            ];

            return response()->json([
                'user' => [
                    'name' => $user->name,
                    'email' => $user->email,
                    'company' => $user->company_name,
                ],
                'stats' => $stats,
                'vendors' => $this->getVendorPerformance(),
                'health' => $this->getVendorHealth(),
                'recent_transactions' => $this->getRecentTransactions(),
            ]);
        }

        // For direct browser access, serve the SPA shell
        return file_get_contents(public_path('homepage.html'));
    }

    private function getVendorPerformance()
    {
        return [
            ['name' => 'Qoinhub', 'rate' => 96.2, 'tx' => 4821],
            ['name' => 'Midtrans', 'rate' => 99.1, 'tx' => 5203],
            ['name' => 'Xendit', 'rate' => 94.8, 'tx' => 2823],
        ];
    }

    private function getVendorHealth()
    {
        return [
            ['name' => 'Qoinhub', 'status' => 'success', 'state' => 'Closed', 'rt' => 'avg 312ms', 'checked' => '2s ago'],
            ['name' => 'Midtrans', 'status' => 'success', 'state' => 'Closed', 'rt' => 'avg 248ms', 'checked' => '3s ago'],
            ['name' => 'Xendit', 'status' => 'pending', 'state' => 'Half-Open', 'rt' => 'avg 540ms', 'checked' => '5s ago'],
        ];
    }

    private function getRecentTransactions()
    {
        return [
            ['id' => 'ptms-7f2a91', 'amount' => 'Rp 150.000', 'vendor' => 'Midtrans', 'time' => '2m ago', 'ok' => true],
            ['id' => 'ptms-3c9b22', 'amount' => 'Rp 75.000', 'vendor' => 'Xendit', 'time' => '5m ago', 'ok' => true],
            ['id' => 'ptms-1a4d08', 'amount' => 'Rp 500.000', 'vendor' => 'Qoinhub', 'time' => '8m ago', 'ok' => true],
            ['id' => 'ptms-9e7c14', 'amount' => 'Rp 240.000', 'vendor' => 'Midtrans', 'time' => '11m ago', 'ok' => false],
        ];
    }
}
