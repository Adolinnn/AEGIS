<?php

declare(strict_types=1);

namespace App\Scanning\Checkers;

use App\Enums\ToolName;
use App\Enums\VulnerabilitySeverity;
use App\Models\Target;
use App\Scanning\NormalizedFinding;
use App\Services\ScannerService;
use Illuminate\Support\Facades\Log;

class MisconfigurationChecker implements VulnerabilityChecker
{
    public function check(Target $target, ScannerService $scanner): array
    {
        $findings = [];

        try {
            $response = $scanner->makeRequest($target->domain_url);
            if (!$response) return [];

            $headers = array_change_key_case($response->headers(), CASE_LOWER);
            $missingHeaders = [];

            $requiredHeaders = [
                'content-security-policy' => 'Content-Security-Policy',
                'strict-transport-security' => 'Strict-Transport-Security',
                'x-frame-options' => 'X-Frame-Options',
                'x-content-type-options' => 'X-Content-Type-Options',
                'referrer-policy' => 'Referrer-Policy',
                'permissions-policy' => 'Permissions-Policy',
            ];

            foreach ($requiredHeaders as $header => $displayName) {
                if (!isset($headers[$header])) {
                    $missingHeaders[] = $displayName;
                }
            }

            if (isset($headers['server'])) {
                $findings[] = new NormalizedFinding(
                    tool: ToolName::Builtin,
                    title: 'Server header discloses version: ' . ($headers['server'][0] ?? ''),
                    category: 'misconfig',
                    severity: VulnerabilitySeverity::Info->value,
                    description: 'Server header discloses version',
                    evidence: 'Server header: ' . ($headers['server'][0] ?? 'unknown'),
                    recommendation: 'Review response headers and disable version/technology disclosure.'
                );
            }

            if (isset($headers['x-powered-by'])) {
                $findings[] = new NormalizedFinding(
                    tool: ToolName::Builtin,
                    title: 'X-Powered-By header discloses technology: ' . ($headers['x-powered-by'][0] ?? ''),
                    category: 'misconfig',
                    severity: VulnerabilitySeverity::Info->value,
                    description: 'X-Powered-By header discloses technology',
                    evidence: 'X-Powered-By header: ' . ($headers['x-powered-by'][0] ?? 'unknown'),
                    recommendation: 'Review response headers and disable version/technology disclosure.'
                );
            }

            if (!empty($missingHeaders)) {
                foreach ($missingHeaders as $header) {
                    $severity = in_array($header, ['Content-Security-Policy', 'Strict-Transport-Security'])
                        ? VulnerabilitySeverity::Medium->value
                        : VulnerabilitySeverity::Low->value;

                    $findings[] = new NormalizedFinding(
                        tool: ToolName::Builtin,
                        title: "Missing security header: {$header}",
                        category: 'misconfig',
                        severity: $severity,
                        description: "Missing security header: {$header}",
                        evidence: "Response headers analysis: {$header} not present",
                        recommendation: 'Review response headers and disable version/technology disclosure.'
                    );
                }
            }

            if (str_contains($response->body(), 'Index of /') || str_contains($response->body(), 'Directory listing for')) {
                $findings[] = new NormalizedFinding(
                    tool: ToolName::Builtin,
                    title: 'Directory listing enabled',
                    category: 'misconfig',
                    severity: VulnerabilitySeverity::Low->value,
                    description: 'Directory listing enabled',
                    evidence: 'Directory listing detected in response body',
                    recommendation: 'Review response headers and disable version/technology disclosure.'
                );
            }
        } catch (\Throwable $e) {
            Log::error('Misconfiguration scan failed', [
                'target_id' => $target->id,
                'error' => $e->getMessage(),
            ]);
        }

        return $findings;
    }
}
