<?php

declare(strict_types=1);

namespace App\Jobs;

use App\Models\Target;
use App\Services\UptimeService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

class CheckUptimeJob implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public readonly int $targetId
    ) {}

    public function handle(UptimeService $uptimeService): void
    {
        $target = Target::find($this->targetId);

        if (!$target) {
            \Illuminate\Support\Facades\Log::warning('Uptime check: Target not found', [
                'target_id' => $this->targetId,
            ]);
            return;
        }

        if (!$target->is_active) {
            return;
        }

        $uptimeService->checkTarget($target);
    }

    public function tags(): array
    {
        return ['uptime', 'target:' . $this->targetId];
    }
}