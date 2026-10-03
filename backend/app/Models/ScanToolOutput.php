<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ScanToolOutput extends Model
{
    protected $table = 'scan_tool_outputs';

    protected $fillable = [
        'scan_run_id',
        'tool',
        'status',
        'command',
        'exit_code',
        'timed_out',
        'output',
        'findings_count',
    ];

    protected function casts(): array
    {
        return [
            'exit_code' => 'integer',
            'timed_out' => 'boolean',
            'findings_count' => 'integer',
        ];
    }

    public function scanRun(): BelongsTo
    {
        return $this->belongsTo(ScanRun::class);
    }
}
