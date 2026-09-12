<?php

declare(strict_types=1);

namespace App\Scanning\Tools;

use App\Enums\ToolName;
use App\Models\Target;
use App\Scanning\Contracts\SecurityTool;
use App\Scanning\NormalizedFinding;
use App\Services\ScannerService;

/**
 * Adapter for in-process HTTP vulnerability checks (XSS, SQLi, SSRF, misconfigurations).
 * Implements SecurityTool so built-in checks adhere to the exact same adapter seam
 * as external CLI tools in ScanEngine and ToolRegistry.
 */
class BuiltinTool implements SecurityTool
{
    public function __construct(
        protected ScannerService $scanner
    ) {}

    public function name(): ToolName
    {
        return ToolName::Builtin;
    }

    public function buildCommand(string $target, array $options = []): array
    {
        $checks = $options['checks'] ?? 'xss, sqli, ssrf, misconfiguration';
        $checksLabel = is_array($checks) ? implode(', ', $checks) : (string) $checks;

        return ['(built-in checks: ' . $checksLabel . ')', $target];
    }

    public function parseOutput(string $raw, int $exitCode): array
    {
        return [];
    }

    /**
     * Execute the in-process HTTP checks against a target and format the console log output.
     *
     * @param  array<int, string|\App\Enums\ScanType>  $checkTypes
     * @return array{output: string, findings: NormalizedFinding[], exitCode: int}
     */
    public function execute(Target $target, array $checkTypes = []): array
    {
        $findings = $this->scanner->runChecks($target, $checkTypes);
        $checks = 'xss, sqli, ssrf, misconfiguration';

        $lines = ["Ran built-in HTTP checks ({$checks}) against {$target->domain_url}", ''];
        if (count($findings) === 0) {
            $lines[] = 'No issues detected by the built-in checks.';
        } else {
            foreach ($findings as $f) {
                $lines[] = "[{$f->severity->value}] {$f->category}: {$f->title}";
                if ($f->evidence) {
                    $lines[] = "    evidence: {$f->evidence}";
                }
            }
        }

        return [
            'output' => implode("\n", $lines),
            'findings' => $findings,
            'exitCode' => 0,
        ];
    }
}
