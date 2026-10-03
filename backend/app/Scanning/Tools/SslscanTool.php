<?php

declare(strict_types=1);

namespace App\Scanning\Tools;

use App\Enums\ToolName;
use App\Enums\VulnerabilitySeverity;
use App\Scanning\Contracts\SecurityTool;
use App\Scanning\NormalizedFinding;

/**
 * Adapter for `sslscan`. Enumerates supported TLS/SSL protocols and ciphers
 * on the target host. Parses output for security findings.
 */
class SslscanTool implements SecurityTool
{
    public function name(): ToolName
    {
        return ToolName::Sslscan;
    }

    public function buildCommand(string $target, array $options = []): array
    {
        $host = parse_url($target, PHP_URL_HOST) ?: $target;
        $port = parse_url($target, PHP_URL_PORT) ?: 443;

        return array_filter([$this->binary(), '--no-colour', $host . ':' . $port]);
    }

    public function parseOutput(string $raw, int $exitCode): array
    {
        $findings = [];
        $lines = explode("\n", $raw);

        $inCipherSection = false;
        $inProtocolSection = false;
        $currentProtocol = '';

        foreach ($lines as $line) {
            $line = trim($line);
            if ($line === '') continue;

            // SSL/TLS Protocols section
            if (str_starts_with($line, 'SSL/TLS Protocols:')) {
                $inProtocolSection = true;
                $inCipherSection = false;
                continue;
            }

            // Cipher section
            if (str_starts_with($line, 'Supported Server Cipher(s):')) {
                $inCipherSection = true;
                $inProtocolSection = false;
                continue;
            }

            // Certificate section
            if (str_starts_with($line, 'SSL Certificate:')) {
                $inCipherSection = false;
                $inProtocolSection = false;
                continue;
            }

            // Parse protocols
            if ($inProtocolSection && preg_match('/^(\w+\s*\d*)\s+(enabled|disabled)$/i', $line, $m)) {
                $protocol = $m[1];
                $status = strtolower($m[2]);
                
                if ($status === 'enabled') {
                    $severity = match (strtolower($protocol)) {
                        'sslv2', 'sslv3', 'tlsv1.0', 'tlsv1.1' => VulnerabilitySeverity::High,
                        default => VulnerabilitySeverity::Info,
                    };
                    
                    $findings[] = new NormalizedFinding(
                        tool: $this->name(),
                        title: "TLS/SSL Protocol enabled: {$protocol}",
                        category: 'ssl-protocol',
                        severity: $severity,
                        description: "Server supports {$protocol} which is " . ($severity === VulnerabilitySeverity::High ? 'deprecated and insecure' : 'enabled'),
                        evidence: $line,
                        recommendation: $severity === VulnerabilitySeverity::High 
                            ? 'Disable deprecated protocols (SSLv2, SSLv3, TLS 1.0, TLS 1.1). Require TLS 1.2+.' 
                            : 'Review if this protocol should be enabled.',
                    );
                }
            }

            // Parse ciphers
            if ($inCipherSection && preg_match('/^(Preferred|Accepted)\s+(\w+\.?\d*)\s+(\d+)\s+bits\s+(\S+)/', $line, $m)) {
                $preference = $m[1];
                $protocol = $m[2];
                $bits = (int) $m[3];
                $cipher = $m[4];

                $severity = VulnerabilitySeverity::Info;
                $category = 'ssl-cipher';

                // Check for weak ciphers
                if ($bits < 128) {
                    $severity = VulnerabilitySeverity::Medium;
                    $category = 'weak-cipher';
                }
                if (preg_match('/(RC4|DES|3DES|EXPORT|NULL|ANON|MD5)/i', $cipher)) {
                    $severity = VulnerabilitySeverity::High;
                    $category = 'weak-cipher';
                }

                $findings[] = new NormalizedFinding(
                    tool: $this->name(),
                    title: "Cipher: {$cipher} ({$protocol}, {$bits} bits)",
                    category: $category,
                    severity: $severity,
                    description: "Server supports {$cipher} ({$protocol}, {$bits} bits) - {$preference}",
                    evidence: $line,
                    recommendation: $severity >= VulnerabilitySeverity::Medium 
                        ? 'Disable weak ciphers. Prefer AES-GCM, ChaCha20-Poly1305 with 128+ bits.' 
                        : 'Cipher appears acceptable.',
                );
            }

            // Parse certificate info
            if (preg_match('/Not valid after:\s+(.+)$/i', $line, $m)) {
                $expiryStr = trim($m[1]);
                $expiry = strtotime($expiryStr);
                if ($expiry) {
                    $daysUntilExpiry = ($expiry - time()) / 86400;
                    $severity = match (true) {
                        $daysUntilExpiry < 0 => VulnerabilitySeverity::Critical,
                        $daysUntilExpiry < 30 => VulnerabilitySeverity::High,
                        $daysUntilExpiry < 60 => VulnerabilitySeverity::Medium,
                        default => VulnerabilitySeverity::Info,
                    };

                    $findings[] = new NormalizedFinding(
                        tool: $this->name(),
                        title: 'SSL Certificate expiry',
                        category: 'cert-expiry',
                        severity: $severity,
                        description: "Certificate expires on {$expiryStr} ({$daysUntilExpiry} days)",
                        evidence: $line,
                        recommendation: $severity >= VulnerabilitySeverity::High 
                            ? 'Renew certificate immediately.' 
                            : 'Plan certificate renewal before expiry.',
                    );
                }
            }

            // Key strength
            if (preg_match('/RSA Key Strength:\s+(\d+)/i', $line, $m)) {
                $bits = (int) $m[1];
                $severity = $bits < 2048 ? VulnerabilitySeverity::Medium : VulnerabilitySeverity::Info;

                $findings[] = new NormalizedFinding(
                    tool: $this->name(),
                    title: "SSL Key strength: {$bits} bits",
                    category: 'ssl-key-strength',
                    severity: $severity,
                    description: "Server certificate uses {$bits}-bit RSA key",
                    evidence: $line,
                    recommendation: $bits < 2048 ? 'Upgrade to 2048-bit or higher RSA key.' : 'Key strength is adequate.',
                );
            }

            // Heartbleed
            if (str_contains($line, 'heartbleed') && !str_contains($line, 'not vulnerable')) {
                $findings[] = new NormalizedFinding(
                    tool: $this->name(),
                    title: 'Heartbleed vulnerability',
                    category: 'heartbleed',
                    severity: VulnerabilitySeverity::Critical,
                    description: 'Server may be vulnerable to Heartbleed (CVE-2014-0160)',
                    evidence: $line,
                    recommendation: 'Patch OpenSSL immediately and revoke/reissue certificates.',
                );
            }
        }

        return $findings;
    }

    protected function binary(): ?string
    {
        return $this->name()->binary();
    }
}
