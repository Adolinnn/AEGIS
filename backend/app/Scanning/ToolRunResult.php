<?php

declare(strict_types=1);

namespace App\Scanning;

/**
 * Result of executing a security tool binary.
 */
final class ToolRunResult
{
    public function __construct(
        public readonly string $raw,
        public readonly int $exitCode,
        public readonly bool $timedOut,
        public readonly ?string $error = null,
    ) {
    }

    public function successful(): bool
    {
        return $this->error === null && ! $this->timedOut;
    }

    public function failed(): bool
    {
        return ! $this->successful() && $this->raw !== '';
    }
}
