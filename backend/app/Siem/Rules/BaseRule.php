<?php

namespace App\Siem\Rules;

use App\Siem\Contracts\DetectionRule;
use App\Models\SiemEvent;
use Carbon\Carbon;

abstract class BaseRule implements DetectionRule
{
    public function appliesTo(string $eventType): bool
    {
        return true;
    }

    protected function getThreshold(int $agentId): int
    {
        // For Phase 4, we could look up user overrides in siem_rule_settings.
        // For MVP, just return default.
        return $this->defaultThreshold();
    }

    protected function getWindow(int $agentId): int
    {
        return $this->defaultWindow();
    }
}
