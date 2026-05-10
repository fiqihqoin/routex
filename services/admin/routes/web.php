<?php

use App\Http\Controllers\Portal\RegisterController;
use App\Http\Controllers\Portal\EmailVerificationController;
use App\Http\Controllers\Portal\PortalLoginController;
use App\Http\Controllers\Portal\DashboardController;
use App\Http\Controllers\Portal\VendorController;
use App\Http\Controllers\Portal\VendorCredentialController;
use App\Http\Controllers\Portal\ApiKeyController;
use App\Http\Controllers\Portal\TransactionController;
use App\Http\Controllers\Portal\WebhookController;
use App\Http\Controllers\Portal\ProfileController;
use Illuminate\Support\Facades\Route;

// React SPA Routes (Frontend shell)
Route::get('/', fn() => file_get_contents(public_path('homepage.html')));
Route::get('/login', fn() => file_get_contents(public_path('homepage.html')))->name('login');
Route::get('/register', fn() => file_get_contents(public_path('homepage.html')))->name('register');

// Protected Portal Routes
Route::middleware('auth:portal')->group(function () {
    
    // 1. Dashboard UI (Root portal path)
    Route::get('/portal', [DashboardController::class, 'serveApp'])->name('portal.dashboard');
    
    // Portal Backend API logic
    Route::prefix('portal')->name('portal.')->group(function () {
        // Auth & User
        Route::get('/me', [DashboardController::class, 'me'])->name('me');

        // Dashboard Data
        Route::get('/dashboard', [DashboardController::class, 'dashboard'])->name('dashboard.data');

        Route::get('/dashboard/chart', [DashboardController::class, 'volumeChart'])->name('dashboard.chart');

        // Vendor Management
        Route::get('/vendors', [VendorController::class, 'index'])->name('vendors.index');
        Route::get('/vendors/{vendorCode}/credentials', [VendorCredentialController::class, 'show'])->name('vendors.show');
        Route::post('/vendors/{vendorCode}/credentials', [VendorCredentialController::class, 'store'])->name('vendors.store');
        Route::patch('/vendors/{vendorCode}/toggle', [VendorCredentialController::class, 'toggle'])->name('vendors.toggle');

        // API Keys Management API
        Route::prefix('api-keys')->name('api-keys.')
            ->group(function () {
                Route::get('/', [ApiKeyController::class, 'index'])->name('index');
                Route::post('/generate', [ApiKeyController::class, 'generate'])->name('generate');
                Route::delete('/{keyId}/revoke', [ApiKeyController::class, 'revoke'])->name('revoke');
                Route::patch('/{keyId}/name', [ApiKeyController::class, 'updateName'])->name('update-name');
            });

        // Transactions API
        Route::prefix('transactions')->name('transactions.')
            ->group(function () {
                Route::get('/', [TransactionController::class, 'index'])->name('index');
                Route::get('/stats', [TransactionController::class, 'stats'])->name('stats');
                Route::get('/{transactionId}', [TransactionController::class, 'show'])->name('show');
            });

        // Webhooks API
        Route::prefix('webhooks')->name('webhooks.')
            ->group(function () {
                Route::get('/', [WebhookController::class, 'index'])->name('index');
                Route::post('/', [WebhookController::class, 'upsert'])->name('upsert');
                Route::post('/test', [WebhookController::class, 'sendTest'])->name('test');
                Route::post('/rotate-secret', [WebhookController::class, 'rotateSecret'])->name('rotate-secret');
                Route::post('/reenable', [WebhookController::class, 'reenable'])->name('reenable');
                Route::delete('/', [WebhookController::class, 'delete'])->name('delete');
            });

        // Profile & Security API
        Route::prefix('profile')->name('profile.')
            ->group(function () {
                // GET - ambil data profile
                Route::get('/', [ProfileController::class, 'show'])->name('show');
                
                // PATCH - update info personal & perusahaan
                Route::patch('/info', [ProfileController::class, 'updateInfo'])->name('update-info');
                
                // POST - request ganti email (kirim verif ke email baru)
                Route::post('/email/change', [ProfileController::class, 'requestEmailChange'])->name('email.change');
                Route::post('/email/cancel', [ProfileController::class, 'cancelEmailChange'])->name('email.cancel');
                
                // GET - verifikasi email baru dari link di email
                Route::get('/email/verify/{token}', [ProfileController::class, 'verifyEmailChange'])
                    ->name('email.verify')
                    ->withoutMiddleware('auth:portal'); 

                // POST - ganti password
                Route::post('/password', [ProfileController::class, 'changePassword'])->name('password.change');
                
                // GET - list active sessions
                Route::get('/sessions', [ProfileController::class, 'getSessions'])->name('sessions');
                
                // DELETE - revoke specific session
                Route::delete('/sessions/{sessionId}', [ProfileController::class, 'revokeSession'])->name('sessions.revoke');
                // DELETE - revoke all other sessions
                Route::delete('/sessions', [ProfileController::class, 'revokeAllSessions'])->name('sessions.revoke-all');

                // 2FA

                // POST - mulai setup 2FA (return QR code)
                Route::post('/2fa/enable', [ProfileController::class, 'enableTwoFactor'])->name('2fa.enable');
                
                // POST - konfirmasi OTP untuk aktifkan 2FA
                Route::post('/2fa/confirm', [ProfileController::class, 'confirmTwoFactor'])->name('2fa.confirm');
                
                // POST - ambil recovery codes (dengan password)
                Route::post('/2fa/recovery-codes', [ProfileController::class, 'getRecoveryCodes'])->name('2fa.recovery-codes');

                // DELETE - nonaktifkan 2FA
                Route::delete('/2fa', [ProfileController::class, 'disableTwoFactor'])->name('2fa.disable');
                
                // DELETE - hapus akun (soft delete + anonymize)
                Route::delete('/account', [ProfileController::class, 'deleteAccount'])->name('account.delete');
            });
    });

    // 3. SPA Catch-all (Must be last)
    Route::get('/portal/{any}', [DashboardController::class, 'serveApp'])->where('any', '.*');
});

// Public Portal Backend API/Auth Logic
Route::prefix('portal')->name('portal.')->group(function () {
    Route::post('/register', [RegisterController::class, 'store'])->name('register.submit');
    Route::get('/verify-email/{token}', [EmailVerificationController::class, 'verify'])->name('verify-email');
    Route::post('/login', [PortalLoginController::class, 'store'])->name('login.submit');
    Route::post('/login/2fa', [PortalLoginController::class, 'verify2fa'])->name('login.2fa');
    Route::post('/logout', [PortalLoginController::class, 'destroy'])->name('logout');
    
    Route::get('/pending-approval', fn() => view('portal.pending-approval'))->name('pending-approval');
});
