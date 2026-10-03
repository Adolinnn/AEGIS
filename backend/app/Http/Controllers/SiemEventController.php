<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Inertia\Inertia;
use App\Models\SiemEvent;

class SiemEventController extends Controller
{
    public function index(Request $request)
    {
        $query = SiemEvent::with('agent:id,name')->where('user_id', $request->user()->id);

        if ($request->filled('agent_id')) {
            $query->where('agent_id', $request->agent_id);
        }

        if ($request->filled('event_type')) {
            $query->where('event_type', $request->event_type);
        }

        if ($request->filled('src_ip')) {
            $query->where('src_ip', 'like', '%' . $request->src_ip . '%');
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('raw', 'like', "%{$search}%")
                  ->orWhere('message', 'like', "%{$search}%")
                  ->orWhere('src_ip', 'like', "%{$search}%")
                  ->orWhere('event_type', 'like', "%{$search}%")
                  ->orWhere('username', 'like', "%{$search}%");
            });
        }

        $query->orderBy('occurred_at', 'desc');

        // Check if this is an API request for live tail polling
        if ($request->wantsJson()) {
            $lastId = $request->input('last_id');
            if ($lastId) {
                $query->where('id', '>', $lastId);
            }
            $events = $query->limit(100)->get();
            return response()->json(['events' => $events]);
        }

        $events = $query->paginate(50)->withQueryString();

        return Inertia::render('Siem/Events/Index', [
            'events' => $events,
            'filters' => $request->only(['agent_id', 'event_type', 'src_ip', 'search']),
            'agents' => $request->user()->siemAgents()->select('id', 'name')->get(),
        ]);
    }

    public function explain(Request $request, SiemEvent $event)
    {
        if ($event->user_id !== $request->user()->id) {
            abort(403);
        }

        $gateway = app(\App\Services\Llm\LlmGatewayInterface::class);
        $prompt = "You are a SIEM expert. Briefly explain this single log line in 2-3 sentences. Identify the action, the risk level, and what it implies. Do not include greetings. Log:\n" . ($event->raw ?? json_encode($event->fields));
        
        try {
            $req = new \App\Services\Llm\LlmRequest($prompt);
            $response = $gateway->send($req);
            return response()->json(['explanation' => $response->content]);
        } catch (\Exception $e) {
            return response()->json(['explanation' => 'AI is currently unavailable or rate limited (429). Please try again later.']);
        }
    }
}
