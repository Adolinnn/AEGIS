<?php

declare(strict_types=1);

namespace App\Services;

use App\Enums\TargetStatus;
use App\Models\ScanRun;
use App\Models\Target;
use App\Models\User;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Backend for the AI chat sidebar. Reuses the same provider/config pattern
 * as AiRemediationService, but drives a proper OpenAI-style tool-calling
 * loop so the assistant can read the user's targets/scan results and create
 * new targets on request, instead of only summarizing text handed to it.
 */
class ChatService
{
    protected ?string $apiKey;
    protected string $model;
    protected int $timeout;
    protected ?string $baseUrl;
    protected ?string $referer;
    protected ?string $title;

    public function __construct()
    {
        $this->configureForProvider(config('services.llm.provider', 'openai'));
    }

    protected function configureForProvider(string $provider): void
    {
        $this->apiKey = match ($provider) {
            'openrouter' => config('services.llm.openrouter.key') ?? env('OPENROUTER_API_KEY'),
            'anthropic' => config('services.llm.anthropic.key') ?? env('ANTHROPIC_API_KEY'),
            default => config('services.llm.openai.key') ?? env('OPENAI_API_KEY'),
        };

        $this->model = match ($provider) {
            'openrouter' => config('services.llm.openrouter.model', 'anthropic/claude-3.5-sonnet'),
            'anthropic' => config('services.llm.anthropic.model', 'claude-sonnet-4-5'),
            default => config('services.llm.openai.model', 'gpt-4o-mini'),
        };

        $this->timeout = 60;
        $this->baseUrl = match ($provider) {
            'openrouter' => config('services.llm.openrouter.base_url', 'https://openrouter.ai/api/v1'),
            'anthropic' => null, // Anthropic's Messages API isn't OpenAI-tool-call compatible; chat isn't wired for it (see reply()).
            default => config('services.llm.openai.base_url', 'https://api.openai.com/v1'),
        };
        $this->referer = config('services.llm.openrouter.referer');
        $this->title = config('services.llm.openrouter.title');
    }

    /**
     * Fully re-resolve provider/key/base URL/model from this user's own
     * Profile > AI settings when they've set a provider, instead of only
     * overriding the API key on top of the server's fixed provider. This is
     * what lets a user point the chat sidebar at their own OpenRouter/OpenAI
     * account (with their own base URL and model) independent of the
     * server-wide LLM_PROVIDER.
     */
    public function forUser(?User $user): static
    {
        if (! $user) {
            return $this;
        }

        if (filled($user->llm_provider)) {
            $this->configureForProvider($user->llm_provider);
        }
        if (filled($user->llm_api_key)) {
            $this->apiKey = $user->llm_api_key;
        }
        if (filled($user->llm_base_url)) {
            $this->baseUrl = rtrim($user->llm_base_url, '/');
        }
        if (filled($user->llm_model)) {
            $this->model = $user->llm_model;
        }

        return $this;
    }

    /**
     * @param  array<int, array{role:string, content:string}>  $history  prior turns, oldest first (frontend keeps the transcript, stateless server)
     * @param  array{target_id?:int, scan_run_id?:int}  $pageContext  what the user is currently looking at, so "this target" / "this scan" resolve without them typing an id
     */
    public function reply(User $user, array $history, array $pageContext = []): array
    {
        if (! $this->apiKey) {
            return [
                'reply' => null,
                'error' => 'No LLM API key configured. Set LLM_PROVIDER and the matching *_API_KEY in .env, or add a personal key in Profile settings.',
            ];
        }

        if (! $this->baseUrl) {
            // Anthropic native API uses a different shape; not wired for chat yet.
            return [
                'reply' => null,
                'error' => 'Chat is currently only wired for OpenAI/OpenRouter-compatible providers. Switch LLM_PROVIDER to "openai" or "openrouter" to use the chat sidebar.',
            ];
        }

        $messages = array_merge(
            [['role' => 'system', 'content' => $this->systemPrompt($user, $pageContext)]],
            $this->sanitizeHistory($history),
        );

        $toolLog = [];

        // Function-calling loop: give the model up to 4 round trips to call
        // tools before forcing a final text answer, so it can chain e.g.
        // "look up the target" -> "look up its scan results" -> answer.
        for ($round = 0; $round < 4; $round++) {
            $response = $this->call($messages);

            if ($response === null) {
                return ['reply' => null, 'error' => 'The AI provider request failed. Check application logs for details.', 'tool_log' => $toolLog];
            }

            $choice = $response['choices'][0]['message'] ?? null;
            if (! $choice) {
                return ['reply' => null, 'error' => 'The AI provider returned an unexpected response.', 'tool_log' => $toolLog];
            }

            $toolCalls = $choice['tool_calls'] ?? null;

            if (! $toolCalls) {
                return [
                    'reply' => $choice['content'] ?? '(empty response)',
                    'error' => null,
                    'tool_log' => $toolLog,
                ];
            }

            // Model wants to call tools: append its tool_calls message, then
            // execute each tool and append the results, and loop again.
            $messages[] = $choice;

            foreach ($toolCalls as $call) {
                $name = $call['function']['name'] ?? '';
                $args = json_decode($call['function']['arguments'] ?? '{}', true) ?: [];
                $result = $this->executeTool($user, $name, $args, $pageContext);
                $toolLog[] = ['tool' => $name, 'args' => $args, 'result_summary' => is_string($result) ? $result : json_encode($result)];

                $messages[] = [
                    'role' => 'tool',
                    'tool_call_id' => $call['id'] ?? '',
                    'content' => is_string($result) ? $result : json_encode($result),
                ];
            }
        }

        return ['reply' => null, 'error' => 'The assistant made too many tool calls without answering. Try rephrasing.', 'tool_log' => $toolLog];
    }

    protected function call(array $messages): ?array
    {
        try {
            $headers = [
                'Authorization' => "Bearer {$this->apiKey}",
                'Content-Type' => 'application/json',
            ];
            if ($this->referer) {
                $headers['HTTP-Referer'] = $this->referer;
            }
            if ($this->title) {
                $headers['X-Title'] = $this->title;
            }

            $response = Http::timeout($this->timeout)
                ->withHeaders($headers)
                ->post($this->baseUrl . '/chat/completions', [
                    'model' => $this->model,
                    'messages' => $messages,
                    'tools' => $this->toolSchema(),
                    'temperature' => 0.3,
                    'max_tokens' => 1500,
                ]);

            if ($response->failed()) {
                Log::error('Chat AI provider error', ['status' => $response->status(), 'body' => $response->body()]);
                return null;
            }

            return $response->json();
        } catch (\Throwable $e) {
            Log::error('Chat AI provider exception', ['error' => $e->getMessage()]);
            return null;
        }
    }

    /**
     * @param  array<int, array{role:string, content:string}>  $history
     */
    protected function sanitizeHistory(array $history): array
    {
        return collect($history)
            ->filter(fn ($m) => in_array($m['role'] ?? '', ['user', 'assistant'], true) && filled($m['content'] ?? null))
            ->map(fn ($m) => ['role' => $m['role'], 'content' => (string) $m['content']])
            ->values()
            ->take(-20) // keep the request small; frontend keeps the full transcript for display
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

    /**
     * OpenAI-style tool schema (also understood by OpenRouter's OpenAI-compatible endpoint).
     */
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
