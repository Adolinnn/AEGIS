<?php

namespace App\Policies;

use App\Models\SiemAgent;
use App\Models\User;

class SiemAgentPolicy
{
    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, SiemAgent $siemAgent): bool
    {
        return $user->id === $siemAgent->user_id;
    }

    public function create(User $user): bool
    {
        return true;
    }

    public function update(User $user, SiemAgent $siemAgent): bool
    {
        return $user->id === $siemAgent->user_id;
    }

    public function delete(User $user, SiemAgent $siemAgent): bool
    {
        return $user->id === $siemAgent->user_id;
    }
}
