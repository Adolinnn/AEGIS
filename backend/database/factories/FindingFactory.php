<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Enums\ToolName;
use App\Enums\VulnerabilitySeverity;
use App\Models\Finding;
use App\Models\ScanRun;
use App\Models\Target;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Finding>
 */
class FindingFactory extends Factory
{
    protected $model = Finding::class;

    public function definition(): array
    {
        $category = $this->faker->randomElement(['xss', 'sqli', 'ssrf', 'misconfig']);

        return [
            'scan_run_id' => ScanRun::factory(),
            // Tie the finding's target to its scan run's target.
            'target_id' => fn (array $attrs) => ScanRun::find($attrs['scan_run_id'])?->target_id ?? Target::factory(),
            'tool' => ToolName::Builtin->value,
            'title' => ucfirst($category) . ' finding',
            'category' => $category,
            'severity' => $this->faker->randomElement(array_map(
                fn (VulnerabilitySeverity $s) => $s->value,
                VulnerabilitySeverity::cases()
            )),
            'description' => $this->faker->sentence(),
            'evidence' => $this->faker->optional()->sentence(),
            'recommendation' => $this->faker->sentence(),
            'raw_output' => null,
            'detected_at' => now(),
            'is_resolved' => false,
        ];
    }

    public function resolved(): static
    {
        return $this->state(fn () => ['is_resolved' => true, 'resolved_at' => now()]);
    }
}
