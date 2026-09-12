<?php

declare(strict_types=1);

namespace App\Scanning;

use App\Enums\ScanRunStatus;
use App\Enums\ToolName;
use App\Jobs\GenerateReportJob;
use App\Models\Finding;
use App\Models\ScanRun;
use App\Models\ScanToolOutput;
use App\Services\ScannerService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use App\Events\ScanToolOutputUpdated;

/**
 * Deep module encapsulating full scan execution across built-in and external CLI tools,
 * live terminal logging, normalized finding generation, and lifecycle finalization.
 */
class ScanEngine
{
    public function __construct(
        protected ToolRegistry $registry,
        protected ToolRunnerService $runner,
    ) {}

    /**
     * Execute a full scan run synchronously or in a queue worker.
     */
    public function execute(ScanRun $run): ScanEngineResult
    {
        $run->loadMissing('target');

        if (! $run->target) {
            Log::warning('ScanEngine: target missing for scan run', ['scan_run_id' => $run->id]);
            $run->update(['status' => ScanRunStatus::Failed, 'finished_at' => now()]);
            return new ScanEngineResult($run->id, ScanRunStatus::Failed, 0, 0, 0, [], 'Target missing');
        }

        if (! $run->target->is_authorized) {
            Log::warning('ScanEngine: target not authorized', ['scan_run_id' => $run->id]);
            $run->update(['status' => ScanRunStatus::Failed, 'finished_at' => now()]);
            return new ScanEngineResult($run->id, ScanRunStatus::Failed, 0, 0, 0, [], 'Target not authorized');
        }

        $run->markRunning();

        $tools = $run->selectedToolNames();
        if (empty($tools)) {
            $tools = [ToolName::Builtin];
        }

        foreach ($tools as $tool) {
            $this->runSingleTool($run, $tool);
        }

        return $this->finalize($run);
    }

    /**
     * Execute a single tool within a scan run.
     */
    public function runSingleTool(ScanRun $run, ToolName $tool): void
    {
        $adapter = $this->registry->get($tool);
        if (! $adapter) {
            $this->recordFailure($run, $tool, 'Tool adapter not registered');
            return;
        }

        if (! $tool->isInstalled()) {
            $this->recordFailure($run, $tool, 'Tool binary not installed on host');
            return;
        }

        $targetArg = $this->targetArgument($run, $tool);
        $toolOptions = $run->target->scan_config['tool_options'][$tool->value] ?? [];
        $command = $adapter->buildCommand($targetArg, $toolOptions);
        $liveId = $this->startLiveOutput($run, implode(' ', $command), $tool);

        try {
            if ($adapter instanceof \App\Scanning\Tools\BuiltinTool) {
                $result = $adapter->execute($run->target);
                $findings = $result['findings'];
                $this->persistFindings($run, $findings);

                $this->recordOutput(
                    $run,
                    $tool,
                    implode(' ', $command),
                    $result['exitCode'],
                    false,
                    $result['output'],
                    count($findings),
                    $liveId,
                );
                return;
            }

            $result = $this->runner->run(
                $tool,
                $command,
                outputCapKb: (int) config("scanning.tools.{$tool->value}.output_cap_kb", 4096),
                onOutput: function (string $accumulated) use ($run, $tool, $liveId) {
                    $this->updateLiveOutput($run, $tool, $liveId, $accumulated);
                },
            );

            if (! $result->successful() && $result->raw === '') {
                $this->recordFailure($run, $tool, $result->error ?? ($result->timedOut ? 'Timed out' : 'Unknown error'), $liveId);
                return;
            }

            $findings = $adapter->parseOutput($result->raw, $result->exitCode);
            $this->persistFindings($run, $findings);

            $this->recordOutput(
                $run,
                $tool,
                implode(' ', $command),
                $result->exitCode,
                $result->timedOut,
                $result->raw,
                count($findings),
                $liveId,
            );
        } catch (\Throwable $e) {
            $this->recordFailure($run, $tool, $e->getMessage(), $liveId);
        }
    }

    /**
     * Finalize the scan run: calculate terminal status, summary stats, update target, and trigger report.
     */
    public function finalize(ScanRun $run): ScanEngineResult
    {
        $run->load('findings', 'target');

        $failed = $run->tools_failed ?? [];
        $selected = $run->selected_tools ?? [];

        $status = match (true) {
            count($failed) === 0 => ScanRunStatus::Completed,
            count($failed) >= count($selected) => ScanRunStatus::Failed,
            default => ScanRunStatus::Partial,
        };

        $findingsBySeverity = $run->findings
            ->groupBy(fn ($f) => $f->severity->value)
            ->map->count()
            ->toArray();

        $summary = [
            'tools_run' => count($selected),
            'tools_failed' => count($failed),
            'findings_total' => $run->findings->count(),
            'findings_by_severity' => $findingsBySeverity,
        ];

        $run->update([
            'status' => $status,
            'summary' => $summary,
            'finished_at' => now(),
        ]);

        $run->target?->update(['last_scanned_at' => now()]);

        if ($run->generate_report) {
            GenerateReportJob::dispatch($run->id);
        }

        return new ScanEngineResult(
            $run->id,
            $status,
            count($selected),
            count($failed),
            $run->findings->count(),
            $findingsBySeverity
        );
    }

    protected function targetArgument(ScanRun $run, ToolName $tool): string
    {
        $url = $run->target->domain_url;
        if ($tool->requiresUrl()) {
            return $url;
        }
        return parse_url($url, PHP_URL_HOST) ?: $url;
    }

    /**
     * @param NormalizedFinding[] $findings
     */
    protected function persistFindings(ScanRun $run, array $findings): void
    {
        foreach ($findings as $finding) {
            Finding::create([
                'scan_run_id' => $run->id,
                'target_id' => $run->target_id,
                'tool' => $finding->tool,
                'title' => $finding->title,
                'category' => $finding->category,
                'severity' => $finding->severity,
                'description' => $finding->description,
                'evidence' => $finding->evidence,
                'recommendation' => $finding->recommendation,
                'raw_output' => null,
                'detected_at' => now(),
            ]);
        }
    }

    protected function recordFailure(ScanRun $run, ToolName $tool, string $reason, ?int $liveId = null): void
    {
        Log::warning('ScanEngine tool failed', [
            'scan_run_id' => $run->id,
            'tool' => $tool->value,
            'reason' => $reason,
        ]);

        $this->recordOutput($run, $tool, null, null, false, "FAILED: {$reason}", 0, $liveId, status: 'failed');

        DB::transaction(function () use ($run, $tool) {
            $fresh = ScanRun::lockForUpdate()->find($run->id);
            if (! $fresh) return;
            $failed = $fresh->tools_failed ?? [];
            if (! in_array($tool->value, $failed, true)) {
                $failed[] = $tool->value;
            }
            $fresh->update(['tools_failed' => $failed]);
        });
    }

    protected function startLiveOutput(ScanRun $run, ?string $command, ToolName $tool = ToolName::Builtin): int
    {
        $output = ScanToolOutput::create([
            'scan_run_id' => $run->id,
            'tool' => $tool->value,
            'status' => 'running',
            'command' => $command,
            'exit_code' => null,
            'timed_out' => false,
            'output' => '',
            'findings_count' => 0,
        ]);

        ScanToolOutputUpdated::dispatch(
            $run->id, $tool->value, 'running', '', null, 0
        );

        return $output->id;
    }

    protected function updateLiveOutput(ScanRun $run, ToolName $tool, int $liveId, string $accumulated): void
    {
        $outputStr = $accumulated !== '' ? $accumulated : '(waiting for output…)';
        ScanToolOutput::whereKey($liveId)->update([
            'output' => $outputStr,
        ]);

        ScanToolOutputUpdated::dispatch(
            $run->id, $tool->value, 'running', $outputStr, null, 0
        );
    }

    protected function recordOutput(
        ScanRun $run,
        ToolName $tool,
        ?string $command,
        ?int $exitCode,
        bool $timedOut,
        string $output,
        int $findingsCount,
        ?int $liveId = null,
        string $status = 'completed',
    ): void {
        $payload = [
            'scan_run_id' => $run->id,
            'tool' => $tool->value,
            'status' => $status,
            'command' => $command,
            'exit_code' => $exitCode,
            'timed_out' => $timedOut,
            'output' => $output !== '' ? $output : '(no output)',
            'findings_count' => $findingsCount,
        ];

        if ($liveId !== null && ScanToolOutput::whereKey($liveId)->exists()) {
            ScanToolOutput::whereKey($liveId)->update($payload);
        } else {
            ScanToolOutput::create($payload);
        }

        ScanToolOutputUpdated::dispatch(
            $run->id, $tool->value, $status, $payload['output'], $exitCode, $findingsCount
        );
    }
}
