<?php

namespace App\Policies;

use App\Models\SiemEvent;
use App\Models\User;

class SiemEventPolicy
{
    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, SiemEvent $siemEvent): bool
    {
        return $user->id === $siemEvent->user_id;
    }
}
