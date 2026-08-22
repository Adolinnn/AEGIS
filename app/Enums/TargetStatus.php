<?php

declare(strict_types=1);

namespace App\Enums;

enum TargetStatus: string
{
    case Active = 'active';
    case Inactive = 'inactive';
    case Paused = 'paused';
    case Error = 'error';

    public function label(): string
    {
        return match ($this) {
            self::Active => 'Active',
            self::Inactive => 'Inactive',
            self::Paused => 'Paused',
            self::Error => 'Error',
        };
    }

    public function color(): string
    {
        return match ($this) {
            self::Active => 'text-green-400 bg-green-900/30',
            self::Inactive => 'text-gray-400 bg-gray-900/30',
            self::Paused => 'text-yellow-400 bg-yellow-900/30',
            self::Error => 'text-red-400 bg-red-900/30',
        };
    }
}