<?php

declare(strict_types=1);

namespace Tests\Unit\Services;

use App\Models\Report;
use App\Models\ScanRun;
use App\Models\Target;
use App\Models\User;
use App\Services\ReportAgentService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class ReportAgentServiceTest extends TestCase
{
    use RefreshDatabase;

    protected function makeRunWithFindings(): ScanRun
    {
        $user = User::factory()->create();
        $target = Target::factory()->create(['user_id' => $user->id]);
        $run = ScanRun::factory()->create([
            'user_id' => $user->id,
            'target_id' => $target->id,
        ]);

        $run->findings()->create([
            'target_id' => $target->id,
            'tool' => 'nmap',
            'title' => 'Open port 21/tcp (ftp)',
            'category' => 'risky-service',
            'severity' => 'medium',
            'description' => 'FTP exposed',
            'detected_at' => now(),
        ]);

        return $run;
    }

    public function test_generates_report_from_openai_response(): void
    {
        config(['services.llm.provider' => 'openai']);
        config(['services.llm.openai.key' => 'test-key']);
        config(['services.llm.openai.model' => 'gpt-4o-mini']);

        Http::fake([
            'api.openai.com/*' => Http::response([
                'choices' => [
                    ['message' => ['content' => json_encode([
                        'executive_summary' => 'One medium finding detected.',
                        'overall_risk_score' => 50,
                        'risk_level' => 'medium',
                        'prioritized_findings' => [
                            ['title' => 'FTP exposed', 'severity' => 'medium', 'why_it_matters' => 'cleartext', 'recommendation' => 'firewall'],
                        ],
                        'remediation_plan' => ['Restrict FTP'],
                        'methodology' => 'nmap scan',
                    ])]],
                ],
            ]),
        ]);

        $run = $this->makeRunWithFindings();
        $report = (new ReportAgentService())->generateForRun($run);

        $this->assertNotNull($report);
        $this->assertSame('openai', $report->provider);
        $this->assertSame('medium', $report->risk_level);
        $this->assertSame(50, $report->risk_score);
        $this->assertSame('One medium finding detected.', $report->payload['executive_summary']);
        $this->assertSame(1, Report::count());
    }

    public function test_skips_when_no_api_key(): void
    {
        config(['services.llm.openai.key' => null]);
        config(['services.llm.anthropic.key' => null]);

        $run = $this->makeRunWithFindings();
        $report = (new ReportAgentService())->generateForRun($run);

        $this->assertNull($report);
        $this->assertSame(0, Report::count());
    }

    public function test_skips_when_no_findings(): void
    {
        config(['services.llm.openai.key' => 'test-key']);

        $user = User::factory()->create();
        $target = Target::factory()->create(['user_id' => $user->id]);
        $run = ScanRun::factory()->create(['user_id' => $user->id, 'target_id' => $target->id]);

        $this->assertNull((new ReportAgentService())->generateForRun($run));
    }
}
