<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\Report;
use App\Models\ScanRun;
use App\Services\Llm\LlmGatewayInterface;
use App\Services\Llm\LlmRequest;
use Illuminate\Support\Facades\Log;

/**
 * Builds comprehensive, elaborative AI security assessment reports for scan runs.
 * Designed to be actionable for engineers while completely legible to non-technical stakeholders.
 */
class ReportAgentService
{
    public function __construct(
        protected LlmGatewayInterface $gateway
    ) {}

    /**
     * Generate and persist an elaborative report for a scan run.
     */
    public function generateForRun(ScanRun $run): ?Report
    {
        $findings = $run->findings()
            ->get()
            ->map(fn ($f) => [
                'tool' => $f->tool->value ?? 'unknown',
                'title' => $f->title,
                'category' => $f->category,
                'severity' => $f->severity->value ?? 'info',
                'description' => $f->description,
                'evidence' => $f->evidence,
                'recommendation' => $f->recommendation,
            ])
            ->all();

        if (empty($findings)) {
            Log::info('Report generation skipped: no findings', ['scan_run_id' => $run->id]);
            return null;
        }

        $target = $run->target;
        $user = $target?->user ?? $run->user;

        $prompt = $this->buildPrompt($findings, $target);

        $request = LlmRequest::make()
            ->forUser($user)
            ->withTemperature(0.3)
            ->withMaxTokens(3500)
            ->withTimeout(120)
            ->asJson()
            ->withMessages([
                ['role' => 'system', 'content' => $this->getSystemPrompt()],
                ['role' => 'user', 'content' => $prompt],
            ]);

        $response = $this->gateway->send($request);

        if ($response->isError() || ! $response->json()) {
            Log::warning('Report generation failed', [
                'scan_run_id' => $run->id,
                'error' => $response->error(),
            ]);
            return null;
        }

        $payload = $response->json();
        $resolvedProvider = $user?->llm_provider ?: config('services.llm.provider', 'openai');

        return Report::updateOrCreate(
            ['scan_run_id' => $run->id],
            [
                'target_id' => $run->target_id,
                'user_id' => $run->user_id,
                'provider' => $resolvedProvider,
                'risk_score' => $payload['overall_risk_score'] ?? ($payload['risk_score'] ?? null),
                'risk_level' => $payload['risk_level'] ?? 'medium',
                'payload' => $payload,
                'generated_at' => now(),
            ]
        );
    }

    protected function getSystemPrompt(): string
    {
        return <<<PROMPT
You are a Principal Security Consultant producing executive and technical security assessment reports.
Your task is to analyze discovered security scan findings and produce an elaborative, deeply informative report.

CRITICAL TONE AND AUDIENCE GUIDELINES:
1. Executive & Non-Technical Legibility: Explain findings in clear, everyday language so non-cybersecurity founders, managers, and stakeholders understand what was found, what it means in real life, and why it matters to the business.
2. Concrete Remediation for Developers: Provide explicit, step-by-step remediation methods, configuration examples, and actionable guidance so engineers can immediately fix each issue.
3. Structured Remediation Roadmap: Break fixes into realistic phases (Immediate 24-48h, Short-term 1-2 weeks, Long-term 1-3 months).

You MUST respond with valid JSON matching this exact structure:
{
  "executive_summary": "Thorough high-level overview explaining the overall security posture, key takeaways, and general risk level in a professional yet accessible manner...",
  "plain_english_summary": "A friendly, jargon-free summary explaining what was tested, what was discovered, what could happen if ignored, and the immediate peace-of-mind next steps...",
  "overall_risk_score": 45,
  "risk_level": "critical"|"high"|"medium"|"low"|"info",
  "key_findings": [
    {
      "title": "Finding Title",
      "severity": "critical"|"high"|"medium"|"low"|"info",
      "plain_english_explanation": "Explain what this issue is in simple terms (e.g. 'Your server is leaving the digital front door unlocked...')",
      "business_impact": "Explain the business and operational risk (e.g. potential data theft, search engine blacklisting, compliance penalties, downtime)",
      "remediation_method": "Detailed step-by-step instructions on how to remediate this vulnerability",
      "code_or_config_example": "Optional code snippet or server config (e.g. Nginx config, PHP header, Apache rule, or CLI command)"
    }
  ],
  "remediation_roadmap": [
    {
      "phase": "Immediate (24-48h)",
      "objective": "Address high-exposure issues and critical misconfigurations",
      "actions": [
        "Action step 1",
        "Action step 2"
      ]
    },
    {
      "phase": "Short-term (1-2 weeks)",
      "objective": "Implement defense-in-depth headers and hardening",
      "actions": [
        "Action step 1",
        "Action step 2"
      ]
    },
    {
      "phase": "Long-term (1-3 months)",
      "objective": "Continuous monitoring and architectural security policies",
      "actions": [
        "Action step 1"
      ]
    }
  ],
  "preventive_best_practices": [
    "Best practice tip 1",
    "Best practice tip 2"
  ]
}
PROMPT;
    }

    protected function buildPrompt(array $findings, $target): string
    {
        $domain = $target->domain_url ?? 'Unknown Target';
        $findingCount = count($findings);
        $findingsSummary = json_encode($findings, JSON_PRETTY_PRINT);

        return <<<PROMPT
Target Analyzed: {$domain}
Total Findings Detected: {$findingCount}

Discovered Findings:
{$findingsSummary}

Please generate the comprehensive security assessment report adhering strictly to the JSON schema provided in system instructions. Ensure both non-technical explanations and concrete remediation code/configs are included.
PROMPT;
    }
}
