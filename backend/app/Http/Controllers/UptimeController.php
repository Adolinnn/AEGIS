<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\Target;
use App\Models\UptimeLog;
use App\Jobs\CheckUptimeJob;
use App\Services\UptimeService;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;

class UptimeController extends Controller
{
    public function index(Request $request): InertiaResponse
    {
        $user = $request->user();

        $targets = $user->targets()
            ->with('latestUptimeLog')
            ->active()
            ->paginate(20)
            ->withQueryString();

        return Inertia::render('Uptime/Index', [
            'targets' => $targets,
        ]);
    }

    public function show(Request $request, Target $target): InertiaResponse
    {
        $this->authorizeTarget($target);

        $days = $request->integer('days', 30);

        $target->load([
            'latestUptimeLog',
            'uptimeLogs' => fn ($q) => $q->where('checked_at', '>=', now()->subDays($days))->latest(),
        ]);

        $stats = app(UptimeService::class)->getUptimeStats($target, $days);

        $logs = $target->uptimeLogs
            ->map(fn ($log) => [
                'id' => $log->id,
                'status_code' => $log->status_code,
                'response_time_ms' => $log->response_time_ms,
                'status' => $log->status,
                'error_message' => $log->error_message,
                'checked_at' => $log->checked_at->toISOString(),
            ])
            ->toArray();

        // Calculate hourly/daily aggregates for charts
        $hourlyStats = $this->getHourlyStats($target, $days);
        $dailyStats = $this->getDailyStats($target, $days);

        return Inertia::render('Uptime/Show', [
            'target' => $target,
            'stats' => $stats,
            'logs' => $logs,
            'hourlyStats' => $hourlyStats,
            'dailyStats' => $dailyStats,
            'days' => $days,
        ]);
    }

    public function check(Target $target): Response
    {
        $this->authorizeTarget($target);

        CheckUptimeJob::dispatch($target->id);

        return response()->json(['message' => 'Uptime check queued']);
    }

    public function bulkCheck(Request $request): Response
    {
        $request->validate([
            'target_ids' => 'required|array|min:1',
            'target_ids.*' => 'exists:targets,id',
        ]);

        $targets = Target::whereIn('id', $request->array('target_ids'))
            ->where('user_id', $request->user()->id)
            ->where('is_active', true)
            ->get();

        foreach ($targets as $target) {
            CheckUptimeJob::dispatch($target->id);
        }

        return response()->json([
            'message' => 'Uptime checks queued for ' . $targets->count() . ' targets',
            'targets' => $targets->pluck('id'),
        ]);
    }

    public function statistics(Request $request): Response
    {
        $user = $request->user();
        $days = $request->integer('days', 30);

        $targets = $user->targets()->active()->get();
        $totalChecks = 0;
        $totalUp = 0;
        $totalDown = 0;
        $totalDegraded = 0;
        $totalResponseTime = 0;
        $responseCount = 0;

        foreach ($targets as $target) {
            $stats = app(UptimeService::class)->getUptimeStats($target, $days);
            $totalChecks += $stats['total_checks'];
            $totalUp += $stats['up_count'];
            $totalDown += $stats['down_count'];
            $totalDegraded += $stats['degraded_count'];
            if ($stats['average_response_time_ms']) {
                $totalResponseTime += $stats['average_response_time_ms'];
                $responseCount++;
            }
        }

        return response()->json([
            'total_targets' => $targets->count(),
            'total_checks' => $totalChecks,
            'overall_uptime_percentage' => $totalChecks > 0 ? round(($totalUp / $totalChecks) * 100, 2) : 100,
            'up_count' => $totalUp,
            'down_count' => $totalDown,
            'degraded_count' => $totalDegraded,
            'average_response_time_ms' => $responseCount > 0 ? round($totalResponseTime / $responseCount) : null,
        ]);
    }

    protected function getHourlyStats(Target $target, int $days): array
    {
        $logs = $target->uptimeLogs()
            ->where('checked_at', '>=', now()->subDays($days))
            ->get();

        $stats = [];
        $hoursAgo = $days * 24;

        for ($i = 0; $i < $hoursAgo; $i++) {
            $hourStart = now()->subHours($i)->startOfHour();
            $hourEnd = $hourStart->copy()->endOfHour();

            $hourLogs = $logs->filter(fn ($log) =>
                $log->checked_at >= $hourStart && $log->checked_at <= $hourEnd
            );

            $up = $hourLogs->where('status', 'up')->count();
            $down = $hourLogs->where('status', 'down')->count();
            $degraded = $hourLogs->where('status', 'degraded')->count();
            $avgResponse = $hourLogs->where('status', 'up')->avg('response_time_ms');

            $stats[] = [
                'hour' => $hourStart->format('Y-m-d H:00'),
                'up' => $up,
                'down' => $down,
                'degraded' => $degraded,
                'total' => $up + $down + $degraded,
                'avg_response_ms' => $avgResponse ? round($avgResponse) : null,
                'uptime_pct' => ($up + $down + $degraded) > 0
                    ? round(($up / ($up + $down + $degraded)) * 100, 1)
                    : 100,
            ];
        }

        return array_reverse($stats);
    }

    protected function getDailyStats(Target $target, int $days): array
    {
        $logs = $target->uptimeLogs()
            ->where('checked_at', '>=', now()->subDays($days))
            ->get();

        $stats = [];

        for ($i = 0; $i < $days; $i++) {
            $dayStart = now()->subDays($i)->startOfDay();
            $dayEnd = $dayStart->copy()->endOfDay();

            $dayLogs = $logs->filter(fn ($log) =>
                $log->checked_at >= $dayStart && $log->checked_at <= $dayEnd
            );

            $up = $dayLogs->where('status', 'up')->count();
            $down = $dayLogs->where('status', 'down')->count();
            $degraded = $dayLogs->where('status', 'degraded')->count();
            $avgResponse = $dayLogs->where('status', 'up')->avg('response_time_ms');

            $stats[] = [
                'date' => $dayStart->format('Y-m-d'),
                'up' => $up,
                'down' => $down,
                'degraded' => $degraded,
                'total' => $up + $down + $degraded,
                'avg_response_ms' => $avgResponse ? round($avgResponse) : null,
                'uptime_pct' => ($up + $down + $degraded) > 0
                    ? round(($up / ($up + $down + $degraded)) * 100, 1)
                    : 100,
            ];
        }

        return array_reverse($stats);
    }

    protected function authorizeTarget(Target $target): void
    {
        if ($target->user_id !== auth()->id()) {
            abort(403, 'Unauthorized access to target.');
        }
    }
}