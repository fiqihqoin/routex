<?php

namespace App\Http\Controllers\Portal;

use App\Http\Controllers\Controller;
use App\Models\Vendor;
use App\Models\VendorAccount;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class VendorController extends Controller
{
    public function index()
    {
        $user = Auth::guard('portal')->user();
        $vendors = Vendor::where('is_active', true)->get();
        
        $accounts = VendorAccount::whereIn('id', function($query) use ($user) {
            $query->select('account_id')
                  ->from('user_account_assignments')
                  ->where('user_id', $user->id);
        })->get()->keyBy('vendor_id');

        return view('portal.vendors.index', [
            'vendors' => $vendors,
            'accounts' => $accounts,
        ]);
    }

    public function store(Request $request, Vendor $vendor)
    {
        $user = Auth::guard('portal')->user();
        
        $validated = $request->validate([
            'credentials' => 'required|array',
            'account_name' => 'required|string|max:255',
        ]);

        DB::transaction(function () use ($user, $vendor, $validated) {
            $account = VendorAccount::create([
                'vendor_id' => $vendor->id,
                'account_name' => $validated['account_name'],
                'credentials' => $validated['credentials'],
                'is_active' => true,
            ]);

            DB::table('user_account_assignments')->insert([
                'id' => \Illuminate\Support\Str::uuid(),
                'user_id' => $user->id,
                'vendor_id' => $vendor->id,
                'account_id' => $account->id,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        });

        return back()->with('success', 'Vendor configured successfully.');
    }
}
