<?php

namespace App\Siem\Rules;

use App\Models\SiemEvent;
use Carbon\Carbon;

class SshBruteForceRule extends BaseRule
{
    public function key(): string { return 'ssh_bruteforce'; }
    public function title(): string { return 'Forcefully Login Detected'; }
    public function severity(): string { return 'medium'; }
    public function mitre(): ?string { return 'T1110.001'; }
    public function defaultThreshold(): int { return 6; }
    public function defaultWindow(): int { return 2; } // 2 minutes

    public function description(): string { return 'Repeated SSH authentication failures from a single IP address.'; }
    public function recommendedActions(): string { return 'Consider blocking this IP address at the firewall level or using tools like fail2ban.'; }

    public function appliesTo(string $eventType): bool
    {
        return in_array($eventType, ['ssh_auth_failed', 'ssh_auth_invalid_user']);
    }

    public function evaluate(int $agentId, ?string $srcIp, Carbon $now): ?array
    {
        if (!$srcIp) return null;

        $windowStart = $now->copy()->subMinutes($this->getWindow($agentId));

        $events = SiemEvent::where('agent_id', $agentId)
            ->where('src_ip', $srcIp)
            ->whereIn('event_type', ['ssh_auth_failed', 'ssh_auth_invalid_user'])
            ->where('occurred_at', '>=', $windowStart)
            ->orderBy('id', 'desc')
            ->limit(50)
            ->get();

        if ($events->count() >= $this->getThreshold($agentId)) {
            return $events->pluck('id')->toArray();
        }

        return null;
    }
}
