<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\SiemAgent;
use App\Models\SiemAlert;
use App\Siem\Rules\RuleRegistry;
use Carbon\Carbon;

class CheckSiemAgents extends Command
{
    protected $signature = 'siem:check-agents';
    protected $description = 'Check for agents that have gone offline and raise alerts';

    public function handle()
    {
        $offlineThreshold = config('siem.offline_after_seconds', 180);
        $thresholdTime = now()->subSeconds($offlineThreshold);

        // Find agents that were active but haven't been seen recently
        $offlineAgents = SiemAgent::where('status', 'active')
            ->where('last_seen_at', '<', $thresholdTime)
            ->get();

        $rule = RuleRegistry::get('agent_offline');

        foreach ($offlineAgents as $agent) {
            $agent->update(['status' => 'offline']);

            $dedupeKey = hash('sha256', "{$agent->id}|agent_offline|system");
            
            SiemAlert::firstOrCreate(
                [
                    'dedupe_key' => $dedupeKey,
                    'status' => 'open' // Only create if one isn't open
                ],
                [
                    'user_id' => $agent->user_id,
                    'agent_id' => $agent->id,
                    'rule_key' => 'agent_offline',
                    'title' => $rule->title(),
                    'severity' => $rule->severity(),
                    'first_seen_at' => now(),
                    'last_seen_at' => now(),
                    'event_count' => 1,
                    'evidence_event_ids' => []
                ]
            );
        }

        // Auto-resolve agents that came back online
        $onlineAgents = SiemAgent::where('status', 'offline')
            ->where('last_seen_at', '>=', $thresholdTime)
            ->get();

        foreach ($onlineAgents as $agent) {
            $agent->update(['status' => 'active']);
            
            $dedupeKey = hash('sha256', "{$agent->id}|agent_offline|system");
            
            SiemAlert::where('dedupe_key', $dedupeKey)
                ->where('status', 'open')
                ->update([
                    'status' => 'resolved', 
                    'resolved_at' => now(),
                    'resolution_note' => 'Auto-resolved: Agent came back online.'
                ]);
        }

        $this->info("Checked SIEM agents. " . count($offlineAgents) . " went offline, " . count($onlineAgents) . " came back online.");
    }
}
