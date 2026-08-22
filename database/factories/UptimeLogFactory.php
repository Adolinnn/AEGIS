<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\Target;
use App\Models\UptimeLog;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<UptimeLog>
 */
class UptimeLogFactory extends Factory
{
    protected $model = UptimeLog::class;

    public function definition(): array
    {
        $statusCode = $this->faker->randomElement([
            200, 200, 200, 200, 200, // Mostly success
            301, 302, 304,
            400, 401, 403, 404, 429,
            500, 502, 503, 504,
        ]);

        return [
            'target_id' => Target::factory(),
            'status_code' => $statusCode,
            'response_time_ms' => $this->faker->numberBetween(50, 2000),
            'status' => $this->determineStatus($statusCode),
            'error_message' => $statusCode >= 400 ? $this->faker->optional(0.7)->sentence() : null,
            'headers' => $this->generateHeaders($statusCode),
            'checked_at' => $this->faker->dateTimeBetween('-1 hour', 'now'),
        ];
    }

    private function determineStatus(int $statusCode): string
    {
        if ($statusCode >= 200 && $statusCode < 300) {
            return 'up';
        }
        if ($statusCode >= 500) {
            return 'down';
        }
        if ($statusCode >= 400) {
            return 'degraded';
        }
        return 'unknown';
    }

    private function generateHeaders(int $statusCode): array
    {
        $headers = [
            'server' => $this->faker->randomElement(['nginx', 'Apache', 'cloudflare', 'openresty']),
            'content-type' => 'text/html; charset=UTF-8',
            'x-powered-by' => $this->faker->optional(0.3)->randomElement(['PHP/8.2', 'Express', 'Next.js']),
        ];

        if ($statusCode >= 200 && $statusCode < 300) {
            $headers['cache-control'] = 'no-cache, private';
            $headers['x-frame-options'] = $this->faker->optional(0.5)->randomElement(['SAMEORIGIN', 'DENY']);
        }

        return $headers;
    }

    public function up(): static
    {
        return $this->state(fn () => [
            'status_code' => 200,
            'status' => 'up',
            'response_time_ms' => $this->faker->numberBetween(50, 300),
            'error_message' => null,
        ]);
    }

    public function down(): static
    {
        return $this->state(fn () => [
            'status_code' => $this->faker->randomElement([500, 502, 503, 504]),
            'status' => 'down',
            'response_time_ms' => $this->faker->numberBetween(1000, 5000),
            'error_message' => 'Connection refused',
        ]);
    }

    public function degraded(): static
    {
        return $this->state(fn () => [
            'status_code' => $this->faker->randomElement([400, 401, 403, 404, 429]),
            'status' => 'degraded',
            'response_time_ms' => $this->faker->numberBetween(200, 1000),
        ]);
    }
}