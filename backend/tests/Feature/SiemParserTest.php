<?php

namespace Tests\Feature;

use App\Siem\Parsers\ParserRegistry;
use Carbon\Carbon;
use Tests\TestCase;

class SiemParserTest extends TestCase
{
    public function test_ssh_auth_parser_detects_failed_password()
    {
        $raw = "Oct  2 14:03:11 web1 sshd[2211]: Failed password for invalid user admin from 203.0.113.50 port 51122 ssh2";
        
        $parser = ParserRegistry::getParser('auth');
        $event = $parser->parse($raw, Carbon::now());

        $this->assertEquals('ssh_auth_failed', $event->eventType);
        $this->assertEquals('admin', $event->username);
        $this->assertEquals('203.0.113.50', $event->srcIp);
        $this->assertEquals('51122', $event->fields['port']);
    }

    public function test_sudo_account_parser_detects_sudo_command()
    {
        $raw = "Oct  2 14:07:10 web1 sudo:   deploy : TTY=pts/0 ; PWD=/home/deploy ; USER=root ; COMMAND=/usr/bin/apt update";
        
        $parser = ParserRegistry::getParser('sudo');
        $event = $parser->parse($raw, Carbon::now());

        $this->assertEquals('sudo_command', $event->eventType);
        $this->assertEquals('deploy', $event->username);
        $this->assertEquals('root', $event->fields['target_user']);
        $this->assertEquals('/usr/bin/apt update', $event->fields['command']);
    }

    public function test_web_access_parser_extracts_sql_injection_attempt()
    {
        $raw = '203.0.113.50 - - [02/Oct/2026:14:08:01 +0000] "GET /index.php?id=1%20UNION%20SELECT%20null,version() HTTP/1.1" 200 512 "-" "sqlmap/1.7"';
        
        $parser = ParserRegistry::getParser('web_access');
        $event = $parser->parse($raw, Carbon::now());

        $this->assertEquals('web_access', $event->eventType);
        $this->assertEquals('203.0.113.50', $event->srcIp);
        $this->assertEquals('GET', $event->fields['method']);
        $this->assertEquals('/index.php?id=1%20UNION%20SELECT%20null,version()', $event->fields['path']);
        $this->assertEquals('200', $event->fields['status']);
        $this->assertEquals('sqlmap/1.7', $event->fields['user_agent']);
    }
}
