<?php

namespace App\Siem\Parsers;

use App\Siem\Contracts\ParserInterface;
use App\Siem\NormalizedEvent;
use Carbon\Carbon;

class AgentSyntheticParser implements ParserInterface
{
    public function parse(string $raw, Carbon $receivedAt): NormalizedEvent
    {
        return new NormalizedEvent(
            eventType: 'log_truncated',
            message: $raw
        );
    }
}
