<?php

namespace App\Siem\Parsers;

class ParserRegistry
{
    protected static array $parsers = [
        'auth' => SshAuthParser::class,
        'syslog' => SyslogFallbackParser::class,
        'web_access' => WebAccessParser::class,
        'sudo' => SudoAccountParser::class,
        'agent' => AgentSyntheticParser::class,
        'fim' => FimParser::class,
    ];

    public static function getParser(string $source): \App\Siem\Contracts\ParserInterface
    {
        $class = self::$parsers[$source] ?? SyslogFallbackParser::class;
        return new $class();
    }
}
