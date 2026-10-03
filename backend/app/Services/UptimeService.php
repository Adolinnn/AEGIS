<?php

declare(strict_types=1);

namespace App\Services;

use App\Enums\UptimeStatus;
use App\Models\Target;
use App\Models\UptimeLog;
use Illuminate\Http\Client\PendingRequest;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class UptimeService
{
    protected const TIMEOUT = 10;

    protected PendingRequest $httpClient;

    public function __construct()
    {
        $this->httpClient = Http::timeout(self::TIMEOUT)
            ->retry(1, 100)
            ->withHeaders([
                'User-Agent' => 'Aegis-Uptime/1.0 (+https://aegis.security/bot)',
                'Accept' => 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            ])
            ->withOptions(['allow_redirects' => ['max' => 5]]);
    }

    public function checkTarget(Target $target): UptimeLog
    {
        $url = $target->domain_url;
        $startTime = microtime(true);

        try {
            $response = $this->httpClient->get($url);
            $responseTimeMs = (int) ((microtime(true) - $startTime) * 1000);
            $statusCode = $response->status();
            $headers = $response->headers();

            $status = $this->determineStatus($statusCode, $responseTimeMs);
            $errorMessage = $statusCode >= 400 ? "HTTP {$statusCode}" : null;

            $log = UptimeLog::create([
                'target_id' => $target->id,
                'status_code' => $statusCode,
                'response_time_ms' => $responseTimeMs,
                'status' => $status->value,
                'error_message' => $errorMessage,
                'response_headers' => $this->filterHeaders($headers),
                'checked_at' => now(),
            ]);

            $target->update([
                'last_checked_at' => now(),
            ]);

            return $log;

        } catch (\Illuminate\Http\Client\ConnectionException $e) {
            $responseTimeMs = (int) ((microtime(true) - $startTime) * 1000);

            $log = UptimeLog::create([
                'target_id' => $target->id,
                'status_code' => null,
                'response_time_ms' => $responseTimeMs,
                'status' => UptimeStatus::Down->value,
                'error_message' => $e->getMessage(),
                'response_headers' => null,
                'checked_at' => now(),
            ]);

            $target->update([
                'last_checked_at' => now(),
            ]);

            return $log;

        } catch (\Illuminate\Http\Client\RequestException $e) {
            $responseTimeMs = (int) ((microtime(true) - $startTime) * 1000);
            $statusCode = $e->response?->status() ?? 0;

            $log = UptimeLog::create([
                'target_id' => $target->id,
                'status_code' => $statusCode ?: null,
                'response_time_ms' => $responseTimeMs,
                'status' => $this->determineStatus($statusCode, $responseTimeMs)->value,
                'error_message' => $e->getMessage(),
                'response_headers' => $e->response ? $this->filterHeaders($e->response->headers()) : null,
                'checked_at' => now(),
            ]);

            $target->update([
                'last_checked_at' => now(),
            ]);

            return $log;

        } catch (\Throwable $e) {
            $responseTimeMs = (int) ((microtime(true) - $startTime) * 1000);

            $log = UptimeLog::create([
                'target_id' => $target->id,
                'status_code' => null,
                'response_time_ms' => $responseTimeMs,
                'status' => UptimeStatus::Down->value,
                'error_message' => $e->getMessage(),
                'response_headers' => null,
                'checked_at' => now(),
            ]);

            $target->update([
                'last_checked_at' => now(),
            ]);

            Log::error('Uptime check failed', [
                'target_id' => $target->id,
                'url' => $url,
                'error' => $e->getMessage(),
            ]);

            return $log;
        }
    }

    public function checkMultipleTargets(array $targets): array
    {
        $results = [];

        foreach ($targets as $target) {
            $results[$target->id] = $this->checkTarget($target);
        }

        return $results;
    }

    protected function determineStatus(?int $statusCode, int $responseTimeMs): UptimeStatus
    {
        if ($statusCode === null || $statusCode === 0) {
            return UptimeStatus::Down;
        }

        if ($statusCode >= 200 && $statusCode < 300) {
            if ($responseTimeMs > 2000) {
                return UptimeStatus::Degraded;
            }
            return UptimeStatus::Up;
        }

        if ($statusCode >= 500) {
            return UptimeStatus::Down;
        }

        if ($statusCode >= 400) {
            return UptimeStatus::Degraded;
        }

        return UptimeStatus::Unknown;
    }

    protected function filterHeaders(array $headers): array
    {
        $importantHeaders = [
            'content-type',
            'server',
            'x-powered-by',
            'cache-control',
            'content-security-policy',
            'strict-transport-security',
            'x-frame-options',
            'x-content-type-options',
            'referrer-policy',
            'permissions-policy',
            'set-cookie',
            'location',
        ];

        $filtered = [];
        $lowerHeaders = array_change_key_case($headers, CASE_LOWER);

        foreach ($importantHeaders as $header) {
            if (isset($lowerHeaders[$header])) {
                $value = $lowerHeaders[$header];
                // Limit header values
                if (is_array($value)) {
                    $value = $value[0] ?? '';
                }
                $filtered[$header] = Str::limit($value, 500);
            }
        }

        return $filtered;
    }

    public function getUptimeStats(Target $target, int $days = 30): array
    {
        $logs = $target->uptimeLogs()
            ->where('checked_at', '>=', now()->subDays($days))
            ->get();

        if ($logs->isEmpty()) {
            return [
                'uptime_percentage' => 100.0,
                'total_checks' => 0,
                'up_count' => 0,
                'down_count' => 0,
                'degraded_count' => 0,
                'average_response_time_ms' => null,
                'current_status' => UptimeStatus::Unknown->value,
            ];
        }

        $total = $logs->count();
        $up = $logs->where('status', 'up')->count();
        $down = $logs->where('status', 'down')->count();
        $degraded = $logs->where('status', 'degraded')->count();
        $avgResponseTime = (int) $logs->where('status', 'up')->avg('response_time_ms');
        $latestLog = $logs->sortByDesc('checked_at')->first();

        return [
            'uptime_percentage' => round(($up / $total) * 100, 2),
            'total_checks' => $total,
            'up_count' => $up,
            'down_count' => $down,
            'degraded_count' => $degraded,
            'average_response_time_ms' => $avgResponseTime,
            'current_status' => $latestLog?->status ?? UptimeStatus::Unknown->value,
        ];
    }
}