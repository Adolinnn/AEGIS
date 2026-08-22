<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\Finding;
use App\Models\ScanRun;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();
        $userId = $user->id;

        $bySeverity = Finding::forUser($userId)->unresolved()
            ->selectRaw('severity, count(*) as count')
            ->groupBy('severity')
            ->pluck('count', 'severity');

        $recentRuns = ScanRun::where('user_id', $userId)
            ->with('target:id,domain_url,display_name')
            ->withCount('findings')
            ->latest()
            ->limit(5)
            ->get()
            ->map(fn (ScanRun $r) => [
                'id' => $r->id,
                'status' => $r->status->value,
                'status_label' => $r->status->label(),
                'findings_count' => $r->findings_count,
                'target' => $r->target?->domain_url,
                'created_at' => $r->created_at,
            ]);

        return Inertia::render('Dashboard', [
            'stats' => [
                'targets' => $user->targets()->count(),
                'active_targets' => $user->targets()->where('is_active', true)->count(),
                'scan_runs' => ScanRun::where('user_id', $userId)->count(),
                'total_findings' => Finding::forUser($userId)->count(),
                'unresolved' => Finding::forUser($userId)->unresolved()->count(),
                'critical' => (int) ($bySeverity['critical'] ?? 0),
                'high' => (int) ($bySeverity['high'] ?? 0),
                'medium' => (int) ($bySeverity['medium'] ?? 0),
                'low' => (int) ($bySeverity['low'] ?? 0),
                'info' => (int) ($bySeverity['info'] ?? 0),
            ],
            'recentRuns' => $recentRuns,
        ]);
    }
}
