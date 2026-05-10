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
use Illuminate\Support\Facades\Route;

// React SPA Routes (Frontend shell)
Route::get('/', fn() => file_get_contents(public_path('homepage.html')));
Route::get('/login', fn() => file_get_contents(public_path('homepage.html')))->name('login');
Route::get('/register', fn() => file_get_contents(public_path('homepage.html')))->name('register');

// Protected Portal Routes
Route::middleware('auth:portal')->group(function () {
    
    // 1. Dashboard UI (Root portal path)
    Route::get('/portal', [DashboardController::class, 'serveApp'])->name('portal.dashboard');
    
    // 2. Portal Backend API logic
    Route::prefix('portal')->name('portal.')->group(function () {
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
    });

    // 3. SPA Catch-all (Must be last)
    Route::get('/portal/{any}', [DashboardController::class, 'serveApp'])->where('any', '.*');
});

// Public Portal Backend API/Auth Logic
Route::prefix('portal')->name('portal.')->group(function () {
    Route::post('/register', [RegisterController::class, 'store'])->name('register.submit');
    Route::get('/verify-email/{token}', [EmailVerificationController::class, 'verify'])->name('verify-email');
    Route::post('/login', [PortalLoginController::class, 'store'])->name('login.submit');
    Route::post('/logout', [PortalLoginController::class, 'destroy'])->name('logout');
    
    Route::get('/pending-approval', fn() => view('portal.pending-approval'))->name('pending-approval');
});
