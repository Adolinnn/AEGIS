<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Enums\SiemAgentStatus;

class SiemAgent extends Model
{
    use HasFactory;

    protected $guarded = [];

    protected $casts = [
        'config' => 'json',
        'local_ips' => 'json',
        'host_stats' => 'json',
        'install_token_expires_at' => 'datetime',
        'last_seen_at' => 'datetime',
        'first_seen_at' => 'datetime',
        'revoked_at' => 'datetime',
        'status' => SiemAgentStatus::class,
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function events()
    {
        return $this->hasMany(SiemEvent::class, 'agent_id');
    }

    public function alerts()
    {
        return $this->hasMany(SiemAlert::class, 'agent_id');
    }
}
