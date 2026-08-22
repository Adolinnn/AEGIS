<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Enums\TargetStatus;
use App\Models\Target;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Target>
 */
class TargetFactory extends Factory
{
    protected $model = Target::class;

    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'domain_url' => 'https://' . $this->faker->domainName(),
            'display_name' => $this->faker->company(),
            'is_active' => true,
            'is_authorized' => true,
            'last_checked_at' => $this->faker->optional(0.7)->dateTimeBetween('-1 hour', 'now'),
            'last_scanned_at' => $this->faker->optional(0.5)->dateTimeBetween('-1 day', 'now'),
            'uptime_check_interval_minutes' => $this->faker->randomElement([1, 5, 10, 15, 30]),
            'scan_config' => [
                'scan_types' => ['xss', 'sqli', 'ssrf', 'misconfiguration'],
                'custom_headers' => [],
                'follow_redirects' => true,
                'timeout_seconds' => 10,
            ],
        ];
    }

    public function inactive(): static
    {
        return $this->state(fn (array $attributes) => [
            'is_active' => false,
        ]);
    }

    public function withStatus(TargetStatus $status): static
    {
        return match ($status) {
            TargetStatus::Active => $this->state(fn () => ['is_active' => true]),
            TargetStatus::Inactive => $this->state(fn () => ['is_active' => false]),
            TargetStatus::Error => $this->state(fn () => [
                'is_active' => true,
                'last_checked_at' => now()->subMinutes(10),
            ]),
            TargetStatus::Paused => $this->state(fn () => ['is_active' => false]),
        };
    }
}