<?php

namespace App\Siem\Rules;

use App\Models\SiemEvent;
use Carbon\Carbon;

class SshSuccessAfterFailuresRule extends BaseRule
{
    public function key(): string { return 'ssh_success_after_failures'; }
    public function title(): string { return 'Successful SSH Login After Brute Force'; }
    public function severity(): string { return 'critical'; }
    public function mitre(): ?string { return 'T1078'; }
    public function defaultThreshold(): int { return 5; }
    public function defaultWindow(): int { return 10; }

    public function description(): string { return 'An attacker successfully authenticated to SSH after multiple failed attempts. This usually indicates a compromised account.'; }
    public function recommendedActions(): string { return 'Immediately revoke the user credentials. Inspect the system for persistence mechanisms (cron, ssh keys) and anomalous execution.'; }

    public function appliesTo(string $eventType): bool
    {
        return $eventType === 'ssh_auth_success';
    }

    public function evaluate(int $agentId, ?string $srcIp, Carbon $now): ?array
    {
        if (!$srcIp) return null;

        $windowStart = $now->copy()->subMinutes($this->getWindow($agentId));

        // We know the current event is a success, we need to check prior failures in the window
        $failures = SiemEvent::where('agent_id', $agentId)
            ->where('src_ip', $srcIp)
            ->whereIn('event_type', ['ssh_auth_failed', 'ssh_auth_invalid_user'])
            ->where('occurred_at', '>=', $windowStart)
            ->orderBy('id', 'desc')
            ->limit($this->getThreshold($agentId))
            ->get();

        if ($failures->count() >= $this->getThreshold($agentId)) {
            // Include the success event(s) too
            $successes = SiemEvent::where('agent_id', $agentId)
                ->where('src_ip', $srcIp)
                ->where('event_type', 'ssh_auth_success')
                ->where('occurred_at', '>=', $windowStart)
                ->orderBy('id', 'desc')
                ->limit(5)
                ->get();
                
            return array_merge($failures->pluck('id')->toArray(), $successes->pluck('id')->toArray());
        }

        return null;
    }
}
