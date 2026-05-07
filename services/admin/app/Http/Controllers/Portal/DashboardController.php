<?php

namespace App\Http\Controllers\Portal;

use App\Http\Controllers\Controller;
use App\Models\Vendor;
use App\Models\VendorAccount;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    public function index()
    {
        $user = Auth::guard('portal')->user();
        
        $vendors = Vendor::where('is_active', true)->get();
        $vendorConfig = config('vendor_credentials');

        // Fetch accounts linked to this user
        $userAccounts = VendorAccount::whereIn('id', function($query) use ($user) {
            $query->select('account_id')
                  ->from('user_account_assignments')
                  ->where('user_id', $user->id);
        })->get()->keyBy('vendor_id');

        $vendorData = $vendors->map(function ($vendor) use ($userAccounts, $vendorConfig) {
            $account = $userAccounts->get($vendor->id);
            $config = $vendorConfig[$vendor->code] ?? [];
            
            $status = 'Belum dikonfigurasi';
            $statusColor = 'gray';

            if ($account) {
                if ($account->validation_status === 'invalid') {
                    $status = 'Error';
                    $statusColor = 'red';
                } else {
                    $env = ucfirst($account->environment ?? 'sandbox');
                    $status = "{$env} aktif";
                    $statusColor = $account->environment === 'production' ? 'green' : 'blue';
                }
            }

            return [
                'id' => $vendor->id,
                'code' => $vendor->code,
                'name' => $vendor->name,
                'status' => $status,
                'status_color' => $statusColor,
                'webhook_url' => $config['webhook_url'] ?? '',
                'has_account' => !!$account,
            ];
        });

        return view('portal.dashboard', [
            'user' => $user,
            'vendorData' => $vendorData,
        ]);
    }
}
