<?php

declare(strict_types=1);

namespace App\Jobs;

use App\Models\Finding;
use App\Services\AiRemediationService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Log;

class GenerateAIPatchJob implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public readonly int $findingId
    ) {}

    public function handle(AiRemediationService $aiService): void
    {
        $finding = Finding::find($this->findingId);

        if (! $finding) {
            Log::warning('AI patch generation: finding not found', ['finding_id' => $this->findingId]);
            return;
        }

        if ($finding->ai_patch_snippet) {
            Log::info('AI patch already exists, skipping', ['finding_id' => $this->findingId]);
            return;
        }

        $patch = $aiService->forUser($finding->target?->user)->generatePatch($finding);

        if ($patch) {
            $finding->update(['ai_patch_snippet' => $patch]);
            Log::info('AI patch generated', [
                'finding_id' => $this->findingId,
                'patch_length' => strlen($patch),
            ]);
        }
    }

    public function tags(): array
    {
        return ['ai-patch', 'finding:' . $this->findingId];
    }
}
