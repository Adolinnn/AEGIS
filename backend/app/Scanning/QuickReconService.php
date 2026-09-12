<?php

declare(strict_types=1);

namespace App\Scanning;

use App\Enums\ToolName;
use App\Enums\VulnerabilitySeverity;
use App\Scanning\NormalizedFinding;
use App\Scanning\ToolRegistry;
use App\Scanning\ToolRunnerService;
use App\Models\Target;
use Illuminate\Support\Collection;

/**
 * QuickReconService - Fast reconnaissance combining multiple tools for
 * rapid target assessment. Runs in sequence for quick results:
 * 1. WhatWeb - Technology fingerprinting (fast)
 * 2. Nmap - Top ports + service detection
 * 3. Nikto - Web server misconfig (quick scan)
 * 4. Nuclei - Fast template-based vulnerability checks
 * 5. SSLScan - TLS config check
 * 
 * Designed for speed: ~2-5 minutes total depending on target.
 */
class QuickReconService
{
    protected ToolRegistry $registry;
    protected ToolRunnerService $runner;

    public function __construct(ToolRegistry $registry, ToolRunnerService $runner)
    {
        $this->registry = $registry;
        $this->runner = $runner;
    }

    /**
     * Run quick recon against a target.
     * Returns normalized findings from all tools.
     * 
     * @param array<ToolName> $tools Specific tools to run (default: all quick tools)
     * @return array<NormalizedFinding>
     */
    public function run(Target $target, array $tools = []): array
    {
        $defaultTools = [
            ToolName::Whatweb,
            ToolName::Nmap,
            ToolName::Nikto,
            ToolName::Nuclei,
            ToolName::Sslscan,
        ];

        $tools = $tools ?: $defaultTools;
        $allFindings = [];

        foreach ($tools as $toolName) {
            if (! $toolName->isInstalled()) {
                continue;
            }

            $adapter = $this->registry->get($toolName);
            if (! $adapter) {
                continue;
            }

            $toolFindings = $this->runTool($adapter, $target);
            $allFindings = array_merge($allFindings, $toolFindings);
        }

        return $allFindings;
    }

    /**
     * Run a single tool and return normalized findings.
     */
    protected function runTool($adapter, Target $target): array
    {
        $url = $target->domain_url;
        $host = parse_url($url, PHP_URL_HOST) ?: $url;

        // Get quick recon options as defaults
        $quickOptions = $this->getQuickScanOptions();
        $toolName = $adapter->name();
        $defaultOptions = $quickOptions[$toolName->value]['options'] ?? [];
        
        // Merge with target-specific options (target options override defaults)
        $options = array_merge($defaultOptions, $target->scan_config['tool_options'][$toolName->value] ?? []);

        try {
            $command = $adapter->buildCommand($toolName->requiresUrl() ? $url : $host, $options);
            
            $result = $this->runner->run(
                $toolName,
                $command,
                outputCapKb: (int) config("scanning.tools.{$toolName->value}.output_cap_kb", 4096)
            );

            if (! $result->successful() && $result->raw === '') {
                return [];
            }

            return $adapter->parseOutput($result->raw, $result->exitCode);
        } catch (\Throwable $e) {
            // Log error but continue with other tools
            \Illuminate\Support\Facades\Log::error('QuickRecon tool failed', [
                'tool' => $toolName->value,
                'target' => $target->id,
                'error' => $e->getMessage(),
            ]);
            return [];
        }
    }

    /**
     * Get available quick recon tools.
     * 
     * @return array<ToolName>
     */
    public function getAvailableTools(): array
    {
        $defaultTools = [
            ToolName::Whatweb,
            ToolName::Nmap,
            ToolName::Nikto,
            ToolName::Nuclei,
            ToolName::Sslscan,
        ];

        return array_values(array_filter($defaultTools, fn (ToolName $t) => $t->isInstalled()));
    }

    /**
     * Get recommended quick scan options per tool.
     */
    public function getQuickScanOptions(): array
    {
        return [
            ToolName::Whatweb->value => [
                'description' => 'Technology fingerprint (CMS, frameworks, servers)',
                'timeout' => 30,
            ],
            ToolName::Nmap->value => [
                'description' => 'Top 1000 ports + service/version detection (-sV)',
                'options' => ['ports' => '1-1000', 'scan_type' => '-sV'],
                'timeout' => 120,
            ],
            ToolName::Nikto->value => [
                'description' => 'Web server misconfig scan (tuning 1234567890abc)',
                'options' => ['tuning' => '1234567890abc', 'maxtime' => '5m'],
                'timeout' => 180,
            ],
            ToolName::Nuclei->value => [
                'description' => 'Fast template-based vulnerability checks',
                'options' => ['severity' => 'low,medium,high,critical'],
                'timeout' => 180,
            ],
            ToolName::Sslscan->value => [
                'description' => 'TLS/SSL cipher and protocol check',
                'timeout' => 60,
            ],
        ];
    }
}