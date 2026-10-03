<?php

declare(strict_types=1);

namespace App\Scanning\Tools;

use App\Enums\ToolName;
use App\Scanning\Contracts\SecurityTool;

/**
 * Adapter for `dig`. Queries common DNS record types for a domain and
 * returns raw output for display.
 */
class DigTool implements SecurityTool
{
    public function name(): ToolName
    {
        return ToolName::Dig;
    }

    public function buildCommand(string $target, array $options = []): array
    {
        $host = parse_url($target, PHP_URL_HOST) ?: $target;

        return array_filter([$this->binary(), $host, 'ANY', '+noall', '+answer']);
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
