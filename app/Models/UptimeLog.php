<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\UptimeStatus;
use Database\Factories\UptimeLogFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'target_id',
    'status_code',
    'response_time_ms',
    'status',
    'error_message',
    'response_headers',
    'checked_at',
])]
class UptimeLog extends Model
{
    use HasFactory;

    /** @use HasFactory<UptimeLogFactory> */

    protected function casts(): array
    {
        return [
            'status_code' => 'integer',
            'response_time_ms' => 'integer',
            'checked_at' => 'datetime',
            'response_headers' => 'array',
        ];
    }

    public function target(): BelongsTo
    {
        return $this->belongsTo(Target::class);
    }

    public function getStatusEnumAttribute(): UptimeStatus
    {
        return UptimeStatus::tryFrom($this->status) ?? UptimeStatus::Unknown;
    }

    public function isUp(): bool
    {
        return $this->status === 'up';
    }

    public function isDown(): bool
    {
        return $this->status === 'down';
    }
}