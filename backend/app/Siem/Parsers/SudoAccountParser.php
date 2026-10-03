<?php

namespace App\Siem\Parsers;

use App\Siem\Contracts\ParserInterface;
use App\Siem\NormalizedEvent;
use Carbon\Carbon;

class SudoAccountParser implements ParserInterface
{
    public function parse(string $raw, Carbon $receivedAt): NormalizedEvent
    {
        // Sample: Oct  2 14:07:10 web1 sudo:   deploy : TTY=pts/0 ; PWD=/home/deploy ; USER=root ; COMMAND=/usr/bin/apt update
        
        $eventType = 'sudo_unknown';
        $username = null;
        $fields = [];
        $message = $raw;

        if (preg_match('/sudo:\s+([^:]+)\s*:\s*(.*)/', $raw, $matches)) {
            $username = trim($matches[1]);
            $details = $matches[2];
            $message = $details;

            if (preg_match('/USER=([^;]+)/', $details, $u)) {
                $fields['target_user'] = trim($u[1]);
            }
            if (preg_match('/COMMAND=(.*)/', $details, $c)) {
                $fields['command'] = substr(trim($c[1]), 0, 500); // truncate
                $eventType = 'sudo_command';
            }
            if (str_contains($details, 'authentication failure')) {
                $eventType = 'sudo_auth_failed';
            }
        } elseif (preg_match('/useradd(?:\[\d+\])?:\s*new user:\s*name=(\S+)/', $raw, $m)) {
            $eventType = 'account_created';
            $fields['target_user'] = $m[1];
        } elseif (preg_match('/usermod(?:\[\d+\])?:\s*add \'(.*?)\' to group \'(.*?)\'/', $raw, $m)) {
            $eventType = 'account_modified';
            $fields['target_user'] = $m[1];
            $fields['group'] = $m[2];
        } elseif (preg_match('/passwd(?:\[\d+\])?:\s*password for (\S+) changed by (\S+)/', $raw, $m)) {
            $eventType = 'password_changed';
            $fields['target_user'] = $m[1];
            $username = $m[2];
        }

        return new NormalizedEvent(
            eventType: $eventType,
            username: $username,
            message: $message,
            fields: $fields
        );
    }
}
