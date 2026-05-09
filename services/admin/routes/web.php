<?php

use App\Http\Controllers\Portal\RegisterController;
use App\Http\Controllers\Portal\EmailVerificationController;
use App\Http\Controllers\Portal\PortalLoginController;
use App\Http\Controllers\Portal\DashboardController;
use App\Http\Controllers\Portal\VendorCredentialController;
use App\Http\Controllers\Portal\ApiKeyController;
use Illuminate\Support\Facades\Route;

// React SPA Routes (Frontend shell)
Route::get('/', fn() => file_get_contents(public_path('homepage.html')));
Route::get('/login', fn() => file_get_contents(public_path('homepage.html')))->name('login');
Route::get('/register', fn() => file_get_contents(public_path('homepage.html')))->name('register');

// Protected Portal Routes (Served via SPA)
Route::middleware('auth:portal')->group(function () {
    Route::get('/portal', [DashboardController::class, 'index'])->name('portal.dashboard');
    Route::get('/portal/api-keys', fn() => view('portal.api-keys'))->name('portal.api-keys-page');
    Route::get('/portal/{any}', [DashboardController::class, 'index'])->where('any', '.*');
});

// Portal Backend API/Auth Logic
Route::prefix('portal')->name('portal.')->group(function () {
    Route::post('/register', [RegisterController::class, 'store'])->name('register.submit');
    Route::get('/verify-email/{token}', [EmailVerificationController::class, 'verify'])->name('verify-email');
    Route::post('/login', [PortalLoginController::class, 'store'])->name('login.submit');
    Route::post('/logout', [PortalLoginController::class, 'destroy'])->name('logout');
    
    Route::get('/pending-approval', fn() => view('portal.pending-approval'))->name('pending-approval');

    // Authenticated API logic (Can be used by React)
    Route::middleware('auth:portal')->group(function () {
        Route::get('/vendors/{vendorCode}/credentials', [VendorCredentialController::class, 'show'])->name('vendors.show');
        Route::post('/vendors/{vendorCode}/credentials', [VendorCredentialController::class, 'store'])->name('vendors.store');
        Route::patch('/vendors/{vendorCode}/toggle', [VendorCredentialController::class, 'toggle'])->name('vendors.toggle');

        // API Keys Management API
        Route::get('/api/keys', [ApiKeyController::class, 'index'])->name('api-keys.index');
        Route::post('/api/keys/regenerate-sandbox', [ApiKeyController::class, 'regenerateSandbox'])->name('api-keys.regenerate-sandbox');
        Route::post('/api/keys/regenerate-production', [ApiKeyController::class, 'regenerateProduction'])->name('api-keys.regenerate-production');
    });
});
