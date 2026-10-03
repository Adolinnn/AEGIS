<?php

namespace App\Siem\Parsers;

use App\Siem\Contracts\ParserInterface;
use App\Siem\NormalizedEvent;
use Carbon\Carbon;

class FimParser implements ParserInterface
{
    public function parse(string $raw, Carbon $receivedAt): NormalizedEvent
    {
        $eventType = 'unknown';
        $fields = [];
        $message = $raw;

        if (preg_match('/^FIM:(created|modified):([a-f0-9]{32})$/i', $raw, $matches)) {
            $eventType = 'fim_hash';
            $fields['action'] = $matches[1];
            $fields['md5'] = $matches[2];
        }

        return new NormalizedEvent(
            eventType: $eventType,
            srcIp: null,
            username: null,
            message: $message,
            fields: $fields
        );
    }
}
