<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Enums\ToolName;
use App\Scanning\ToolRegistry;
use App\Scanning\ToolRunnerService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Lightweight, synchronous "quick scan": takes a target URL from the UI and
 * runs a fixed set of read-only recon tools against it, returning each
 * tool's raw output directly (no DB persistence, no queue).
 */
class QuickScanController extends Controller
{
    /**
     * Tools run for every quick scan, in display order.
     */
    protected const TOOLS = [
        ToolName::Whois,
        ToolName::Dig,
        ToolName::Sslscan,
        ToolName::Whatweb,
    ];

    public function index(): Response
    {
        return Inertia::render('QuickScan/Index');
    }

    public function run(Request $request, ToolRegistry $registry, ToolRunnerService $runner): JsonResponse
    {
        $validated = $request->validate([
            'target' => ['required', 'string', 'max:255'],
        ]);

        $target = $this->normalizeTarget($validated['target']);

        $tasks = [];
        foreach (self::TOOLS as $toolName) {
            $tool = $registry->get($toolName);
            if (! $toolName->isInstalled() || $tool === null) {
                continue;
            }

            $arg = $toolName->requiresUrl() ? $target : (parse_url($target, PHP_URL_HOST) ?: $target);
            $tasks[$toolName->value] = [
                'tool' => $toolName,
                'command' => $tool->buildCommand($arg),
            ];
        }

        $concurrentResults = $runner->runConcurrent($tasks);

        $results = [];
        foreach (self::TOOLS as $toolName) {
            if (! $toolName->isInstalled() || ! isset($tasks[$toolName->value])) {
                $results[] = [
                    'tool' => $toolName->value,
                    'label' => $toolName->label(),
                    'installed' => false,
                    'output' => "{$toolName->value} is not installed on this machine.",
                    'exit_code' => null,
                    'timed_out' => false,
                ];
                continue;
            }

            $result = $concurrentResults[$toolName->value] ?? null;

            $results[] = [
                'tool' => $toolName->value,
                'label' => $toolName->label(),
                'installed' => true,
                'output' => $result && $result->raw !== '' ? $result->raw : ($result?->error ?? '(no output)'),
                'exit_code' => $result?->exitCode ?? -1,
                'timed_out' => $result?->timedOut ?? false,
            ];
        }

        return response()->json([
            'target' => $target,
            'results' => $results,
        ]);
    }

    /**
     * Ensure the target has a scheme so URL-based tools receive a valid URL,
     * while host-only tools (whois, dig) extract the bare host themselves.
     */
    protected function normalizeTarget(string $target): string
    {
        $target = trim($target);

        if (! preg_match('#^https?://#i', $target)) {
            $target = 'https://' . $target;
        }

        return $target;
    }
}
