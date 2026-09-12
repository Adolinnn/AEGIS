<?php

declare(strict_types=1);

namespace App\Scanning\Checkers;

use App\Enums\ToolName;
use App\Enums\ScanType;
use App\Enums\VulnerabilitySeverity;
use App\Models\Target;
use App\Scanning\NormalizedFinding;
use App\Services\ScannerService;

class SqliChecker implements VulnerabilityChecker
{
    public function check(Target $target, ScannerService $scanner): array
    {
        $findings = [];
        $payloads = ScanType::Sqli->defaultPayloads();
        $parameters = $scanner->discoverParameters($target->domain_url);

        foreach ($parameters as $param) {
            $baseline = $scanner->makeRequest($target->domain_url, [$param => 'test']);
            if (!$baseline) continue;

            $baselineData = ['body' => $baseline->body()];

            foreach ($payloads as $payload) {
                $evidence = $this->testSqliPayload($scanner, $target->domain_url, $param, $payload, $baselineData);
                if ($evidence) {
                    $title = "SQL injection via parameter '{$param}'";
                    $findings[] = new NormalizedFinding(
                        tool: ToolName::Builtin,
                        title: $title,
                        category: 'sqli',
                        severity: VulnerabilitySeverity::Critical->value,
                        description: $payload,
                        evidence: $evidence,
                        recommendation: 'Use parameterized queries / prepared statements exclusively.'
                    );
                    break;
                }
            }
        }

        return $findings;
    }

    protected function testSqliPayload(ScannerService $scanner, string $url, string $param, string $payload, array $baseline): ?string
    {
        $response = $scanner->makeRequest($url, [$param => $payload]);
        if (!$response) return null;

        $body = $response->body();
        $baselineBody = $baseline['body'] ?? '';
        $baselineLength = strlen($baselineBody);
        $currentLength = strlen($body);
        $lengthDiff = abs($currentLength - $baselineLength);

        if ($lengthDiff > 50 && $lengthDiff / max($baselineLength, 1) > 0.1) {
            return "Boolean-based SQLi suspected: response length changed by {$lengthDiff} bytes (baseline: {$baselineLength}, current: {$currentLength})";
        }

        $sqlErrors = [
            'SQL syntax', 'mysql_fetch', 'ORA-', 'PostgreSQL', 'Warning: pg_',
            'valid MySQL result', 'MySqlClient', 'SQLServer', 'ODBC Driver',
            'JDBC', 'SQLite', 'syntax error', 'unclosed quotation mark',
            'quoted string not properly terminated',
        ];

        foreach ($sqlErrors as $error) {
            if (stripos($body, $error) !== false) {
                return "Error-based SQLi detected: '{$error}' found in response";
            }
        }

        return null;
    }
}
