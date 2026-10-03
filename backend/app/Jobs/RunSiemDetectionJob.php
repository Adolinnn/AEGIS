<?php

namespace App\Jobs;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use App\Models\SiemAgent;
use App\Models\SiemAlert;
use App\Siem\Rules\RuleRegistry;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class RunSiemDetectionJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;
    public int $backoff = 10;
    public int $timeout = 120;

    public function __construct(
        public int $agentId,
        public ?string $srcIp,
        public string $eventType
    ) {}

    public function handle(): void
    {
        $agent = SiemAgent::find($this->agentId);
        $statusValue = $agent->status instanceof \BackedEnum ? $agent->status->value : (string) $agent->status;
        if (!$agent || $statusValue === 'revoked') return;

        $now = now();
        $rules = RuleRegistry::all();

        foreach ($rules as $rule) {
            if (!$rule->appliesTo($this->eventType)) {
                continue;
            }

            // Check if IP is in allowlist (omitted for brevity, assume MVP without allowlist or basic check)
            
            $evidenceIds = $rule->evaluate($this->agentId, $this->srcIp, $now);

            if ($evidenceIds && count($evidenceIds) > 0) {
                // Trigger Alert
                $dedupeKey = hash('sha256', "{$agent->id}|{$rule->key()}|{$this->srcIp}");

                // Find existing open alert within cooldown (15 mins)
                $cooldownStart = $now->copy()->subMinutes(15);
                $existing = SiemAlert::where('dedupe_key', $dedupeKey)
                    ->whereIn('status', ['open', 'acknowledged'])
                    ->where('last_seen_at', '>=', $cooldownStart)
                    ->first();

                if ($existing) {
                    $mergedEvidence = array_unique(array_merge($existing->evidence_event_ids ?? [], $evidenceIds));
                    $existing->update([
                        'event_count' => $existing->event_count + count($evidenceIds),
                        'last_seen_at' => $now,
                        'evidence_event_ids' => array_slice($mergedEvidence, 0, 50)
                    ]);
                } else {
                    SiemAlert::create([
                        'user_id' => $agent->user_id,
                        'agent_id' => $agent->id,
                        'rule_key' => $rule->key(),
                        'title' => $rule->title(),
                        'severity' => $rule->severity(),
                        'status' => 'open',
                        'dedupe_key' => $dedupeKey,
                        'src_ip' => $this->srcIp,
                        'event_count' => count($evidenceIds),
                        'first_seen_at' => $now,
                        'last_seen_at' => $now,
                        'evidence_event_ids' => array_slice($evidenceIds, 0, 50),
                    ]);
                }
            }
        }
    }
}
