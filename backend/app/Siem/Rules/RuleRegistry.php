<?php

namespace App\Siem\Rules;

class RuleRegistry
{
    protected static array $rules = [
        'ssh_bruteforce' => SshBruteForceRule::class,
        'ssh_success_after_failures' => SshSuccessAfterFailuresRule::class,
        'web_scanner_ua' => WebScannerUaRule::class,
        'web_sqli' => WebSqliRule::class,
        'agent_offline' => AgentOfflineRule::class,
        'fim_malicious_file' => VirusTotalRule::class,
    ];

    /**
     * @return \App\Siem\Contracts\DetectionRule[]
     */
    public static function all(): array
    {
        $instances = [];
        foreach (self::$rules as $key => $class) {
            $instances[$key] = new $class();
        }
        return $instances;
    }

    public static function get(string $key): ?\App\Siem\Contracts\DetectionRule
    {
        if (!isset(self::$rules[$key])) return null;
        $class = self::$rules[$key];
        return new $class();
    }
}
