<?php

namespace App\Siem\Rules;

use App\Siem\Contracts\DetectionRule;
use App\Models\SiemEvent;
use Illuminate\Support\Facades\Http;
use App\Enums\SiemEventSeverity;
use Carbon\Carbon;

class VirusTotalRule implements DetectionRule
{
    public function key(): string
    {
        return 'fim_malicious_file';
    }

    public function title(): string
    {
        return 'Malicious File Detected (VirusTotal)';
    }

    public function description(): string
    {
        return 'A file modification matched a known malicious hash on VirusTotal.';
    }

    public function severity(): string
    {
        return 'critical';
    }

    public function mitre(): ?string
    {
        return 'T1204';
    }

    public function defaultThreshold(): int
    {
        return 1;
    }

    public function recommendedActions(): string
    {
        return "1. Isolate the affected host immediately.\n2. Delete or quarantine the malicious file.\n3. Perform a full system scan.";
    }

    public function appliesTo(string $eventType): bool
    {
        return $eventType === 'fim_hash';
    }

    public function defaultWindow(): int
    {
        return 5;
    }

    public function evaluate(int $agentId, ?string $srcIp, Carbon $now): ?array
    {
        $events = SiemEvent::where('agent_id', $agentId)
            ->where('event_type', 'fim_hash')
            ->where('occurred_at', '>=', $now->copy()->subMinutes($this->defaultWindow()))
            ->get();

        $maliciousEventIds = [];
        $apiKey = env('VIRUS_TOTAL');

        if (empty($apiKey)) {
            return null;
        }

        foreach ($events as $event) {
            $md5 = $event->fields['md5'] ?? null;
            if (!$md5) continue;

            try {
                $response = Http::withHeaders([
                    'x-apikey' => $apiKey
                ])->get("https://www.virustotal.com/api/v3/files/{$md5}");

                if ($response->successful()) {
                    $stats = $response->json('data.attributes.last_analysis_stats');
                    if ($stats && isset($stats['malicious']) && $stats['malicious'] > 0) {
                        $maliciousEventIds[] = $event->id;
                    }
                }
            } catch (\Exception $e) {
                // Ignore API errors
            }
        }

        return count($maliciousEventIds) > 0 ? $maliciousEventIds : null;
    }
}
