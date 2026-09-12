<?php

declare(strict_types=1);

namespace App\Jobs;

use App\Enums\ScanRunStatus;
use App\Models\ScanRun;
use App\Scanning\ScanEngine;
use Illuminate\Bus\Batch;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Bus;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Orchestrates a scan run: dispatches tool jobs as a batch through ScanEngine,
 * or runs directly via ScanEngine::execute($run).
 */
class RunScanJob implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public readonly int $scanRunId,
    ) {
    }

    public function handle(ScanEngine $engine): void
    {
        $run = ScanRun::with('target')->find($this->scanRunId);
        if (! $run || ! $run->target) {
            Log::warning('RunScanJob: scan run or target missing', ['scan_run_id' => $this->scanRunId]);
            return;
        }

        if (! $run->target->is_authorized) {
            $run->update(['status' => ScanRunStatus::Failed, 'finished_at' => now()]);
            Log::warning('RunScanJob: target not authorized', ['scan_run_id' => $run->id]);
            return;
        }

        $tools = $run->selectedToolNames();
        if (empty($tools)) {
            $engine->finalize($run);
            return;
        }

        $run->markRunning();
        $scanRunId = $run->id;

        $jobs = array_map(
            fn ($tool) => new RunToolJob($run->id, $tool),
            $tools
        );

        Bus::batch($jobs)
            ->name("scan-run:{$scanRunId}")
            ->allowFailures()
            ->then(function (Batch $batch) use ($scanRunId) {
                RunScanJob::finalize($scanRunId);
            })
            ->catch(function (Batch $batch, Throwable $e) use ($scanRunId) {
                Log::error('Scan batch error', ['scan_run_id' => $scanRunId, 'error' => $e->getMessage()]);
            })
            ->finally(function (Batch $batch) use ($scanRunId) {
                RunScanJob::finalize($scanRunId);
            })
            ->dispatch();
    }

    /**
     * Finalize the run through ScanEngine.
     */
    public static function finalize(int $scanRunId): void
    {
        $run = ScanRun::with('findings')->find($scanRunId);
        if (! $run || $run->isFinished()) {
            return;
        }

        app(ScanEngine::class)->finalize($run);
    }

    public function tags(): array
    {
        return ['scan-run:' . $this->scanRunId];
    }
}
