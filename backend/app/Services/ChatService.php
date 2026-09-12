<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\ScanRun;
use App\Models\Target;
use App\Models\User;
use App\Services\Llm\LlmGatewayInterface;
use App\Services\Llm\LlmRequest;

/**
 * Backend for the AI chat sidebar. Delegates LLM networking and tool loops
 * to the deep LlmGateway while providing Aegis-specific security tools and context.
 */
class ChatService
{
    protected ?User $userOverride = null;

    public function __construct(
        protected LlmGatewayInterface $gateway
    ) {}

    /**
     * Re-resolve provider/key settings for a specific user if needed.
     */
    public function forUser(?User $user): static
    {
        $clone = clone $this;
        $clone->userOverride = $user;
        return $clone;
    }

    /**
     * @param array<int, array{role:string, content:string}> $history
     * @param array{target_id?:int, scan_run_id?:int} $pageContext
     */
    public function reply(User $user, array $history, array $pageContext = []): array
    {
        $effectiveUser = $this->userOverride ?? $user;

        $messages = array_merge(
            [['role' => 'system', 'content' => $this->systemPrompt($effectiveUser, $pageContext)]],
            $this->sanitizeHistory($history)
        );

        $request = LlmRequest::make()
            ->forUser($effectiveUser)
            ->withTemperature(0.3)
            ->withMaxTokens(1500)
            ->withTimeout(60)
            ->withMessages($messages)
            ->withTools(
                $this->toolSchema(),
                fn (string $name, array $args) => $this->executeTool($effectiveUser, $name, $args, $pageContext)
            );

        $response = $this->gateway->send($request);

        if ($response->isError()) {
            return [
                'reply' => null,
                'error' => $response->error(),
                'tool_log' => $response->toolCalls(),
            ];
        }

        return [
            'reply' => $response->text() ?: '(empty response)',
            'error' => null,
            'tool_log' => $response->toolCalls(),
        ];
    }

    /**
     * @param array<int, array{role:string, content:string}> $history
     */
    protected function sanitizeHistory(array $history): array
    {
        return collect($history)
            ->filter(fn ($m) => in_array($m['role'] ?? '', ['user', 'assistant'], true) && filled($m['content'] ?? null))
            ->map(fn ($m) => ['role' => $m['role'], 'content' => (string) $m['content']])
            ->values()
            ->take(-20)
            ->all();
    }

    protected function systemPrompt(User $user, array $pageContext): string
    {
        $targets = $user->targets()->orderByDesc('id')->limit(20)->get(['id', 'domain_url', 'display_name', 'is_authorized']);
        $targetList = $targets->isEmpty()
            ? '(none yet)'
            : $targets->map(fn ($t) => "#{$t->id} {$t->domain_url}" . ($t->is_authorized ? '' : ' [NOT AUTHORIZED]'))->implode(', ');

        $context = '';
        if (! empty($pageContext['target_id'])) {
            $context .= "\nThe user is currently viewing target #{$pageContext['target_id']}.";
        }
        if (! empty($pageContext['scan_run_id'])) {
            $context .= "\nThe user is currently viewing scan run #{$pageContext['scan_run_id']}.";
        }

        return <<<PROMPT
You are the AI assistant embedded in Aegis, a security scanning platform. You help {$user->name} understand
vulnerabilities found by scans, and can act on their behalf using the tools provided.

Their targets (id + domain): {$targetList}
{$context}

Rules:
- Use the get_scan_results / get_target tools to look up real data before answering questions about specific findings, risk, or scan status — never invent findings.
- Use add_target when the user asks you to add/create a new target. Always create it with authorization=false (the user must explicitly authorize it themselves in the UI afterward) unless they clearly state in their message that they own/are authorized to test that domain, in which case pass their stated authorization through — never assume authorization silently.
- Keep answers concise and technical. When discussing a vulnerability, explain impact and a concrete remediation step.
- If asked something outside security/this app's data, answer briefly and steer back.
PROMPT;
    }

    protected function toolSchema(): array
    {
        return [
            [
                'type' => 'function',
                'function' => [
                    'name' => 'list_targets',
                    'description' => "List the user's targets with id, domain, authorization and last scan status.",
                    'parameters' => ['type' => 'object', 'properties' => new \stdClass(), 'required' => []],
                ],
            ],
            [
                'type' => 'function',
                'function' => [
                    'name' => 'get_target',
                    'description' => 'Get details for one target by id, including its most recent scan runs.',
                    'parameters' => [
                        'type' => 'object',
                        'properties' => ['target_id' => ['type' => 'integer']],
                        'required' => ['target_id'],
                    ],
                ],
            ],
            [
                'type' => 'function',
                'function' => [
                    'name' => 'get_scan_results',
                    'description' => 'Get findings (vulnerabilities) for a specific scan run by id.',
                    'parameters' => [
                        'type' => 'object',
                        'properties' => ['scan_run_id' => ['type' => 'integer']],
                        'required' => ['scan_run_id'],
                    ],
                ],
            ],
            [
                'type' => 'function',
                'function' => [
                    'name' => 'add_target',
                    'description' => 'Create a new scan target for the user.',
                    'parameters' => [
                        'type' => 'object',
                        'properties' => [
                            'domain_url' => ['type' => 'string', 'description' => 'e.g. https://example.com'],
                            'display_name' => ['type' => 'string'],
                            'authorized' => ['type' => 'boolean', 'description' => 'Only true if the user explicitly stated they own/are authorized to test this domain.'],
                        ],
                        'required' => ['domain_url'],
                    ],
                ],
            ],
        ];
    }

    protected function executeTool(User $user, string $name, array $args, array $pageContext): array|string
    {
        return match ($name) {
            'list_targets' => $user->targets()->orderByDesc('id')->get(['id', 'domain_url', 'display_name', 'is_authorized', 'last_scanned_at'])->toArray(),

            'get_target' => (function () use ($user, $args, $pageContext) {
                $id = $args['target_id'] ?? $pageContext['target_id'] ?? null;
                $target = $id ? $user->targets()->with(['scanRuns' => fn ($q) => $q->latest()->limit(5)])->find($id) : null;
                if (! $target) {
                    return 'Target not found or not owned by this user.';
                }
                return [
                    'id' => $target->id,
                    'domain_url' => $target->domain_url,
                    'display_name' => $target->display_name,
                    'is_authorized' => $target->is_authorized,
                    'recent_scan_runs' => $target->scanRuns->map(fn ($r) => [
                        'id' => $r->id, 'status' => $r->status->value, 'finished_at' => $r->finished_at,
                    ]),
                ];
            })(),

            'get_scan_results' => (function () use ($user, $args, $pageContext) {
                $id = $args['scan_run_id'] ?? $pageContext['scan_run_id'] ?? null;
                $run = $id ? ScanRun::where('user_id', $user->id)->with('findings', 'target')->find($id) : null;
                if (! $run) {
                    return 'Scan run not found or not owned by this user.';
                }
                return [
                    'scan_run_id' => $run->id,
                    'target' => $run->target->domain_url,
                    'status' => $run->status->value,
                    'findings' => $run->findings->map(fn ($f) => [
                        'severity' => $f->severity->value,
                        'title' => $f->title,
                        'category' => $f->category,
                        'description' => $f->description,
                        'recommendation' => $f->recommendation,
                    ]),
                ];
            })(),

            'add_target' => (function () use ($user, $args) {
                if ($user->targets()->count() >= $user->maxTargets()) {
                    return "Cannot add target: user has reached their plan's target limit ({$user->maxTargets()}).";
                }
                if (empty($args['domain_url'])) {
                    return 'domain_url is required.';
                }
                $target = Target::create([
                    'user_id' => $user->id,
                    'domain_url' => $args['domain_url'],
                    'display_name' => $args['display_name'] ?? null,
                    'is_active' => true,
                    'is_authorized' => (bool) ($args['authorized'] ?? false),
                    'uptime_check_interval_minutes' => 5,
                    'scan_config' => [
                        'scan_types' => ['xss', 'sqli', 'ssrf', 'misconfiguration'],
                        'custom_headers' => [],
                        'follow_redirects' => true,
                        'timeout_seconds' => 10,
                    ],
                ]);
                return [
                    'created' => true,
                    'target_id' => $target->id,
                    'domain_url' => $target->domain_url,
                    'is_authorized' => $target->is_authorized,
                    'note' => $target->is_authorized ? null : 'Created as NOT authorized — the user must confirm authorization in the Targets UI before it can be scanned.',
                ];
            })(),

            default => "Unknown tool: {$name}",
        };
    }
}
