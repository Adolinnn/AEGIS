<?php

declare(strict_types=1);

namespace App\Scanning\Checkers;

use App\Enums\ToolName;
use App\Enums\ScanType;
use App\Enums\VulnerabilitySeverity;
use App\Models\Target;
use App\Scanning\NormalizedFinding;
use App\Services\ScannerService;

class XssChecker implements VulnerabilityChecker
{
    public function check(Target $target, ScannerService $scanner): array
    {
        $findings = [];
        $payloads = ScanType::Xss->defaultPayloads();
        $parameters = $scanner->discoverParameters($target->domain_url);

        foreach ($parameters as $param) {
            foreach ($payloads as $payload) {
                $evidence = $this->testXssPayload($scanner, $target->domain_url, $param, $payload);
                if ($evidence) {
                    $title = "Reflected XSS via parameter '{$param}'";
                    $findings[] = new NormalizedFinding(
                        tool: ToolName::Builtin,
                        title: $title,
                        category: 'xss',
                        severity: VulnerabilitySeverity::High->value,
                        description: $payload,
                        evidence: $evidence,
                        recommendation: 'Apply context-aware output encoding and a restrictive Content-Security-Policy.'
                    );
                    break;
                }
            }
        }

        return $findings;
    }

    protected function testXssPayload(ScannerService $scanner, string $url, string $param, string $payload): ?string
    {
        $response = $scanner->makeRequest($url, [$param => $payload]);
        if (!$response) return null;

        $body = $response->body();
        $decodedPayload = html_entity_decode($payload);
        
        if (str_contains($body, $decodedPayload) && !str_contains($body, htmlspecialchars($decodedPayload))) {
            return "Payload '{$payload}' reflected unencoded in response body (length: " . strlen($body) . ")";
        }

        if (str_contains($body, '<script>alert(1)</script>') ||
            str_contains($body, 'onerror=alert(1)') ||
            str_contains($body, 'onload=alert(1)')) {
            return "XSS payload appears in response without encoding";
        }

        return null;
    }
}
