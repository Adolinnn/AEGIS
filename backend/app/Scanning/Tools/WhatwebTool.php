<?php

declare(strict_types=1);

namespace App\Scanning\Tools;

use App\Enums\ToolName;
use App\Enums\VulnerabilitySeverity;
use App\Scanning\Contracts\SecurityTool;
use App\Scanning\NormalizedFinding;

/**
 * Adapter for `whatweb`. Fingerprints the web technologies powering a URL.
 * Returns raw output for display.
 */
class WhatwebTool implements SecurityTool
{
    public function name(): ToolName
    {
        return ToolName::Whatweb;
    }

    public function buildCommand(string $target, array $options = []): array
    {
        return array_filter([$this->binary(), $target]);
    }

    public function parseOutput(string $raw, int $exitCode): array
    {
        $findings = [];

        // whatweb output format:
        // https://example.com [200 OK] Apache[2.4.41], Country[US], PHP[7.4.3], ...
        // Each line is a target with detected technologies
        
        $lines = preg_split('/\r?\n/', $raw) ?: [];
        foreach ($lines as $line) {
            $line = trim($line);
            if ($line === '') continue;

            // Parse: URL [STATUS] Tech1[version], Tech2[version], ...
            if (! preg_match('#^(\S+)\s+\[([^\]]+)\]\s+(.+)$#', $line, $m)) {
                continue;
            }

            $url = $m[1];
            $status = $m[2];
            $technologies = $m[3];

            // Extract individual technologies - but exclude false positives like time units
            // Pattern: TechnologyName[Version] where TechnologyName is alphanumeric with dots/hyphens
            // Exclude: pure numbers, time units (s, m, h, ms), single letters
            preg_match_all('/([A-Za-z][A-Za-z0-9\.\-]+)\[([^\]]+)\]/', $technologies, $matches, PREG_SET_ORDER);
            
            foreach ($matches as $match) {
                $tech = $match[1];
                $version = $match[2];
                
                // Skip false positives
                if (preg_match('/^\d+[smh]?$/', $tech) || strlen($tech) === 1) {
                    continue;
                }
                
                $findings[] = new NormalizedFinding(
                    tool: $this->name(),
                    title: "Technology detected: {$tech}",
                    category: 'technology-fingerprint',
                    severity: VulnerabilitySeverity::Info,
                    description: "{$tech} version {$version} detected on {$url}",
                    evidence: "URL: {$url} | Status: {$status} | Raw: {$technologies}",
                    recommendation: 'Review technology stack for outdated components and information disclosure.',
                );
            }

            // Also add a summary finding for the target
            $findings[] = new NormalizedFinding(
                tool: $this->name(),
                title: "Web server fingerprint: {$url}",
                category: 'web-fingerprint',
                severity: VulnerabilitySeverity::Info,
                description: "Target {$url} returned {$status} with technologies: {$technologies}",
                evidence: $line,
                recommendation: 'Review server headers and technology stack for security hardening.',
            );
        }

        return $findings;
    }

    protected function binary(): ?string
    {
        return $this->name()->binary();
    }
}
