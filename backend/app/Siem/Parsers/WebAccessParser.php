<?php

namespace App\Siem\Parsers;

use App\Siem\Contracts\ParserInterface;
use App\Siem\NormalizedEvent;
use Carbon\Carbon;

class WebAccessParser implements ParserInterface
{
    public function parse(string $raw, Carbon $receivedAt): NormalizedEvent
    {
        // Log format: 203.0.113.50 - - [02/Oct/2026:14:08:01 +0000] "GET /index.php?id=1%20UNION%20SELECT%20null,version() HTTP/1.1" 200 512 "-" "sqlmap/1.7"
        // Regex for Nginx/Apache Combined Log Format
        $pattern = '/^(\S+) \S+ \S+ \[([^\]]+)\] "([^"]*)" (\d{3}) (\d+|-) "([^"]*)" "([^"]*)"/';
        
        if (preg_match($pattern, $raw, $matches)) {
            $ip = $matches[1];
            // $timestampStr = $matches[2]; // Will be handled by the job ideally, or we can just leave occurred_at to what ingest set
            $requestStr = $matches[3];
            $status = $matches[4];
            $bytes = $matches[5];
            $referer = $matches[6];
            $userAgent = $matches[7];

            $method = 'UNKNOWN';
            $path = '';
            $protocol = '';
            $reqParts = explode(' ', $requestStr);
            if (count($reqParts) >= 2) {
                $method = $reqParts[0];
                $path = $reqParts[1];
                $protocol = $reqParts[2] ?? '';
            } else {
                $method = $requestStr;
            }

            return new NormalizedEvent(
                eventType: 'web_access',
                srcIp: $ip,
                message: $requestStr,
                fields: [
                    'method' => $method,
                    'path' => $path,
                    'protocol' => $protocol,
                    'status' => $status,
                    'bytes' => $bytes,
                    'referer' => $referer,
                    'user_agent' => $userAgent,
                ]
            );
        }

        return new NormalizedEvent(eventType: 'unknown', message: $raw);
    }
}
