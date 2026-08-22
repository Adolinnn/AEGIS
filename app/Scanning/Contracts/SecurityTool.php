<?php

declare(strict_types=1);

namespace App\Scanning\Contracts;

use App\Enums\ToolName;
use App\Scanning\NormalizedFinding;

/**
 * Contract for an orchestrated security tool. Implementations are responsible
 * for building a safe argument list (NO shell string interpolation — the
 * Process facade runs the argument array directly) and for parsing raw tool
 * output into NormalizedFinding objects.
 */
interface SecurityTool
{
    /**
     * Which tool this adapter represents.
     */
    public function name(): ToolName;

    /**
     * Build the command as a flat argument array for Process::command().
     * The returned array MUST NOT be joined into a shell string. Arguments
     * are passed positionally to the binary, preventing injection.
     *
     * @param  string  $target  A host (for nmap) or full URL (for web tools).
     * @param  array<string, mixed>  $options  Tool-specific options (wordlist, depth, etc.).
     * @return array<int, string>
     */
    public function buildCommand(string $target, array $options = []): array;

    /**
     * Parse raw tool output into normalized findings. Pure function — no
     * binary execution — so it can be unit tested with captured output.
     *
     * @return NormalizedFinding[]
     */
    public function parseOutput(string $raw, int $exitCode): array;
}
