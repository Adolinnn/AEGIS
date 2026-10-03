<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Enums\SiemEventSource;
use App\Enums\SiemEventSeverity;

class SiemEvent extends Model
{
    use HasFactory;

    public $timestamps = false; // Because we use occurred_at and received_at

    protected $guarded = [];

    protected $casts = [
        'occurred_at' => 'datetime',
        'received_at' => 'datetime',
        'fields' => 'json',
        'source' => SiemEventSource::class,
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
