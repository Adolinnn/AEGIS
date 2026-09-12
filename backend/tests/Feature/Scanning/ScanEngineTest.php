<?php

declare(strict_types=1);

namespace Tests\Feature\Scanning;

use App\Enums\ScanRunStatus;
use App\Enums\ToolName;
use App\Models\Finding;
use App\Models\ScanRun;
use App\Models\ScanToolOutput;
use App\Models\Target;
use App\Models\User;
use App\Scanning\ScanEngine;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ScanEngineTest extends TestCase
{
    use RefreshDatabase;

    public function test_engine_executes_builtin_scan_and_creates_findings_and_outputs(): void
    {
        $user = User::factory()->create();
        $target = Target::factory()->create([
            'user_id' => $user->id,
            'domain_url' => 'https://example.com',
            'is_authorized' => true,
        ]);

        $scanRun = ScanRun::create([
            'user_id' => $user->id,
            'target_id' => $target->id,
            'status' => ScanRunStatus::Pending,
            'selected_tools' => ['builtin'],
            'consent_attested' => true,
        ]);

        $engine = app(ScanEngine::class);
        $result = $engine->execute($scanRun);

        $this->assertTrue($result->isSuccess());
        $this->assertSame(ScanRunStatus::Completed, $result->status);
        $this->assertSame(1, $result->toolsRun);
        $this->assertSame(0, $result->toolsFailed);

        // Verify ScanToolOutput was persisted
        $this->assertDatabaseHas('scan_tool_outputs', [
            'scan_run_id' => $scanRun->id,
            'tool' => 'builtin',
            'status' => 'completed',
        ]);

        // Verify ScanRun finalized
        $scanRun->refresh();
        $this->assertSame(ScanRunStatus::Completed, $scanRun->status);
        $this->assertNotNull($scanRun->finished_at);
        $this->assertNotNull($scanRun->summary);
    }

    public function test_engine_fails_unauthorized_target_gracefully(): void
    {
        $user = User::factory()->create();
        $target = Target::factory()->create([
            'user_id' => $user->id,
            'domain_url' => 'https://unauthorized.test',
            'is_authorized' => false,
        ]);

        $scanRun = ScanRun::create([
            'user_id' => $user->id,
            'target_id' => $target->id,
            'status' => ScanRunStatus::Pending,
            'selected_tools' => ['builtin'],
            'consent_attested' => true,
        ]);

        $engine = app(ScanEngine::class);
        $result = $engine->execute($scanRun);

        $this->assertFalse($result->isSuccess());
        $this->assertSame(ScanRunStatus::Failed, $result->status);
        $this->assertSame('Target not authorized', $result->error);
    }
}
