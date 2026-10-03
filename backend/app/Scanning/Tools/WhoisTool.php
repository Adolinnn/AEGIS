<?php

declare(strict_types=1);

namespace App\Scanning\Tools;

use App\Enums\ToolName;
use App\Scanning\Contracts\SecurityTool;

/**
 * Adapter for `whois`. Returns raw registration/ownership text for a domain.
 * No structured findings are produced — the quick-scan UI displays the raw
 * output directly.
 */
class WhoisTool implements SecurityTool
{
    public function name(): ToolName
    {
        return ToolName::Whois;
    }

    public function buildCommand(string $target, array $options = []): array
    {
        $host = parse_url($target, PHP_URL_HOST) ?: $target;

        return array_filter([$this->binary(), $host]);
    }

    public function parseOutput(string $raw, int $exitCode): array
    {
        return [];
    }

    protected function binary(): ?string
    {
        return $this->name()->binary();
    }
}
