<?php

namespace App\Http\Controllers\Portal;

use App\Http\Controllers\Controller;
use App\Models\Vendor;
use App\Models\VendorAccount;
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
        $user = Auth::guard('portal')->user();
        $vendor = Vendor::where('code', $vendorCode)->firstOrFail();
        $config = config("vendor_credentials.{$vendorCode}");

        if (!$config) {
            if ($request->wantsJson()) return response()->json(['error' => 'Vendor config not found'], 404);
            abort(404, "Vendor configuration not found.");
        }

        $existingAccount = VendorAccount::whereIn('id', function($query) use ($user) {
            $query->select('account_id')
                  ->from('user_account_assignments')
                  ->where('user_id', $user->id);
        })->where('vendor_id', $vendor->id)->first();

        if ($request->wantsJson()) {
            return response()->json([
                'vendor' => $vendor,
                'config' => $config,
                'account' => $existingAccount,
            ]);
        }

        return file_get_contents(public_path('homepage.html'));
    }

    public function store(Request $request, string $vendorCode)
    {
        $user = Auth::guard('portal')->user();
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

        // --- TEST CONNECTION ---
        $validationResult = $this->validationService->validate($vendorCode, $credentials);
        if (!$validationResult->isValid) {
            return response()->json([
                'message' => 'Connection test failed',
                'errors' => ['credentials' => [$validationResult->message]]
            ], 422);
        }
        // -----------------------

        DB::transaction(function () use ($user, $vendor, $validated, $credentials) {
            $existingAssignment = DB::table('user_account_assignments as uaa')
                ->join('vendor_accounts as va', 'uaa.account_id', '=', 'va.id')
                ->where('uaa.user_id', $user->id)
                ->where('va.vendor_id', $vendor->id)
                ->select('uaa.*', 'uaa.account_id')
                ->first();

            $isProduction = filter_var($credentials['is_production'] ?? false, FILTER_VALIDATE_BOOLEAN);

            $data = [
                'account_name' => $validated['account_name'],
                'credentials' => $credentials,
                'validation_status' => 'valid',
                'last_validated_at' => now(),
                'validation_error' => null,
                'environment' => $isProduction ? 'production' : 'sandbox',
            ];

            if ($existingAssignment) {
                $account = VendorAccount::find($existingAssignment->account_id);
                $account->update($data);
            } else {
                $account = VendorAccount::create(array_merge($data, [
                    'vendor_id' => $vendor->id,
                    'is_active' => true,
                ]));

                DB::table('user_account_assignments')->insert([
                    'id' => Str::uuid(),
                    'user_id' => $user->id,
                    'vendor_id' => $vendor->id,
                    'account_id' => $account->id,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
        });

        Redis::publish('config:update', "merchant-{$user->id}-{$vendorCode}");

        return response()->json([
            'message' => "Credentials for {$vendor->name} are valid and activated.",
            'redirect' => '/portal/vendors'
        ]);
    }

    public function toggle(Request $request, string $vendorCode)
    {
        $user = Auth::guard('portal')->user();
        $vendor = Vendor::where('code', $vendorCode)->firstOrFail();

        $account = VendorAccount::whereIn('id', function($query) use ($user) {
            $query->select('account_id')
                  ->from('user_account_assignments')
                  ->where('user_id', $user->id);
        })->where('vendor_id', $vendor->id)->firstOrFail();

        $account->is_active = !$account->is_active;
        
        if (!$account->is_active) {
            $account->validation_status = 'unchecked';
        }

        $account->save();

        Redis::publish('config:update', "merchant-{$user->id}-{$vendorCode}");

        return response()->json([
            'is_active' => $account->is_active,
            'message' => "Vendor {$vendor->name} is now " . ($account->is_active ? 'Active' : 'Inactive') . "."
        ]);
    }
}
