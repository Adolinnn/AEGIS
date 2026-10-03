<?php

declare(strict_types=1);

namespace App\Scanning\Tools;

use App\Enums\ToolName;
use App\Enums\VulnerabilitySeverity;
use App\Scanning\Contracts\SecurityTool;
use App\Scanning\NormalizedFinding;
use Illuminate\Support\Facades\File;

/**
 * Adapter for `gobuster dir`. Brute-forces common paths against a URL and
 * reports each discovered (200/204/301/302/307/401/403) location as an Info
 * finding so an analyst can review what is exposed.
 */
class GobusterTool implements SecurityTool
{
    public function name(): ToolName
    {
        return ToolName::Gobuster;
    }

    public function buildCommand(string $target, array $options = []): array
    {
        $wordlist = $this->resolveWordlist($options['wordlist'] ?? null);

        $args = [
            'dir',
            '-u', $target,
            '-q',
            '-w', $wordlist,
            '-t', (string) ($options['threads'] ?? 10),
        ];

        // Follow redirects to find more paths
        $args[] = '-r';

        // Show status codes in output - use -b "" to disable default 404 blacklist
        // so our custom -s works without conflict
        $statusCodes = $options['status_codes'] ?? '200,204,301,302,307,401,403';
        if (filled($statusCodes)) {
            $args[] = '-b';
            $args[] = '';  // Disable default 404 blacklist
            $args[] = '-s';
            $args[] = (string) $statusCodes;
        }

        if (filled($options['extensions'] ?? null)) {
            $args[] = '-x';
            $args[] = (string) $options['extensions']; // e.g. "php,html,js"
        }

        // Timeout per request
        if (filled($options['timeout'] ?? null)) {
            $args[] = '--timeout';
            $args[] = (string) $options['timeout'];
        }

        return array_merge([$this->binary()], $args);
    }

    public function parseOutput(string $raw, int $exitCode): array
    {
        $lines = preg_split('/\r?\n/', $raw) ?: [];
        $findings = [];

        foreach ($lines as $line) {
            $line = trim($line);
            if ($line === '') {
                continue;
            }

            // gobuster output formats:
            // With -s: "/admin (Status: 200) [Size: 1234] [--> /login]"
            // Without -s: "/admin (Status: 200) [Size: 1234]"
            // Also handles: "===============================================================" (progress bars)
            // And bare filenames like ".env (Status: 200) [Size: 1207]"
            if (! preg_match('#^(\S+)\s+\(Status:\s*(\d+)\)#', $line, $m)) {
                continue;
            }

            $path = $m[1];
            $status = (int) $m[2];

            // Extract size if present
            $size = null;
            if (preg_match('/\[Size:\s*(\d+)\]/', $line, $sizeMatch)) {
                $size = (int) $sizeMatch[1];
            }

            // Extract redirect if present
            $redirect = null;
            if (preg_match('/\[-->\s*([^\]]+)\]/', $line, $redirectMatch)) {
                $redirect = trim($redirectMatch[1]);
            }

            $severity = $this->severityFromStatus($status);
            $category = $this->categoryFromStatus($status, $redirect);

            $description = "Gobuster found {$path} returning HTTP {$status}";
            if ($size !== null) {
                $description .= " (Size: {$size})";
            }
            if ($redirect !== null) {
                $description .= " -> Redirects to: {$redirect}";
            }
            $description .= '.';

            $evidence = $line;

            $findings[] = new NormalizedFinding(
                tool: $this->name(),
                title: "Discovered path: {$path}",
                category: $category,
                severity: $severity,
                description: $description,
                evidence: $evidence,
                recommendation: $this->recommendationFromStatus($status, $redirect),
            );
        }

        return $findings;
    }

    /**
     * Resolve wordlist path with fallbacks.
     */
    protected function resolveWordlist(?string $provided): string
    {
        // 1. Explicitly provided wordlist
        if (filled($provided) && File::exists($provided)) {
            return $provided;
        }

        // 2. Config value
        $configWordlist = config('scanning.tools.gobuster.wordlist');
        if (filled($configWordlist) && File::exists($configWordlist)) {
            return $configWordlist;
        }

        // 3. Fallback chain - try common locations
        $fallbacks = [
            '/usr/share/seclists/Discovery/Web-Content/raft-medium-directories.txt',
            '/usr/share/seclists/Discovery/Web-Content/raft-small-directories.txt',
            '/usr/share/seclists/Discovery/Web-Content/common.txt',
            '/usr/share/seclists/Discovery/Web-Content/DirBuster-2007_directory-list-2.3-medium.txt',
            '/usr/share/wordlists/dirb/common.txt',
            '/usr/share/wordlists/dirbuster/directory-list-2.3-medium.txt',
            '/usr/share/dirb/wordlists/common.txt',
        ];

        foreach ($fallbacks as $fallback) {
            if (File::exists($fallback)) {
                return $fallback;
            }
        }

        // 4. Last resort - return config value even if missing (gobuster will error clearly)
        return $configWordlist ?? base_path('wordlist/common.txt');
    }

    /**
     * Determine severity based on HTTP status code.
     */
    protected function severityFromStatus(int $status): VulnerabilitySeverity
    {
        return match (true) {
            $status >= 500 => VulnerabilitySeverity::Medium,  // Server errors may indicate issues
            $status === 403 => VulnerabilitySeverity::Low,    // Forbidden - interesting but not directly exploitable
            $status === 401 => VulnerabilitySeverity::Low,    // Unauthorized - auth protected
            $status >= 300 && $status < 400 => VulnerabilitySeverity::Info, // Redirects
            $status >= 200 && $status < 300 => VulnerabilitySeverity::Info, // Success
            default => VulnerabilitySeverity::Info,
        };
    }

    /**
     * Determine category based on status and redirect.
     */
    protected function categoryFromStatus(int $status, ?string $redirect): string
    {
        if ($status >= 500) {
            return 'server-error';
        }
        if ($status === 403) {
            return 'forbidden-path';
        }
        if ($status === 401) {
            return 'auth-protected';
        }
        if ($status >= 300 && $status < 400) {
            return $redirect ? 'redirect' : 'redirect-unknown';
        }
        return 'exposed-path';
    }

    /**
     * Generate recommendation based on status and redirect.
     */
    protected function recommendationFromStatus(int $status, ?string $redirect): string
    {
        return match (true) {
            $status >= 500 => 'Investigate server error; may indicate misconfiguration or vulnerability.',
            $status === 403 => 'Path exists but is forbidden. Check if access control is correctly implemented.',
            $status === 401 => 'Path requires authentication. Verify auth mechanism is robust.',
            $status >= 300 && $status < 400 => $redirect
                ? "Redirects to {$redirect}. Review if redirect target is intended and safe."
                : 'Redirect with unknown target. Investigate redirect chain.',
            $status >= 200 && $status < 300 => 'Review whether this path should be publicly accessible.',
            default => 'Review whether this path should be publicly accessible.',
        };
    }

    protected function binary(): ?string
    {
        return $this->name()->binary();
    }
}