<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Inertia\Inertia;
use App\Models\SiemEvent;
use App\Models\SiemAlert;
use App\Models\SiemAgent;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class SiemDashboardController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        
        // Time range: 1h, 24h, 7d
        $range = $request->query('range', '24h');
        
        switch ($range) {
            case '1h':
                $startTime = now()->subHour();
                break;
            case '7d':
                $startTime = now()->subDays(7);
                break;
            case '24h':
            default:
                $startTime = now()->subHours(24);
                break;
        }

        // Base queries
        $eventsQuery = SiemEvent::where('user_id', $user->id)->where('occurred_at', '>=', $startTime);
        $alertsQuery = SiemAlert::where('user_id', $user->id)->where('first_seen_at', '>=', $startTime);
        $allAlertsQuery = SiemAlert::where('user_id', $user->id)->whereIn('status', ['open', 'acknowledged']);

        // KPIs
        $totalAgents = SiemAgent::where('user_id', $user->id)->count();
        $onlineAgents = SiemAgent::where('user_id', $user->id)->where('status', 'active')->count();
        $totalEvents = $eventsQuery->count();
        $openAlertsCount = (clone $allAlertsQuery)->count();
        
        $openCritical = (clone $allAlertsQuery)->where('severity', 'critical')->count();
        $openHigh = (clone $allAlertsQuery)->where('severity', 'high')->count();

        // Top Attacker IP
        $topIpRow = SiemAlert::where('user_id', $user->id)
            ->where('first_seen_at', '>=', $startTime)
            ->whereNotNull('src_ip')
            ->select('src_ip', DB::raw('sum(event_count) as total_events'))
            ->groupBy('src_ip')
            ->orderBy('total_events', 'desc')
            ->first();
        
        $topAttacker = $topIpRow ? $topIpRow->src_ip : 'N/A';

        // Events over time (bucket by hour or minute depending on range)
        $eventsOverTime = [];
        // Group by hour for simplicity across 24h/7d
        $timeFormat = "DATE_FORMAT(occurred_at, '%Y-%m-%d %H:00')";

        $eventsData = $eventsQuery->select(
            DB::raw("{$timeFormat} as time_bucket"),
            'event_type',
            DB::raw('count(*) as total')
        )
        ->groupBy('time_bucket', 'event_type')
        ->orderBy('time_bucket')
        ->get();

        // Format for Recharts (Array of objects like {time: '2023-10-02 14:00', ssh_auth_failed: 10, web_access: 50})
        $formattedEvents = [];
        foreach ($eventsData as $row) {
            $bucket = $row->time_bucket;
            if (!isset($formattedEvents[$bucket])) {
                $formattedEvents[$bucket] = ['time' => Carbon::parse($bucket)->format('M d H:i')];
            }
            $formattedEvents[$bucket][$row->event_type] = $row->total;
        }

        // Alerts by severity
        $alertsBySeverity = $alertsQuery->select('severity', DB::raw('count(*) as count'))
            ->groupBy('severity')
            ->get();

        // Top attacking IPs
        $topIps = SiemAlert::where('user_id', $user->id)
            ->where('first_seen_at', '>=', $startTime)
            ->whereNotNull('src_ip')
            ->select('src_ip', DB::raw('count(*) as alert_count'), DB::raw('sum(event_count) as event_count'), DB::raw('max(last_seen_at) as last_seen'))
            ->groupBy('src_ip')
            ->orderBy('alert_count', 'desc')
            ->limit(5)
            ->get();

        // Recent alerts
        $recentAlerts = SiemAlert::where('user_id', $user->id)
            ->with('agent:id,name')
            ->orderBy('last_seen_at', 'desc')
            ->limit(10)
            ->get();

        // Agent health
        $agents = SiemAgent::where('user_id', $user->id)
            ->select('id', 'name', 'status', 'last_seen_at')
            ->orderBy('name')
            ->get();
            
        // Map agents with mock risk score (could aggregate open alerts per agent)
        $agentHealth = $agents->map(function ($agent) {
            $risk = SiemAlert::where('agent_id', $agent->id)
                ->whereIn('status', ['open', 'acknowledged'])
                ->get()
                ->reduce(function ($carry, $alert) {
                    if ($alert->severity === 'critical') return $carry + 10;
                    if ($alert->severity === 'high') return $carry + 5;
                    if ($alert->severity === 'medium') return $carry + 2;
                    return $carry + 1;
                }, 0);
                
            return [
                'id' => $agent->id,
                'name' => $agent->name,
                'status' => $agent->status,
                'last_seen_at' => $agent->last_seen_at,
                'risk_score' => $risk,
            ];
        });

        // JSON response for polling if requested
        if ($request->wantsJson()) {
            return response()->json([
                'kpis' => [
                    'online_agents' => $onlineAgents,
                    'total_agents' => $totalAgents,
                    'total_events' => $totalEvents,
                    'open_critical' => $openCritical,
                    'open_high' => $openHigh,
                    'top_attacker' => $topAttacker,
                ],
                'eventsOverTime' => array_values($formattedEvents),
                'alertsBySeverity' => $alertsBySeverity,
                'topIps' => $topIps,
                'recentAlerts' => $recentAlerts,
                'agentHealth' => $agentHealth,
            ]);
        }

        return Inertia::render('Siem/Overview', [
            'range' => $range,
            'kpis' => [
                'online_agents' => $onlineAgents,
                'total_agents' => $totalAgents,
                'total_events' => $totalEvents,
                'open_critical' => $openCritical,
                'open_high' => $openHigh,
                'top_attacker' => $topAttacker,
            ],
            'eventsOverTime' => array_values($formattedEvents),
            'alertsBySeverity' => $alertsBySeverity,
            'topIps' => $topIps,
            'recentAlerts' => $recentAlerts,
            'agentHealth' => $agentHealth,
        ]);
    }
}
