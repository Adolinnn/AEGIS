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
 * Anthropic (Claude) report provider. Single Messages API call requesting
 * strict JSON via the `json` output format. Falls back gracefully when no key.
 */
class AnthropicReportProvider implements ReportProvider
{
    use NormalizesReport;
    protected ?string $key;
    protected string $model;
    protected int $timeout;
    protected string $baseUrl;

    public function __construct()
    {
        $this->key = config('services.llm.anthropic.key') ?? env('ANTHROPIC_API_KEY');
        $this->model = config('services.llm.anthropic.model', 'claude-sonnet-4-5');
        $this->timeout = (int) config('services.llm.anthropic.timeout', 60);
        $this->baseUrl = config('services.llm.anthropic.base_url', 'https://api.anthropic.com/v1');
    }

    /**
     * Use this user's own saved AI settings instead of the server-wide
     * config, when they've set them.
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
            Log::warning('Anthropic report provider: no API key configured, skipping');
            return null;
        }

        $schema = $this->schema();
        $userPrompt = $this->buildUserPrompt($findings, $target);

        try {
            $response = Http::timeout($this->timeout)
                ->withHeaders([
                    'x-api-key' => $this->key,
                    'anthropic-version' => '2023-06-01',
                    'Content-Type' => 'application/json',
                ])
                ->post($this->baseUrl . '/messages', [
                    'model' => $this->model,
                    'max_tokens' => 2000,
                    'system' => $this->systemPrompt(),
                    'messages' => [
                        ['role' => 'user', 'content' => $userPrompt],
                    ],
                ]);

            if ($response->failed()) {
                Log::error('Anthropic report generation failed', [
                    'status' => $response->status(),
                    'body' => $response->body(),
                ]);
                return null;
            }

            $text = '';
            foreach (($response->json('content') ?? []) as $block) {
                if (($block['type'] ?? '') === 'text') {
                    $text .= $block['text'] ?? '';
                }
            }

            if ($text === '') {
                return null;
            }

            // Strip markdown fences if the model wrapped the JSON.
            $decoded = json_decode($this->stripFences($text), true);

            return $this->normalize($decoded, $findings, $target);
        } catch (\Throwable $e) {
            Log::error('Anthropic report generation exception', ['error' => $e->getMessage()]);
            return null;
        }
    }

    protected function systemPrompt(): string
    {
        return <<<PROMPT
You are a senior application security analyst. You are given a list of raw
findings produced by automated security scanners (nmap, nikto, wpscan,
gobuster, sqlmap) against a single web target. Produce a clear, prioritized
security report as a JSON object. Be precise: only reference findings that
appear in the input. Do not invent vulnerabilities. Respond with ONLY the JSON object.
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

    protected function stripFences(string $text): string
    {
        if (preg_match('/```(?:json)?\s*(.*?)\s*```/s', $text, $m)) {
            return $m[1];
        }
        return $text;
    }

    protected function normalize(?array $data, array $findings, Target $target): ?array
    {
        return $this->normalizeReport($data, $findings);
    }
}
