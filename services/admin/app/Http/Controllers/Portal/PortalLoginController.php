<?php

namespace App\Http\Controllers\Portal;

use App\Http\Controllers\Controller;
use App\Models\Merchant;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
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

        $user = Merchant::where('email', $credentials['email'])->first();
        
        if (!$user) {
            Log::info("Portal Login: User not found: " . $credentials['email']);
            throw ValidationException::withMessages(['email' => [trans('auth.failed')]]);
        }

        // Extremely detailed debug
        $inputPass = $credentials['password'];
        $dbPass = $user->password;
        $check = Hash::check($inputPass, $dbPass);
        
        Log::info("Portal Login Debug:", [
            'email' => $user->email,
            'input_len' => strlen($inputPass),
            'db_pass_start' => substr($dbPass, 0, 10),
            'db_pass_len' => strlen($dbPass),
            'check_result' => $check ? 'TRUE' : 'FALSE'
        ]);

        if (!$check) {
            throw ValidationException::withMessages(['email' => [trans('auth.failed')]]);
        }

        switch ($user->status) {
            case 'pending_verification':
                throw ValidationException::withMessages(['email' => ['Silakan verifikasi email dulu']]);
            case 'pending_approval':
                throw ValidationException::withMessages(['email' => ['Akun sedang menunggu persetujuan admin']]);
            case 'rejected':
                throw ValidationException::withMessages(['email' => ['Akun ditolak. Hubungi support']]);
            case 'active':
                Auth::guard('portal')->login($user);
                $request->session()->regenerate();
                return response()->json([
                    'message' => 'Login successful',
                    'redirect' => route('portal.dashboard')
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
