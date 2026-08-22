<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\ScanRun;
use App\Services\Contracts\ReportProvider;
use App\Services\Providers\AnthropicReportProvider;
use App\Services\Providers\OpenAiReportProvider;
use App\Services\Providers\OpenRouterReportProvider;
use Illuminate\Support\Facades\Log;

/**
 * Builds the AI report for a scan run. Resolves the configured LLM provider
 * (OpenAI by default, Anthropic selectable via services.llm.provider) and
 * persists the result as a Report row. When no API key is configured, report
 * generation is skipped gracefully so the rest of the pipeline still works.
 */
class ReportAgentService
{
    /**
     * Generate and persist a report for a scan run.
     */
    public function generateForRun(ScanRun $run): ?\App\Models\Report
    {
        $provider = $this->resolveProvider($run->target?->user);
        if (! $provider) {
            Log::warning('Report generation skipped: no LLM provider available', [
                'scan_run_id' => $run->id,
            ]);
            return null;
        }

        $findings = $run->findings()
            ->get()
            ->map(fn ($f) => $f->toArray())
            ->all();

        if (empty($findings)) {
            Log::info('Report generation skipped: no findings', ['scan_run_id' => $run->id]);
            return null;
        }

        $payload = $provider->generate($findings, $run->target);
        if (! $payload) {
            return null;
        }

        $resolvedProvider = $run->target?->user?->llm_provider ?: config('services.llm.provider', 'openai');

        // updateOrCreate, not create: Report has a hasOne relation to
        // ScanRun, so calling this twice for the same run (e.g. the user
        // clicks "Generate report" again) must replace the existing row,
        // not silently insert a second one that the hasOne relation never
        // surfaces.
        return \App\Models\Report::updateOrCreate(
            ['scan_run_id' => $run->id],
            [
                'target_id' => $run->target_id,
                'user_id' => $run->user_id,
                'provider' => $resolvedProvider,
                'risk_score' => $payload['overall_risk_score'] ?? null,
                'risk_level' => $payload['risk_level'] ?? null,
                'payload' => $payload,
                'generated_at' => now(),
            ]
        );
    }

    protected function resolveProvider(?\App\Models\User $user = null): ?ReportProvider
    {
        // A user's own provider choice (Profile > AI settings) takes
        // priority over the server-wide LLM_PROVIDER, so someone can point
        // their own account at OpenRouter/OpenAI/Anthropic independent of
        // whatever the server operator configured.
        $provider = $user?->llm_provider ?: config('services.llm.provider', 'openai');

        $instance = match ($provider) {
            'anthropic' => app(AnthropicReportProvider::class),
            'openai' => app(OpenAiReportProvider::class),
            'openrouter' => app(OpenRouterReportProvider::class),
            default => app(OpenAiReportProvider::class),
        };

        if ($user && method_exists($instance, 'forUser')) {
            $instance = $instance->forUser($user);
        }

        return $instance;
    }
}
