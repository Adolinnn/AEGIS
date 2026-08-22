<?php

declare(strict_types=1);

namespace App\Jobs;

use App\Models\ScanRun;
use App\Services\ReportAgentService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Log;

/**
 * Generates the AI report for a completed scan run from its normalized
 * findings. Delegates to ReportAgentService which no-ops gracefully when no
 * LLM API key is configured, so the pipeline still completes offline.
 */
class GenerateReportJob implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public readonly int $scanRunId,
    ) {
    }

    public function handle(ReportAgentService $agent): void
    {
        $run = ScanRun::with(['findings', 'target'])->find($this->scanRunId);
        if (! $run || ! $run->target) {
            Log::warning('GenerateReportJob: scan run or target missing', ['scan_run_id' => $this->scanRunId]);
            return;
        }

        $agent->generateForRun($run);
    }

    public function tags(): array
    {
        return ['report', 'scan-run:' . $this->scanRunId];
    }
}
