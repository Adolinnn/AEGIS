<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Enums\ScanRunStatus;
use App\Enums\ToolName;
use App\Models\ScanRun;
use App\Models\Target;
use App\Scanning\QuickReconService;
use App\Scanning\ScanEngine;
use App\Services\ReportAgentService;
use Illuminate\Console\Command;

/**
 * Local proof-of-concept entrypoint. Runs the scan pipeline synchronously
 * via ScanEngine.
 *
 *   php artisan aegis:scan {target_id} --tool=nmap --tool=wpscan --sync
 */
class AegisScanCommand extends Command
{
    protected $signature = 'aegis:scan
        {target_id : The target to scan}
        {--tool=* : Tool to run (repeatable; default nmap). One of: nmap, nikto, wpscan, gobuster, sqlmap, dig, sslscan, whatweb, nuclei, builtin}
        {--sync : Run synchronously (default for this command)}
        {--queue : Dispatch to the queue instead of running inline}
        {--quick-recon : Run quick reconnaissance (whatweb, nmap, nikto, nuclei, sslscan)}
        {--generate-report : Generate AI report after scan completes}';

    protected $description = 'Run security tool(s) against a target and generate an AI report';

    public function handle(
        ScanEngine $engine,
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
            'generate_report' => (bool) $this->option('generate-report'),
            'started_at' => now(),
        ]);

        $this->info("Scan run #{$run->id} → {$target->domain_url}");
        $this->info('Tools: ' . $tools->map(fn (ToolName $t) => $t->label())->implode(', '));

        $result = $engine->execute($run);

        $this->info("Findings: {$result->findingsTotal}  •  Status: {$result->status->label()}");

        if ($this->option('generate-report')) {
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
        $this->info('Available tools: ' . collect($availableTools)->map(fn (ToolName $t) => $t->label())->implode(', '));

        $run = ScanRun::create([
            'user_id' => $target->user_id,
            'target_id' => $target->id,
            'status' => ScanRunStatus::Running,
            'selected_tools' => array_map(fn (ToolName $t) => $t->value, $availableTools),
            'consent_attested' => true,
            'consent_text' => config('scanning.consent_text'),
            'generate_report' => (bool) $this->option('generate-report'),
            'started_at' => now(),
        ]);

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

        if ($this->option('generate-report')) {
            $this->line('Generating AI report...');
            $report = $agent->generateForRun($run);
            if (! $report) {
                $this->warn('No report generated (no LLM key configured, or no findings).');
            } else {
                $this->info("Risk level: {$report->risk_level} (score {$report->risk_score})");
            }
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
