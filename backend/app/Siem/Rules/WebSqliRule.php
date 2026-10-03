<?php

namespace App\Siem\Rules;

use App\Models\SiemEvent;
use Carbon\Carbon;

class WebSqliRule extends BaseRule
{
    public function key(): string { return 'web_sqli'; }
    public function title(): string { return 'SQL Injection Attempt'; }
    public function severity(): string { return 'high'; }
    public function mitre(): ?string { return 'T1190'; }
    public function defaultThreshold(): int { return 1; }
    public function defaultWindow(): int { return 1; } // 1 minute

    public function description(): string { return 'Detected SQL injection patterns in the requested URL path or query string.'; }
    public function recommendedActions(): string { return 'Ensure your application uses parameterized queries. Block this IP if behavior persists.'; }

    public function appliesTo(string $eventType): bool
    {
        return $eventType === 'web_access';
    }

    public function evaluate(int $agentId, ?string $srcIp, Carbon $now): ?array
    {
        if (!$srcIp) return null;

        $windowStart = $now->copy()->subMinutes($this->getWindow($agentId));

        $events = SiemEvent::where('agent_id', $agentId)
            ->where('src_ip', $srcIp)
            ->where('event_type', 'web_access')
            ->where('occurred_at', '>=', $windowStart)
            ->orderBy('id', 'desc')
            ->limit(50)
            ->get();

        $patterns = ['union select', 'or 1=1', "' or '", 'sleep(', 'benchmark(', 'information_schema'];
        
        $matchedIds = [];
        foreach ($events as $event) {
            $path = urldecode(urldecode($event->fields['path'] ?? ''));
            $pathLower = strtolower($path);
            
            foreach ($patterns as $pattern) {
                if (str_contains($pathLower, $pattern)) {
                    $matchedIds[] = $event->id;
                    break;
                }
            }
        }

        if (count($matchedIds) >= $this->getThreshold($agentId)) {
            return $matchedIds;
        }

        return null;
    }
}
