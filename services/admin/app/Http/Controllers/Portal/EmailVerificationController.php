<?php

namespace App\Http\Controllers\Portal;

use App\Http\Controllers\Controller;
use App\Models\EmailVerificationToken;
use App\Models\User;
use App\Mail\AdminNewUserNotification;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Carbon\Carbon;

class EmailVerificationController extends Controller
{
    public function verify(string $token)
    {
        $hashedToken = hash('sha256', $token);
        
        $verificationToken = EmailVerificationToken::where('token_hash', $hashedToken)
            ->where('expires_at', '>', Carbon::now())
            ->whereNull('used_at')
            ->first();

        if (!$verificationToken) {
            return response()->json(['error' => 'Link verifikasi tidak valid atau sudah kadaluarsa'], 400);
        }

        return DB::transaction(function () use ($verificationToken) {
            $merchant = $verificationToken->merchant;
            
            $merchant->update([
                'status' => 'pending_approval',
                'email_verified_at' => Carbon::now(),
            ]);

            $verificationToken->update([
                'used_at' => Carbon::now(),
            ]);

            // Notify Admin via Mailable
            $admins = User::where('role', 'admin')->get();
            if ($admins->isNotEmpty()) {
                // Mail::to($admins)->send(new AdminNewUserNotification($merchant));
            }

            return redirect('/portal/pending-approval');
        });
    }
}
