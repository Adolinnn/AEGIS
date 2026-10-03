<?php

namespace App\Siem;

class NormalizedEvent
{
    public function __construct(
        public string $eventType = 'unknown',
        public ?string $srcIp = null,
        public ?string $username = null,
        public ?string $message = null,
        public array $fields = [],
        public ?\Carbon\Carbon $occurredAt = null
    ) {}
}
