<?php

declare(strict_types=1);

namespace App\Scanning\Tools;

use App\Enums\ToolName;
use App\Enums\VulnerabilitySeverity;
use App\Scanning\Contracts\SecurityTool;
use App\Scanning\NormalizedFinding;

/**
 * Adapter for `nuclei` (ProjectDiscovery). Runs the community template set
 * against the target and reports each match as a finding. Uses `-jsonl` for
 * one JSON object per line, which is nuclei's documented machine-readable
 * output format.
 */
class NucleiTool implements SecurityTool
{
    public function name(): ToolName
    {
        return ToolName::Nuclei;
    }

    public function buildCommand(string $target, array $options = []): array
    {
        $args = [
            '-u', $target,
            '-jsonl',
            '-silent',
            '-no-color',
            '-timeout', (string) ($options['timeout'] ?? config('scanning.tools.nuclei.request_timeout', 10)),
        ];

        // Restrict to specific severities, e.g. "low,medium,high,critical"
        $severity = $options['severity'] ?? config('scanning.tools.nuclei.severity');
        if (filled($severity)) {
            $args[] = '-severity';
            $args[] = (string) $severity;
        }

        // Restrict to specific templates/tags if provided
        if (filled($options['tags'] ?? null)) {
            $args[] = '-tags';
            $args[] = (string) $options['tags'];
        }

        // Rate limit (requests/sec) to keep scans polite by default
        $rateLimit = $options['rate_limit'] ?? config('scanning.tools.nuclei.rate_limit');
        if (filled($rateLimit)) {
            $args[] = '-rate-limit';
            $args[] = (string) $rateLimit;
        }

        return array_merge([$this->binary()], $args);
    }

    public function parseOutput(string $raw, int $exitCode): array
    {
        $findings = [];

        foreach (preg_split('/\r?\n/', trim($raw)) ?: [] as $line) {
            $line = trim($line);
            if ($line === '' || $line[0] !== '{') {
                continue;
            }

            $result = json_decode($line, true);
            if (! is_array($result)) {
                continue;
            }

            $info = $result['info'] ?? [];
            $templateId = $result['template-id'] ?? ($result['template_id'] ?? 'unknown-template');
            $name = $info['name'] ?? $templateId;
            $matchedAt = $result['matched-at'] ?? ($result['host'] ?? '');

            $severity = VulnerabilitySeverity::tryFrom(strtolower((string) ($info['severity'] ?? 'info')))
                ?? VulnerabilitySeverity::Info;

            $tags = is_array($info['tags'] ?? null) ? implode(', ', $info['tags']) : (string) ($info['tags'] ?? '');

            $findings[] = new NormalizedFinding(
                tool: $this->name(),
                title: (string) $name,
                category: 'nuclei-' . ($tags !== '' ? explode(',', $tags)[0] : 'template'),
                severity: $severity,
                description: (string) ($info['description'] ?? "Nuclei template '{$templateId}' matched at {$matchedAt}."),
                evidence: $matchedAt !== '' ? "matched-at: {$matchedAt} | template: {$templateId}" : $line,
                recommendation: 'Review the matched template details; remediate per the referenced CVE/advisory if applicable.',
            );
        }

        return $findings;
    }

    protected function binary(): ?string
    {
        return $this->name()->binary();
    }
}
