<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Enums\ToolName;
use App\Jobs\RunScanJob;
use App\Models\ScanRun;
use App\Models\Target;
use App\Scanning\ToolRegistry;
use App\Services\ReportAgentService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ScanRunController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();

        $runs = ScanRun::where('user_id', $user->id)
            ->with(['target', 'findings'])
            ->latest()
            ->paginate(20)
            ->withQueryString();

        return Inertia::render('ScanRuns/Index', [
            'runs' => $runs,
            'targets' => $user->targets()->get(['id', 'domain_url', 'display_name', 'is_authorized']),
            'availableTools' => $this->availableTools(),
            'consentText' => config('scanning.consent_text'),
        ]);
    }

    public function show(Request $request, ScanRun $scanRun): Response
    {
        if ($scanRun->user_id !== $request->user()->id) {
            abort(403);
        }

        $scanRun->load([
            'target',
            'findings' => fn ($q) => $q->orderByDesc('severity'),
            'report',
            'toolOutputs' => fn ($q) => $q->orderBy('id'),
        ]);

        $findings = $scanRun->findings->map(fn ($f) => [
            'id' => $f->id,
            'tool' => $f->tool->value,
            'title' => $f->title,
            'category' => $f->category,
            'severity' => $f->severity->value,
            'description' => $f->description,
            'evidence' => $f->evidence,
            'recommendation' => $f->recommendation,
        ]);

        $toolOutputs = $scanRun->toolOutputs->map(fn ($o) => [
            'tool' => $o->tool,
            'tool_label' => \App\Enums\ToolName::tryFrom($o->tool)?->label() ?? $o->tool,
            'status' => $o->status,
            'command' => $o->command,
            'exit_code' => $o->exit_code,
            'timed_out' => $o->timed_out,
            'output' => $o->output,
            'findings_count' => $o->findings_count,
        ]);

        return Inertia::render('ScanRuns/Show', [
            'run' => [
                'id' => $scanRun->id,
                'status' => $scanRun->status->value,
                'status_label' => $scanRun->status->label(),
                'selected_tools' => $scanRun->selected_tools,
                'tools_failed' => $scanRun->tools_failed ?? [],
                'consent_attested' => $scanRun->consent_attested,
                'summary' => $scanRun->summary,
                'created_at' => $scanRun->created_at,
                'finished_at' => $scanRun->finished_at,
            ],
            'target' => [
                'id' => $scanRun->target->id,
                'domain_url' => $scanRun->target->domain_url,
                'display_name' => $scanRun->target->display_name,
            ],
            'findings' => $findings,
            'toolOutputs' => $toolOutputs,
            'report' => $scanRun->report ? [
                'provider' => $scanRun->report->provider,
                'risk_score' => $scanRun->report->risk_score,
                'risk_level' => $scanRun->report->risk_level,
                'payload' => $scanRun->report->payload,
                'generated_at' => $scanRun->report->generated_at,
            ] : null,
        ]);
    }

    /**
     * Start a tool-driven scan run for a target. Requires the target to be
     * authorized and an explicit consent attestation in the request.
     */
    public function store(Request $request, Target $target): RedirectResponse
    {
        if ($target->user_id !== $request->user()->id) {
            abort(403);
        }

        if (! $target->is_authorized) {
            return back()->withErrors([
                'scan' => 'This target is not authorized for tool scanning. Confirm authorization first.',
            ]);
        }

        $request->validate([
            'consent' => ['required', 'accepted'],
            'generate_report' => ['sometimes', 'boolean'],
            'tools' => ['sometimes', 'array'],
            'tools.*' => ['string', 'in:' . implode(',', array_column(ToolName::cases(), 'value'))],
        ]);

        $requested = $request->array('tools');
        if (empty($requested)) {
            $requested = array_map(fn (ToolName $t) => $t->value, ToolName::installed());
        }

        $selected = collect($requested)
            ->map(fn ($v) => ToolName::tryFrom($v))
            ->filter()
            ->unique()
            ->all();

        if (empty($selected)) {
            return back()->withErrors([
                'scan' => 'No installed tools available to run. Install nmap, wpscan, gobuster, or sqlmap on the host.',
            ]);
        }

        $run = ScanRun::create([
            'user_id' => $target->user_id,
            'target_id' => $target->id,
            'status' => \App\Enums\ScanRunStatus::Pending,
            'selected_tools' => array_map(fn (ToolName $t) => $t->value, $selected),
            'consent_attested' => true,
            'consent_text' => config('scanning.consent_text'),
            'generate_report' => (bool) $request->boolean('generate_report'),
        ]);

        RunScanJob::dispatch($run->id);

        return back()->with('success', 'Tool scan queued. Results will appear shortly.');
    }

    /**
     * Tool availability for the UI authorization form.
     */
    /**
     * Queue on-demand AI report generation for a finished scan run.
     */
    public function generateReport(Request $request, ScanRun $scanRun, ReportAgentService $agent): RedirectResponse
    {
        if ($scanRun->user_id !== $request->user()->id && ! $request->user()->isAdmin()) {
            abort(403);
        }

        if (! $scanRun->status->isTerminal()) {
            return back()->withErrors(['report' => 'Wait for the scan to finish before generating a report.']);
        }

        if ($scanRun->findings()->count() === 0) {
            return back()->withErrors(['report' => 'There are no findings to write a report from.']);
        }

        // Run synchronously rather than queueing: report generation is one
        // HTTP call to the LLM (seconds), and relying on a background queue
        // worker being alive silently drops the request with no feedback if
        // one isn't running. This also lets us surface a real error to the
        // "Generate report" button instead of a permanent no-op.
        $scanRun->loadMissing('target');
        $report = $agent->generateForRun($scanRun);

        if (! $report) {
            return back()->withErrors([
                'report' => 'Report generation failed. Check that an AI provider and API key are configured (Profile > AI settings, or server .env), and check storage/logs/laravel.log for the underlying error.',
            ]);
        }

        return back()->with('success', 'AI report generated.');
    }

    public function availableTools(): array
    {
        $builtin = [[
            'name' => \App\Enums\ToolName::Builtin->value,
            'label' => \App\Enums\ToolName::Builtin->label(),
            'description' => \App\Enums\ToolName::Builtin->description(),
            'installed' => true,
        ]];

        $external = app(ToolRegistry::class)
            ->all()
            ->map(fn ($tool) => [
                'name' => $tool->name()->value,
                'label' => $tool->name()->label(),
                'description' => $tool->name()->description(),
                'installed' => $tool->name()->isInstalled(),
            ])
            ->values()   // re-index so this serializes as a JSON array, not an object
            ->all();

        return array_merge($builtin, $external);
    }
}
