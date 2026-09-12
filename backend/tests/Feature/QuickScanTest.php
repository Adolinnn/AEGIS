<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Process;
use Tests\TestCase;

class QuickScanTest extends TestCase
{
    use RefreshDatabase;

    public function test_quick_scan_page_loads_for_authenticated_user(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->get(route('quick-scan.index'));

        $response->assertOk();
    }

    public function test_quick_scan_runs_tools_concurrently_and_returns_json(): void
    {
        $user = User::factory()->create();

        Process::fake([
            '*' => Process::result(
                output: 'Mock tool output for quick scan',
                exitCode: 0,
            ),
        ]);

        $response = $this->actingAs($user)->postJson(route('quick-scan.run'), [
            'target' => 'https://example.com',
        ]);

        $response->assertOk()
            ->assertJsonStructure([
                'target',
                'results' => [
                    '*' => [
                        'tool',
                        'label',
                        'installed',
                        'output',
                        'exit_code',
                        'timed_out',
                    ],
                ],
            ]);
    }
}
