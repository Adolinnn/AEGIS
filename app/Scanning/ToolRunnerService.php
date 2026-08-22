<?php

declare(strict_types=1);

namespace App\Scanning;

use App\Enums\ToolName;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Process;

/**
 * Executes security tool commands via the Process facade. Commands are passed
 * as argument arrays (never interpolated into a shell string) so user-supplied
 * targets cannot inject additional commands. Output is capped to protect the
 * worker from runaway tools.
 */
class ToolRunnerService
{
    /**
     * Run a tool's command and capture its output.
     *
     * @param  array<int, string>  $command
     * @param  int|null  $timeout       Per-run override (seconds).
     * @param  int|null  $idleTimeout   Per-run override (seconds of no output).
     * @param  int  $outputCapKb        Max captured output in kilobytes.
     * @param  (callable(string): void)|null  $onOutput  Invoked with the
     *         accumulated output every time a new chunk arrives, so callers
     *         can persist a live tail while the process is still running.
     */
    public function run(
        ToolName $tool,
        array $command,
        ?int $timeout = null,
        ?int $idleTimeout = null,
        int $outputCapKb = 4096,
        ?callable $onOutput = null,
    ): ToolRunResult {
        $timeout = $timeout ?? $tool->timeout();
        $idleTimeout = $idleTimeout ?? $tool->idleTimeout();

        try {
            $buffer = '';
            $lastFlush = 0.0;

            $process = Process::timeout($timeout)
                ->idleTimeout($idleTimeout)
                ->run($command, function (string $type, string $chunk) use (&$buffer, &$lastFlush, $onOutput, $outputCapKb) {
                    $buffer .= $chunk;

                    if ($onOutput === null) {
                        return;
                    }

                    // Throttle DB writes to ~4/sec so a chatty tool doesn't
                    // hammer the database, while still feeling "live".
                    $now = microtime(true);
                    if ($now - $lastFlush < 0.25) {
                        return;
                    }
                    $lastFlush = $now;

                    $onOutput($this->cap($buffer, $outputCapKb));
                });

            $raw = $this->cap($process->output() . $process->errorOutput(), $outputCapKb);

            // Final flush so the terminal shows every last byte, even if it
            // arrived within the throttle window above.
            if ($onOutput !== null) {
                $onOutput($raw);
            }

            return new ToolRunResult(
                raw: $raw,
                exitCode: $process->exitCode() ?? -1,
                timedOut: false,
                error: $process->failed() && $process->exitCode() === null
                    ? 'Process failed without exit code'
                    : null,
            );
        } catch (\Illuminate\Process\Exceptions\ProcessTimedOutException $e) {
            Log::warning('Tool execution timed out', [
                'tool' => $tool->value,
                'timeout' => $timeout,
            ]);

            return new ToolRunResult(
                raw: $this->cap($e->result->output() . $e->result->errorOutput(), $outputCapKb),
                exitCode: -1,
                timedOut: true,
                error: 'Execution timed out after ' . $timeout . 's',
            );
        } catch (\Throwable $e) {
            Log::error('Tool execution failed', [
                'tool' => $tool->value,
                'error' => $e->getMessage(),
            ]);

            return new ToolRunResult(
                raw: '',
                exitCode: -1,
                timedOut: false,
                error: $e->getMessage(),
            );
        }
    }

    /**
     * Strip ANSI escape/color codes (from tools like wpscan/sslscan that
     * colorize output even when not attached to a TTY) and cap the result so
     * a verbose tool cannot exhaust memory or the database text column.
     */
    protected function cap(string $raw, int $outputCapKb): string
    {
        $raw = $this->stripAnsi($raw);

        $maxBytes = $outputCapKb * 1024;
        if (strlen($raw) <= $maxBytes) {
            return $raw;
        }

        return substr($raw, 0, $maxBytes)
            . "\n... [output truncated to {$outputCapKb}KB]";
    }

    /**
     * Remove ANSI escape sequences (color codes, cursor movement, etc.) so
     * captured tool output is plain, readable text in the UI terminal.
     */
    protected function stripAnsi(string $raw): string
    {
        // CSI sequences (colors, cursor moves): ESC [ ... letter
        $raw = preg_replace('/\x1B\[[0-9;?]*[a-zA-Z]/', '', $raw) ?? $raw;
        // OSC sequences (e.g. terminal title): ESC ] ... BEL or ESC \
        $raw = preg_replace('/\x1B\][^\x07\x1B]*(\x07|\x1B\\\\)/', '', $raw) ?? $raw;
        // Any other stray escape + single char
        $raw = preg_replace('/\x1B./', '', $raw) ?? $raw;
        // Carriage-return progress-bar overwrites collapse to newlines
        $raw = str_replace("\r", "\n", $raw);

        return $raw;
    }
}
