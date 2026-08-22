<?php

declare(strict_types=1);

namespace App\Services;

use App\Enums\ScanType;
use App\Enums\ToolName;
use App\Enums\VulnerabilitySeverity;
use App\Models\Target;
use App\Scanning\NormalizedFinding;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class ScannerService
{
    protected int $timeout;
    protected array $userAgents;

    public function __construct()
    {
        $this->timeout = config('services.scanner.timeout', 10);
        $this->userAgents = [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        ];
    }

    /**
     * Run the in-process HTTP checks and return normalized findings WITHOUT
     * persisting. The ScanRun pipeline (RunToolJob) stores them as Findings,
     * so built-in checks behave exactly like external tools.
     *
     * @param  array<int, string|ScanType>  $checkTypes
     * @return NormalizedFinding[]
     */
    public function runChecks(Target $target, array $checkTypes = []): array
    {
        if (empty($checkTypes)) {
            $checkTypes = [ScanType::Xss, ScanType::Sqli, ScanType::Ssrf, ScanType::Misconfiguration];
        }

        $findings = [];

        foreach ($checkTypes as $checkType) {
            $type = $checkType instanceof ScanType
                ? $checkType
                : ScanType::tryFrom((string) $checkType);

            if ($type === null || $type === ScanType::Full) {
                continue;
            }

            $vulnerabilities = match ($type) {
                ScanType::Xss => $this->scanXss($target),
                ScanType::Sqli => $this->scanSqli($target),
                ScanType::Ssrf => $this->scanSsrf($target),
                ScanType::Misconfiguration => $this->scanMisconfiguration($target),
                default => [],
            };

            foreach ($vulnerabilities as $vuln) {
                $findings[] = $this->toFinding($type, $vuln);
            }
        }

        return $findings;
    }

    /**
     * Map a raw check result array into a NormalizedFinding.
     *
     * @param  array<string, mixed>  $vuln
     */
    protected function toFinding(ScanType $type, array $vuln): NormalizedFinding
    {
        $param = $vuln['parameter'] ?? null;

        [$title, $category, $recommendation] = match ($type) {
            ScanType::Xss => [
                $param ? "Reflected XSS via parameter '{$param}'" : 'Reflected XSS',
                'xss',
                'Apply context-aware output encoding and a restrictive Content-Security-Policy.',
            ],
            ScanType::Sqli => [
                $param ? "SQL injection via parameter '{$param}'" : 'SQL injection',
                'sqli',
                'Use parameterized queries / prepared statements exclusively.',
            ],
            ScanType::Ssrf => [
                $param ? "SSRF via parameter '{$param}'" : 'SSRF',
                'ssrf',
                'Allowlist outbound destinations; block link-local and cloud-metadata ranges.',
            ],
            ScanType::Misconfiguration => [
                (string) ($vuln['payload'] ?? 'Security misconfiguration'),
                'misconfig',
                'Review response headers and disable version/technology disclosure.',
            ],
            default => ['Finding', 'other', null],
        };

        return new NormalizedFinding(
            tool: ToolName::Builtin,
            title: $title,
            category: $category,
            severity: $vuln['severity'],
            description: (string) ($vuln['payload'] ?? $title),
            evidence: $vuln['evidence'] ?? null,
            recommendation: $recommendation,
        );
    }

    protected function scanXss(Target $target): array
    {
        $vulnerabilities = [];
        $payloads = ScanType::Xss->defaultPayloads();
        $parameters = $this->discoverParameters($target->domain_url);

        foreach ($parameters as $param) {
            foreach ($payloads as $payload) {
                $vuln = $this->testXssPayload($target->domain_url, $param, $payload);
                if ($vuln) {
                    $vulnerabilities[] = [
                        'payload' => $payload,
                        'parameter' => $param,
                        'severity' => VulnerabilitySeverity::High,
                        'evidence' => $vuln,
                    ];

                    // Don't test more payloads for this parameter if we found one
                    break;
                }
            }
        }

        return $vulnerabilities;
    }

    protected function scanSqli(Target $target): array
    {
        $vulnerabilities = [];
        $payloads = ScanType::Sqli->defaultPayloads();
        $parameters = $this->discoverParameters($target->domain_url);

        foreach ($parameters as $param) {
            // Get baseline response
            $baseline = $this->makeRequest($target->domain_url, [$param => 'test']);
            if (!$baseline) continue;

            foreach ($payloads as $payload) {
                $vuln = $this->testSqliPayload($target->domain_url, $param, $payload, $baseline);
                if ($vuln) {
                    $vulnerabilities[] = [
                        'payload' => $payload,
                        'parameter' => $param,
                        'severity' => VulnerabilitySeverity::Critical,
                        'evidence' => $vuln,
                    ];
                    break;
                }
            }
        }

        return $vulnerabilities;
    }

    protected function scanSsrf(Target $target): array
    {
        $vulnerabilities = [];
        $payloads = ScanType::Ssrf->defaultPayloads();
        $parameters = $this->discoverParameters($target->domain_url, ['url', 'uri', 'link', 'redirect', 'next', 'callback', 'dest', 'destination', 'return', 'return_url', 'continue']);

        foreach ($parameters as $param) {
            foreach ($payloads as $payload) {
                $vuln = $this->testSsrfPayload($target->domain_url, $param, $payload);
                if ($vuln) {
                    $vulnerabilities[] = [
                        'payload' => $payload,
                        'parameter' => $param,
                        'severity' => VulnerabilitySeverity::High,
                        'evidence' => $vuln,
                    ];
                    break;
                }
            }
        }

        return $vulnerabilities;
    }

    protected function scanMisconfiguration(Target $target): array
    {
        $vulnerabilities = [];

        try {
            $response = $this->makeRequest($target->domain_url);
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

            // Check for information disclosure
            if (isset($headers['server'])) {
                $vulnerabilities[] = [
                    'payload' => 'Server header discloses version: ' . $headers['server'][0] ?? '',
                    'parameter' => 'N/A (header)',
                    'severity' => VulnerabilitySeverity::Info,
                    'evidence' => 'Server header: ' . ($headers['server'][0] ?? 'unknown'),
                ];
            }

            if (isset($headers['x-powered-by'])) {
                $vulnerabilities[] = [
                    'payload' => 'X-Powered-By header discloses technology: ' . $headers['x-powered-by'][0] ?? '',
                    'parameter' => 'N/A (header)',
                    'severity' => VulnerabilitySeverity::Info,
                    'evidence' => 'X-Powered-By header: ' . ($headers['x-powered-by'][0] ?? 'unknown'),
                ];
            }

            if (!empty($missingHeaders)) {
                foreach ($missingHeaders as $header) {
                    $severity = in_array($header, ['Content-Security-Policy', 'Strict-Transport-Security'])
                        ? VulnerabilitySeverity::Medium
                        : VulnerabilitySeverity::Low;

                    $vulnerabilities[] = [
                        'payload' => "Missing security header: {$header}",
                        'parameter' => 'N/A (header)',
                        'severity' => $severity,
                        'evidence' => "Response headers analysis: {$header} not present",
                    ];
                }
            }

            // Check for directory listing
            if (str_contains($response->body(), 'Index of /') || str_contains($response->body(), 'Directory listing for')) {
                $vulnerabilities[] = [
                    'payload' => 'Directory listing enabled',
                    'parameter' => 'N/A',
                    'severity' => VulnerabilitySeverity::Low,
                    'evidence' => 'Directory listing detected in response body',
                ];
            }

        } catch (\Throwable $e) {
            Log::error('Misconfiguration scan failed', [
                'target_id' => $target->id,
                'error' => $e->getMessage(),
            ]);
        }

        return $vulnerabilities;
    }

    protected function testXssPayload(string $url, string $param, string $payload): ?string
    {
        $response = $this->makeRequest($url, [$param => $payload]);
        if (!$response) return null;

        $body = $response->body();

        // Check if payload is reflected unencoded
        $decodedPayload = html_entity_decode($payload);
        if (str_contains($body, $decodedPayload) && !str_contains($body, htmlspecialchars($decodedPayload))) {
            return "Payload '{$payload}' reflected unencoded in response body (length: " . strlen($body) . ")";
        }

        // Check for script execution indicators (limited detection without browser)
        if (str_contains($body, '<script>alert(1)</script>') ||
            str_contains($body, 'onerror=alert(1)') ||
            str_contains($body, 'onload=alert(1)')) {
            return "XSS payload appears in response without encoding";
        }

        return null;
    }

    protected function testSqliPayload(string $url, string $param, string $payload, array $baseline): ?string
    {
        $response = $this->makeRequest($url, [$param => $payload]);
        if (!$response) return null;

        $body = $response->body();
        $baselineBody = $baseline['body'] ?? '';
        $baselineLength = strlen($baselineBody);
        $currentLength = strlen($body);
        $lengthDiff = abs($currentLength - $baselineLength);

        // Boolean-based detection: significant length difference
        if ($lengthDiff > 50 && $lengthDiff / max($baselineLength, 1) > 0.1) {
            return "Boolean-based SQLi suspected: response length changed by {$lengthDiff} bytes (baseline: {$baselineLength}, current: {$currentLength})";
        }

        // Error-based detection
        $sqlErrors = [
            'SQL syntax',
            'mysql_fetch',
            'ORA-',
            'PostgreSQL',
            'Warning: pg_',
            'valid MySQL result',
            'MySqlClient',
            'SQLServer',
            'ODBC Driver',
            'JDBC',
            'SQLite',
            'syntax error',
            'unclosed quotation mark',
            'quoted string not properly terminated',
        ];

        foreach ($sqlErrors as $error) {
            if (stripos($body, $error) !== false) {
                return "Error-based SQLi detected: '{$error}' found in response";
            }
        }

        // Time-based would require timing comparison - simplified here
        return null;
    }

    protected function testSsrfPayload(string $url, string $param, string $payload): ?string
    {
        $response = $this->makeRequest($url, [$param => $payload], 5); // shorter timeout for SSRF
        if (!$response) return null;

        $body = $response->body();

        // Look for indicators of internal access
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

        // Check response time for time-based SSRF (would need baseline)
        return null;
    }

    protected function makeRequest(string $url, array $params = [], ?int $timeout = null): ?\Illuminate\Http\Client\Response
    {
        try {
            $client = Http::timeout($timeout ?? $this->timeout)
                ->withHeaders([
                    'User-Agent' => $this->userAgents[array_rand($this->userAgents)],
                    'Accept' => 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                    'Accept-Language' => 'en-US,en;q=0.5',
                ])
                ->withOptions(['allow_redirects' => ['max' => 5]]);

            // Parse URL to determine if GET or POST
            $parsed = parse_url($url);
            $baseUrl = $parsed['scheme'] . '://' . $parsed['host'] . ($parsed['port'] ? ':' . $parsed['port'] : '');
            $path = $parsed['path'] ?? '/';
            $existingQuery = $parsed['query'] ?? '';

            $queryParams = [];
            if ($existingQuery) {
                parse_str($existingQuery, $queryParams);
            }
            $queryParams = array_merge($queryParams, $params);

            $fullUrl = $baseUrl . $path . ($queryParams ? '?' . http_build_query($queryParams) : '');

            return $client->get($fullUrl);

        } catch (\Throwable $e) {
            Log::debug('Scanner request failed', [
                'url' => $url,
                'params' => $params,
                'error' => $e->getMessage(),
            ]);
            return null;
        }
    }

    protected function discoverParameters(string $url, array $priorityParams = []): array
    {
        $commonParams = [
            'q', 'search', 'query', 's', 'keyword', 'keywords',
            'id', 'page', 'item', 'product', 'category', 'cat',
            'url', 'uri', 'link', 'redirect', 'next', 'return', 'return_url',
            'callback', 'dest', 'destination', 'continue', 'goto',
            'file', 'path', 'dir', 'folder', 'document', 'doc',
            'name', 'username', 'user', 'login', 'email', 'mail',
            'input', 'data', 'text', 'message', 'msg', 'comment',
            'filter', 'sort', 'order', 'by', 'limit', 'offset',
            'action', 'cmd', 'command', 'exec', 'run', 'do',
        ];

        $params = array_merge($priorityParams, $commonParams);

        // Could enhance with actual parameter discovery from forms
        return array_unique($params);
    }
}