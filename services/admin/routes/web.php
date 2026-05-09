<?php

use App\Http\Controllers\Portal\RegisterController;
use App\Http\Controllers\Portal\EmailVerificationController;
use App\Http\Controllers\Portal\PortalLoginController;
use App\Http\Controllers\Portal\DashboardController;
use App\Http\Controllers\Portal\VendorController;
use App\Http\Controllers\Portal\VendorCredentialController;
use App\Http\Controllers\Portal\ApiKeyController;
use App\Http\Controllers\Portal\TransactionController;
use Illuminate\Support\Facades\Route;

// React SPA Routes (Frontend shell)
Route::get('/', fn() => file_get_contents(public_path('homepage.html')));
Route::get('/login', fn() => file_get_contents(public_path('homepage.html')))->name('login');
Route::get('/register', fn() => file_get_contents(public_path('homepage.html')))->name('register');

// Protected Portal Routes (Served via SPA)
Route::middleware('auth:portal')->group(function () {
    Route::get('/portal', [DashboardController::class, 'index'])->name('portal.dashboard');
    
    // Portal Backend API logic
    Route::prefix('portal')->name('portal.')->group(function () {
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
    });

    // SPA Catch-all (Must be last)
    Route::get('/portal/{any}', [DashboardController::class, 'index'])->where('any', '.*');
});

// Public Portal Backend API/Auth Logic
Route::prefix('portal')->name('portal.')->group(function () {
    Route::post('/register', [RegisterController::class, 'store'])->name('register.submit');
    Route::get('/verify-email/{token}', [EmailVerificationController::class, 'verify'])->name('verify-email');
    Route::post('/login', [PortalLoginController::class, 'store'])->name('login.submit');
    Route::post('/logout', [PortalLoginController::class, 'destroy'])->name('logout');
    
    Route::get('/pending-approval', fn() => view('portal.pending-approval'))->name('pending-approval');
});
