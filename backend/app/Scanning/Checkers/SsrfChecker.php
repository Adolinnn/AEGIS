<?php

declare(strict_types=1);

namespace App\Scanning\Checkers;

use App\Enums\ToolName;
use App\Enums\ScanType;
use App\Enums\VulnerabilitySeverity;
use App\Models\Target;
use App\Scanning\NormalizedFinding;
use App\Services\ScannerService;

class SsrfChecker implements VulnerabilityChecker
{
    public function check(Target $target, ScannerService $scanner): array
    {
        $findings = [];
        $payloads = ScanType::Ssrf->defaultPayloads();
        $parameters = $scanner->discoverParameters($target->domain_url, ['url', 'uri', 'link', 'redirect', 'next', 'callback', 'dest', 'destination', 'return', 'return_url', 'continue']);

        foreach ($parameters as $param) {
            foreach ($payloads as $payload) {
                $evidence = $this->testSsrfPayload($scanner, $target->domain_url, $param, $payload);
                if ($evidence) {
                    $title = "SSRF via parameter '{$param}'";
                    $findings[] = new NormalizedFinding(
                        tool: ToolName::Builtin,
                        title: $title,
                        category: 'ssrf',
                        severity: VulnerabilitySeverity::High->value,
                        description: $payload,
                        evidence: $evidence,
                        recommendation: 'Allowlist outbound destinations; block link-local and cloud-metadata ranges.'
                    );
                    break;
                }
            }
        }

        return $findings;
    }

    protected function testSsrfPayload(ScannerService $scanner, string $url, string $param, string $payload): ?string
    {
        $response = $scanner->makeRequest($url, [$param => $payload], 5);
        if (!$response) return null;

        $body = $response->body();
        $indicators = [
            'ami-id' => 'AWS metadata',
            'instance-id' => 'AWS metadata',
            'local-ipv4' => 'AWS metadata',
            'metadata.google.internal' => 'GCP metadata',
            '169.254.169.254' => 'Cloud metadata',
            'root:' => '/etc/passwd',
            'daemon:' => '/etc/passwd',
            'localhost' => 'Localhost reference',
            '127.0.0.1' => 'Localhost IP',
            '[::1]' => 'IPv6 localhost',
        ];

        foreach ($indicators as $indicator => $description) {
            if (stripos($body, $indicator) !== false) {
                return "SSRF indicator found: {$description} ('{$indicator}') in response";
            }
        }

        return null;
    }
}
