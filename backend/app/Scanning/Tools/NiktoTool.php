<?php

declare(strict_types=1);

namespace App\Scanning\Tools;

use App\Enums\ToolName;
use App\Enums\VulnerabilitySeverity;
use App\Scanning\Contracts\SecurityTool;
use App\Scanning\NormalizedFinding;

/**
 * Adapter for `nikto`. Scans a web target for misconfigurations and known
 * issues. Requests JSON output (-Format json) and parses the per-item list.
 */
class NiktoTool implements SecurityTool
{
    /**
     * Path to the temp JSON output file for the in-flight command. Nikto's
     * -output flag (per official docs) only accepts a real file path or '.'
     * for auto-name — '-' for stdout is NOT a supported token, which is why
     * the previous command silently failed ("Unable to open '-' for write").
     * We always give it a real writable path and read that file in
     * parseOutput() instead of relying on stdout.
     */
    protected ?string $outputPath = null;

    public function name(): ToolName
    {
        return ToolName::Nikto;
    }

    public function buildCommand(string $target, array $options = []): array
    {
        $dir = storage_path('app/tmp/nikto');
        if (! is_dir($dir)) {
            mkdir($dir, 0775, true);
        }
        $this->outputPath = $dir . '/' . uniqid('nikto_', true) . '.json';

        $args = [
            '-h', $target,
            '-Format', 'json',
            '-output', $this->outputPath,
            '-nointeractive',
            '-Tuning', $options['tuning'] ?? config('scanning.tools.nikto.tuning', '1234567890abc'),
        ];

        // Max time
        $maxtime = $options['maxtime'] ?? config('scanning.tools.nikto.maxtime', '10m');
        if (filled($maxtime)) {
            $args[] = '-maxtime';
            $args[] = (string) $maxtime;
        }

        // Port
        if (filled($options['port'] ?? null)) {
            $args[] = '-port';
            $args[] = (string) $options['port'];
        }

        // SSL
        if (! empty($options['ssl'] ?? false)) {
            $args[] = '-ssl';
        }

        // No SSL
        if (! empty($options['nossl'] ?? false)) {
            $args[] = '-nossl';
        }

        // Follow redirects
        if (! empty($options['follow_redirects'] ?? false)) {
            $args[] = '-followredirects';
        }

        // Evasion techniques
        if (filled($options['evasion'] ?? null)) {
            $args[] = '-evasion';
            $args[] = (string) $options['evasion'];
        }

        // Authentication
        if (filled($options['id'] ?? null)) {
            $args[] = '-id';
            $args[] = (string) $options['id'];
        }

        // CGI dirs
        if (filled($options['cgidirs'] ?? null)) {
            $args[] = '-Cgidirs';
            $args[] = (string) $options['cgidirs'];
        }

        // Pause between tests
        if (filled($options['pause'] ?? null)) {
            $args[] = '-Pause';
            $args[] = (string) $options['pause'];
        }

        // Platform
        if (filled($options['platform'] ?? null)) {
            $args[] = '-Platform';
            $args[] = (string) $options['platform'];
        }

        // Plugins
        if (filled($options['plugins'] ?? null)) {
            $args[] = '-Plugins';
            $args[] = (string) $options['plugins'];
        }

        // Root prepend
        if (filled($options['root'] ?? null)) {
            $args[] = '-root';
            $args[] = (string) $options['root'];
        }

        // Display options
        if (filled($options['display'] ?? null)) {
            $args[] = '-Display';
            $args[] = (string) $options['display'];
        }

        // No 404 check
        if (! empty($options['no404'] ?? false)) {
            $args[] = '-no404';
        }

        // No lookup
        if (! empty($options['nolookup'] ?? false)) {
            $args[] = '-nolookup';
        }

        // Mutate
        if (filled($options['mutate'] ?? null)) {
            $args[] = '-mutate';
            $args[] = (string) $options['mutate'];
        }

        return array_merge([$this->binary()], $args);
    }

    public function parseOutput(string $raw, int $exitCode): array
    {
        // Nikto writes JSON to the -output file, not stdout. Read that file;
        // fall back to $raw (e.g. in unit tests that don't run the real
        // binary) if the file is missing/empty.
        $source = $raw;
        if ($this->outputPath && is_file($this->outputPath) && filesize($this->outputPath) > 0) {
            $source = file_get_contents($this->outputPath) ?: $raw;
        }
        if ($this->outputPath && is_file($this->outputPath)) {
            @unlink($this->outputPath);
        }

        $data = json_decode($source, true);
        if (! is_array($data)) {
            return [];
        }

        // Nikto JSON output format varies:
        // 1. Array of scan objects with "vulnerabilities" key (newer versions)
        // 2. Object with "nikto" -> "scan_details" -> "item" (older format)
        $items = [];

        // Format 1: Array of scan objects with vulnerabilities
        if (isset($data[0]['vulnerabilities']) && is_array($data[0]['vulnerabilities'])) {
            foreach ($data as $scan) {
                foreach ($scan['vulnerabilities'] as $vuln) {
                    $items[] = $vuln;
                }
            }
        }
        // Format 2: { "nikto": { "scan_details": [ { "item": [...] } ] } }
        elseif (isset($data['nikto']['scan_details'])) {
            $details = $data['nikto']['scan_details'];
            if (! is_array($details)) {
                $details = [$details];
            }
            foreach ($details as $detail) {
                foreach (($detail['item'] ?? []) as $item) {
                    $items[] = $item;
                }
            }
        }
        // Format 3: { "scan_details": [ { "item": [...] } ] }
        elseif (isset($data['scan_details'])) {
            $details = $data['scan_details'];
            if (! is_array($details)) {
                $details = [$details];
            }
            foreach ($details as $detail) {
                foreach (($detail['item'] ?? []) as $item) {
                    $items[] = $item;
                }
            }
        }

        $findings = [];

        foreach ($items as $item) {
            $message = $item['msg'] ?? $item['message'] ?? null;
            if (! filled($message)) {
                continue;
            }

            $severity = match ((int) ($item['severity'] ?? $item['risk'] ?? 0)) {
                1 => VulnerabilitySeverity::High,
                2 => VulnerabilitySeverity::Medium,
                3 => VulnerabilitySeverity::Low,
                default => VulnerabilitySeverity::Info,
            };

            // Try to get a better title from the ID or method/url
            $title = $item['namelink'] ?? $item['id'] ?? 'Nikto finding';
            if ($title === 'Nikto finding' && isset($item['method'], $item['url'])) {
                $title = "{$item['method']} {$item['url']}";
            }

            $findings[] = new NormalizedFinding(
                tool: $this->name(),
                title: (string) $title,
                category: 'web-misconfiguration',
                severity: $severity,
                description: $message,
                evidence: json_encode($item),
                recommendation: 'Review the flagged web server configuration.',
            );
        }

        return $findings;
    }

    protected function binary(): ?string
    {
        return $this->name()->binary();
    }
}