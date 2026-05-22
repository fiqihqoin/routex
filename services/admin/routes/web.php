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

/*
|--------------------------------------------------------------------------
| Web Routes - API Backend for Merchant Portal
|--------------------------------------------------------------------------
|
| These routes serve as JSON API backend for the React merchant portal.
| The React SPA is served from the separate FE container (caishenengine-fe).
|
*/

// ============================================================================
// PUBLIC PORTAL API (Authentication & Registration)
// ============================================================================
Route::prefix('api/portal')->name('api.portal.')->group(function () {
    // Authentication
    Route::post('/login', [PortalLoginController::class, 'store'])->name('login');
    Route::post('/login/2fa', [PortalLoginController::class, 'verify2fa'])->name('login.2fa');
    Route::post('/logout', [PortalLoginController::class, 'destroy'])->name('logout');

    // Registration (Disabled - Admin registers merchants manually)
    // Route::post('/register', [RegisterController::class, 'store'])->name('register');

    // Email Verification (public link from email)
    Route::get('/verify-email/{token}', [EmailVerificationController::class, 'verify'])
        ->name('verify-email');
});

// ============================================================================
// PROTECTED PORTAL API (Requires Authentication)
// ============================================================================
Route::middleware('auth:portal')->prefix('api/portal')->name('api.portal.')->group(function () {

    // User & Dashboard
    Route::get('/me', [DashboardController::class, 'me'])->name('me');
    Route::get('/dashboard', [DashboardController::class, 'dashboard'])->name('dashboard');
    Route::get('/dashboard/chart', [DashboardController::class, 'volumeChart'])->name('dashboard.chart');

    // Vendor Management
    Route::get('/vendors', [VendorController::class, 'index'])->name('vendors.index');
    Route::get('/vendors/{vendorCode}/credentials', [VendorCredentialController::class, 'show'])
        ->name('vendors.credentials.show');
    Route::post('/vendors/{vendorCode}/credentials', [VendorCredentialController::class, 'store'])
        ->name('vendors.credentials.store');
    Route::patch('/vendors/{vendorCode}/toggle', [VendorCredentialController::class, 'toggle'])
        ->name('vendors.toggle');

    // API Keys Management
    Route::prefix('api-keys')->name('api-keys.')->group(function () {
        Route::get('/', [ApiKeyController::class, 'index'])->name('index');
        Route::post('/generate', [ApiKeyController::class, 'generate'])->name('generate');
        Route::delete('/{keyId}/revoke', [ApiKeyController::class, 'revoke'])->name('revoke');
        Route::patch('/{keyId}/name', [ApiKeyController::class, 'updateName'])->name('update-name');
    });

    // Transactions
    Route::prefix('transactions')->name('transactions.')->group(function () {
        Route::get('/', [TransactionController::class, 'index'])->name('index');
        Route::get('/stats', [TransactionController::class, 'stats'])->name('stats');
        Route::get('/{transactionId}', [TransactionController::class, 'show'])->name('show');
    });

    // Webhooks
    Route::prefix('webhooks')->name('webhooks.')->group(function () {
        Route::get('/', [WebhookController::class, 'index'])->name('index');
        Route::post('/', [WebhookController::class, 'upsert'])->name('upsert');
        Route::post('/test', [WebhookController::class, 'sendTest'])->name('test');
        Route::post('/rotate-secret', [WebhookController::class, 'rotateSecret'])->name('rotate-secret');
        Route::post('/reenable', [WebhookController::class, 'reenable'])->name('reenable');
        Route::delete('/', [WebhookController::class, 'delete'])->name('delete');
    });

    // Profile & Security
    Route::prefix('profile')->name('profile.')->group(function () {
        // Profile Info
        Route::get('/', [ProfileController::class, 'show'])->name('show');
        Route::patch('/info', [ProfileController::class, 'updateInfo'])->name('update-info');

        // Email Change
        Route::post('/email/change', [ProfileController::class, 'requestEmailChange'])->name('email.change');
        Route::post('/email/cancel', [ProfileController::class, 'cancelEmailChange'])->name('email.cancel');

        // Password Change
        Route::post('/password', [ProfileController::class, 'changePassword'])->name('password.change');

        // Session Management
        Route::get('/sessions', [ProfileController::class, 'getSessions'])->name('sessions');
        Route::delete('/sessions/{sessionId}', [ProfileController::class, 'revokeSession'])->name('sessions.revoke');
        Route::delete('/sessions', [ProfileController::class, 'revokeAllSessions'])->name('sessions.revoke-all');

        // 2FA Management
        Route::post('/2fa/enable', [ProfileController::class, 'enableTwoFactor'])->name('2fa.enable');
        Route::post('/2fa/confirm', [ProfileController::class, 'confirmTwoFactor'])->name('2fa.confirm');
        Route::post('/2fa/recovery-codes', [ProfileController::class, 'getRecoveryCodes'])->name('2fa.recovery-codes');
        Route::delete('/2fa', [ProfileController::class, 'disableTwoFactor'])->name('2fa.disable');

        // Account Deletion
        Route::delete('/account', [ProfileController::class, 'deleteAccount'])->name('account.delete');
    });
});

// Email Verification (public, no auth required)
Route::get('/api/portal/profile/email/verify/{token}', [ProfileController::class, 'verifyEmailChange'])
    ->name('api.portal.profile.email.verify');

// ============================================================================
// ADMIN PANEL ROUTES
// ============================================================================
// Will be automatically registered by Filament after installation
// Access: http://localhost/admin
