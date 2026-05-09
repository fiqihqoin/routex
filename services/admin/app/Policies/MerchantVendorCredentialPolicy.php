<?php

namespace App\Policies;

use App\Models\User;
use App\Models\MerchantVendorCredential;

class MerchantVendorCredentialPolicy
{
    public function viewAny(User $user): bool { return true; }
    public function view(User $user, MerchantVendorCredential $merchantVendorCredential): bool { return true; }
    public function create(User $user): bool { return $user->role === 'admin'; }
    public function update(User $user, MerchantVendorCredential $merchantVendorCredential): bool { return $user->role === 'admin'; }
    public function delete(User $user, MerchantVendorCredential $merchantVendorCredential): bool { return $user->role === 'admin'; }
}
