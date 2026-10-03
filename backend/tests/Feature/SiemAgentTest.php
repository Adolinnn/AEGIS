<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\SiemAgent;
use App\Enums\SiemAgentStatus;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class SiemAgentTest extends TestCase
{
    use RefreshDatabase;

    public function test_installer_route_returns_correct_script()
    {
        $user = User::factory()->create();
        
        $uuid = (string) Str::uuid();
        $secret = 'aegis_' . bin2hex(random_bytes(24));
        $installTokenRaw = base64_encode("{$uuid}:{$secret}");
        $installTokenHash = hash('sha256', $installTokenRaw);
        
        $agent = SiemAgent::create([
            'user_id' => $user->id,
            'uuid' => $uuid,
            'name' => 'Test Agent',
            'secret_hash' => hash('sha256', $secret),
            'secret_last4' => substr($secret, -4),
            'install_token_hash' => $installTokenHash,
            'install_token_expires_at' => now()->addMinutes(60),
            'status' => SiemAgentStatus::Pending,
        ]);

        $response = $this->get('/siem/install/' . $installTokenRaw);
        
        $response->assertStatus(200);
        $content = $response->getContent();
        
        // Assert it contains the embedded secret
        $this->assertStringContainsString($secret, $content);
        // Assert it contains the uuid
        $this->assertStringContainsString($uuid, $content);
    }

    public function test_heartbeat_requires_valid_credentials()
    {
        $user = User::factory()->create();
        
        $uuid = (string) Str::uuid();
        $secret = 'aegis_' . bin2hex(random_bytes(24));
        
        $agent = SiemAgent::create([
            'user_id' => $user->id,
            'uuid' => $uuid,
            'name' => 'Test Agent',
            'secret_hash' => hash('sha256', $secret),
            'secret_last4' => substr($secret, -4),
            'status' => SiemAgentStatus::Pending,
        ]);

        // Missing headers
        $this->postJson('/api/siem/heartbeat')->assertStatus(401);

        // Wrong secret
        $this->postJson('/api/siem/heartbeat', [], [
            'X-Agent-Id' => $uuid,
            'Authorization' => 'Bearer wrong_secret',
        ])->assertStatus(401);

        // Correct secret
        $this->postJson('/api/siem/heartbeat', [], [
            'X-Agent-Id' => $uuid,
            'Authorization' => 'Bearer ' . $secret,
        ])->assertStatus(200);

        // Agent should be active now
        $this->assertEquals(SiemAgentStatus::Active, $agent->fresh()->status);
    }
}
