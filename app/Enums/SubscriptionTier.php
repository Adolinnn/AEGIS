<?php

declare(strict_types=1);

namespace App\Enums;

enum SubscriptionTier: string
{
    case Free = 'free';
    case Individual = 'individual';
    case Team = 'team';
    case Student = 'student';

    public function label(): string
    {
        return match ($this) {
            self::Free => 'Free',
            self::Individual => 'Individual',
            self::Team => 'Team',
            self::Student => 'Student',
        };
    }

    public function tagline(): string
    {
        return match ($this) {
            self::Free => 'Kick the tires',
            self::Individual => 'For solo security work',
            self::Team => 'For teams of 50–60',
            self::Student => 'Discounted for students',
        };
    }

    /**
     * Display price. No payment gateway is wired up — subscribing just
     * activates the tier on the account — so this is presentational only.
     */
    public function price(): string
    {
        return match ($this) {
            self::Free => '$0',
            self::Individual => '$19/mo',
            self::Team => '$399/mo',
            self::Student => '$5/mo',
        };
    }

    public function priceNote(): ?string
    {
        return match ($this) {
            self::Team => 'flat rate, up to 60 seats',
            self::Student => 'requires a .edu email',
            default => null,
        };
    }

    public function color(): string
    {
        return match ($this) {
            self::Free => 'text-gray-400 bg-gray-900/30',
            self::Individual => 'text-blue-400 bg-blue-900/30',
            self::Team => 'text-purple-400 bg-purple-900/30',
            self::Student => 'text-emerald-400 bg-emerald-900/30',
        };
    }

    public function maxTargets(): int
    {
        return match ($this) {
            self::Free => 3,
            self::Individual => 25,
            self::Team => 100,
            self::Student => 8,
        };
    }

    public function maxScansPerDay(): int
    {
        return match ($this) {
            self::Free => 5,
            self::Individual => 50,
            self::Team => 200,
            self::Student => 15,
        };
    }

    public function maxUptimeChecksPerHour(): int
    {
        return match ($this) {
            self::Free => 6,
            self::Individual => 60,
            self::Team => 240,
            self::Student => 12,
        };
    }

    public function maxSeats(): int
    {
        return match ($this) {
            self::Free, self::Individual, self::Student => 1,
            self::Team => 60,
        };
    }

    public function features(): array
    {
        return match ($this) {
            self::Free => [
                '3 monitored targets',
                '5 security scans/day',
                'Uptime checks every 10 min',
                'Basic vulnerability reports',
                'Email alerts',
            ],
            self::Individual => [
                '25 monitored targets',
                '50 security scans/day',
                'Uptime checks every 1 min',
                'AI-powered remediation patches',
                'Webhook & Slack alerts',
                'API access',
                'Scan history (90 days)',
            ],
            self::Team => [
                'Up to 60 seats',
                '100 monitored targets',
                '200 security scans/day',
                'Uptime checks every 15 sec',
                'AI-powered remediation patches',
                'Webhook, Slack, PagerDuty alerts',
                'Full API access',
                'Unlimited scan history',
                'White-label reports',
                'Custom payload templates',
            ],
            self::Student => [
                '8 monitored targets',
                '15 security scans/day',
                'Uptime checks every 5 min',
                'AI-powered remediation patches',
                'Email alerts',
                'Requires a .edu email on your account',
            ],
        };
    }

    public function hasAiRemediation(): bool
    {
        return $this !== self::Free;
    }

    /**
     * Tiers a user can self-serve subscribe to from the billing page.
     * Free is the default/fallback, not something you "subscribe" to.
     */
    public static function subscribable(): array
    {
        return [self::Individual, self::Team, self::Student];
    }
}
