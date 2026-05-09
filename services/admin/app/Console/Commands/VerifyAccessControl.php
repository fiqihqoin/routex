<?php

namespace App\Console\Commands;

use App\Models\Merchant;
use App\Models\User;
use App\Models\UserAccountAssignment;
use App\Models\Vendor;
use App\Models\VendorAccount;
use App\Policies\MerchantPolicy;
use App\Policies\UserAccountAssignmentPolicy;
use App\Policies\VendorAccountPolicy;
use App\Policies\VendorPolicy;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Gate;

class VerifyAccessControl extends Command
{
    protected $signature = 'routex:verify-access-control';
    protected $description = 'Verify access control, policy registration, and guard separation';

    public function handle()
    {
        $passed = 0;

        $this->info("Checking Access Control System...");
        $this->newLine();

        // 1. Policy Registration Check
        $policyChecks = [
            Vendor::class => VendorPolicy::class,
            VendorAccount::class => VendorAccountPolicy::class,
            Merchant::class => MerchantPolicy::class,
            UserAccountAssignment::class => UserAccountAssignmentPolicy::class,
        ];

        $allPoliciesOk = true;
        $this->comment("1. Policy Registration Check:");
        foreach ($policyChecks as $model => $expectedPolicy) {
            $actualPolicy = Gate::getPolicyFor($model);
            $isOk = $actualPolicy instanceof $expectedPolicy;
            $status = $isOk ? "✓" : "✗";
            $this->line("  {$status} Model: " . class_basename($model));
            if (!$isOk) $allPoliciesOk = false;
        }
        if ($allPoliciesOk) $passed++;

        $this->newLine();

        // 2. Guard Separation Check
        $this->comment("2. Guard Separation Check:");
        
        // Check web guard
        $webProvider = Auth::guard('web')->getProvider();
        $webModel = $webProvider->getModel();
        $isWebOk = $webModel === User::class;
        $webStatus = $isWebOk ? "✓" : "✗";
        $this->line("  {$webStatus} Guard 'web' uses Model: User");

        // Check portal guard
        $portalProvider = Auth::guard('portal')->getProvider();
        $portalModel = $portalProvider->getModel();
        $isPortalOk = $portalModel === Merchant::class;
        $portalStatus = $isPortalOk ? "✓" : "✗";
        $this->line("  {$portalStatus} Guard 'portal' uses Model: Merchant");

        if ($isWebOk && $isPortalOk) $passed++;

        $this->newLine();

        // 3. Role Enforcement Check
        $this->comment("3. Role Enforcement Check (VendorPolicy):");
        
        $vendorPolicy = new VendorPolicy();
        
        // Viewer role
        $viewer = new User(['role' => 'viewer']);
        $viewerAllowed = $vendorPolicy->create($viewer);
        $isViewerOk = $viewerAllowed === false;
        $viewerStatus = $isViewerOk ? "✓" : "✗";
        $this->line("  {$viewerStatus} Role 'viewer' cannot create vendor");

        // Admin role
        $admin = new User(['role' => 'admin']);
        $adminAllowed = $vendorPolicy->create($admin);
        $isAdminOk = $adminAllowed === true;
        $adminStatus = $isAdminOk ? "✓" : "✗";
        $this->line("  {$adminStatus} Role 'admin' can create vendor");

        if ($isViewerOk && $isAdminOk) $passed++;

        $this->newLine();

        // Final Summary
        $color = $passed === 3 ? "info" : "error";
        $this->$color("Summary: {$passed}/3 checks passed");

        return $passed === 3 ? 0 : 1;
    }
}
