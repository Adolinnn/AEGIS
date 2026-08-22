<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\TargetStatus;
use App\Enums\SubscriptionTier;
use Database\Factories\TargetFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

#[Fillable([
    'user_id',
    'domain_url',
    'display_name',
    'is_active',
    'is_authorized',
    'last_checked_at',
    'last_scanned_at',
    'uptime_check_interval_minutes',
    'scan_config',
])]
class Target extends Model
{
    use HasFactory;

    /** @use HasFactory<TargetFactory> */

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'is_authorized' => 'boolean',
            'last_checked_at' => 'datetime',
            'last_scanned_at' => 'datetime',
            'uptime_check_interval_minutes' => 'integer',
            'scan_config' => 'array',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function uptimeLogs(): HasMany
    {
        return $this->hasMany(UptimeLog::class);
    }

    public function scanRuns(): HasMany
    {
        return $this->hasMany(ScanRun::class);
    }

    public function findings(): HasMany
    {
        return $this->hasMany(Finding::class);
    }

    public function reports(): HasMany
    {
        return $this->hasMany(Report::class);
    }

    public function scopeAuthorized($query)
    {
        return $query->where('is_authorized', true);
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function latestUptimeLog(): HasOne
    {
        return $this->hasOne(UptimeLog::class)->latest('checked_at');
    }

    public function unresolvedFindings(): HasMany
    {
        return $this->hasMany(Finding::class)->where('is_resolved', false);
    }

    public function criticalFindings(): HasMany
    {
        return $this->hasMany(Finding::class)
            ->where('is_resolved', false)
            ->where('severity', 'critical');
    }

    public function getStatusAttribute(): TargetStatus
    {
        if (! $this->is_active) {
            return TargetStatus::Inactive;
        }

        $latestLog = $this->latestUptimeLog;
        if (! $latestLog) {
            return TargetStatus::Active;
        }

        return match ($latestLog->status) {
            'up' => TargetStatus::Active,
            'down' => TargetStatus::Error,
            'degraded' => TargetStatus::Paused,
            default => TargetStatus::Active,
        };
    }

    public function getUptimePercentageAttribute(): float
    {
        $logs = $this->uptimeLogs()->limit(100)->get();
        if ($logs->isEmpty()) {
            return 100.0;
        }

        $upCount = $logs->where('status', 'up')->count();
        return round(($upCount / $logs->count()) * 100, 2);
    }

    public function getAverageResponseTimeAttribute(): ?int
    {
        $avg = $this->uptimeLogs()
            ->where('status', 'up')
            ->avg('response_time_ms');

        return $avg ? (int) round($avg) : null;
    }

    public function isOverdueForCheck(): bool
    {
        if (! $this->last_checked_at) {
            return true;
        }

        return $this->last_checked_at->diffInMinutes(now()) >= $this->uptime_check_interval_minutes;
    }
}