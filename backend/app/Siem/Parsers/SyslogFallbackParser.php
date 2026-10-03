<?php

namespace App\Siem\Parsers;

use App\Siem\Contracts\ParserInterface;
use App\Siem\NormalizedEvent;
use Carbon\Carbon;

class SyslogFallbackParser implements ParserInterface
{
    public function parse(string $raw, Carbon $receivedAt): NormalizedEvent
    {
        // Fallback: just return the raw string as message
        return new NormalizedEvent(
            eventType: 'unknown',
            message: $raw
        );
    }
}
