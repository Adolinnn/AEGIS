<?php

declare(strict_types=1);

namespace Tests\Feature\Services;

use App\Enums\ToolName;
use App\Enums\VulnerabilitySeverity;
use App\Models\Finding;
use App\Models\Target;
use App\Models\User;
use App\Services\AiRemediationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class AiRemediationServiceTest extends TestCase
{
    use RefreshDatabase;

    public function test_configures_base_url_and_api_key_per_provider(): void
    {
        config(['services.llm.provider' => 'openai']);
        config(['services.llm.openai.key' => 'sk-openai-test']);
        config(['services.llm.openai.base_url' => 'https://api.openai.com/v1']);

        $service = app(AiRemediationService::class);

        Http::fake([
            'https://api.openai.com/v1/chat/completions' => Http::response([
                'choices' => [
                    ['message' => ['content' => "```php\n// FILE: test.php\necho 'safe';\n```"]],
                ],
            ], 200),
        ]);

        $user = User::factory()->create();
        $target = Target::factory()->create(['user_id' => $user->id, 'domain_url' => 'https://example.com']);
        $scanRun = \App\Models\ScanRun::create([
            'user_id' => $user->id,
            'target_id' => $target->id,
            'status' => \App\Enums\ScanRunStatus::Completed,
            'selected_tools' => ['builtin'],
            'consent_attested' => true,
        ]);
        $finding = Finding::create([
            'scan_run_id' => $scanRun->id,
            'target_id' => $target->id,
            'tool' => ToolName::Builtin,
            'title' => 'Reflected XSS',
            'category' => 'xss',
            'severity' => VulnerabilitySeverity::High,
            'description' => 'XSS vulnerability detected',
            'evidence' => 'alert(1)',
            'recommendation' => 'Escape output',
            'detected_at' => now(),
        ]);

        $patch = $service->generatePatch($finding);

        $this->assertNotNull($patch);
        $this->assertStringContainsString("echo 'safe';", $patch);

        Http::assertSent(function ($request) {
            return $request->url() === 'https://api.openai.com/v1/chat/completions'
                && $request->hasHeader('Authorization', 'Bearer sk-openai-test');
        });
    }

    public function test_supports_anthropic_messages_endpoint(): void
    {
        config(['services.llm.provider' => 'anthropic']);
        config(['services.llm.anthropic.key' => 'sk-ant-test']);
        config(['services.llm.anthropic.base_url' => 'https://api.anthropic.com/v1']);

        $service = app(AiRemediationService::class);

        Http::fake([
            'https://api.anthropic.com/v1/messages' => Http::response([
                'content' => [
                    ['type' => 'text', 'text' => "```php\n// FILE: fix.php\n\$clean = htmlspecialchars(\$input);\n```"],
                ],
            ], 200),
        ]);

        $user = User::factory()->create();
        $target = Target::factory()->create(['user_id' => $user->id, 'domain_url' => 'https://example.com']);
        $scanRun = \App\Models\ScanRun::create([
            'user_id' => $user->id,
            'target_id' => $target->id,
            'status' => \App\Enums\ScanRunStatus::Completed,
            'selected_tools' => ['builtin'],
            'consent_attested' => true,
        ]);
        $finding = Finding::create([
            'scan_run_id' => $scanRun->id,
            'target_id' => $target->id,
            'tool' => ToolName::Builtin,
            'title' => 'Reflected XSS',
            'category' => 'xss',
            'severity' => VulnerabilitySeverity::High,
            'description' => 'XSS detected',
            'evidence' => 'alert(1)',
            'recommendation' => 'Escape output',
            'detected_at' => now(),
        ]);

        $patch = $service->generatePatch($finding);

        $this->assertNotNull($patch);
        $this->assertStringContainsString('htmlspecialchars', $patch);

        Http::assertSent(function ($request) {
            return $request->url() === 'https://api.anthropic.com/v1/messages'
                && $request->hasHeader('x-api-key', 'sk-ant-test')
                && $request->hasHeader('anthropic-version', '2023-06-01');
        });
    }

    public function test_for_user_overrides_provider_and_settings(): void
    {
        config(['services.llm.provider' => 'openai']);
        config(['services.llm.openai.key' => 'server-key']);

        $user = User::factory()->create([
            'llm_provider' => 'openrouter',
            'llm_api_key' => 'user-openrouter-key',
            'llm_model' => 'anthropic/claude-3.5-sonnet',
            'llm_base_url' => 'https://openrouter.ai/api/v1',
        ]);

        $service = app(AiRemediationService::class)->forUser($user);

        Http::fake([
            'https://openrouter.ai/api/v1/chat/completions' => Http::response([
                'choices' => [
                    ['message' => ['content' => "```php\n// FILE: patch.php\n\$safe = true;\n```"]],
                ],
            ], 200),
        ]);

        $target = Target::factory()->create(['user_id' => $user->id, 'domain_url' => 'https://example.com']);
        $scanRun = \App\Models\ScanRun::create([
            'user_id' => $user->id,
            'target_id' => $target->id,
            'status' => \App\Enums\ScanRunStatus::Completed,
            'selected_tools' => ['builtin'],
            'consent_attested' => true,
        ]);
        $finding = Finding::create([
            'scan_run_id' => $scanRun->id,
            'target_id' => $target->id,
            'tool' => ToolName::Builtin,
            'title' => 'Misconfig',
            'category' => 'misconfig',
            'severity' => VulnerabilitySeverity::Low,
            'description' => 'Header missing',
            'detected_at' => now(),
        ]);

        $patch = $service->generatePatch($finding);

        $this->assertNotNull($patch);
        Http::assertSent(function ($request) {
            return $request->url() === 'https://openrouter.ai/api/v1/chat/completions'
                && $request->hasHeader('Authorization', 'Bearer user-openrouter-key');
        });
    }
}
