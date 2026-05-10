<?php

namespace App\Http\Controllers\Portal;

use App\Http\Controllers\Controller;
use App\Models\Merchant;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Validation\ValidationException;
use PragmaRX\Google2FA\Google2FA;

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
                // Check if 2FA is enabled
                if ($merchant->two_factor_enabled) {
                    // Store merchant ID in session for 2nd stage
                    $request->session()->put('login.id', $merchant->id);
                    
                    return response()->json([
                        'two_factor_required' => true,
                        'message' => 'Autentikasi dua faktor diperlukan.'
                    ]);
                }

                Auth::guard('portal')->login($merchant);
                $request->session()->regenerate();
                return response()->json([
                    'message' => 'Login successful',
                    'redirect' => '/portal',
                    'user' => [
                        'id' => $merchant->id,
                        'name' => $merchant->name,
                        'email' => $merchant->email,
                        'company' => $merchant->company_name,
                        'merchant_id' => $merchant->id,
                    ]
                ]);
            default:
                throw ValidationException::withMessages(['email' => ['Status akun tidak dikenal.']]);
        }
    }

    /**
     * Verify 2FA code during login
     */
    public function verify2fa(Request $request)
    {
        $request->validate([
            'code' => 'required|string',
            'recovery' => 'boolean'
        ]);

        $merchantId = $request->session()->get('login.id');
        if (!$merchantId) {
            return response()->json(['error' => 'Sesi login kadaluarsa. Silakan login kembali.'], 422);
        }

        $merchant = Merchant::findOrFail($merchantId);
        $google2fa = new Google2FA();

        if ($request->recovery) {
            // Verify via recovery code
            $recoveryCodes = json_decode(Crypt::decryptString($merchant->two_factor_recovery_codes), true);
            
            if (($key = array_search($request->code, $recoveryCodes)) !== false) {
                // Remove used code
                unset($recoveryCodes[$key]);
                $merchant->update([
                    'two_factor_recovery_codes' => Crypt::encryptString(json_encode(array_values($recoveryCodes)))
                ]);
                $valid = true;
            } else {
                $valid = false;
            }
        } else {
            // Verify via OTP
            $secret = Crypt::decryptString($merchant->two_factor_secret);
            $valid = $google2fa->verifyKey($secret, $request->code);
        }

        if (!$valid) {
            return response()->json(['error' => 'Kode ' . ($request->recovery ? 'recovery' : 'OTP') . ' tidak valid.'], 422);
        }

        // Complete login
        Auth::guard('portal')->login($merchant);
        $request->session()->forget('login.id');
        $request->session()->regenerate();

        return response()->json([
            'message' => 'Login successful',
            'redirect' => '/portal',
            'user' => [
                'id' => $merchant->id,
                'name' => $merchant->name,
                'email' => $merchant->email,
                'company' => $merchant->company_name,
                'merchant_id' => $merchant->id,
            ]
        ]);
    }

    public function destroy(Request $request)
    {
        Auth::guard('portal')->logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();
        return redirect('/login');
    }
}
