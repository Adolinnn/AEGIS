<?php

declare(strict_types=1);

namespace App\Enums;

use Illuminate\Support\Facades\Process;

enum ToolName: string
{
    case Builtin = 'builtin';
    case Nmap = 'nmap';
    case Nikto = 'nikto';
    case Wpscan = 'wpscan';
    case Gobuster = 'gobuster';
    case Sqlmap = 'sqlmap';
    case Whois = 'whois';
    case Dig = 'dig';
    case Sslscan = 'sslscan';
    case Whatweb = 'whatweb';
    case Nuclei = 'nuclei';

    public function label(): string
    {
        return match ($this) {
            self::Builtin => 'Built-in Checks',
            self::Nmap => 'Nmap',
            self::Nikto => 'Nikto',
            self::Wpscan => 'WPScan',
            self::Gobuster => 'Gobuster',
            self::Sqlmap => 'SQLMap',
            self::Whois => 'Whois',
            self::Dig => 'Dig',
            self::Sslscan => 'SSLScan',
            self::Whatweb => 'WhatWeb',
            self::Nuclei => 'Nuclei',
        };
    }

    public function description(): string
    {
        return match ($this) {
            self::Builtin => 'In-process XSS, SQLi, SSRF, and misconfiguration checks. No external binary required.',
            self::Nmap => 'Port and service discovery against the target host.',
            self::Nikto => 'Web server vulnerability and misconfiguration scanning.',
            self::Wpscan => 'WordPress core, plugin, and theme vulnerability scanning.',
            self::Gobuster => 'Directory and file brute-forcing against the target URL.',
            self::Sqlmap => 'Automated SQL injection detection and exploitation.',
            self::Whois => 'Domain registration and ownership lookup.',
            self::Dig => 'DNS record lookup for the target domain.',
            self::Sslscan => 'TLS/SSL configuration and cipher scan.',
            self::Whatweb => 'Web technology and fingerprint identification.',
            self::Nuclei => 'Template-based vulnerability scanning across known CVEs and misconfigurations.',
        };
    }

    /**
     * Whether this scanner runs in-process (no external binary).
     */
    public function isBuiltin(): bool
    {
        return $this === self::Builtin;
    }

    /**
     * Absolute path to the binary, or null to auto-detect via `command -v`.
     * Built-in checks have no binary.
     */
    public function binary(): ?string
    {
        if ($this === self::Builtin) {
            return null;
        }

        $configured = config("scanning.tools.{$this->value}.binary");
        if (filled($configured)) {
            return $configured;
        }

        $result = Process::path(base_path())->run("command -v {$this->value}");

        return $result->successful() ? trim($result->output()) : null;
    }

    /**
     * Whether the scanner is available on the host. Built-in checks are always
     * available; external tools depend on their binary being installed.
     */
    public function isInstalled(): bool
    {
        if ($this === self::Builtin) {
            return true;
        }

        return filled($this->binary());
    }

    public function timeout(): int
    {
        return (int) config("scanning.tools.{$this->value}.timeout", 120);
    }

    public function idleTimeout(): int
    {
        return (int) config("scanning.tools.{$this->value}.idle_timeout", 30);
    }

    /**
     * Tools that operate on a full URL vs. a host. Nmap/Whois/Dig take a host;
     * the rest (including built-in checks) take a URL.
     */
    public function requiresUrl(): bool
    {
        return match ($this) {
            self::Nmap, self::Whois, self::Dig => false,
            default => true,
        };
    }

    /**
     * Return all scanners that are currently available on the host.
     *
     * @return array<int, ToolName>
     */
    public static function installed(): array
    {
        return array_values(array_filter(
            self::cases(),
            fn (self $tool) => $tool->isInstalled()
        ));
    }
}
