<?php

declare(strict_types=1);

/*
|--------------------------------------------------------------------------
| Security Tool Orchestration
|--------------------------------------------------------------------------
|
| Configuration for the real security CLI tools Aegis orchestrates against
| targets. Binary paths are env-overridable; when not set, the tool layer
| auto-detects the binary via `command -v` on the host. Only tools whose
| binary is present are offered/run.
|
*/

return [

    /*
    |--------------------------------------------------------------------------
    | Default tool binary paths (auto-detected when null)
    |--------------------------------------------------------------------------
    |
    | Set an absolute path via env to pin a specific binary, e.g. when tools
    | are installed inside a Docker image at a known location.
    */
    'tools' => [
        'nmap' => [
            'binary' => env('NMAP_BINARY'),
            'timeout' => env('NMAP_TIMEOUT', 120),
            'idle_timeout' => env('NMAP_IDLE_TIMEOUT', 30),
            'output_cap_kb' => 2048,
        ],
        'nikto' => [
            'binary' => env('NIKTO_BINARY'),
            'timeout' => env('NIKTO_TIMEOUT', 180),
            'idle_timeout' => env('NIKTO_IDLE_TIMEOUT', 30),
            'output_cap_kb' => 2048,
        ],
        'wpscan' => [
            'binary' => env('WPSCAN_BINARY'),
            'timeout' => env('WPSCAN_TIMEOUT', 300),
            'idle_timeout' => env('WPSCAN_IDLE_TIMEOUT', 60),
            'output_cap_kb' => 4096,
        ],
        'gobuster' => [
            'binary' => env('GOBUSTER_BINARY'),
            'timeout' => env('GOBUSTER_TIMEOUT', 300),
            'idle_timeout' => env('GOBUSTER_IDLE_TIMEOUT', 30),
            'output_cap_kb' => 4096,
            'wordlist' => env('GOBUSTER_WORDLIST', '/usr/share/wordlists/dirb/common.txt'),
        ],
        'sqlmap' => [
            'binary' => env('SQLMAP_BINARY'),
            'timeout' => env('SQLMAP_TIMEOUT', 300),
            'idle_timeout' => env('SQLMAP_IDLE_TIMEOUT', 60),
            'output_cap_kb' => 4096,
        ],
        'whois' => [
            'binary' => env('WHOIS_BINARY'),
            'timeout' => env('WHOIS_TIMEOUT', 30),
            'idle_timeout' => env('WHOIS_IDLE_TIMEOUT', 15),
            'output_cap_kb' => 512,
        ],
        'dig' => [
            'binary' => env('DIG_BINARY'),
            'timeout' => env('DIG_TIMEOUT', 30),
            'idle_timeout' => env('DIG_IDLE_TIMEOUT', 15),
            'output_cap_kb' => 512,
        ],
        'sslscan' => [
            'binary' => env('SSLSCAN_BINARY'),
            'timeout' => env('SSLSCAN_TIMEOUT', 60),
            'idle_timeout' => env('SSLSCAN_IDLE_TIMEOUT', 30),
            'output_cap_kb' => 1024,
        ],
        'whatweb' => [
            'binary' => env('WHATWEB_BINARY'),
            'timeout' => env('WHATWEB_TIMEOUT', 60),
            'idle_timeout' => env('WHATWEB_IDLE_TIMEOUT', 30),
            'output_cap_kb' => 1024,
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | Execution
    |--------------------------------------------------------------------------
    */
    'concurrency' => env('SCAN_CONCURRENCY', 2),

    /*
    |--------------------------------------------------------------------------
    | Authorization
    |--------------------------------------------------------------------------
    |
    | The exact text a user must attest to before a tool scan may run against
    | a target. Running network scanners against hosts you do not own is
    | legally risky; this attestation is recorded on each scan run.
    */
    'consent_text' => env(
        'SCAN_CONSENT_TEXT',
        'I confirm I own or am explicitly authorized to perform security scanning against this target.'
    ),

];
