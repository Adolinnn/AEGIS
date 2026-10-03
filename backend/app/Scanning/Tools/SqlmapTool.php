<?php

declare(strict_types=1);

namespace App\Scanning\Tools;

use App\Enums\ToolName;
use App\Enums\VulnerabilitySeverity;
use App\Scanning\Contracts\SecurityTool;
use App\Scanning\NormalizedFinding;

/**
 * Adapter for `sqlmap`. Runs in batch mode crawling the target URL. sqlmap's
 * human-readable output is parsed for successful injection confirmations;
 * the structured risk is captured where available.
 */
class SqlmapTool implements SecurityTool
{
    public function name(): ToolName
    {
        return ToolName::Sqlmap;
    }

    public function buildCommand(string $target, array $options = []): array
    {
        $args = [
            '-u', $target,
            '--batch',
            '--crawl', (string) ($options['crawl'] ?? 1),
            '--level', (string) ($options['level'] ?? 1),
            '--risk', (string) ($options['risk'] ?? 1),
        ];

        if (filled($options['data'] ?? null)) {
            $args[] = '--data';
            $args[] = (string) $options['data'];
        }

        return array_merge([$this->binary()], $args);
    }

    public function parseOutput(string $raw, int $exitCode): array
    {
        if (! str_contains($raw, 'is vulnerable')) {
            return [];
        }

        $findings = [];

        // sqlmap prints blocks like:
        //   Parameter: id (GET)
        //   Type: boolean-based blind
        //   Title: ... (e.g. AND 1=1)
        preg_match_all(
            '/Parameter:\s*([^\n]+)\n((?:\s+Type:[^\n]+\n)(?:\s+Title:[^\n]+\n)?)/',
            $raw,
            $matches,
            PREG_SET_ORDER
        );

        if (empty($matches)) {
            // Fallback: report a generic confirmed injection.
            $findings[] = new NormalizedFinding(
                tool: $this->name(),
                title: 'SQL injection confirmed',
                category: 'sqli',
                severity: VulnerabilitySeverity::Critical,
                description: 'sqlmap confirmed at least one SQL injection point on the target.',
                evidence: $this->firstEvidence($raw),
                recommendation: 'Use parameterized queries / prepared statements exclusively.',
            );

            return $findings;
        }

        foreach ($matches as $m) {
            $parameter = trim($m[1]);
            $typeLine = $m[2];
            $isTimeBased = stripos($typeLine, 'time-based') !== false
                || stripos($typeLine, 'stacked') !== false;

            $findings[] = new NormalizedFinding(
                tool: $this->name(),
                title: "SQL injection via parameter: {$parameter}",
                category: 'sqli',
                severity: $isTimeBased ? VulnerabilitySeverity::Critical : VulnerabilitySeverity::High,
                description: "sqlmap confirmed SQL injection on parameter '{$parameter}'.",
                evidence: $this->firstEvidence($raw),
                recommendation: 'Validate input types and use parameterized queries.',
            );
        }

        return $findings;
    }

    protected function firstEvidence(string $raw): ?string
    {
        foreach (explode("\n", $raw) as $line) {
            if (stripos($line, 'is vulnerable') !== false) {
                return trim($line);
            }
        }

        return null;
    }

    protected function binary(): ?string
    {
        return $this->name()->binary();
    }
}
