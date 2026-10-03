<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\SiemAlert;
use Inertia\Inertia;

class SiemAlertController extends Controller
{
    public function index(Request $request)
    {
        $query = SiemAlert::with('agent:id,name')->where('user_id', $request->user()->id);

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        } else {
            // Default to showing non-resolved alerts unless specified
            $query->whereIn('status', ['open', 'acknowledged']);
        }

        if ($request->filled('severity')) {
            $query->where('severity', $request->severity);
        }

        if ($request->filled('agent_id')) {
            $query->where('agent_id', $request->agent_id);
        }

        $alerts = $query->orderBy('last_seen_at', 'desc')->paginate(50)->withQueryString();

        return Inertia::render('Siem/Alerts/Index', [
            'alerts' => $alerts,
            'filters' => $request->only(['status', 'severity', 'agent_id']),
            'agents' => $request->user()->siemAgents()->select('id', 'name')->get(),
        ]);
    }

    public function show(Request $request, SiemAlert $siemAlert)
    {
        $this->authorize('view', $siemAlert);

        $siemAlert->load('agent:id,name');

        // Load the evidence events
        $evidenceIds = $siemAlert->evidence_event_ids ?? [];
        $evidence = [];
        if (!empty($evidenceIds)) {
            $evidence = \App\Models\SiemEvent::whereIn('id', $evidenceIds)
                ->orderBy('occurred_at', 'desc')
                ->get();
        }

        // Add Rule description/recommended actions
        $rule = \App\Siem\Rules\RuleRegistry::get($siemAlert->rule_key);
        $ruleInfo = $rule ? [
            'description' => $rule->description(),
            'recommended_actions' => $rule->recommendedActions(),
            'window' => $rule->defaultWindow(),
            'threshold' => $rule->defaultThreshold(),
        ] : null;

        if (!$siemAlert->ai_explanation && $request->user()->llm_api_key) {
            \App\Jobs\GenerateSiemAIExplainJob::dispatch($siemAlert->id);
        }

        return Inertia::render('Siem/Alerts/Show', [
            'alert' => $siemAlert,
            'evidence' => $evidence,
            'rule_info' => $ruleInfo,
        ]);
    }

    public function updateStatus(Request $request, SiemAlert $siemAlert)
    {
        $this->authorize('update', $siemAlert);

        $validated = $request->validate([
            'status' => 'required|in:open,acknowledged,resolved,false_positive',
            'resolution_note' => 'nullable|string'
        ]);

        $update = ['status' => $validated['status']];
        if (in_array($validated['status'], ['resolved', 'false_positive'])) {
            $update['resolved_at'] = now();
            if (isset($validated['resolution_note'])) {
                $update['resolution_note'] = $validated['resolution_note'];
            }
        }

        $siemAlert->update($update);

        return redirect()->back();
    }

    public function criticalUnread(Request $request)
    {
        $alerts = SiemAlert::where('user_id', $request->user()->id)
            ->whereIn('severity', ['critical', 'high'])
            ->where('status', 'open')
            ->orderBy('last_seen_at', 'desc')
            ->limit(5)
            ->get();
            
        return response()->json(['alerts' => $alerts]);
    }
}
