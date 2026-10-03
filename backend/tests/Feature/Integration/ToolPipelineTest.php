<?php

declare(strict_types=1);

namespace Tests\Feature\Integration;

use App\Enums\ScanRunStatus;
use App\Enums\ToolName;
use App\Models\Finding;
use App\Models\Report;
use App\Models\ScanRun;
use App\Models\Target;
use App\Models\User;
use App\Scanning\ToolRunnerService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Process;
use Tests\TestCase;

/**
 * @group integration
 *
 * These tests actually invoke security binaries. They are skipped when the
 * required tool is not installed, so the suite stays green in CI without
 * scanning tools present.
 */
class ToolPipelineTest extends TestCase
{
    use RefreshDatabase;

    protected function nmapInstalled(): bool
    {
        return ToolName::Nmap->isInstalled();
    }

    public function test_nmap_runner_produces_findings(): void
    {
        if (! $this->nmapInstalled()) {
            $this->markTestSkipped('nmap not installed');
        }

        $tool = ToolName::Nmap;
        $command = [$tool->binary(), '-F', '-oX', '-', '127.0.0.1'];

        $result = (new ToolRunnerService())->run($tool, $command);

        $this->assertTrue($result->successful() || $result->raw !== '', 'nmap should produce output');
        $this->assertStringContainsString('<nmaprun', $result->raw);
    }

    public function test_aegis_scan_command_end_to_end(): void
    {
        if (! $this->nmapInstalled()) {
            $this->markTestSkipped('nmap not installed');
        }

        $user = User::factory()->create();
        $target = Target::factory()->create([
            'user_id' => $user->id,
            'domain_url' => 'http://127.0.0.1',
            'is_authorized' => true,
        ]);

        $this->artisan('aegis:scan', [
            'target_id' => $target->id,
            '--tool' => 'nmap',
            '--sync' => true,
        ])->assertSuccessful();

        $run = ScanRun::where('target_id', $target->id)->latest()->first();
        $this->assertNotNull($run);
        $this->assertTrue(
            $run->status->isTerminal(),
            'run should reach a terminal status'
        );
        $this->assertGreaterThanOrEqual(1, $run->findings()->count(), 'nmap should yield findings');

        // Report is skipped without a configured LLM key (graceful no-op).
        $this->assertSame(0, Report::count());
    }

    public function test_runner_caps_output_size(): void
    {
        // Use a fake process so we do not depend on a real binary.
        Process::fake([
            '*' => Process::result(output: str_repeat('x', 5000 * 1024), exitCode: 0),
        ]);

        $result = (new ToolRunnerService())->run(
            ToolName::Nmap,
            ['nmap', '127.0.0.1'],
            outputCapKb: 1
        );

        $this->assertStringContainsString('output truncated', $result->raw);
        $this->assertLessThanOrEqual(1024 + 64, strlen($result->raw));
    }
}
