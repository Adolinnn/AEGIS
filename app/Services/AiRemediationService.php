<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\Finding;
use App\Models\User;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Generates remediation guidance / code patches for a Finding via an LLM.
 * Operates on the unified Finding model.
 */
class AiRemediationService
{
    protected ?string $apiKey;
    protected string $model;
    protected int $timeout;
    protected string $baseUrl;
    protected ?string $referer;
    protected ?string $title;

    public function __construct()
    {
        $provider = config('services.llm.provider', 'openai');
        
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
        
        $this->timeout = 120;
        $this->baseUrl = config('services.llm.openrouter.base_url', 'https://openrouter.ai/api/v1');
        $this->referer = config('services.llm.openrouter.referer');
        $this->title = config('services.llm.openrouter.title');
    }

    /**
     * Use this user's own saved LLM API key (Profile > AI / LLM API Key)
     * instead of the server-wide key, when they have one set.
     */
    public function forUser(?User $user): static
    {
        if ($user && filled($user->llm_api_key)) {
            $this->apiKey = $user->llm_api_key;
        }

        return $this;
    }

    public function generatePatch(Finding $finding): ?string
    {
        if (! $this->apiKey) {
            Log::warning('LLM API key not configured, skipping AI remediation');
            return null;
        }

        try {
            $headers = [
                'Authorization' => "Bearer {$this->apiKey}",
                'Content-Type' => 'application/json',
            ];

            // Optional headers for OpenRouter analytics/attribution
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
                    'messages' => [
                        ['role' => 'system', 'content' => $this->getSystemPrompt()],
                        ['role' => 'user', 'content' => $this->buildPrompt($finding)],
                    ],
                    'temperature' => 0.2,
                    'max_tokens' => 2000,
                ]);

            if ($response->failed()) {
                Log::error('AI remediation API error', [
                    'status' => $response->status(),
                    'body' => $response->body(),
                ]);
                return null;
            }

            $content = $response->json('choices.0.message.content');

            if ($content) {
                $this->storeAnalysis($finding, $content);
                return $this->extractPatch($content);
            }

            return null;
        } catch (\Throwable $e) {
            Log::error('AI remediation failed', [
                'finding_id' => $finding->id,
                'error' => $e->getMessage(),
            ]);
            return null;
        }
    }

    protected function buildPrompt(Finding $finding): string
    {
        $target = $finding->target;
        $domain = $target->domain_url ?? 'unknown';
        $stackHints = $this->detectTechStack($domain);

        return <<<PROMPT
You are an expert application security engineer. Generate a precise, production-ready code patch to fix the following vulnerability.

**Vulnerability Details:**
- Type/Category: {$finding->category}
- Title: {$finding->title}
- Severity: {$finding->severity->label()}
- Target: {$domain}
- Description: {$finding->description}
- Evidence: {$finding->evidence}
- Existing recommendation: {$finding->recommendation}

**Detected Technology Stack:** {$stackHints}

**Requirements:**
1. Provide a complete, copy-pasteable code fix
2. Use the detected framework/language conventions
3. Include input validation AND output encoding where applicable
4. Add comments explaining the fix
5. If multiple files need changes, separate with clear file markers

**Output Format:**
\`\`\`language
// FILE: path/to/file.ext
// Description: What this file does and why it's being changed
code_here
\`\`\`

If framework cannot be determined, provide a generic PHP/Laravel middleware solution.
PROMPT;
    }

    protected function getSystemPrompt(): string
    {
        return <<<PROMPT
You are a senior application security engineer specializing in secure code remediation.
Your task is to generate precise, production-ready patches for vulnerabilities.

Guidelines:
- Always validate AND sanitize/encode input
- Use framework-native security features (Laravel: validate(), e(), @csrf, etc.)
- Prefer allowlist validation over blocklist
- Apply defense in depth (multiple layers)
- Include proper error handling
- Never suggest disabling security features
- Output ONLY the code patches in the specified format
PROMPT;
    }

    protected function detectTechStack(string $url): string
    {
        return 'Laravel (PHP), Node.js/Express, Python/Django, or generic - provide solutions for the most likely';
    }

    protected function extractPatch(string $content): string
    {
        if (preg_match_all('/```(?:php|javascript|python|typescript|html|nginx|apache)?\n(.*?)\n```/s', $content, $matches)) {
            return implode("\n\n", $matches[1]);
        }

        return $content;
    }

    protected function storeAnalysis(Finding $finding, string $analysis): void
    {
        $finding->update([
            'ai_patch_snippet' => $this->extractPatch($analysis),
            'ai_explanation' => $analysis,
        ]);
    }

    /**
     * Static remediation guidance keyed on the finding's category.
     *
     * @return array<string, array<int, string>>
     */
    public function getRemediationGuidance(Finding $finding): array
    {
        return match ($finding->category) {
            'xss' => $this->xssGuidance(),
            'sqli' => $this->sqliGuidance(),
            'ssrf' => $this->ssrfGuidance(),
            'misconfig' => $this->misconfigurationGuidance(),
            default => [],
        };
    }

    protected function xssGuidance(): array
    {
        return [
            'Immediate' => [
                'Implement output encoding for all user-controlled data in HTML contexts',
                "Use Laravel's {{ }} Blade syntax (auto-escapes) or e() helper",
                'Avoid {!! !!} raw output unless absolutely necessary and sanitized',
            ],
            'Validation' => [
                'Validate all input with strict rules (alpha, numeric, email, regex)',
                'Use Laravel Form Requests for centralized validation',
                'Implement Content-Security-Policy header as defense-in-depth',
            ],
        ];
    }

    protected function sqliGuidance(): array
    {
        return [
            'Immediate' => [
                'Use parameterized queries / prepared statements exclusively',
                'Never concatenate user input into SQL strings',
                'Use Laravel Eloquent ORM or Query Builder (automatically parameterized)',
            ],
            'Validation' => [
                'Validate input types strictly (integer, uuid, email, etc.)',
                'Implement allowlist for dynamic column/table names',
            ],
        ];
    }

    protected function ssrfGuidance(): array
    {
        return [
            'Immediate' => [
                'Validate and allowlist all outbound URLs',
                'Block internal ranges (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, 169.254.0.0/16, 127.0.0.0/8)',
                'Use a dedicated HTTP client with no-redirect for user-supplied URLs',
            ],
            'Validation' => [
                'Parse URL and verify scheme is http/https only',
                'Resolve DNS and check IP against blocklist before connecting',
            ],
        ];
    }

    protected function misconfigurationGuidance(): array
    {
        return [
            'Headers' => [
                'Content-Security-Policy: Start with report-only, then enforce',
                'Strict-Transport-Security: max-age=31536000; includeSubDomains; preload',
                'X-Frame-Options: DENY or SAMEORIGIN',
                'X-Content-Type-Options: nosniff',
                'Referrer-Policy: strict-origin-when-cross-origin',
            ],
            'Server' => [
                'Hide server version and remove X-Powered-By header',
                'Disable directory listing',
            ],
        ];
    }
}
