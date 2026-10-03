<?php

declare(strict_types=1);

namespace App\Enums;

enum UptimeStatus: string
{
    case Up = 'up';
    case Down = 'down';
    case Degraded = 'degraded';
    case Unknown = 'unknown';

    public function label(): string
    {
        return match ($this) {
            self::Up => 'Up',
            self::Down => 'Down',
            self::Degraded => 'Degraded',
            self::Unknown => 'Unknown',
        };
    }

    public function color(): string
    {
        return match ($this) {
            self::Up => 'text-green-400 bg-green-900/30',
            self::Down => 'text-red-400 bg-red-900/30',
            self::Degraded => 'text-yellow-400 bg-yellow-900/30',
            self::Unknown => 'text-gray-400 bg-gray-900/30',
        };
    }

    public function icon(): string
    {
        return match ($this) {
            self::Up => '✓',
            self::Down => '✗',
            self::Degraded => '⚠',
            self::Unknown => '?',
        };
    }

    public static function fromStatusCode(int $statusCode): self
    {
        if ($statusCode >= 200 && $statusCode < 300) {
            return self::Up;
        }
        if ($statusCode >= 500) {
            return self::Down;
        }
        if ($statusCode >= 400) {
            return self::Degraded;
        }
        return self::Unknown;
    }

    public static function fromResponseTime(int $responseTimeMs): self
    {
        if ($responseTimeMs < 200) {
            return self::Up;
        }
        if ($responseTimeMs < 1000) {
            return self::Degraded;
        }
        return self::Down;
    }
}