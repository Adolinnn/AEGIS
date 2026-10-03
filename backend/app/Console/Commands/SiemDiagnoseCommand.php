<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\SiemAgent;
use App\Models\SiemEvent;
use App\Models\SiemAlert;
use App\Siem\Rules\RuleRegistry;
use Illuminate\Support\Facades\Schema;

class SiemDiagnoseCommand extends Command
{
    protected $signature = 'siem:diagnose';
    protected $description = 'Diagnose SIEM pipeline health and data flow';

    public function handle()
    {
        $this->info("--- SIEM Diagnostic Report ---");

        $agentCount = SiemAgent::count();
        $this->line("Agents configured: {$agentCount}");
        if ($agentCount === 0) {
            $this->warn("WARNING: No agents configured. You will not receive any events.");
        }

        $totalEvents = SiemEvent::count();
        $unknownCount = SiemEvent::where('event_type', 'unknown')->count();
        $unparsedCount = SiemEvent::where('event_type', 'unparsed')->count();

        $this->line("Total events ingested: {$totalEvents}");
        $this->line("Events pending parse ('unknown'): {$unknownCount}");
        if ($unknownCount > 0 && $unknownCount === $totalEvents) {
            $this->warn("WARNING: All events are stuck at 'unknown'. Is the queue worker running? (php artisan queue:work)");
        }

        $this->line("Events that could not be parsed ('unparsed'): {$unparsedCount}");

        $distinctTypes = SiemEvent::select('event_type')->distinct()->pluck('event_type')->toArray();
        $this->line("Distinct event types present: " . implode(', ', $distinctTypes));

        $this->info("\n--- Rule Evaluation Map ---");
        $rules = RuleRegistry::all();
        foreach ($rules as $rule) {
            $matched = false;
            foreach ($distinctTypes as $type) {
                if ($rule->appliesTo($type)) {
                    $matched = true;
                    break;
                }
            }
            $status = $matched ? "<info>SATISFIED</info>" : "<comment>NO MATCHING EVENTS</comment>";
            $this->line("- [{$rule->key()}] {$rule->title()}: {$status}");
        }

        $this->info("\n--- Alerts & Schema ---");
        $hasColumn = Schema::hasColumn('siem_alerts', 'evidence_event_ids');
        $this->line("Schema siem_alerts.evidence_event_ids exists: " . ($hasColumn ? "<info>YES</info>" : "<error>NO</error>"));
        if (!$hasColumn) {
            $this->error("CRITICAL: evidence_event_ids column is missing. Run migrations to fix.");
        }

        $alertCount = SiemAlert::count();
        $this->line("Total generated alerts: {$alertCount}");

        if ($totalEvents > 0 && $alertCount === 0) {
            $this->warn("WARNING: Events exist but no alerts generated. Check thresholds, worker status, and rule logic.");
        }
    }
}
