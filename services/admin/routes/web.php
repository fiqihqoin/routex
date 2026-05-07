<?php

use App\Http\Controllers\Portal\RegisterController;
use App\Http\Controllers\Portal\EmailVerificationController;
use App\Http\Controllers\Portal\PortalLoginController;
use App\Http\Controllers\Portal\DashboardController;
use App\Http\Controllers\Portal\VendorCredentialController;
use Illuminate\Support\Facades\Route;

// React SPA Routes (Directly at root for SPA navigation)
Route::get('/', fn() => file_get_contents(public_path('homepage.html')));
Route::get('/login', fn() => file_get_contents(public_path('homepage.html')))->name('login');
Route::get('/register', fn() => file_get_contents(public_path('homepage.html')))->name('register');

// Portal Backend Logic
Route::prefix('portal')->name('portal.')->group(function () {
    // API-like endpoints for the React frontend
    Route::post('/register', [RegisterController::class, 'store'])->name('register.submit');
    Route::get('/verify-email/{token}', [EmailVerificationController::class, 'verify'])->name('verify-email');
    Route::post('/login', [PortalLoginController::class, 'store'])->name('login.submit');
    
    // Legacy/Fallback views
    Route::get('/pending-approval', fn() => view('portal.pending-approval'))->name('pending-approval');

    // Authenticated routes
    Route::middleware('auth:portal')->group(function () {
        Route::get('/dashboard', [DashboardController::class, 'index'])->name('dashboard');
        Route::post('/logout', [PortalLoginController::class, 'destroy'])->name('logout');
        Route::get('/vendors/{vendorCode}/credentials', [VendorCredentialController::class, 'show'])->name('vendors.show');
        Route::post('/vendors/{vendorCode}/credentials', [VendorCredentialController::class, 'store'])->name('vendors.store');
    });
});
