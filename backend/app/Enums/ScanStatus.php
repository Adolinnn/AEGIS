<?php

declare(strict_types=1);

namespace App\Enums;

enum ScanStatus: string
{
    case Pending = 'pending';
    case Queued = 'queued';
    case Running = 'running';
    case Completed = 'completed';
    case Failed = 'failed';
    case Cancelled = 'cancelled';

    public function label(): string
    {
        return match ($this) {
            self::Pending => 'Pending',
            self::Queued => 'Queued',
            self::Running => 'Running',
            self::Completed => 'Completed',
            self::Failed => 'Failed',
            self::Cancelled => 'Cancelled',
        };
    }

    public function color(): string
    {
        return match ($this) {
            self::Pending => 'text-gray-400 bg-gray-900/30',
            self::Queued => 'text-blue-400 bg-blue-900/30',
            self::Running => 'text-yellow-400 bg-yellow-900/30 animate-pulse',
            self::Completed => 'text-green-400 bg-green-900/30',
            self::Failed => 'text-red-400 bg-red-900/30',
            self::Cancelled => 'text-gray-500 bg-gray-900/30',
        };
    }

    public function isTerminal(): bool
    {
        return in_array($this, [
            self::Completed,
            self::Failed,
            self::Cancelled,
        ]);
    }

    public function isActive(): bool
    {
        return in_array($this, [
            self::Queued,
            self::Running,
        ]);
    }
}