<?php

namespace App\Siem\Rules;

use App\Models\SiemEvent;
use Carbon\Carbon;

class WebScannerUaRule extends BaseRule
{
    public function key(): string { return 'web_scanner_ua'; }
    public function title(): string { return 'Web Vulnerability Scanner Detected'; }
    public function severity(): string { return 'high'; }
    public function mitre(): ?string { return 'T1595'; }
    public function defaultThreshold(): int { return 1; }
    public function defaultWindow(): int { return 1; }

    public function description(): string { return 'A known web vulnerability scanner user-agent was detected.'; }
    public function recommendedActions(): string { return 'Block the IP address. These are automated scanning tools looking for vulnerabilities.'; }

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
            ->limit(10)
            ->get();

        $scanners = ['sqlmap', 'nikto', 'nmap', 'gobuster', 'dirbuster', 'wpscan', 'nuclei', 'masscan', 'zgrab', 'acunetix', 'burp', 'hydra'];
        
        $matchedIds = [];
        foreach ($events as $event) {
            $ua = strtolower($event->fields['user_agent'] ?? '');
            
            foreach ($scanners as $scanner) {
                if (str_contains($ua, $scanner)) {
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
