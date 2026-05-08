<?php

namespace App\Http\Controllers\Portal;

use App\Http\Controllers\Controller;
use App\Models\Vendor;
use App\Models\VendorAccount;
use Illuminate\Support\Facades\Auth;
use Illuminate\Http\Request;

class VendorController extends Controller
{
    /**
     * Return JSON for the React Vendor Setup page
     */
    public function index(Request $request)
    {
        if ($request->wantsJson() || $request->is('api/*')) {
            $user = Auth::guard('portal')->user();
            $vendors = Vendor::where('is_active', true)->get();
            $vendorConfig = config('vendor_credentials');

            // Fetch accounts linked to this user
            $userAccounts = VendorAccount::whereIn('id', function($query) use ($user) {
                $query->select('account_id')
                      ->from('user_account_assignments')
                      ->where('user_id', $user->id);
            })->get()->keyBy('vendor_id');

            $data = $vendors->map(function ($vendor) use ($userAccounts, $vendorConfig) {
                $account = $userAccounts->get($vendor->id);
                
                return [
                    'id' => $vendor->id,
                    'code' => $vendor->code,
                    'name' => $vendor->name,
                    'is_configured' => !!$account,
                    'status' => $account ? $account->validation_status : 'not_configured',
                    'environment' => $account ? $account->environment : null,
                ];
            });

            return response()->json([
                'vendors' => $data
            ]);
        }

        // For direct browser access, serve the SPA shell
        return file_get_contents(public_path('homepage.html'));
    }
}
