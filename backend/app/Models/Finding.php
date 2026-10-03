<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\ToolName;
use App\Enums\VulnerabilitySeverity;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * A single vulnerability produced by a scan run — the ONE canonical
 * vulnerability model in the app. Built-in HTTP checks and external tools
 * both write Finding rows, so every surface reads from here.
 */
#[Fillable([
    'scan_run_id',
    'target_id',
    'tool',
    'title',
    'category',
    'severity',
    'description',
    'evidence',
    'recommendation',
    'raw_output',
    'detected_at',
    'is_resolved',
    'resolved_at',
    'ai_patch_snippet',
    'ai_explanation',
    'ai_analysis',
])]
class Finding extends Model
{
    /** @use HasFactory<\Database\Factories\FindingFactory> */
    use HasFactory;

    protected $table = 'findings';

    protected function casts(): array
    {
        return [
            'tool' => ToolName::class,
            'severity' => VulnerabilitySeverity::class,
            'detected_at' => 'datetime',
            'is_resolved' => 'boolean',
            'resolved_at' => 'datetime',
            'ai_analysis' => 'array',
        ];
    }

    public function scanRun(): BelongsTo
    {
        return $this->belongsTo(ScanRun::class);
    }

    public function target(): BelongsTo
    {
        return $this->belongsTo(Target::class);
    }

    public function scopeUnresolved(Builder $query): Builder
    {
        return $query->where('is_resolved', false);
    }

    public function scopeResolved(Builder $query): Builder
    {
        return $query->where('is_resolved', true);
    }

    public function scopeSeverity(Builder $query, string $severity): Builder
    {
        return $query->where('severity', $severity);
    }

    /**
     * Restrict to findings whose target belongs to the given user.
     */
    public function scopeForUser(Builder $query, int $userId): Builder
    {
        return $query->whereHas('target', fn (Builder $q) => $q->where('user_id', $userId));
    }

    public function markResolved(): void
    {
        $this->update(['is_resolved' => true, 'resolved_at' => now()]);
    }

    public function markUnresolved(): void
    {
        $this->update(['is_resolved' => false, 'resolved_at' => null]);
    }

    public function getHasAiPatchAttribute(): bool
    {
        return filled($this->ai_patch_snippet);
    }
}
