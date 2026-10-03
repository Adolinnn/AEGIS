<?php

namespace App\Siem\Parsers;

use App\Siem\Contracts\ParserInterface;
use App\Siem\NormalizedEvent;
use Carbon\Carbon;

class SshAuthParser implements ParserInterface
{
    public function parse(string $raw, Carbon $receivedAt): NormalizedEvent
    {
        // Sample: Oct  2 14:03:11 web1 sshd[2211]: Failed password for invalid user admin from 203.0.113.50 port 51122 ssh2
        
        $eventType = 'auth_unknown';
        $username = null;
        $srcIp = null;
        $fields = [];
        $message = $raw;
        
        // Strip out the syslog prefix up to sshd[...] or sshd-session[...]
        if (preg_match('/sshd(?:-session)?\[\d+\]:\s*(.*)/', $raw, $matches)) {
            $message = $matches[1];
        }

        if (preg_match('/Failed password for (?:invalid user )?(\S+) from (\S+) port (\d+)/', $message, $m)) {
            $eventType = 'ssh_auth_failed';
            $username = $m[1];
            $srcIp = $m[2];
            $fields['port'] = $m[3];
        } elseif (preg_match('/Accepted (password|publickey) for (\S+) from (\S+) port (\d+)/', $message, $m)) {
            $eventType = 'ssh_auth_success';
            $fields['method'] = $m[1];
            $username = $m[2];
            $srcIp = $m[3];
            $fields['port'] = $m[4];
        } elseif (preg_match('/Invalid user (\S+) from (\S+)/', $message, $m)) {
            $eventType = 'ssh_auth_invalid_user';
            $username = $m[1];
            $srcIp = $m[2];
        } elseif (preg_match('/Disconnected from (?:invalid user )?(\S+) (\S+) port (\d+)/', $message, $m)) {
            $eventType = 'ssh_disconnect';
            $username = $m[1];
            $srcIp = $m[2];
            $fields['port'] = $m[3];
        } elseif (str_contains($message, 'maximum authentication attempts exceeded')) {
            $eventType = 'ssh_max_attempts';
            if (preg_match('/for (\S+) from (\S+) port (\d+)/', $message, $m)) {
                $username = $m[1];
                $srcIp = $m[2];
                $fields['port'] = $m[3];
            }
        }

        return new NormalizedEvent(
            eventType: $eventType,
            srcIp: $srcIp,
            username: $username,
            message: $message,
            fields: $fields
        );
    }
}
