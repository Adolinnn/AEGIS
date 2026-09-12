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

        $checkers = [
            ScanType::Xss->value => new \App\Scanning\Checkers\XssChecker(),
            ScanType::Sqli->value => new \App\Scanning\Checkers\SqliChecker(),
            ScanType::Ssrf->value => new \App\Scanning\Checkers\SsrfChecker(),
            ScanType::Misconfiguration->value => new \App\Scanning\Checkers\MisconfigurationChecker(),
        ];

        foreach ($checkTypes as $checkType) {
            $type = $checkType instanceof ScanType
                ? $checkType
                : ScanType::tryFrom((string) $checkType);

            if ($type === null || $type === ScanType::Full) {
                continue;
            }

            if (isset($checkers[$type->value])) {
                $checkerFindings = $checkers[$type->value]->check($target, $this);
                $findings = array_merge($findings, $checkerFindings);
            }
        }

        return $findings;
    }

    public function makeRequest(string $url, array $params = [], ?int $timeout = null): ?\Illuminate\Http\Client\Response
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

    public function discoverParameters(string $url, array $priorityParams = []): array
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