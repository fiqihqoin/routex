<?php

namespace App\Providers;

use App\Models\Vendor;
use App\Models\MerchantVendorCredential;
use App\Models\Merchant;
use App\Policies\VendorPolicy;
use App\Policies\MerchantVendorCredentialPolicy;
use App\Policies\MerchantPolicy;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Gate::policy(Vendor::class, VendorPolicy::class);
        Gate::policy(MerchantVendorCredential::class, MerchantVendorCredentialPolicy::class);
        Gate::policy(Merchant::class, MerchantPolicy::class);

        Gate::guessPolicyNamesUsing(function (string $modelClass) {
            return 'App\\Policies\\' . class_basename($modelClass) . 'Policy';
        });
    }
}
