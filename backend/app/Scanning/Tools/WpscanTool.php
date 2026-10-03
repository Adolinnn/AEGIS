<?php

declare(strict_types=1);

namespace App\Scanning\Tools;

use App\Enums\ToolName;
use App\Enums\VulnerabilitySeverity;
use App\Scanning\Contracts\SecurityTool;
use App\Scanning\NormalizedFinding;

/**
 * Adapter for `wpscan`. Runs against a WordPress URL and requests JSON output.
 * Parses the interesting_entries, vulnerabilities, and outdated component
 * sections into findings.
 */
class WpscanTool implements SecurityTool
{
    public function name(): ToolName
    {
        return ToolName::Wpscan;
    }

    public function buildCommand(string $target, array $options = []): array
    {
        $args = [
            '--url', $target,
            '--no-update',
            '--format', 'json',
            '--disable-tls-checks',
            '--max-threads', (string) ($options['max_threads'] ?? 5),
            '--request-timeout', (string) ($options['request_timeout'] ?? 60),
        ];

        // API token for vulnerability data
        $apiToken = $options['api_token'] ?? config('scanning.tools.wpscan.api_token');
        if (filled($apiToken)) {
            $args[] = '--api-token';
            $args[] = (string) $apiToken;
        }

        // Enumeration options
        $enumerate = $options['enumerate'] ?? config('scanning.tools.wpscan.enumerate', 'vp,vt,tt,cb,dbe,bf,u,m');
        if (filled($enumerate)) {
            $args[] = '--enumerate';
            $args[] = (string) $enumerate;
        }

        // Detection mode
        if (filled($options['detection_mode'] ?? null)) {
            $args[] = '--detection-mode';
            $args[] = (string) $options['detection_mode'];
        }

        // Force scan even if not detected as WordPress
        if (! empty($options['force'] ?? false)) {
            $args[] = '--force';
        }

        // WP auth for REST API (application password)
        if (filled($options['wp_auth'] ?? null)) {
            $args[] = '--wp-auth';
            $args[] = (string) $options['wp_auth'];
        }

        // HTTP basic auth
        if (filled($options['http_auth'] ?? null)) {
            $args[] = '--http-auth';
            $args[] = (string) $options['http_auth'];
        }

        // Proxy
        if (filled($options['proxy'] ?? null)) {
            $args[] = '--proxy';
            $args[] = (string) $options['proxy'];
        }

        // Cookie jar
        if (filled($options['cookie_jar'] ?? null)) {
            $args[] = '--cookie-jar';
            $args[] = (string) $options['cookie_jar'];
        }

        // User agent
        if (filled($options['user_agent'] ?? null)) {
            $args[] = '--user-agent';
            $args[] = (string) $options['user_agent'];
        } elseif (! empty($options['random_user_agent'] ?? false)) {
            $args[] = '--random-user-agent';
        }

        return array_merge([$this->binary()], $args);
    }

    public function parseOutput(string $raw, int $exitCode): array
    {
        $data = json_decode($raw, true);
        if (! is_array($data)) {
            // Try JSONL format (one JSON per line)
            $lines = explode("\n", $raw);
            $findings = [];
            foreach ($lines as $line) {
                $line = trim($line);
                if ($line === '') continue;
                $decoded = json_decode($line, true);
                if (is_array($decoded)) {
                    $findings = array_merge($findings, $this->parseWpscanData($decoded));
                }
            }
            return $findings;
        }

        return $this->parseWpscanData($data);
    }

    protected function parseWpscanData(array $data): array
    {
        $findings = [];

        // WordPress version detection
        if (! empty($data['version'])) {
            $version = $data['version'];
            if (! empty($version['status']) && $version['status'] === 'outdated') {
                $findings[] = new NormalizedFinding(
                    tool: $this->name(),
                    title: 'Outdated WordPress core',
                    category: 'outdated-core',
                    severity: VulnerabilitySeverity::High,
                    description: 'WordPress version ' . ($version['number'] ?? 'unknown') . ' is outdated.',
                    evidence: json_encode($version),
                    recommendation: 'Upgrade WordPress to the latest stable release.',
                );
            } elseif (! empty($version['number'])) {
                $findings[] = new NormalizedFinding(
                    tool: $this->name(),
                    title: 'WordPress version detected',
                    category: 'version-disclosure',
                    severity: VulnerabilitySeverity::Info,
                    description: 'WordPress version ' . $version['number'] . ' detected.',
                    evidence: json_encode($version),
                    recommendation: 'Consider hiding version in meta generator tag.',
                );
            }
        }

        // Main theme
        if (! empty($data['main_theme'])) {
            $theme = $data['main_theme'];
            if (! empty($theme['vulnerabilities']) && is_array($theme['vulnerabilities'])) {
                foreach ($theme['vulnerabilities'] as $vuln) {
                    $findings[] = $this->createVulnFinding(
                        $theme['slug'] ?? 'unknown',
                        'theme',
                        $vuln,
                        $theme['version'] ?? null
                    );
                }
            }
            // Theme info even without vulns
            if (! empty($theme['slug'])) {
                $findings[] = new NormalizedFinding(
                    tool: $this->name(),
                    title: 'Theme detected: ' . $theme['slug'],
                    category: 'theme-detected',
                    severity: VulnerabilitySeverity::Info,
                    description: 'Active theme: ' . $theme['slug'] . ' v' . ($theme['version'] ?? 'unknown'),
                    evidence: json_encode($theme),
                    recommendation: 'Keep theme updated and review for vulnerabilities.',
                );
            }
        }

        // Plugins
        foreach (($data['plugins'] ?? []) as $slug => $plugin) {
            $vulns = $plugin['vulnerabilities'] ?? [];
            foreach ($vulns as $vuln) {
                $findings[] = $this->createVulnFinding(
                    $slug,
                    'plugin',
                    $vuln,
                    $plugin['version'] ?? null
                );
            }
            // Plugin info even without vulns
            $findings[] = new NormalizedFinding(
                tool: $this->name(),
                title: 'Plugin detected: ' . $slug,
                category: 'plugin-detected',
                severity: VulnerabilitySeverity::Info,
                description: 'Plugin: ' . $slug . ' v' . ($plugin['version'] ?? 'unknown') . ($plugin['is_vulnerable'] ?? false ? ' (vulnerable)' : ''),
                evidence: json_encode($plugin),
                recommendation: 'Keep plugin updated. Remove if unused.',
            );
        }

        // Other themes
        foreach (($data['themes'] ?? []) as $slug => $theme) {
            if (isset($data['main_theme']['slug']) && $data['main_theme']['slug'] === $slug) {
                continue; // Already handled
            }
            $vulns = $theme['vulnerabilities'] ?? [];
            foreach ($vulns as $vuln) {
                $findings[] = $this->createVulnFinding(
                    $slug,
                    'theme',
                    $vuln,
                    $theme['version'] ?? null
                );
            }
            if (! empty($theme['slug'])) {
                $findings[] = new NormalizedFinding(
                    tool: $this->name(),
                    title: 'Theme detected: ' . $slug,
                    category: 'theme-detected',
                    severity: VulnerabilitySeverity::Info,
                    description: 'Theme: ' . $slug . ' v' . ($theme['version'] ?? 'unknown') . ($theme['is_vulnerable'] ?? false ? ' (vulnerable)' : ''),
                    evidence: json_encode($theme),
                    recommendation: 'Keep theme updated. Remove if unused.',
                );
            }
        }

        // Interesting findings (config backups, db exports, etc.)
        foreach (($data['interesting_findings'] ?? []) as $finding) {
            $severity = match ($finding['type'] ?? '') {
                'config-backup', 'db-export', 'backup-folder' => VulnerabilitySeverity::Medium,
                'debug-log', 'wp-config' => VulnerabilitySeverity::High,
                default => VulnerabilitySeverity::Info,
            };

            $findings[] = new NormalizedFinding(
                tool: $this->name(),
                title: 'Interesting finding: ' . ($finding['to_s'] ?? 'unknown'),
                category: 'interesting-finding',
                severity: $severity,
                description: ($finding['to_s'] ?? 'Interesting file/folder found'),
                evidence: json_encode($finding),
                recommendation: 'Review and restrict access to sensitive files.',
            );
        }

        // Users enumeration
        foreach (($data['users'] ?? []) as $user) {
            $findings[] = new NormalizedFinding(
                tool: $this->name(),
                title: 'User enumerated: ' . ($user['slug'] ?? $user['id'] ?? 'unknown'),
                category: 'user-enumeration',
                severity: VulnerabilitySeverity::Low,
                description: 'WordPress user detected: ' . ($user['slug'] ?? 'unknown'),
                evidence: json_encode($user),
                recommendation: 'Consider disabling user enumeration via REST API / author archives.',
            );
        }

        return $findings;
    }

    protected function createVulnFinding(string $slug, string $type, array $vuln, ?string $version): NormalizedFinding
    {
        $title = $vuln['title'] ?? "Vulnerability in {$type} {$slug}";
        $severity = $this->severityFromTitle($title);

        return new NormalizedFinding(
            tool: $this->name(),
            title: $title,
            category: "vulnerable-{$type}",
            severity: $severity,
            description: "Vulnerability detected in {$type} '{$slug}'"
                . (filled($version) ? ' v' . $version : '')
                . ". Fixed in: " . ($vuln['fixed_in'] ?? 'unknown'),
            evidence: json_encode($vuln),
            recommendation: 'Update or remove the vulnerable component. ' . ($vuln['references']['url'][0] ?? 'Check references for details.'),
        );
    }

    protected function severityFromTitle(string $title): VulnerabilitySeverity
    {
        $lower = strtolower($title);
        if (str_contains($lower, 'rce') || str_contains($lower, 'remote code') || str_contains($lower, 'unauthenticated rce')) {
            return VulnerabilitySeverity::Critical;
        }
        if (str_contains($lower, 'sqli') || str_contains($lower, 'sql injection')) {
            return VulnerabilitySeverity::Critical;
        }
        if (str_contains($lower, 'xss') || str_contains($lower, 'cross-site scripting')) {
            return VulnerabilitySeverity::High;
        }
        if (str_contains($lower, 'csrf')) {
            return VulnerabilitySeverity::Medium;
        }
        if (str_contains($lower, 'privilege escalation') || str_contains($lower, 'authentication bypass')) {
            return VulnerabilitySeverity::Critical;
        }
        if (str_contains($lower, 'file upload') || str_contains($lower, 'arbitrary file')) {
            return VulnerabilitySeverity::High;
        }

        return VulnerabilitySeverity::High;
    }

    protected function binary(): ?string
    {
        return $this->name()->binary();
    }
}