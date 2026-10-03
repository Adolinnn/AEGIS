<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Enums\SiemAgentStatus;

class SiemHeartbeatController extends Controller
{
    public function __invoke(Request $request)
    {
        $agent = $request->attributes->get('siem_agent');

        $validated = $request->validate([
            'hostname' => 'nullable|string',
            'os_info' => 'nullable|string',
            'agent_version' => 'nullable|string',
            'tz_offset_minutes' => 'nullable|integer',
            'local_ips' => 'nullable|array',
            'host_stats' => 'nullable|array',
        ]);

        $ip = $request->ip();

        if ($agent->status === SiemAgentStatus::Pending) {
            $agent->status = SiemAgentStatus::Active;
            $agent->install_token_hash = null;
            $agent->install_token_expires_at = null;
            $agent->first_seen_at = now();
        }

        $agent->last_seen_at = now();
        $agent->ip_address = $ip;

        if (isset($validated['hostname'])) $agent->hostname = $validated['hostname'];
        if (isset($validated['os_info'])) $agent->os_info = $validated['os_info'];
        if (isset($validated['agent_version'])) $agent->agent_version = $validated['agent_version'];
        if (isset($validated['tz_offset_minutes'])) $agent->tz_offset_minutes = $validated['tz_offset_minutes'];
        if (isset($validated['local_ips'])) $agent->local_ips = $validated['local_ips'];
        if (isset($validated['host_stats'])) $agent->host_stats = $validated['host_stats'];

        $agent->save();

        return response()->json([
            'status' => 'ok',
            'config_version' => 1,
            'latest_agent_version' => config('siem.agent_version'),
        ]);
    }
}
