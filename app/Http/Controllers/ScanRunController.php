<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Enums\ToolName;
use App\Jobs\RunScanJob;
use App\Models\ScanRun;
use App\Models\Target;
use App\Scanning\ToolRegistry;
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
        ]);
    }

    public function show(Request $request, ScanRun $scanRun): Response
    {
        if ($scanRun->user_id !== $request->user()->id) {
            abort(403);
        }

        $scanRun->load(['target', 'findings' => fn ($q) => $q->orderByDesc('severity'), 'report']);

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
        ]);

        RunScanJob::dispatch($run->id);

        return back()->with('success', 'Tool scan queued. Results will appear shortly.');
    }

    /**
     * Tool availability for the UI authorization form.
     */
    public function availableTools(): array
    {
        return app(ToolRegistry::class)
            ->all()
            ->map(fn ($tool) => [
                'name' => $tool->name()->value,
                'label' => $tool->name()->label(),
                'description' => $tool->name()->description(),
                'installed' => $tool->name()->isInstalled(),
            ])
            ->all();
    }
}
