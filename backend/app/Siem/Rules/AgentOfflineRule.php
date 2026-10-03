<?php

namespace App\Siem\Rules;

use Carbon\Carbon;

class AgentOfflineRule extends BaseRule
{
    public function key(): string { return 'agent_offline'; }
    public function title(): string { return 'Agent Offline'; }
    public function severity(): string { return 'medium'; }
    public function mitre(): ?string { return null; }
    public function defaultThreshold(): int { return 1; }
    public function defaultWindow(): int { return 1; }

    public function description(): string { return 'The agent has missed multiple heartbeats and is considered offline.'; }
    public function recommendedActions(): string { return 'Check the host server to ensure the aegis-agent service is running and has network connectivity.'; }

    public function appliesTo(string $eventType): bool
    {
        return false; // Handled by command, not event driven
    }

    public function evaluate(int $agentId, ?string $srcIp, Carbon $now): ?array
    {
        return null;
    }
}
