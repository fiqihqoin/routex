<?php

namespace App\Http\Controllers\Portal;

use App\Http\Controllers\Controller;
use App\Mail\EmailChangeVerificationMail;
use App\Mail\PasswordChangedNotificationMail;
use App\Models\ApiKey;
use App\Models\Merchant;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use PragmaRX\Google2FA\Google2FA;

class ProfileController extends Controller
{
    /**
     * Display the merchant's profile information.
     */
    public function show(Request $request): JsonResponse
    {
        $merchant = Auth::guard('portal')->user();

        return response()->json([
            'profile' => [
                'id' => $merchant->id,
                'name' => $merchant->name,
                'email' => $merchant->email,
                'pending_email' => $merchant->pending_email,
                'company_name' => $merchant->company_name,
                'phone_number' => $merchant->phone_number,
                'industry' => $merchant->industry,
                'use_case' => $merchant->use_case,
                'expected_monthly_volume' => $merchant->expected_monthly_volume,
                'status' => $merchant->status,
                'email_verified_at' => $merchant->email_verified_at,
                'last_password_changed_at' => $merchant->last_password_changed_at,
                'two_factor_enabled' => $merchant->two_factor_enabled,
                'member_since' => $merchant->created_at,
                'approved_at' => $merchant->approved_at,
            ]
        ]);
    }

    /**
     * Update the general profile information.
     */
    public function updateInfo(Request $request): JsonResponse
    {
        $merchant = Auth::guard('portal')->user();

        $request->validate([
            'name' => 'required|string|min:2|max:255',
            'company_name' => 'nullable|string|max:255',
            'phone_number' => 'nullable|string|max:50',
            'industry' => 'nullable|string|max:100', // You can add 'in:...' if you have a list
            'use_case' => 'nullable|string|max:500',
            'expected_monthly_volume' => 'nullable|integer|min:0',
        ]);

        $merchant->update($request->only([
            'name', 'company_name', 'phone_number',
            'industry', 'use_case', 
            'expected_monthly_volume'
        ]));

        return response()->json(['success' => true, 'message' => 'Profile updated']);
    }

    /**
     * Request an email change.
     */
    public function requestEmailChange(Request $request): JsonResponse
    {
        $merchant = Auth::guard('portal')->user();

        $request->validate([
            'email' => 'required|email|unique:merchants,email',
            'current_password' => 'required',
        ]);

        if (!Hash::check($request->current_password, $merchant->password_hash)) {
            return response()->json(['error' => 'Password tidak sesuai'], 422);
        }

        if ($request->email === $merchant->email) {
            return response()->json(['error' => 'Email baru sama dengan email saat ini'], 422);
        }

        $rawToken = Str::random(60);
        $hashedToken = hash('sha256', $rawToken);

        $merchant->update([
            'pending_email' => $request->email,
            'pending_email_token_hash' => $hashedToken,
            'pending_email_token_expires_at' => now()->addHours(24),
        ]);

        Mail::to($request->email)->send(new EmailChangeVerificationMail($merchant, $rawToken));

        return response()->json([
            'success' => true,
            'message' => 'Link verifikasi dikirim ke ' . $request->email . '. Berlaku 24 jam.'
        ]);
    }

    /**
     * Cancel a pending email change request.
     */
    public function cancelEmailChange(Request $request): JsonResponse
    {
        $merchant = Auth::guard('portal')->user();

        $merchant->update([
            'pending_email' => null,
            'pending_email_token_hash' => null,
            'pending_email_token_expires_at' => null,
        ]);

        return response()->json(['success' => true, 'message' => 'Permintaan ganti email dibatalkan']);
    }

    /**
     * Verify and apply the email change.
     */
    public function verifyEmailChange(string $token)
    {
        $hashedToken = hash('sha256', $token);

        $merchant = Merchant::where('pending_email_token_hash', $hashedToken)
            ->where('pending_email_token_expires_at', '>', now())
            ->first();

        if (!$merchant) {
            return response()->json(['error' => 'Token tidak valid atau sudah kadaluarsa'], 400);
        }

        DB::transaction(function() use ($merchant) {
            $merchant->update([
                'email' => $merchant->pending_email,
                'pending_email' => null,
                'pending_email_token_hash' => null,
                'pending_email_token_expires_at' => null,
            ]);
        });

        // Optional: Logout other sessions can be done here as well

        return redirect('/portal?email_changed=1');
    }

    /**
     * Change the merchant's password.
     */
    public function changePassword(Request $request): JsonResponse
    {
        $merchant = Auth::guard('portal')->user();

        $request->validate([
            'current_password' => 'required',
            'new_password' => 'required|string|min:8|confirmed|different:current_password',
        ]);

        if (!Hash::check($request->current_password, $merchant->password_hash)) {
            return response()->json(['error' => 'Password saat ini tidak sesuai'], 422);
        }

        $merchant->update([
            'password_hash' => Hash::make($request->new_password),
            'last_password_changed_at' => now(),
        ]);

        // Invalidate all other sessions
        DB::table('sessions')
            ->where('user_id', $merchant->id)
            ->where('id', '!=', session()->getId())
            ->delete();

        Mail::to($merchant->email)->send(new PasswordChangedNotificationMail($merchant));

        return response()->json([
            'success' => true,
            'message' => 'Password berhasil diubah. Semua sesi lain telah dinonaktifkan.'
        ]);
    }

    /**
     * Get active sessions.
     */
    public function getSessions(Request $request): JsonResponse
    {
        $merchant = Auth::guard('portal')->user();

        return response()->json([
            'sessions' => $merchant->getActiveSessions()
        ]);
    }

    /**
     * Revoke a specific session.
     */
    public function revokeSession(Request $request): JsonResponse
    {
        $merchant = Auth::guard('portal')->user();

        $request->validate(['session_id' => 'required|string']);

        if ($request->session_id === session()->getId()) {
            return response()->json(['error' => 'Gunakan logout untuk mengakhiri sesi saat ini'], 422);
        }

        $session = DB::table('sessions')
            ->where('id', $request->session_id)
            ->where('user_id', $merchant->id)
            ->first();

        if (!$session) {
            return response()->json(['error' => 'Not found'], 404);
        }

        DB::table('sessions')->where('id', $request->session_id)->delete();

        return response()->json(['success' => true]);
    }

    /**
     * Revoke all sessions except the current one.
     */
    public function revokeAllSessions(Request $request): JsonResponse
    {
        $merchant = Auth::guard('portal')->user();

        DB::table('sessions')
            ->where('user_id', $merchant->id)
            ->where('id', '!=', session()->getId())
            ->delete();

        return response()->json([
            'success' => true,
            'message' => 'Semua sesi lain telah dinonaktifkan'
        ]);
    }

    /**
     * Enable Two-Factor Authentication.
     */
    public function enableTwoFactor(Request $request): JsonResponse
    {
        $merchant = Auth::guard('portal')->user();
        $google2fa = new Google2FA();

        $secret = $google2fa->generateSecretKey();

        // Encrypt and store temporarily in session
        session(['pending_2fa_secret' => Crypt::encryptString($secret)]);

        $qrCodeUrl = $google2fa->getQRCodeUrl(
            'Routex',
            $merchant->email,
            $secret
        );

        return response()->json([
            'qr_code_url' => $qrCodeUrl,
            'secret' => $secret,
            'message' => 'Scan QR code lalu konfirmasi dengan OTP'
        ]);
    }

    /**
     * Confirm and activate Two-Factor Authentication.
     */
    public function confirmTwoFactor(Request $request): JsonResponse
    {
        $merchant = Auth::guard('portal')->user();
        $google2fa = new Google2FA();

        $request->validate(['otp' => 'required|string|size:6']);

        $pendingSecret = session('pending_2fa_secret');
        if (!$pendingSecret) {
            return response()->json(['error' => 'Sesi kadaluarsa, silakan coba lagi'], 422);
        }

        $secret = Crypt::decryptString($pendingSecret);

        if (!$google2fa->verifyKey($secret, $request->otp)) {
            return response()->json(['error' => 'Kode OTP tidak valid'], 422);
        }

        $recoveryCodes = collect(range(1, 8))
            ->map(fn() => Str::random(10) . '-' . Str::random(10))
            ->toArray();

        $merchant->update([
            'two_factor_secret' => Crypt::encryptString($secret),
            'two_factor_enabled' => true,
            'two_factor_recovery_codes' => Crypt::encryptString(json_encode($recoveryCodes))
        ]);

        session()->forget('pending_2fa_secret');

        return response()->json([
            'success' => true,
            'recovery_codes' => $recoveryCodes,
            'message' => 'Simpan recovery codes ini di tempat aman'
        ]);
    }

    /**
     * Get 2FA recovery codes (requires password confirmation).
     */
    public function getRecoveryCodes(Request $request): JsonResponse
    {
        $merchant = Auth::guard('portal')->user();

        $request->validate(['password' => 'required']);

        if (!Hash::check($request->password, $merchant->password_hash)) {
            return response()->json(['error' => 'Password tidak sesuai'], 422);
        }

        if (!$merchant->two_factor_enabled || !$merchant->two_factor_recovery_codes) {
            return response()->json(['error' => '2FA tidak aktif'], 400);
        }

        $codes = json_decode(Crypt::decryptString($merchant->two_factor_recovery_codes), true);

        return response()->json([
            'success' => true,
            'recovery_codes' => $codes
        ]);
    }

    /**
     * Disable Two-Factor Authentication.
     */
    public function disableTwoFactor(Request $request): JsonResponse
    {
        $merchant = Auth::guard('portal')->user();

        $request->validate(['password' => 'required']);

        if (!Hash::check($request->password, $merchant->password_hash)) {
            return response()->json(['error' => 'Password tidak sesuai'], 422);
        }

        $merchant->update([
            'two_factor_secret' => null,
            'two_factor_enabled' => false,
            'two_factor_recovery_codes' => null,
        ]);

        return response()->json(['success' => true]);
    }

    /**
     * Soft delete the merchant account.
     */
    public function deleteAccount(Request $request): JsonResponse
    {
        $merchant = Auth::guard('portal')->user();

        $request->validate([
            'password' => 'required',
            'confirmation' => 'required|in:DELETE',
        ]);

        if (!Hash::check($request->password, $merchant->password_hash)) {
            return response()->json(['error' => 'Password tidak sesuai'], 422);
        }

        DB::transaction(function() use ($merchant) {
            // Revoke all API keys
            ApiKey::where('merchant_id', $merchant->id)
                ->update([
                    'revoked_at' => now(), 
                    'revoked_reason' => 'Account deleted'
                ]);

            // Clear all sessions
            DB::table('sessions')->where('user_id', $merchant->id)->delete();

            // Soft delete and anonymize
            $merchant->update([
                'deleted_at' => now(),
                'status' => 'rejected',
                'email' => 'deleted_' . $merchant->id . '@deleted.routex.id',
                'name' => 'Deleted Account',
                'company_name' => null,
                'phone_number' => null,
            ]);
        });

        Auth::guard('portal')->logout();
        session()->invalidate();

        return response()->json([
            'success' => true,
            'message' => 'Akun berhasil dihapus'
        ]);
    }
}
