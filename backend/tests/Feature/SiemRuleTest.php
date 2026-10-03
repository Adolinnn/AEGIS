<?php

namespace Tests\Feature;

use App\Siem\Rules\SshBruteForceRule;
use App\Siem\Rules\WebScannerUaRule;
use App\Models\SiemEvent;
use App\Models\SiemAgent;
use App\Models\User;
use Carbon\Carbon;
use Tests\TestCase;
use Illuminate\Foundation\Testing\RefreshDatabase;

class SiemRuleTest extends TestCase
{
    use RefreshDatabase;

    public function test_ssh_brute_force_rule_triggers_on_failures()
    {
        $user = User::factory()->create();
        $agent = SiemAgent::create(['user_id' => $user->id, 'name' => 'Test', 'uuid' => 'test-uuid', 'secret_hash' => 'test', 'secret_last4' => 'test', 'status' => 'active']);
        
        // Create 5 failure events in 1 minute
        for ($i = 0; $i < 5; $i++) {
            SiemEvent::create([
                'user_id' => $user->id,
                'agent_id' => $agent->id,
                'occurred_at' => Carbon::now()->subSeconds($i * 10),
                'received_at' => Carbon::now(),
                'source' => 'auth',
                'event_type' => 'ssh_auth_failed',
                'src_ip' => '1.2.3.4'
            ]);
        }

        $rule = new SshBruteForceRule();
        $evidence = $rule->evaluate($agent->id, '1.2.3.4', Carbon::now());

        $this->assertNotNull($evidence);
        $this->assertCount(5, $evidence);
    }

    public function test_ssh_brute_force_rule_does_not_trigger_under_threshold()
    {
        $user = User::factory()->create();
        $agent = SiemAgent::create(['user_id' => $user->id, 'name' => 'Test', 'uuid' => 'test-uuid2', 'secret_hash' => 'test', 'secret_last4' => 'test', 'status' => 'active']);
        
        // Create 3 failure events in 1 minute
        for ($i = 0; $i < 3; $i++) {
            SiemEvent::create([
                'user_id' => $user->id,
                'agent_id' => $agent->id,
                'occurred_at' => Carbon::now()->subSeconds($i * 10),
                'received_at' => Carbon::now(),
                'source' => 'auth',
                'event_type' => 'ssh_auth_failed',
                'src_ip' => '1.2.3.4'
            ]);
        }

        $rule = new SshBruteForceRule();
        $evidence = $rule->evaluate($agent->id, '1.2.3.4', Carbon::now());

        $this->assertNull($evidence);
    }

    public function test_web_scanner_ua_rule_triggers()
    {
        $user = User::factory()->create();
        $agent = SiemAgent::create(['user_id' => $user->id, 'name' => 'Test', 'uuid' => 'test-uuid3', 'secret_hash' => 'test', 'secret_last4' => 'test', 'status' => 'active']);
        
        SiemEvent::create([
            'user_id' => $user->id,
            'agent_id' => $agent->id,
            'occurred_at' => Carbon::now(),
            'received_at' => Carbon::now(),
            'source' => 'web_access',
            'event_type' => 'web_access',
            'src_ip' => '5.6.7.8',
            'fields' => ['user_agent' => 'sqlmap/1.7']
        ]);

        $rule = new WebScannerUaRule();
        $evidence = $rule->evaluate($agent->id, '5.6.7.8', Carbon::now());

        $this->assertNotNull($evidence);
        $this->assertCount(1, $evidence);
    }
}
