<?php

namespace App\Policies;

use App\Models\SiemAlert;
use App\Models\User;

class SiemAlertPolicy
{
    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, SiemAlert $siemAlert): bool
    {
        return $user->id === $siemAlert->user_id;
    }

    public function update(User $user, SiemAlert $siemAlert): bool
    {
        return $user->id === $siemAlert->user_id;
    }

    public function delete(User $user, SiemAlert $siemAlert): bool
    {
        return $user->id === $siemAlert->user_id;
    }
}
