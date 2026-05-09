<?php

namespace App\Policies;

use App\Models\User;
use App\Models\Merchant;
use Illuminate\Auth\Access\Response;

class MerchantPolicy
{
    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, Merchant $merchant): bool
    {
        return true;
    }

    public function create(User $user): bool
    {
        return $user->role === 'admin';
    }

    public function update(User $user, Merchant $merchant): bool
    {
        return $user->role === 'admin';
    }

    public function delete(User $user, Merchant $merchant): bool
    {
        return $user->role === 'admin';
    }
}
