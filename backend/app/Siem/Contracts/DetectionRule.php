<?php

namespace App\Siem\Contracts;

use App\Models\SiemEvent;

interface DetectionRule
{
    public function key(): string;
    public function title(): string;
    public function severity(): string; // info, low, medium, high, critical
    public function mitre(): ?string;
    public function defaultThreshold(): int;
    public function defaultWindow(): int; // minutes
    public function description(): string;
    public function recommendedActions(): string;

    /**
     * Determine if this rule applies to the given event type.
     */
    public function appliesTo(string $eventType): bool;

    /**
     * Evaluate the rule for a specific agent and source IP.
     * Return array of evidence Event IDs if triggered, or null if not.
     */
    public function evaluate(int $agentId, ?string $srcIp, \Carbon\Carbon $now): ?array;
}
