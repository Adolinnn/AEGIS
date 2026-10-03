<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // User::factory(10)->create();

        User::updateOrCreate(
            ['email' => 'test@example.com'],
            [
                'name' => 'Test User',
                'password' => \Illuminate\Support\Facades\Hash::make('password'),
            ]
        );

        User::updateOrCreate(
            ['email' => env('ADMIN_EMAIL', 'admin@aegis.test')],
            [
                'name' => 'Aegis Admin',
                'password' => \Illuminate\Support\Facades\Hash::make(env('ADMIN_PASSWORD', 'Aegis-Admin#2026!')),
                'is_admin' => true,
                'subscription_tier' => \App\Enums\SubscriptionTier::Team,
                'email_verified_at' => now(),
            ]
        );

        // Testing account: is_admin bypasses every subscription limit
        // (targets, scans/day, AI remediation) — see User::maxTargets(),
        // User::maxScansPerDay(), and VulnerabilityController::generatePatch().
        User::updateOrCreate(
            ['email' => 'admin@example.com'],
            [
                'name' => 'Admin (Testing)',
                'password' => \Illuminate\Support\Facades\Hash::make('admin1234'),
                'is_admin' => true,
                'subscription_tier' => \App\Enums\SubscriptionTier::Team,
                'email_verified_at' => now(),
            ]
        );
    }
}
