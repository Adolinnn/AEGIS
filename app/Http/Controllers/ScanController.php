<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Enums\ScanType;
use App\Enums\VulnerabilitySeverity;
use App\Models\Target;
use App\Models\VulnerabilityLog;
use App\Jobs\ScanTargetJob;
use App\Jobs\CheckUptimeJob;
use App\Jobs\GenerateAIPatchJob;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;

class ScanController extends Controller
{
    public function index(Request $request): InertiaResponse
    {
        $user = $request->user();

        $vulnerabilities = VulnerabilityLog::query()
            ->with('target')
            ->whereHas('target', fn ($q) => $q->where('user_id', $user->id))
            ->when($request->filled('severity'), fn ($q) => $q->where('severity', $request->string('severity')))
            ->when($request->filled('type'), fn ($q) => $q->where('vulnerability_type', $request->string('type')))
            ->when($request->filled('resolved'), fn ($q) => $request->boolean('resolved')
                ? $q->where('is_resolved', true)
                : $q->where('is_resolved', false))
            ->when($request->filled('target_id'), fn ($q) => $q->where('target_id', $request->integer('target_id')))
            ->latest('detected_at')
            ->paginate(25)
            ->withQueryString();

        $targets = $user->targets()->active()->get(['id', 'domain_url', 'display_name']);

        return Inertia::render('Scans/Index', [
            'vulnerabilities' => $vulnerabilities,
            'targets' => $targets,
            'filters' => $request->only(['severity', 'type', 'resolved', 'target_id']),
            'severities' => VulnerabilitySeverity::cases(),
            'scanTypes' => ScanType::cases(),
        ]);
    }

    public function show(VulnerabilityLog $vulnerability): InertiaResponse
    {
        $this->authorize('view', $vulnerability);

        $vulnerability->load('target.user');

        return Inertia::render('Scans/Show', [
            'vulnerability' => $vulnerability,
            'aiPatch' => $vulnerability->ai_patch_snippet,
            'aiExplanation' => $vulnerability->ai_explanation,
        ]);
    }

    public function queueScan(Request $request): Response
    {
        $request->validate([
            'target_id' => 'required|exists:targets,id',
            'scan_types' => 'array',
            'scan_types.*' => 'string|in:' . implode(',', array_column(ScanType::cases(), 'value')),
        ]);

        $target = Target::findOrFail($request->integer('target_id'));
        $this->authorize('scan', $target);

        $scanTypes = $request->array('scan_types', []);
        if (empty($scanTypes)) {
            $scanTypes = ['xss', 'sqli', 'ssrf', 'misconfiguration'];
        }

        ScanTargetJob::dispatch($target->id, $scanTypes);

        return response()->noContent();
    }

    public function bulkScan(Request $request): \Illuminate\Http\JsonResponse
    {
        $request->validate([
            'target_ids' => 'required|array|min:1',
            'target_ids.*' => 'exists:targets,id',
            'scan_types' => 'array',
            'scan_types.*' => 'string',
        ]);

        $targets = Target::whereIn('id', $request->array('target_ids'))
            ->where('user_id', $request->user()->id)
            ->where('is_active', true)
            ->get();

        $scanTypes = $request->array('scan_types', ['xss', 'sqli', 'ssrf', 'misconfiguration']);

        foreach ($targets as $target) {
            ScanTargetJob::dispatch($target->id, $scanTypes);
        }

        return response()->json([
            'message' => 'Scans queued for ' . $targets->count() . ' targets',
            'targets' => $targets->pluck('id'),
        ]);
    }

    public function reScan(VulnerabilityLog $vulnerability): \Illuminate\Http\JsonResponse
    {
        $this->authorize('reScan', $vulnerability);

        $target = $vulnerability->target;
        $scanType = $vulnerability->scan_type;

        ScanTargetJob::dispatch($target->id, [$scanType->value ?? $scanType]);

        return response()->json([
            'message' => 'Re-scan queued for ' . $scanType->label(),
        ]);
    }

    public function markResolved(Request $request, VulnerabilityLog $vulnerability): \Illuminate\Http\JsonResponse
    {
        $this->authorize('update', $vulnerability);

        $vulnerability->markResolved();

        return response()->json([
            'message' => 'Vulnerability marked as resolved',
            'vulnerability' => $vulnerability->fresh(),
        ]);
    }

    public function markUnresolved(Request $request, VulnerabilityLog $vulnerability): \Illuminate\Http\JsonResponse
    {
        $this->authorize('update', $vulnerability);

        $vulnerability->update([
            'is_resolved' => false,
            'resolved_at' => null,
        ]);

        return response()->json([
            'message' => 'Vulnerability marked as unresolved',
            'vulnerability' => $vulnerability->fresh(),
        ]);
    }

    public function generateAiPatch(Request $request, VulnerabilityLog $vulnerability): \Illuminate\Http\JsonResponse
    {
        $this->authorize('view', $vulnerability);

        if (!$request->user()->subscription_tier->hasAiRemediation()) {
            return response()->json([
                'message' => 'AI remediation requires Pro or Agency plan',
            ], 403);
        }

        // Dispatch job to generate patch
        GenerateAIPatchJob::dispatch($vulnerability->id);

        return response()->json([
            'message' => 'AI patch generation queued',
        ]);
    }

    public function statistics(Request $request): \Illuminate\Http\JsonResponse
    {
        $user = $request->user();

        $stats = [
            'total_targets' => $user->targets()->active()->count(),
            'total_vulnerabilities' => VulnerabilityLog::whereHas('target', fn ($q) => $q->where('user_id', $user->id))->count(),
            'unresolved' => VulnerabilityLog::whereHas('target', fn ($q) => $q->where('user_id', $user->id))
                ->where('is_resolved', false)
                ->count(),
            'critical' => VulnerabilityLog::whereHas('target', fn ($q) => $q->where('user_id', $user->id))
                ->where('severity', 'critical')
                ->where('is_resolved', false)
                ->count(),
            'high' => VulnerabilityLog::whereHas('target', fn ($q) => $q->where('user_id', $user->id))
                ->where('severity', 'high')
                ->where('is_resolved', false)
                ->count(),
            'by_type' => VulnerabilityLog::whereHas('target', fn ($q) => $q->where('user_id', $user->id))
                ->selectRaw('vulnerability_type, count(*) as count')
                ->groupBy('vulnerability_type')
                ->pluck('count', 'vulnerability_type')
                ->toArray(),
            'by_severity' => VulnerabilityLog::whereHas('target', fn ($q) => $q->where('user_id', $user->id))
                ->selectRaw('severity, count(*) as count')
                ->groupBy('severity')
                ->pluck('count', 'severity')
                ->toArray(),
        ];

        return response()->json($stats);
    }
}