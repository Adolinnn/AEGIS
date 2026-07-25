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

        $results = [];

        foreach (self::TOOLS as $toolName) {
            $tool = $registry->get($toolName);

            if (! $toolName->isInstalled() || $tool === null) {
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

            $arg = $toolName->requiresUrl() ? $target : (parse_url($target, PHP_URL_HOST) ?: $target);
            $command = $tool->buildCommand($arg);

            $result = $runner->run($toolName, $command);

            $results[] = [
                'tool' => $toolName->value,
                'label' => $toolName->label(),
                'installed' => true,
                'output' => $result->raw !== '' ? $result->raw : '(no output)',
                'exit_code' => $result->exitCode,
                'timed_out' => $result->timedOut,
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
