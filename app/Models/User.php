<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\SubscriptionTier;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

#[Fillable(['name', 'email', 'password', 'subscription_tier', 'is_admin', 'llm_api_key', 'llm_provider', 'llm_base_url', 'llm_model'])]
#[Hidden(['password', 'remember_token', 'llm_api_key'])]
class User extends Authenticatable
{
    use HasFactory, Notifiable;

    /** @use HasFactory<UserFactory> */

    protected function casts(): array
    {

        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'subscription_tier' => SubscriptionTier::class,
            'is_admin' => 'boolean',
            'llm_api_key' => 'encrypted',
        ];
    }
    public function isAdmin(): bool
    {
        return (bool) $this->is_admin;
    }
    public function targets(): HasMany
    {
        return $this->hasMany(Target::class);
    }

    public function isFree(): bool
    {
        return $this->subscription_tier === SubscriptionTier::Free;
    }

    public function isIndividual(): bool
    {
        return $this->subscription_tier === SubscriptionTier::Individual;
    }

    public function isTeam(): bool
    {
        return $this->subscription_tier === SubscriptionTier::Team;
    }

    public function isStudent(): bool
    {
        return $this->subscription_tier === SubscriptionTier::Student;
    }

    /**
     * Whether this account's email looks like a student (.edu) address.
     * Used to gate self-service subscription to the Student plan.
     */
    public function hasEduEmail(): bool
    {
        return (bool) preg_match('/\.edu(\.[a-z]{2,3})?$/i', $this->email ?? '');
    }

    public function maxTargets(): int
    {
        if ($this->isAdmin()) {
            return PHP_INT_MAX;
        }

        return $this->subscription_tier->maxTargets();
    }

    public function maxScansPerDay(): int
    {
        if ($this->isAdmin()) {
            return PHP_INT_MAX;
        }

        return $this->subscription_tier->maxScansPerDay();
    }
}
