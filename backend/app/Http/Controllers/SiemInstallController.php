<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\SiemAgent;

class SiemInstallController extends Controller
{
    public function show(Request $request, string $token)
    {
        $tokenHash = hash('sha256', $token);
        
        $agent = SiemAgent::where('install_token_hash', $tokenHash)
            ->where('install_token_expires_at', '>', now())
            ->first();

        if (!$agent) {
            abort(404);
        }

        $installStub = file_get_contents(resource_path('siem/install.sh.stub'));
        $pythonStub = file_get_contents(resource_path('siem/agent.py.stub'));

        // Actually the secret is only known AT GENERATION. 
        // Wait, AEGIS_SIEM_BUILD_INSTRUCTIONS says:
        // "Generate a one-time install token. Build the installer on the fly from a template... Replace placeholders: server URL, agent uuid, agent secret".
        // Wait, the secret hash is stored, not the plaintext.
        // If the script is generated AT INSTALLATION, we don't have the secret!
        // No, the instructions say:
        // "Generate a high-entropy secret. Store only its sha256 hash. Plaintext exists only inside the generated installer, shown once."
        // Wait, if the installer is served from /siem/install/{token}, the server needs the plaintext secret to put it in the installer!
        // But if the server only stores the hash, how can /siem/install/{token} embed it?
        // Ah! If the one-time link embeds the secret? 
        // Let's check rule 6.2: "Serve via GET /siem/install/{token} as text/plain".
        // If we serve it, we must have the secret. We can pass the secret inside the token!
        // For example, token = base64(uuid:secret). 
        // Let's implement that!

        // So the token passed is actually base64(uuid:secret).
        $decoded = base64_decode($token);
        if (!$decoded || !str_contains($decoded, ':')) {
            abort(404);
        }

        [$uuid, $secret] = explode(':', $decoded, 2);
        
        if ($agent->uuid !== $uuid) {
            abort(404);
        }

        $pythonStub = str_replace(
            ['{{SERVER_URL}}', '{{AGENT_UUID}}', '{{AGENT_SECRET}}', 'SOURCES = [] # {{INJECT_SOURCES}}', 'VERIFY_TLS = True # {{INJECT_VERIFY_TLS}}', '{{AGENT_VERSION}}'],
            [
                config('siem.public_url'),
                $agent->uuid,
                $secret,
                'SOURCES = ' . json_encode($agent->config['sources'] ?? [], JSON_UNESCAPED_SLASHES),
                'VERIFY_TLS = ' . (str_starts_with(config('siem.public_url'), 'https://') && !($agent->config['allow_self_signed'] ?? false) ? 'True' : 'False'),
                config('siem.agent_version')
            ],
            $pythonStub
        );

        $installStub = str_replace(
            ['{{AGENT_UUID}}', '{{PYTHON_SCRIPT}}'],
            [$agent->uuid, $pythonStub],
            $installStub
        );

        return response($installStub)->header('Content-Type', 'text/plain');
    }
}
