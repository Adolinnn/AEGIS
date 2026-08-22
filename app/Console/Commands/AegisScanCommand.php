<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Enums\ScanRunStatus;
use App\Enums\ToolName;
use App\Models\ScanRun;
use App\Models\Target;
use App\Scanning\QuickReconService;
use App\Scanning\ToolRegistry;
use App\Scanning\ToolRunnerService;
use App\Services\ReportAgentService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

/**
 * Local proof-of-concept entrypoint. Runs the full pipeline synchronously
 * (no queue worker required): forks each selected tool, persists findings,
 * finalizes the run, and generates the AI report inline.
 *
 *   php artisan aegis:scan {target_id} --tool=nmap --tool=wpscan --sync
 */
class AegisScanCommand extends Command
{
    protected $signature = 'aegis:scan
        {target_id : The target to scan}
        {--tool=* : Tool to run (repeatable; default nmap). One of: nmap, nikto, wpscan, gobuster, sqlmap, dig, sslscan, whatweb, nuclei}
        {--sync : Run synchronously (default for this command)}
        {--queue : Dispatch to the queue instead of running inline}
        {--quick-recon : Run quick reconnaissance (whatweb, nmap, nikto, nuclei, sslscan)}
        {--generate-report : Generate AI report after scan completes}';

    protected $description = 'Run security tool(s) against a target and generate an AI report';

    public function handle(
        ToolRegistry $registry,
        ToolRunnerService $runner,
        ReportAgentService $agent,
        QuickReconService $quickRecon
    ): int {
        $target = Target::find($this->argument('target_id'));
        if (! $target) {
            $this->error("Target #{$this->argument('target_id')} not found.");
            return self::FAILURE;
        }

        if (! $target->is_authorized) {
            $this->error("Target #{$target->id} is NOT authorized. Set is_authorized before scanning.");
            return self::FAILURE;
        }

        // Quick recon mode
        if ($this->option('quick-recon')) {
            return $this->runQuickRecon($target, $quickRecon, $agent);
        }

        $tools = $this->resolveTools();
        if ($tools->isEmpty()) {
            $this->error('No valid/installed tools selected.');
            return self::FAILURE;
        }

        $missing = $tools->reject(fn (ToolName $t) => $t->isInstalled());
        if ($missing->isNotEmpty()) {
            $this->warn('Skipping not-installed tools: ' . $missing->implode(', '));
        }

        $run = ScanRun::create([
            'user_id' => $target->user_id,
            'target_id' => $target->id,
            'status' => ScanRunStatus::Running,
            'selected_tools' => $tools->map(fn (ToolName $t) => $t->value)->all(),
            'consent_attested' => true,
            'consent_text' => config('scanning.consent_text'),
            'generate_report' => $this->option('generate-report'),
            'started_at' => now(),
        ]);

        $this->info("Scan run #{$run->id} → {$target->domain_url}");
        $this->info('Tools: ' . $tools->map(fn (ToolName $t) => $t->label())->implode(', '));

        $failed = [];
        $total = 0;

        foreach ($tools as $tool) {
            if (! $tool->isInstalled()) {
                $failed[] = $tool->value;
                continue;
            }

            $this->line("  • Running {$tool->label()}...");
            $argument = $tool->requiresUrl()
                ? $target->domain_url
                : (parse_url($target->domain_url, PHP_URL_HOST) ?: $target->domain_url);

            $command = $registry->get($tool)?->buildCommand(
                $argument,
                $target->scan_config['tool_options'][$tool->value] ?? []
            ) ?? [$tool->binary(), $argument];

            $result = $runner->run(
                $tool,
                $command,
                outputCapKb: (int) config("scanning.tools.{$tool->value}.output_cap_kb", 4096),
            );

            if (! $result->successful() && $result->raw === '') {
                $this->warn("    failed: " . ($result->error ?? 'no output'));
                $failed[] = $tool->value;
                continue;
            }

            $findings = $registry->get($tool)?->parseOutput($result->raw, $result->exitCode) ?? [];
            foreach ($findings as $f) {
                $run->findings()->create([
                    'target_id' => $target->id,
                    'tool' => $f->tool,
                    'title' => $f->title,
                    'category' => $f->category,
                    'severity' => $f->severity,
                    'description' => $f->description,
                    'evidence' => $f->evidence,
                    'recommendation' => $f->recommendation,
                    'detected_at' => now(),
                ]);
            }

            $this->line("    {$tool->label()}: " . count($findings) . ' finding(s)');
            $total += count($findings);
        }

        $status = match (true) {
            count($failed) === 0 => ScanRunStatus::Completed,
            count($failed) >= $tools->count() => ScanRunStatus::Failed,
            default => ScanRunStatus::Partial,
        };

        $run->update([
            'status' => $status,
            'tools_failed' => $failed,
            'summary' => [
                'tools_run' => $tools->count(),
                'tools_failed' => count($failed),
                'findings_total' => $total,
            ],
            'finished_at' => now(),
        ]);
        $target->update(['last_scanned_at' => now()]);

        $this->info("Findings: {$total}  •  Status: {$status->label()}");

        // AI report
        $this->line('Generating AI report...');
        $report = $agent->generateForRun($run);
        if (! $report) {
            $this->warn('No report generated (no LLM key configured, or no findings).');
        } else {
            $this->info("Risk level: {$report->risk_level} (score {$report->risk_score})");
            $this->line('');
            $this->line('— Report —');
            $this->line($report->payload['executive_summary'] ?? '(no summary)');
        }

        return self::SUCCESS;
    }

    /**
     * Run quick reconnaissance against target.
     */
    protected function runQuickRecon(Target $target, QuickReconService $quickRecon, ReportAgentService $agent): int
    {
        $this->info("Quick Reconnaissance → {$target->domain_url}");
        
        $availableTools = $quickRecon->getAvailableTools();
        $options = $quickRecon->getQuickScanOptions();
        
        $this->info('Available tools: ' . collect($availableTools)->map(fn (ToolName $t) => $t->label())->implode(', '));
        
        foreach ($availableTools as $tool) {
            $opt = $options[$tool->value] ?? [];
            $this->line("  • {$tool->label()}: " . ($opt['description'] ?? ''));
        }

        $run = ScanRun::create([
            'user_id' => $target->user_id,
            'target_id' => $target->id,
            'status' => ScanRunStatus::Running,
            'selected_tools' => array_map(fn (ToolName $t) => $t->value, $availableTools),
            'consent_attested' => true,
            'consent_text' => config('scanning.consent_text'),
            'generate_report' => $this->option('generate-report'),
            'started_at' => now(),
        ]);

        $this->line('');
        $this->info("Scan run #{$run->id} created");
        
        $allFindings = $quickRecon->run($target, $availableTools);
        
        $total = 0;
        foreach ($allFindings as $f) {
            $run->findings()->create([
                'target_id' => $target->id,
                'tool' => $f->tool,
                'title' => $f->title,
                'category' => $f->category,
                'severity' => $f->severity,
                'description' => $f->description,
                'evidence' => $f->evidence,
                'recommendation' => $f->recommendation,
                'detected_at' => now(),
            ]);
            $total++;
        }

        $run->update([
            'status' => ScanRunStatus::Completed,
            'tools_failed' => [],
            'summary' => [
                'tools_run' => count($availableTools),
                'tools_failed' => 0,
                'findings_total' => $total,
            ],
            'finished_at' => now(),
        ]);
        $target->update(['last_scanned_at' => now()]);

        $this->info("Quick recon complete. Findings: {$total}");

        // AI report
        $this->line('Generating AI report...');
        $report = $agent->generateForRun($run);
        if (! $report) {
            $this->warn('No report generated (no LLM key configured, or no findings).');
        } else {
            $this->info("Risk level: {$report->risk_level} (score {$report->risk_score})");
            $this->line('');
            $this->line('— Report —');
            $this->line($report->payload['executive_summary'] ?? '(no summary)');
        }

        return self::SUCCESS;
    }

    /**
     * @return \Illuminate\Support\Collection<int, ToolName>
     */
    protected function resolveTools(): \Illuminate\Support\Collection
    {
        $requested = $this->option('tool');
        if (is_array($requested)) {
            $values = $requested;
        } else {
            $values = [$requested];
        }

        return collect($values)
            ->map(fn ($v) => ToolName::tryFrom($v))
            ->filter();
    }
}
