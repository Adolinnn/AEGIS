<?php

namespace App\Http\Controllers;

use App\Models\SiemAgent;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Inertia;
use App\Enums\SiemAgentStatus;

class SiemAgentController extends Controller
{
    public function index(Request $request)
    {
        $agents = $request->user()->siemAgents()->latest()->get();
        return Inertia::render('Siem/Agents/Index', [
            'agents' => $agents,
            'current_version' => config('siem.agent_version'),
            'public_url' => config('siem.public_url')
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'os_type' => 'required|in:linux',
            'sources' => 'required|array',
            'sources.*.name' => 'required|string',
            'sources.*.path' => 'required|string',
            'sources.*.source' => 'required|string',
            'allow_self_signed' => 'boolean'
        ]);

        $uuid = (string) Str::uuid();
        // Generate high entropy secret
        $secret = 'aegis_' . bin2hex(random_bytes(24));
        $secretHash = hash('sha256', $secret);

        // Generate install token
        // Token format for installer endpoint: base64(uuid:secret)
        $installTokenRaw = base64_encode("{$uuid}:{$secret}");
        $installTokenHash = hash('sha256', $installTokenRaw);

        $agent = $request->user()->siemAgents()->create([
            'uuid' => $uuid,
            'name' => $validated['name'],
            'os_type' => $validated['os_type'],
            'secret_hash' => $secretHash,
            'secret_last4' => substr($secret, -4),
            'install_token_hash' => $installTokenHash,
            'install_token_expires_at' => now()->addMinutes(config('siem.install_token_ttl_minutes')),
            'status' => SiemAgentStatus::Pending,
            'config' => [
                'sources' => $validated['sources'],
                'allow_self_signed' => $validated['allow_self_signed'] ?? false,
            ]
        ]);

        return redirect()->back()->with([
            'new_agent' => $agent->only('uuid', 'name'),
            'install_token' => $installTokenRaw
        ]);
    }

    public function rotate(Request $request, SiemAgent $siemAgent)
    {
        $this->authorize('update', $siemAgent);

        $secret = 'aegis_' . bin2hex(random_bytes(24));
        $installTokenRaw = base64_encode("{$siemAgent->uuid}:{$secret}");

        $siemAgent->update([
            'secret_hash' => hash('sha256', $secret),
            'secret_last4' => substr($secret, -4),
            'install_token_hash' => hash('sha256', $installTokenRaw),
            'install_token_expires_at' => now()->addMinutes(config('siem.install_token_ttl_minutes')),
            'status' => SiemAgentStatus::Pending
        ]);

        return redirect()->back()->with([
            'rotated_agent' => $siemAgent->only('uuid', 'name'),
            'install_token' => $installTokenRaw
        ]);
    }

    public function revoke(Request $request, SiemAgent $siemAgent)
    {
        $this->authorize('update', $siemAgent);

        $siemAgent->update(['status' => SiemAgentStatus::Revoked, 'revoked_at' => now()]);

        return redirect()->back();
    }

    public function destroy(Request $request, SiemAgent $siemAgent)
    {
        $this->authorize('delete', $siemAgent);

        $siemAgent->delete();

        return redirect()->back();
    }
}
