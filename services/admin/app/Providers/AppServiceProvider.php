<?php

namespace App\Providers;

use App\Models\Vendor;
use App\Models\VendorAccount;
use App\Models\PtmsUser;
use App\Models\UserAccountAssignment;
use App\Policies\VendorPolicy;
use App\Policies\VendorAccountPolicy;
use App\Policies\PtmsUserPolicy;
use App\Policies\UserAccountAssignmentPolicy;
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
        Gate::policy(VendorAccount::class, VendorAccountPolicy::class);
        Gate::policy(PtmsUser::class, PtmsUserPolicy::class);
        Gate::policy(UserAccountAssignment::class, UserAccountAssignmentPolicy::class);

        Gate::guessPolicyNamesUsing(function (string $modelClass) {
            return 'App\\Policies\\' . class_basename($modelClass) . 'Policy';
        });
    }
}
