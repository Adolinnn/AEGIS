<?php

declare(strict_types=1);

namespace App\Jobs;

use App\Enums\ScanRunStatus;
use App\Models\ScanRun;
use Illuminate\Bus\Batch;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Bus;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Orchestrates a full scan run: dispatches one RunToolJob per selected tool as
 * a batch, then finalizes the run and triggers report generation once every
 * tool has completed.
 */
class RunScanJob implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public readonly int $scanRunId,
    ) {
    }

    public function handle(): void
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

        $run->markRunning();

        $tools = $run->selectedToolNames();
        if (empty($tools)) {
            $this->finalize($run->id);
            return;
        }

        $jobs = array_map(
            fn ($tool) => new RunToolJob($run->id, $tool),
            $tools
        );

        $scanRunId = $run->id;

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
                // Safety net: finalize even if the then() callback did not run.
                RunScanJob::finalize($scanRunId);
            })
            ->dispatch();
    }

    /**
     * Finalize the run: set terminal status, write the summary, update the
     * target, and dispatch report generation. Idempotent — safe to call more
     * than once (batch then()/finally() may both fire).
     */
    public static function finalize(int $scanRunId): void
    {
        $run = ScanRun::with('findings')->find($scanRunId);
        if (! $run || $run->isFinished()) {
            return;
        }

        $failed = $run->tools_failed ?? [];
        $selected = $run->selected_tools ?? [];

        $status = match (true) {
            count($failed) === 0 => ScanRunStatus::Completed,
            count($failed) >= count($selected) => ScanRunStatus::Failed,
            default => ScanRunStatus::Partial,
        };

        $summary = [
            'tools_run' => count($selected),
            'tools_failed' => count($failed),
            'findings_total' => $run->findings->count(),
            'findings_by_severity' => $run->findings
                ->groupBy(fn ($f) => $f->severity->value)
                ->map->count()
                ->toArray(),
        ];

        $run->update([
            'status' => $status,
            'summary' => $summary,
            'finished_at' => now(),
        ]);

        $run->target?->update(['last_scanned_at' => now()]);

        // Only generate report if explicitly requested
        if ($run->generate_report) {
            GenerateReportJob::dispatch($run->id);
        }
    }

    public function tags(): array
    {
        return ['scan-run:' . $this->scanRunId];
    }
}
