<?php

namespace App\Http\Controllers\Portal;

use App\Http\Controllers\Controller;
use App\Models\Vendor;
use App\Models\MerchantVendorCredential;
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
            $merchant = Auth::guard('portal')->user();
            $environment = $request->header('X-Routex-Environment', 'sandbox');
            $vendors = Vendor::all();

            // Fetch credentials for this merchant in the specific environment
            $credentials = $merchant->vendorCredentials()
                ->where('environment', $environment)
                ->get()
                ->keyBy('vendor_id');

            $data = $vendors->map(function ($vendor) use ($credentials, $environment) {
                $cred = $credentials->get($vendor->id);
                
                return [
                    'id' => $vendor->id,
                    'code' => $vendor->code,
                    'name' => $vendor->name,
                    'is_configured' => !!$cred,
                    'is_active' => $cred ? (bool)$cred->is_enabled : false,
                    'status' => $cred ? $cred->validation_status : 'not_configured',
                    'environment' => $environment,
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
