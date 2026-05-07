<?php

namespace App\Policies;

use App\Models\User;
use App\Models\UserAccountAssignment;

class UserAccountAssignmentPolicy
{
    public function viewAny(User $user): bool { return true; }
    public function view(User $user, UserAccountAssignment $assignment): bool { return true; }
    public function create(User $user): bool { return $user->role === 'admin'; }
    public function update(User $user, UserAccountAssignment $assignment): bool { return $user->role === 'admin'; }
    public function delete(User $user, UserAccountAssignment $assignment): bool { return $user->role === 'admin'; }
}
