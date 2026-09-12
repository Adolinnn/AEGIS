<?php

namespace App\Events;

use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class ScanToolOutputUpdated implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public int $scan_run_id,
        public string $tool,
        public string $status,
        public string $output,
        public ?int $exit_code,
        public int $findings_count
    ) {}

    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('scan-run.' . $this->scan_run_id),
        ];
    }
}
