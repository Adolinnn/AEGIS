<?php

declare(strict_types=1);

namespace App\Scanning;

use App\Enums\ScanRunStatus;

/**
 * Value object summarizing a completed scan run.
 */
class ScanEngineResult
{
    public function __construct(
        public readonly int $scanRunId,
        public readonly ScanRunStatus $status,
        public readonly int $toolsRun,
        public readonly int $toolsFailed,
        public readonly int $findingsTotal,
        public readonly array $findingsBySeverity = [],
        public readonly ?string $error = null,
    ) {}

    public function isSuccess(): bool
    {
        return $this->status === ScanRunStatus::Completed;
    }
}
