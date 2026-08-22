<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Enums\ScanType;
use App\Enums\SubscriptionTier;
use App\Enums\TargetStatus;
use App\Http\Requests\StoreTargetRequest;
use App\Http\Requests\UpdateTargetRequest;
use App\Enums\ToolName;
use App\Jobs\CheckUptimeJob;
use App\Scanning\ToolRegistry;
use App\Models\Target;
use App\Models\UptimeLog;
use App\Services\UptimeService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class TargetController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();

        $targets = Target::where('user_id', $user->id)
            ->with(['latestUptimeLog', 'unresolvedFindings'])
            ->latest()
            ->paginate(15)
            ->withQueryString();

        return Inertia::render('Targets/Index', [
            'targets' => $targets,
            'subscriptionTier' => $user->subscription_tier,
            'maxTargets' => $user->maxTargets(),
            'canAddTarget' => $user->targets()->count() < $user->maxTargets(),
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('Targets/Create', [
            'scanTypes' => ScanType::cases(),
        ]);
    }

    public function store(StoreTargetRequest $request): RedirectResponse
    {
        $user = $request->user();

        if ($user->targets()->count() >= $user->maxTargets()) {
            return back()->withErrors([
                'domain_url' => "You have reached your target limit ({$user->maxTargets()}). Upgrade your plan to add more.",
            ]);
        }

        $target = Target::create([
            'user_id' => $user->id,
            'domain_url' => $this->normalizeUrl($request->string('domain_url')->toString()),
            'display_name' => $request->string('display_name')->toString() ?: null,
            'is_active' => true,
            'is_authorized' => $request->boolean('is_authorized', false),
            'uptime_check_interval_minutes' => $request->integer('uptime_check_interval_minutes', 5),
            'scan_config' => [
                'scan_types' => $request->array('scan_types', ['xss', 'sqli', 'ssrf', 'misconfiguration']),
                'custom_headers' => $request->array('custom_headers', []),
                'follow_redirects' => $request->boolean('follow_redirects', true),
                'timeout_seconds' => $request->integer('timeout_seconds', 10),
            ],
        ]);

        // Schedule initial uptime check
        CheckUptimeJob::dispatch($target->id);

        return redirect()->route('targets.index')
            ->with('success', 'Target added successfully. Initial uptime check queued.');
    }

    public function show(Request $request, Target $target): Response
    {
        $this->authorizeTarget($target);

        $target->load([
            'latestUptimeLog',
            'uptimeLogs' => fn ($q) => $q->latest()->limit(50),
            'findings' => fn ($q) => $q->latest('detected_at')->limit(50),
            'scanRuns' => fn ($q) => $q->latest()->limit(10),
        ]);

        $uptimeStats = app(UptimeService::class)->getUptimeStats($target, 30);

        return Inertia::render('Targets/Show', [
            'target' => $target,
            'uptimeStats' => $uptimeStats,
            'recentUptimeLogs' => $target->uptimeLogs,
            'recentFindings' => $target->findings->map(fn ($f) => [
                'id' => $f->id,
                'tool' => $f->tool->value,
                'title' => $f->title,
                'category' => $f->category,
                'severity' => $f->severity->value,
                'is_resolved' => $f->is_resolved,
                'detected_at' => $f->detected_at,
            ]),
            'recentRuns' => $target->scanRuns->map(fn ($r) => [
                'id' => $r->id,
                'status' => $r->status->value,
                'status_label' => $r->status->label(),
                'selected_tools' => $r->selected_tools,
                'created_at' => $r->created_at,
                'finished_at' => $r->finished_at,
            ]),
            'consentText' => config('scanning.consent_text'),
            'availableTools' => $this->availableTools(),
        ]);
    }

    /**
     * Scanners offered in the launch UI: the always-available built-in checks
     * plus every registered external tool, flagged by install status.
     *
     * @return array<int, array<string, mixed>>
     */
    protected function availableTools(): array
    {
        $builtin = [[
            'name' => ToolName::Builtin->value,
            'label' => ToolName::Builtin->label(),
            'description' => ToolName::Builtin->description(),
            'installed' => true,
        ]];

        $external = app(ToolRegistry::class)->all()
            ->map(fn ($tool) => [
                'name' => $tool->name()->value,
                'label' => $tool->name()->label(),
                'description' => $tool->name()->description(),
                'installed' => $tool->name()->isInstalled(),
            ])
            ->values()
            ->all();

        return array_merge($builtin, $external);
    }

    public function edit(Target $target): Response
    {
        $this->authorizeTarget($target);

        return Inertia::render('Targets/Edit', [
            'target' => $target,
            'scanTypes' => ScanType::cases(),
        ]);
    }

    public function update(UpdateTargetRequest $request, Target $target): RedirectResponse
    {
        $this->authorizeTarget($target);

        $target->update([
            'domain_url' => $this->normalizeUrl($request->string('domain_url')->toString()),
            'display_name' => $request->string('display_name')->toString() ?: null,
            'is_active' => $request->boolean('is_active', true),
            'is_authorized' => $request->boolean('is_authorized', $target->is_authorized),
            'uptime_check_interval_minutes' => $request->integer('uptime_check_interval_minutes', 5),
            'scan_config' => array_merge($target->scan_config ?? [], [
                'scan_types' => $request->array('scan_types', ['xss', 'sqli', 'ssrf', 'misconfiguration']),
                'custom_headers' => $request->array('custom_headers', []),
                'follow_redirects' => $request->boolean('follow_redirects', true),
                'timeout_seconds' => $request->integer('timeout_seconds', 10),
            ]),
        ]);

        return redirect()->route('targets.index')
            ->with('success', 'Target updated successfully.');
    }

    public function destroy(Target $target): RedirectResponse
    {
        $this->authorizeTarget($target);

        $target->delete();

        return redirect()->route('targets.index')
            ->with('success', 'Target deleted successfully.');
    }

    public function checkUptime(Request $request, Target $target): RedirectResponse
    {
        $this->authorizeTarget($target);

        CheckUptimeJob::dispatch($target->id);

        return back()->with('success', 'Uptime check queued.');
    }

    public function vulnerabilities(Request $request, Target $target): Response
    {
        $this->authorizeTarget($target);

        $findings = $target->findings()
            ->with('scanRun:id,status')
            ->when($request->filled('severity'), fn ($q) => $q->where('severity', $request->string('severity')))
            ->when($request->filled('category'), fn ($q) => $q->where('category', $request->string('category')))
            ->when($request->filled('resolved'), fn ($q) => $q->where('is_resolved', $request->boolean('resolved')))
            ->latest('detected_at')
            ->paginate(20)
            ->withQueryString()
            ->through(fn ($f) => [
                'id' => $f->id,
                'scan_run_id' => $f->scan_run_id,
                'tool' => $f->tool->value,
                'tool_label' => $f->tool->label(),
                'title' => $f->title,
                'category' => $f->category,
                'severity' => $f->severity->value,
                'description' => $f->description,
                'evidence' => $f->evidence,
                'recommendation' => $f->recommendation,
                'is_resolved' => $f->is_resolved,
                'has_ai_patch' => filled($f->ai_patch_snippet),
                'ai_patch_snippet' => $f->ai_patch_snippet,
                'detected_at' => $f->detected_at,
            ]);

        return Inertia::render('Targets/Vulnerabilities', [
            'target' => $target->only(['id', 'domain_url', 'display_name', 'is_authorized']),
            'findings' => $findings,
            'filters' => $request->only(['severity', 'category', 'resolved']),
            'severities' => array_map(fn ($s) => $s->value, \App\Enums\VulnerabilitySeverity::cases()),
            'categories' => $target->findings()->distinct()->pluck('category')->filter()->values(),
        ]);
    }

    public function uptimeHistory(Request $request, Target $target): Response
    {
        $this->authorizeTarget($target);

        $days = $request->integer('days', 30);

        $logs = $target->uptimeLogs()
            ->where('checked_at', '>=', now()->subDays($days))
            ->latest()
            ->paginate(50)
            ->withQueryString();

        $stats = app(UptimeService::class)->getUptimeStats($target, $days);

        return Inertia::render('Targets/UptimeHistory', [
            'target' => $target,
            'logs' => $logs,
            'stats' => $stats,
            'days' => $days,
        ]);
    }

    protected function authorizeTarget(Target $target): void
    {
        if ($target->user_id !== auth()->id()) {
            abort(403, 'Unauthorized access to target.');
        }
    }

    protected function normalizeUrl(string $url): string
    {
        $url = trim($url);
        if (!str_starts_with($url, 'http://') && !str_starts_with($url, 'https://')) {
            $url = 'https://' . $url;
        }
        return rtrim($url, '/');
    }
}