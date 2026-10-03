<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use App\Models\SiemAgent;
use Illuminate\Support\Facades\Hash;
use App\Enums\SiemAgentStatus;

class SiemAgentMiddleware
{
    public function handle(Request $request, Closure $next): Response
    {
        $uuid = $request->header('X-Agent-Id');
        $authHeader = $request->header('Authorization');

        if (!$uuid || !$authHeader || !str_starts_with($authHeader, 'Bearer ')) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        $secret = substr($authHeader, 7);
        $agent = SiemAgent::where('uuid', $uuid)->first();

        if (!$agent) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        if ($agent->status === SiemAgentStatus::Revoked) {
            return response()->json(['error' => 'Agent revoked'], 401);
        }

        $expectedHash = hash('sha256', $secret);

        if (!hash_equals($agent->secret_hash, $expectedHash)) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        // Attach agent to request
        $request->attributes->set('siem_agent', $agent);

        return $next($request);
    }
}
