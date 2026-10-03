<?php

declare(strict_types=1);

namespace App\Services\Contracts;

/**
 * Shared normalization used by both report providers so the canonical report
 * shape is identical regardless of which LLM produced it.
 */
trait NormalizesReport
{
    protected function normalizeReport(?array $data, array $findings): ?array
    {
        if (! is_array($data)) {
            return null;
        }

        $severityCounts = [];
        foreach ($findings as $f) {
            $severityCounts[$f['severity']] = ($severityCounts[$f['severity']] ?? 0) + 1;
        }
        $maxSeverity = $this->maxSeverity($severityCounts);

        return [
            'executive_summary' => $data['executive_summary'] ?? 'No summary provided.',
            'overall_risk_score' => isset($data['overall_risk_score'])
                ? (int) $data['overall_risk_score']
                : $this->scoreFromSeverity($maxSeverity),
            'risk_level' => $data['risk_level'] ?? $maxSeverity,
            'prioritized_findings' => $data['prioritized_findings'] ?? [],
            'remediation_plan' => $data['remediation_plan'] ?? [],
            'methodology' => $data['methodology'] ?? 'Automated tool orchestration.',
            'finding_counts' => $severityCounts,
        ];
    }

    protected function maxSeverity(array $counts): string
    {
        foreach (['critical', 'high', 'medium', 'low', 'info'] as $sev) {
            if (! empty($counts[$sev])) {
                return $sev;
            }
        }
        return 'info';
    }

    protected function scoreFromSeverity(string $severity): int
    {
        return match ($severity) {
            'critical' => 90,
            'high' => 75,
            'medium' => 50,
            'low' => 25,
            default => 5,
        };
    }
}
