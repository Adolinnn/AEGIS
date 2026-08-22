<?php

declare(strict_types=1);

namespace App\Enums;

enum ScanRunStatus: string
{
    case Pending = 'pending';
    case Running = 'running';
    case Completed = 'completed';
    case Partial = 'partial';
    case Failed = 'failed';

    public function label(): string
    {
        return match ($this) {
            self::Pending => 'Pending',
            self::Running => 'Running',
            self::Completed => 'Completed',
            self::Partial => 'Partially Completed',
            self::Failed => 'Failed',
        };
    }

    public function color(): string
    {
        return match ($this) {
            self::Pending => 'text-gray-400 bg-gray-900/30 border-gray-400/20',
            self::Running => 'text-blue-400 bg-blue-900/30 border-blue-400/20',
            self::Completed => 'text-green-400 bg-green-900/30 border-green-400/20',
            self::Partial => 'text-yellow-400 bg-yellow-900/30 border-yellow-400/20',
            self::Failed => 'text-red-500 bg-red-900/40 border-red-500/30',
        };
    }

    public function isTerminal(): bool
    {
        return match ($this) {
            self::Completed, self::Partial, self::Failed => true,
            default => false,
        };
    }
}
