<?php

namespace App\Http\Controllers\Portal;

use App\Http\Controllers\Controller;
use App\Models\Merchant;
use App\Models\EmailVerificationToken;
use App\Jobs\SendVerificationEmailJob;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Carbon\Carbon;

class RegisterController extends Controller
{
    public function create()
    {
        return view('portal.register');
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:merchants,email',
            'password' => 'required|string|min:8|confirmed',
            'company_name' => 'required|string|max:255',
            'use_case' => 'required|string',
            'expected_monthly_volume' => 'required|integer|min:0',
        ]);

        return DB::transaction(function () use ($validated) {
            $merchant = Merchant::create([
                'name' => $validated['name'],
                'email' => $validated['email'],
                'password_hash' => $validated['password'], 
                'company_name' => $validated['company_name'],
                'use_case' => $validated['use_case'],
                'expected_monthly_volume' => $validated['expected_monthly_volume'],
                'status' => 'pending_verification',
            ]);

            $rawToken = Str::random(60);
            $hashedToken = hash('sha256', $rawToken);

            EmailVerificationToken::create([
                'merchant_id' => $merchant->id,
                'token_hash' => $hashedToken,
                'expires_at' => Carbon::now()->addHours(24),
                'created_at' => now(),
            ]);

            SendVerificationEmailJob::dispatch($merchant, $rawToken);

            return response()->json([
                'message' => 'Registrasi berhasil. Cek email untuk verifikasi.',
                'merchant_id' => $merchant->id
            ], 201);
        });
    }
}
