<?php

declare(strict_types=1);

namespace App\Scanning;

use App\Enums\ToolName;
use App\Enums\VulnerabilitySeverity;

/**
 * Immutable value object describing a single result produced by a security
 * tool. Tools return an array of these from parseOutput(); the pipeline maps
 * them into persisted Finding rows. Keeping this as a plain DTO means parsers
 * are pure and unit-testable without executing the underlying binary.
 */
final class NormalizedFinding
{
    /**
     * @param  ToolName  $tool
     * @param  string  $title         Short human-readable finding name.
     * @param  string  $category      Logical grouping (e.g. "open-port", "cve", "exposed-path").
     * @param  VulnerabilitySeverity  $severity
     * @param  string  $description   What was observed.
     * @param  string|null  $evidence Raw supporting detail (port, payload, path, etc.).
     * @param  string|null  $recommendation Suggested remediation.
     */
    public function __construct(
        public readonly ToolName $tool,
        public readonly string $title,
        public readonly string $category,
        public readonly VulnerabilitySeverity $severity,
        public readonly string $description,
        public readonly ?string $evidence = null,
        public readonly ?string $recommendation = null,
    ) {
    }

    /**
     * @return array{tool: string, title: string, category: string, severity: string, description: string, evidence: ?string, recommendation: ?string}
     */
    public function toArray(): array
    {
        return [
            'tool' => $this->tool->value,
            'title' => $this->title,
            'category' => $this->category,
            'severity' => $this->severity->value,
            'description' => $this->description,
            'evidence' => $this->evidence,
            'recommendation' => $this->recommendation,
        ];
    }
}
