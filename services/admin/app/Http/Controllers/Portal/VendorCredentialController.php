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

    public function index()
    {
        return redirect()->route('portal.dashboard');
    }

    public function show(string $vendorCode)
    {
        $user = Auth::guard('portal')->user();
        $vendor = Vendor::where('code', $vendorCode)->firstOrFail();
        $config = config("vendor_credentials.{$vendorCode}");

        if (!$config) {
            abort(404, "Vendor configuration not found.");
        }

        $existingAccount = VendorAccount::whereIn('id', function($query) use ($user) {
            $query->select('account_id')
                  ->from('user_account_assignments')
                  ->where('user_id', $user->id);
        })->where('vendor_id', $vendor->id)->first();

        return view('portal.vendors.form', [
            'vendor' => $vendor,
            'config' => $config,
            'existingAccount' => $existingAccount,
        ]);
    }

    public function store(Request $request, string $vendorCode)
    {
        $user = Auth::guard('portal')->user();
        $vendor = Vendor::where('code', $vendorCode)->firstOrFail();
        $config = config("vendor_credentials.{$vendorCode}");

        if (!$config) {
            return back()->withErrors(['error' => 'Vendor configuration not found.']);
        }

        $rules = [
            'account_name' => 'required|string|max:255',
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
            return back()->withInput()->withErrors(['credentials' => "Validation failed: " . $validationResult->message]);
        }
        // -----------------------

        DB::transaction(function () use ($user, $vendor, $validated, $credentials) {
            $existingAssignment = DB::table('user_account_assignments')
                ->where('user_id', $user->id)
                ->where('vendor_id', $vendor->id)
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

        return redirect()->route('portal.dashboard')->with('success', "Credentials for {$vendor->name} are valid and activated.");
    }
}
