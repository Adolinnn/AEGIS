<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Enums\SiemAlertStatus;
use App\Enums\SiemEventSeverity;

class SiemAlert extends Model
{
    use HasFactory;

    protected $guarded = [];

    protected $casts = [
        'first_seen_at' => 'datetime',
        'last_seen_at' => 'datetime',
        'acknowledged_at' => 'datetime',
        'resolved_at' => 'datetime',
        'evidence' => 'json',
        'evidence_event_ids' => 'json',
        'status' => SiemAlertStatus::class,
        'severity' => SiemEventSeverity::class,
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function agent()
    {
        return $this->belongsTo(SiemAgent::class, 'agent_id');
    }
}
