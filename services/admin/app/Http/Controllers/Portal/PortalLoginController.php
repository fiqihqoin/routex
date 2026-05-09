<?php

namespace App\Http\Controllers\Portal;

use App\Http\Controllers\Controller;
use App\Models\Merchant;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class PortalLoginController extends Controller
{
    public function create()
    {
        return view('portal.auth.login');
    }

    public function store(Request $request)
    {
        $credentials = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required'],
        ]);

        $merchant = Merchant::where('email', $credentials['email'])->first();
        
        if (!$merchant || !Hash::check($credentials['password'], $merchant->password_hash)) {
            throw ValidationException::withMessages(['email' => [trans('auth.failed')]]);
        }

        switch ($merchant->status) {
            case 'pending_verification':
                throw ValidationException::withMessages(['email' => ['Silakan verifikasi email Anda terlebih dahulu.']]);
            case 'pending_approval':
                throw ValidationException::withMessages(['email' => ['Akun Anda sedang menunggu persetujuan admin.']]);
            case 'suspended':
                throw ValidationException::withMessages(['email' => ['Akun Anda ditangguhkan: ' . ($merchant->suspension_reason ?? 'Tidak ada alasan spesifik.')]]);
            case 'rejected':
                throw ValidationException::withMessages(['email' => ['Pendaftaran akun Anda ditolak.']]);
            case 'active':
                Auth::guard('portal')->login($merchant);
                $request->session()->regenerate();
                return response()->json([
                    'message' => 'Login successful',
                    'redirect' => '/portal'
                ]);
            default:
                throw ValidationException::withMessages(['email' => ['Status akun tidak dikenal.']]);
        }
    }

    public function destroy(Request $request)
    {
        Auth::guard('portal')->logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();
        return redirect('/login');
    }
}
