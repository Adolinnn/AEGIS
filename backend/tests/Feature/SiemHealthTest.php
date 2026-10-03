<?php

namespace Tests\Feature;

use Tests\TestCase;

class SiemHealthTest extends TestCase
{
    public function test_siem_health_endpoint_returns_ok(): void
    {
        $response = $this->getJson('/api/siem/health');

        $response->assertStatus(200)
                 ->assertJsonPath('status', 'ok')
                 ->assertJsonStructure(['status', 'time']);
    }
}
