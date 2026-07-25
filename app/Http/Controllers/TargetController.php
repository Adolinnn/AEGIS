<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Enums\ScanType;
use App\Enums\SubscriptionTier;
use App\Enums\TargetStatus;
use App\Http\Requests\StoreTargetRequest;
use App\Http\Requests\UpdateTargetRequest;
use App\Jobs\CheckUptimeJob;
use App\Jobs\ScanTargetJob;
use App\Scanning\ToolRegistry;
use App\Models\Target;
use App\Models\UptimeLog;
use App\Models\VulnerabilityLog;
use App\Services\ScannerService;
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
            ->with(['latestUptimeLog', 'unresolvedVulnerabilities'])
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
            'unresolvedVulnerabilities',
            'uptimeLogs' => fn ($q) => $q->latest()->limit(50),
            'vulnerabilityLogs' => fn ($q) => $q->latest()->limit(50),
        ]);

        $uptimeStats = app(UptimeService::class)->getUptimeStats($target, 30);

        return Inertia::render('Targets/Show', [
            'target' => $target,
            'uptimeStats' => $uptimeStats,
            'recentUptimeLogs' => $target->uptimeLogs,
            'recentVulnerabilities' => $target->vulnerabilityLogs,
            'scanTypes' => ScanType::cases(),
            'consentText' => config('scanning.consent_text'),
            'availableTools' => app(ToolRegistry::class)
                ->all()
                ->map(fn ($tool) => [
                    'name' => $tool->name()->value,
                    'label' => $tool->name()->label(),
                    'description' => $tool->name()->description(),
                    'installed' => $tool->name()->isInstalled(),
                ])
                ->values()
                ->all(),
        ]);
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

    public function scan(Request $request, Target $target): RedirectResponse
    {
        $this->authorizeTarget($target);

        $user = $request->user();

        // Check daily scan limit
        $todayScans = $target->vulnerabilityLogs()
            ->whereDate('detected_at', today())
            ->count();

        if ($todayScans >= $user->maxScansPerDay()) {
            return back()->withErrors([
                'scan' => "Daily scan limit reached ({$user->maxScansPerDay()}). Upgrade your plan for more scans.",
            ]);
        }

        $scanTypes = $request->array('scan_types', []);
        if (empty($scanTypes)) {
            $scanTypes = ['xss', 'sqli', 'ssrf', 'misconfiguration'];
        }

        // Validate scan types
        $validTypes = array_column(ScanType::cases(), 'value');
        $scanTypes = array_intersect($scanTypes, $validTypes);

        if (empty($scanTypes)) {
            return back()->withErrors(['scan' => 'No valid scan types selected.']);
        }

        ScanTargetJob::dispatch($target->id, $scanTypes);

        return back()->with('success', 'Security scan queued. Results will appear shortly.');
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

        $vulnerabilities = $target->vulnerabilityLogs()
            ->when($request->filled('severity'), fn ($q) => $q->where('severity', $request->string('severity')))
            ->when($request->filled('type'), fn ($q) => $q->where('vulnerability_type', $request->string('type')))
            ->when($request->filled('resolved'), fn ($q) => $request->boolean('resolved')
                ? $q->where('is_resolved', true)
                : $q->where('is_resolved', false))
            ->latest()
            ->paginate(20)
            ->withQueryString();

        return Inertia::render('Targets/Vulnerabilities', [
            'target' => $target,
            'vulnerabilities' => $vulnerabilities,
            'filters' => $request->only(['severity', 'type', 'resolved']),
            'severities' => \App\Enums\VulnerabilitySeverity::cases(),
            'scanTypes' => ScanType::cases(),
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