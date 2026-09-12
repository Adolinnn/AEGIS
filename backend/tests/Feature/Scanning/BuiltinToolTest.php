<?php

declare(strict_types=1);

namespace Tests\Feature\Scanning;

use App\Enums\ToolName;
use App\Models\Target;
use App\Models\User;
use App\Scanning\Contracts\SecurityTool;
use App\Scanning\ToolRegistry;
use App\Scanning\Tools\BuiltinTool;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class BuiltinToolTest extends TestCase
{
    use RefreshDatabase;

    public function test_name_is_builtin(): void
    {
        $tool = app(BuiltinTool::class);
        $this->assertSame(ToolName::Builtin, $tool->name());
    }

    public function test_registered_in_tool_registry(): void
    {
        $registry = app(ToolRegistry::class);
        $tool = $registry->get(ToolName::Builtin);

        $this->assertInstanceOf(SecurityTool::class, $tool);
        $this->assertInstanceOf(BuiltinTool::class, $tool);
    }

    public function test_build_command_returns_display_array(): void
    {
        $tool = app(BuiltinTool::class);
        $command = $tool->buildCommand('https://example.com');

        $this->assertCount(2, $command);
        $this->assertStringContainsString('built-in checks', $command[0]);
        $this->assertSame('https://example.com', $command[1]);
    }

    public function test_execute_runs_in_process_checks_and_returns_findings(): void
    {
        Http::fake([
            'https://example.com*' => Http::response('<html><head></head><body>No vulnerabilities</body></html>', 200, [
                'Server' => 'Apache/2.4.41',
            ]),
        ]);

        $user = User::factory()->create();
        $target = Target::factory()->create([
            'user_id' => $user->id,
            'domain_url' => 'https://example.com',
            'is_authorized' => true,
        ]);

        $tool = app(BuiltinTool::class);
        $result = $tool->execute($target);

        $this->assertArrayHasKey('output', $result);
        $this->assertArrayHasKey('findings', $result);
        $this->assertArrayHasKey('exitCode', $result);
        $this->assertSame(0, $result['exitCode']);
        $this->assertStringContainsString('Ran built-in HTTP checks', $result['output']);
    }
}
