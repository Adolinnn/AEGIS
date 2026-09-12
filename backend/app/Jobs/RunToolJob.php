<?php

declare(strict_types=1);

namespace App\Jobs;

use App\Enums\ToolName;
use App\Models\ScanRun;
use App\Scanning\ScanEngine;
use Illuminate\Bus\Batchable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Log;

/**
 * Runs a single security tool against a scan run's target via ScanEngine.
 */
class RunToolJob implements ShouldQueue
{
    use Batchable;
    use Queueable;

    public function __construct(
        public readonly int $scanRunId,
        public readonly ToolName $tool,
    ) {
    }

    public function handle(ScanEngine $engine): void
    {
        if ($this->batch()?->cancelled()) {
            return;
        }

        $run = ScanRun::with('target')->find($this->scanRunId);
        if (! $run || ! $run->target) {
            Log::warning('RunToolJob: scan run or target missing', ['scan_run_id' => $this->scanRunId]);
            return;
        }

        $engine->runSingleTool($run, $this->tool);
    }

    public function tags(): array
    {
        return ['tool:' . $this->tool->value, 'scan-run:' . $this->scanRunId];
    }
}
