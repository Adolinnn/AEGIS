<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'scan_run_id',
    'target_id',
    'user_id',
    'provider',
    'risk_score',
    'risk_level',
    'payload',
    'generated_at',
])]
class Report extends Model
{
    protected $table = 'reports';

    protected function casts(): array
    {
        return [
            'risk_score' => 'integer',
            'payload' => 'array',
            'generated_at' => 'datetime',
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

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
