<?php

namespace App\Policies;

use App\Models\User;
use App\Models\VendorAccount;

class VendorAccountPolicy
{
    public function viewAny(User $user): bool { return true; }
    public function view(User $user, VendorAccount $vendorAccount): bool { return true; }
    public function create(User $user): bool { return $user->role === 'admin'; }
    public function update(User $user, VendorAccount $vendorAccount): bool { return $user->role === 'admin'; }
    public function delete(User $user, VendorAccount $vendorAccount): bool { return $user->role === 'admin'; }
}
