<?php

declare(strict_types=1);

namespace App\Services\Providers;

use App\Models\Target;
use App\Models\User;
use App\Services\Contracts\NormalizesReport;
use App\Services\Contracts\ReportProvider;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * OpenRouter report provider. Uses the OpenAI-compatible API format.
 * Supports any model available on OpenRouter (Claude, GPT, Llama, etc.)
 */
class OpenRouterReportProvider implements ReportProvider
{
    use NormalizesReport;
    protected ?string $key;
    protected string $model;
    protected int $timeout;
    protected string $baseUrl;
    protected ?string $referer;
    protected ?string $title;

    public function __construct()
    {
        $this->key = config('services.llm.openrouter.key') ?? env('OPENROUTER_API_KEY');
        $this->model = config('services.llm.openrouter.model', 'anthropic/claude-3.5-sonnet');
        $this->timeout = (int) config('services.llm.openrouter.timeout', 120);
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
        if (! $user) {
            return $this;
        }
        if (filled($user->llm_api_key)) {
            $this->key = $user->llm_api_key;
        }
        if (filled($user->llm_base_url)) {
            $this->baseUrl = rtrim($user->llm_base_url, '/');
        }
        if (filled($user->llm_model)) {
            $this->model = $user->llm_model;
        }

        return $this;
    }

    public function generate(array $findings, Target $target): ?array
    {
        if (! $this->key) {
            Log::warning('OpenRouter report provider: no API key configured, skipping');
            return null;
        }

        $schema = $this->schema();
        $userPrompt = $this->buildUserPrompt($findings, $target);

        try {
            $headers = [
                'Authorization' => "Bearer {$this->key}",
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
                        ['role' => 'system', 'content' => $this->systemPrompt()],
                        ['role' => 'user', 'content' => $userPrompt],
                    ],
                    'temperature' => 0.2,
                ]);

            if ($response->failed()) {
                Log::error('OpenRouter report generation failed', [
                    'status' => $response->status(),
                    'body' => $response->body(),
                ]);
                return null;
            }

            $content = $response->json('choices.0.message.content')
                ?? $response->json('choices.0.message.reasoning');
            if (! $content) {
                Log::error('OpenRouter report: empty content', ['body' => $response->body()]);
                return null;
            }

            $parsed = $this->extractJson($content);
            if (! $parsed) {
                Log::error('OpenRouter report: could not parse JSON from model output', [
                    'preview' => mb_substr($content, 0, 500),
                ]);
                return null;
            }

            return $this->normalize($parsed, $findings, $target);
        } catch (\Throwable $e) {
            Log::error('OpenRouter report generation exception', ['error' => $e->getMessage()]);
            return null;
        }
    }

    /**
     * Pull a JSON object out of the model's reply, tolerating reasoning text,
     * ```json fences, or leading/trailing prose that free models often add.
     */
    protected function extractJson(string $content): ?array
    {
        $decoded = json_decode($content, true);
        if (is_array($decoded)) {
            return $decoded;
        }

        if (preg_match('/```(?:json)?\s*(\{.*\})\s*```/s', $content, $m)) {
            $decoded = json_decode($m[1], true);
            if (is_array($decoded)) {
                return $decoded;
            }
        }

        $start = strpos($content, '{');
        $end = strrpos($content, '}');
        if ($start !== false && $end !== false && $end > $start) {
            $decoded = json_decode(substr($content, $start, $end - $start + 1), true);
            if (is_array($decoded)) {
                return $decoded;
            }
        }

        return null;
    }

    protected function systemPrompt(): string
    {
        return <<<PROMPT
You are a senior application security analyst. You are given a list of raw
findings produced by automated security scanners (nmap, nikto, wpscan,
gobuster, sqlmap, nuclei, sslscan, whatweb) against a single web target. Produce a clear, prioritized
security report as a JSON object. Be precise: only reference findings that
appear in the input. Do not invent vulnerabilities.
PROMPT;
    }

    protected function buildUserPrompt(array $findings, Target $target): string
    {
        $json = json_encode($findings, JSON_PRETTY_PRINT);
        $schema = $this->schema();

        return <<<PROMPT
Target: {$target->domain_url} ({$target->display_name})

Findings:
{$json}

Return ONLY a JSON object matching this schema:
{$schema}
PROMPT;
    }

    protected function schema(): string
    {
        return json_encode([
            'executive_summary' => 'string: 2-3 sentence plain-language overview',
            'overall_risk_score' => 'integer 0-100',
            'risk_level' => 'string: low|medium|high|critical',
            'prioritized_findings' => [
                ['title' => 'string', 'severity' => 'string', 'why_it_matters' => 'string', 'recommendation' => 'string'],
            ],
            'remediation_plan' => ['string: ordered remediation steps'],
            'methodology' => 'string: briefly describe what was scanned',
        ], JSON_PRETTY_PRINT);
    }

    protected function normalize(?array $data, array $findings, Target $target): ?array
    {
        return $this->normalizeReport($data, $findings);
    }
}