<?php

declare(strict_types=1);

namespace App\Jobs;

use App\Enums\ToolName;
use App\Models\Finding;
use App\Models\ScanRun;
use App\Models\ScanToolOutput;
use App\Scanning\NormalizedFinding;
use App\Scanning\ToolRegistry;
use App\Scanning\ToolRunnerService;
use App\Services\ScannerService;
use Illuminate\Bus\Batchable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Runs a single security tool against a scan run's target, then persists the
 * normalized findings. A single tool failure is recorded on the run but never
 * throws — one broken tool must not abort the whole scan.
 *
 * While the tool is running, its output is streamed into a ScanToolOutput row
 * (status: running) a few times a second, so the frontend's polling terminal
 * shows output arriving live rather than only once the tool finishes.
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

    public function handle(ToolRegistry $registry, ToolRunnerService $runner, ScannerService $scanner): void
    {
        if ($this->batch()?->cancelled()) {
            return;
        }

        $run = ScanRun::with('target')->find($this->scanRunId);
        if (! $run || ! $run->target) {
            Log::warning('RunToolJob: scan run or target missing', ['scan_run_id' => $this->scanRunId]);
            return;
        }

        // Built-in in-process checks: no external binary, no command building.
        if ($this->tool === ToolName::Builtin) {
            $liveId = $this->startLiveOutput($run, '(built-in checks: xss, sqli, ssrf, misconfiguration)');

            try {
                $findings = $scanner->runChecks($run->target);
                $this->persist($run, $findings, '');

                $checks = 'xss, sqli, ssrf, misconfiguration';
                $lines = ["Ran built-in HTTP checks ({$checks}) against {$run->target->domain_url}", ''];
                if (count($findings) === 0) {
                    $lines[] = 'No issues detected by the built-in checks.';
                } else {
                    foreach ($findings as $f) {
                        $lines[] = "[{$f->severity->value}] {$f->category}: {$f->title}";
                        if ($f->evidence) {
                            $lines[] = "    evidence: {$f->evidence}";
                        }
                    }
                }
                $this->recordOutput($run, "(built-in checks: {$checks})", 0, false, implode("\n", $lines), count($findings), $liveId);

                Log::info('Built-in checks complete', [
                    'scan_run_id' => $run->id,
                    'findings' => count($findings),
                ]);
            } catch (\Throwable $e) {
                $this->recordFailure($run, $e->getMessage(), $liveId);
            }

            return;
        }

        $adapter = $registry->get($this->tool);
        if (! $adapter) {
            $this->recordFailure($run, 'Tool not registered');
            return;
        }

        if (! $this->tool->isInstalled()) {
            $this->recordFailure($run, 'Tool binary not installed on host');
            return;
        }

        $target = $this->targetArgument($run);
        $liveId = null;

        try {
            $command = $adapter->buildCommand($target, $run->target->scan_config['tool_options'][$this->tool->value] ?? []);

            $liveId = $this->startLiveOutput($run, implode(' ', $command));

            $result = $runner->run(
                $this->tool,
                $command,
                outputCapKb: (int) config("scanning.tools.{$this->tool->value}.output_cap_kb", 4096),
                onOutput: function (string $accumulated) use ($liveId) {
                    $this->updateLiveOutput($liveId, $accumulated);
                },
            );

            if (! $result->successful() && $result->raw === '') {
                $this->recordFailure($run, $result->error ?? ($result->timedOut ? 'Timed out' : 'Unknown error'), $liveId);
                return;
            }

            $findings = $adapter->parseOutput($result->raw, $result->exitCode);
            $this->persist($run, $findings, $result->raw);

            $this->recordOutput(
                $run,
                implode(' ', $command),
                $result->exitCode,
                $result->timedOut,
                $result->raw,
                count($findings),
                $liveId,
            );

            Log::info('Tool run complete', [
                'scan_run_id' => $run->id,
                'tool' => $this->tool->value,
                'findings' => count($findings),
            ]);
        } catch (\Throwable $e) {
            $this->recordFailure($run, $e->getMessage(), $liveId);
        }
    }

    /**
     * nmap operates on a host; web tools operate on the full URL.
     */
    protected function targetArgument(ScanRun $run): string
    {
        $url = $run->target->domain_url;

        if ($this->tool->requiresUrl()) {
            return $url;
        }

        return parse_url($url, PHP_URL_HOST) ?: $url;
    }

    /**
     * @param  NormalizedFinding[]  $findings
     */
    protected function persist(ScanRun $run, array $findings, string $raw): void
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

    protected function recordFailure(ScanRun $run, string $reason, ?int $liveId = null): void
    {
        Log::warning('Tool run failed', [
            'scan_run_id' => $run->id,
            'tool' => $this->tool->value,
            'reason' => $reason,
        ]);

        // Also surface the failure reason in the tool-output panel.
        $this->recordOutput($run, null, null, false, "FAILED: {$reason}", 0, $liveId, status: 'failed');

        // Atomically append this tool to the run's failed list.
        DB::transaction(function () use ($run) {
            $fresh = ScanRun::lockForUpdate()->find($run->id);
            if (! $fresh) {
                return;
            }
            $failed = $fresh->tools_failed ?? [];
            if (! in_array($this->tool->value, $failed, true)) {
                $failed[] = $this->tool->value;
            }
            $fresh->update(['tools_failed' => $failed]);
        });
    }

    /**
     * Create the tool-output row up front, before the tool has produced any
     * output, so the terminal can show a "live" tab immediately.
     */
    protected function startLiveOutput(ScanRun $run, ?string $command): int
    {
        return ScanToolOutput::create([
            'scan_run_id' => $run->id,
            'tool' => $this->tool->value,
            'status' => 'running',
            'command' => $command,
            'exit_code' => null,
            'timed_out' => false,
            'output' => '',
            'findings_count' => 0,
        ])->id;
    }

    /**
     * Called repeatedly (throttled) by ToolRunnerService while the process is
     * still running, to append the latest output to the live row.
     */
    protected function updateLiveOutput(int $liveId, string $accumulated): void
    {
        ScanToolOutput::whereKey($liveId)->update([
            'output' => $accumulated !== '' ? $accumulated : '(waiting for output…)',
        ]);
    }

    /**
     * Persist the final output of this tool run so the UI can display it.
     * Updates the live row created by startLiveOutput() when present,
     * otherwise falls back to creating a new row (e.g. early-failure paths
     * that never started streaming).
     */
    protected function recordOutput(
        ScanRun $run,
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
            'tool' => $this->tool->value,
            'status' => $status,
            'command' => $command,
            'exit_code' => $exitCode,
            'timed_out' => $timedOut,
            'output' => $output !== '' ? $output : '(no output)',
            'findings_count' => $findingsCount,
        ];

        if ($liveId !== null && ScanToolOutput::whereKey($liveId)->exists()) {
            ScanToolOutput::whereKey($liveId)->update($payload);
            return;
        }

        ScanToolOutput::create($payload);
    }

    public function tags(): array
    {
        return ['tool:' . $this->tool->value, 'scan-run:' . $this->scanRunId];
    }
}
