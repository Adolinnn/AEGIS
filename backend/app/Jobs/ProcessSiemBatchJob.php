<?php

namespace App\Jobs;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use App\Models\SiemEvent;
use App\Siem\Parsers\ParserRegistry;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class ProcessSiemBatchJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;
    public int $backoff = 10;
    public int $timeout = 120;

    public $agentId;

    public function __construct(int $agentId)
    {
        $this->agentId = $agentId;
    }

    public function handle(): void
    {
        // Process unparsed events for this agent
        // In a very high volume setup we'd chunk this by batch ID. 
        // We'll process up to 1000 'unknown' events that haven't been parsed yet.
        
        $events = SiemEvent::where('agent_id', $this->agentId)
            ->where('event_type', 'unknown')
            ->orderBy('id', 'asc')
            ->limit(1000)
            ->get();

        if ($events->isEmpty()) {
            return;
        }

        $combinations = [];

        foreach ($events as $event) {
            $parser = ParserRegistry::getParser($event->source instanceof \BackedEnum ? $event->source->value : (string) $event->source);
            
            // The occurrence time was temporarily set to collection time. 
            // In a full implementation, syslog timestamps would be extracted.
            // For MVP, we will stick to what the ingest set, or update if the parser extracts one.
            
            $normalized = $parser->parse($event->raw, Carbon::parse($event->received_at));

            $event->event_type = $normalized->eventType === 'unknown' ? 'unparsed' : $normalized->eventType;
            
            if ($event->event_type === 'unparsed') {
                $event->delete();
                continue;
            }

            $event->src_ip = $normalized->srcIp;
            $event->username = $normalized->username;
            $event->message = \Illuminate\Support\Str::limit($normalized->message, 255, '');
            $event->fields = $normalized->fields;
            
            if ($normalized->occurredAt) {
                $event->occurred_at = $normalized->occurredAt;
            }
            
            // Re-save (could be bulk updated for better perf, but OK for now)
            $event->save();

            // Collect combinations for detection (Phase 4)
            if ($event->event_type !== 'unknown' && $event->event_type !== 'unparsed') {
                $comboKey = "{$event->agent_id}|{$event->src_ip}|{$event->event_type}";
                $combinations[$comboKey] = [
                    'agent_id' => $event->agent_id,
                    'src_ip' => $event->src_ip,
                    'event_type' => $event->event_type,
                    'last_event' => $event
                ];
            }
        }

        // Trigger Phase 4 detections once per batch combination
        foreach ($combinations as $combo) {
            \App\Jobs\RunSiemDetectionJob::dispatch($combo['agent_id'], $combo['src_ip'], $combo['event_type']);
        }
        
        // If there are more, dispatch self again
        if ($events->count() == 1000) {
            self::dispatch($this->agentId);
        }
    }
}
