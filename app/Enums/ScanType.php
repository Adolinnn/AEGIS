<?php

declare(strict_types=1);

namespace App\Enums;

enum ScanType: string
{
    case Xss = 'xss';
    case Ssrf = 'ssrf';
    case Sqli = 'sqli';
    case Misconfiguration = 'misconfiguration';
    case Full = 'full';

    public function label(): string
    {
        return match ($this) {
            self::Xss => 'Cross-Site Scripting (XSS)',
            self::Ssrf => 'Server-Side Request Forgery (SSRF)',
            self::Sqli => 'SQL Injection (SQLi)',
            self::Misconfiguration => 'Security Misconfiguration',
            self::Full => 'Full Security Scan',
        };
    }

    public function description(): string
    {
        return match ($this) {
            self::Xss => 'Tests for reflected XSS by injecting script payloads into parameters and checking for unsanitized reflection in response body.',
            self::Ssrf => 'Tests for SSRF by injecting internal IP addresses (127.0.0.1, 169.254.169.254) into URL parameters and detecting internal resolution.',
            self::Sqli => 'Tests for SQL injection using boolean-based and time-based payloads, evaluating response length and timing differences.',
            self::Misconfiguration => 'Scans response headers for missing security headers: Content-Security-Policy, Strict-Transport-Security, X-Frame-Options, etc.',
            self::Full => 'Runs all scan types (XSS, SSRF, SQLi, Misconfiguration) in sequence.',
        };
    }

    public function defaultPayloads(): array
    {
        return match ($this) {
            self::Xss => [
                '<script>alert(1)</script>',
                '"><script>alert(1)</script>',
                '\'><script>alert(1)</script>',
                '<img src=x onerror=alert(1)>',
                '<svg onload=alert(1)>',
                'javascript:alert(1)',
            ],
            self::Ssrf => [
                'http://127.0.0.1',
                'http://localhost',
                'http://169.254.169.254/latest/meta-data/',
                'http://[::1]',
                'http://0.0.0.0',
                'http://10.0.0.1',
                'http://192.168.1.1',
            ],
            self::Sqli => [
                "' OR '1'='1",
                "' OR '1'='1' --",
                '" OR "1"="1',
                "' WAITFOR DELAY '0:0:5'--",
                '" WAITFOR DELAY "0:0:5"--',
                "' OR SLEEP(5)--",
                '" OR SLEEP(5)--',
            ],
            self::Misconfiguration => [],
            self::Full => [],
        };
    }

    public function requiresPayload(): bool
    {
        return $this !== self::Misconfiguration && $this !== self::Full;
    }
}