<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\ScanRunStatus;
use App\Enums\ToolName;
use Database\Factories\ScanRunFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

#[Fillable([
    'user_id',
    'target_id',
    'status',
    'selected_tools',
    'consent_attested',
    'consent_text',
    'generate_report',
    'tools_failed',
    'summary',
    'started_at',
    'finished_at',
])]
class ScanRun extends Model
{
    use HasFactory;

    /** @use HasFactory<ScanRunFactory> */

    protected $table = 'scan_runs';

    protected function casts(): array
    {
        return [
            'status' => ScanRunStatus::class,
            'selected_tools' => 'array',
            'tools_failed' => 'array',
            'consent_attested' => 'boolean',
            'summary' => 'array',
            'started_at' => 'datetime',
            'finished_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function target(): BelongsTo
    {
        return $this->belongsTo(Target::class);
    }

    public function findings(): HasMany
    {
        return $this->hasMany(Finding::class);
    }

    public function toolOutputs(): HasMany
    {
        return $this->hasMany(ScanToolOutput::class);
    }

    public function report(): HasOne
    {
        return $this->hasOne(Report::class);
    }

    /**
     * @return ToolName[]
     */
    public function selectedToolNames(): array
    {
        return array_map(
            fn (string $value) => ToolName::from($value),
            $this->selected_tools ?? []
        );
    }

    public function markRunning(): void
    {
        $this->update([
            'status' => ScanRunStatus::Running,
            'started_at' => now(),
        ]);
    }

    public function isFinished(): bool
    {
        return $this->status->isTerminal();
    }
}
