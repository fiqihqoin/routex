<?php

namespace App\Http\Controllers\Portal;

use App\Http\Controllers\Controller;
use App\Models\Vendor;
use App\Models\MerchantVendorCredential;
use App\Services\VendorValidationService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Redis;
use Illuminate\Support\Str;

class VendorCredentialController extends Controller
{
    public function __construct(
        protected VendorValidationService $validationService
    ) {}

    public function show(Request $request, string $vendorCode)
    {
        $merchant = Auth::guard('portal')->user();
        $vendor = Vendor::where('code', $vendorCode)->firstOrFail();
        $config = config("vendor_credentials.{$vendorCode}");
        $environment = $request->header('X-Routex-Environment', 'sandbox');

        if (!$config) {
            if ($request->wantsJson()) return response()->json(['error' => 'Vendor config not found'], 404);
            abort(404, "Vendor configuration not found.");
        }

        $existingCredential = $merchant->vendorCredentials()
            ->where('vendor_id', $vendor->id)
            ->where('environment', $environment)
            ->first();

        if ($request->wantsJson()) {
            return response()->json([
                'vendor' => $vendor,
                'config' => $config,
                'account' => $existingCredential,
            ]);
        }

        return file_get_contents(public_path('homepage.html'));
    }

    public function store(Request $request, string $vendorCode)
    {
        $merchant = Auth::guard('portal')->user();
        $vendor = Vendor::where('code', $vendorCode)->firstOrFail();
        $config = config("vendor_credentials.{$vendorCode}");

        if (!$config) {
            return response()->json(['error' => 'Vendor configuration not found.'], 404);
        }

        $rules = [
            'account_name' => 'required|string|max:255',
            'credentials' => 'required|array',
        ];
        
        foreach ($config['fields'] as $field) {
            $key = $field['key'];
            $rule = ($field['required'] ?? false) ? 'required' : 'nullable';
            if ($field['type'] === 'boolean') {
                $rule .= '|boolean';
            } else {
                $rule .= '|string';
            }
            $rules["credentials.{$key}"] = $rule;
        }

        $validated = $request->validate($rules);
        $credentials = $validated['credentials'];
        $environment = $request->header('X-Routex-Environment', 'sandbox');

        // --- TEST CONNECTION ---
        $validationResult = $this->validationService->validate($vendorCode, $credentials);
        if (!$validationResult->isValid) {
            return response()->json([
                'message' => 'Connection test failed',
                'errors' => ['credentials' => [$validationResult->message]]
            ], 422);
        }
        // -----------------------

        $merchant->vendorCredentials()->updateOrCreate(
            [
                'vendor_id' => $vendor->id,
                'environment' => $environment,
            ],
            [
                'credentials_encrypted' => $credentials, // Handled by trait
                'validation_status' => 'valid',
                'last_validated_at' => now(),
                'validation_error' => null,
                'is_enabled' => true,
            ]
        );

        Redis::publish('config:update', "merchant-{$merchant->id}-{$vendorCode}");

        return response()->json([
            'message' => "Credentials for {$vendor->name} in " . ucfirst($environment) . " are valid and activated.",
            'redirect' => '/portal/vendors'
        ]);
    }

    public function toggle(Request $request, string $vendorCode)
    {
        $merchant = Auth::guard('portal')->user();
        $vendor = Vendor::where('code', $vendorCode)->firstOrFail();
        $environment = $request->header('X-Routex-Environment', 'sandbox');

        $credential = $merchant->vendorCredentials()
            ->where('vendor_id', $vendor->id)
            ->where('environment', $environment)
            ->firstOrFail();

        $credential->is_enabled = !$credential->is_enabled;
        
        if (!$credential->is_enabled) {
            $credential->validation_status = 'unchecked';
        }

        $credential->save();

        Redis::publish('config:update', "merchant-{$merchant->id}-{$vendorCode}");

        return response()->json([
            'is_active' => $credential->is_enabled,
            'message' => "Vendor {$vendor->name} is now " . ($credential->is_enabled ? 'Active' : 'Inactive') . " for " . ucfirst($environment) . "."
        ]);
    }
}
