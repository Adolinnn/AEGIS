<?php

return [
    /*
    |--------------------------------------------------------------------------
    | SIEM Public URL
    |--------------------------------------------------------------------------
    |
    | The URL agents call. Defaults to APP_URL if not set.
    | Baked into every generated agent.
    |
    */
    'public_url' => env('SIEM_PUBLIC_URL', env('APP_URL')),

    /*
    |--------------------------------------------------------------------------
    | Retention settings
    |--------------------------------------------------------------------------
    */
    'retention_days' => env('SIEM_RETENTION_DAYS', 7),
    'alert_retention_days' => env('SIEM_ALERT_RETENTION_DAYS', 90),

    /*
    |--------------------------------------------------------------------------
    | Ingest limits
    |--------------------------------------------------------------------------
    */
    'max_batch_events' => env('SIEM_MAX_BATCH_EVENTS', 500),
    'max_body_kb' => env('SIEM_MAX_BODY_KB', 1024),
    'raw_max_chars' => env('SIEM_RAW_MAX_CHARS', 2000),

    /*
    |--------------------------------------------------------------------------
    | Agent settings
    |--------------------------------------------------------------------------
    */
    'offline_after_seconds' => env('SIEM_OFFLINE_AFTER_SECONDS', 180),
    'install_token_ttl_minutes' => env('SIEM_INSTALL_TOKEN_TTL_MINUTES', 60),
    'agent_version' => env('SIEM_AGENT_VERSION', '1.0.0'),
];
