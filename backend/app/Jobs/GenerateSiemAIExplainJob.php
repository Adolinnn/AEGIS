<?php

declare(strict_types=1);

namespace App\Jobs;

use App\Models\SiemAlert;
use App\Services\Llm\LlmGatewayInterface;
use App\Services\Llm\LlmRequest;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Log;

class GenerateSiemAIExplainJob implements ShouldQueue
{
    use Queueable;

    public int $tries = 3;
    public int $backoff = 10;
    public int $timeout = 120;

    public function __construct(
        public readonly int $alertId
    ) {}

    public function handle(LlmGatewayInterface $gateway): void
    {
        $alert = SiemAlert::find($this->alertId);

        if (! $alert) {
            Log::warning('SIEM AI explain: alert not found', ['alert_id' => $this->alertId]);
            return;
        }

        if ($alert->ai_explanation) {
            return;
        }

        $user = $alert->user;

        // Evidence is stored as an array of SiemEvent ids (evidence_event_ids),
        // NOT an Eloquent relationship. Load the events by id.
        $evidenceIds = $alert->evidence_event_ids ?? [];
        $evidenceEvents = empty($evidenceIds)
            ? collect()
            : \App\Models\SiemEvent::whereIn('id', $evidenceIds)
                ->orderBy('occurred_at', 'desc')
                ->limit(10)
                ->get();

        $evidence = $evidenceEvents->map(function ($ev) {
            return "[{$ev->occurred_at}] {$ev->event_type}: " . ($ev->raw ?? json_encode($ev->fields));
        })->implode("\n");

        $prompt = <<<PROMPT
You are a senior SIEM analyst and security operations expert. Analyze this security alert and provide a brief, actionable executive summary of what happened and what the operator should do.

**Alert Details:**
- Title: {$alert->title}
- Rule: {$alert->rule_key}
- Severity: {$alert->severity}
- Source IP: {$alert->src_ip}
- Total Events: {$alert->event_count}

**Raw Evidence Sample:**
```
{$evidence}
```

Provide your explanation in Markdown format. Keep it concise, focused on the immediate risk, and provide 2-3 specific remediation steps. Do not include greetings.
PROMPT;

        $request = LlmRequest::make()
            ->forUser($user)
            ->withTemperature(0.2)
            ->withMaxTokens(1000)
            ->withMessages([
                ['role' => 'system', 'content' => 'You are an expert SIEM analyst.'],
                ['role' => 'user', 'content' => $prompt],
            ]);

        $response = $gateway->send($request);

        if ($response->isError() || ! $response->text()) {
            Log::warning('SIEM AI explain failed', [
                'alert_id' => $this->alertId,
                'error' => $response->error(),
            ]);
            return;
        }

        $alert->update(['ai_explanation' => $response->text()]);
        
        Log::info('SIEM AI explanation generated', ['alert_id' => $this->alertId]);
    }

    public function tags(): array
    {
        return ['siem-ai-explain', 'alert:' . $this->alertId];
    }
}
