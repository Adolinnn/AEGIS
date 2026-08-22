<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Enums\ScanRunStatus;
use App\Enums\ToolName;
use App\Models\ScanRun;
use App\Models\Target;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ScanRun>
 */
class ScanRunFactory extends Factory
{
    protected $model = ScanRun::class;

    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'target_id' => Target::factory(),
            'status' => ScanRunStatus::Pending,
            'selected_tools' => [ToolName::Nmap->value],
            'consent_attested' => true,
            'consent_text' => config('scanning.consent_text'),
            'tools_failed' => [],
            'summary' => null,
            'started_at' => null,
            'finished_at' => null,
        ];
    }

    public function completed(): static
    {
        return $this->state(fn () => [
            'status' => ScanRunStatus::Completed,
            'started_at' => now()->subMinute(),
            'finished_at' => now(),
        ]);
    }
}
