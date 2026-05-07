<?php

namespace App\Policies;

use App\Models\User;
use App\Models\PtmsUser;
use Illuminate\Auth\Access\Response;

class PtmsUserPolicy
{
    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, PtmsUser $ptmsUser): bool
    {
        return true;
    }

    public function create(User $user): bool
    {
        return $user->role === 'admin';
    }

    public function update(User $user, PtmsUser $ptmsUser): bool
    {
        return $user->role === 'admin';
    }

    public function delete(User $user, PtmsUser $ptmsUser): bool
    {
        return $user->role === 'admin';
    }
}
