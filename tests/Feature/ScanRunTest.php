<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Enums\ToolName;
use App\Models\ScanRun;
use App\Models\Target;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ScanRunTest extends TestCase
{
    use RefreshDatabase;

    public function test_authenticated_user_can_start_scan_run_with_consent(): void
    {
        $user = User::factory()->create();
        $target = Target::factory()->create([
            'user_id' => $user->id,
            'is_authorized' => true,
        ]);

        $selected = ToolName::installed();

        $response = $this->actingAs($user)->post(route('targets.scan-run', $target), [
            'tools' => array_map(fn ($t) => $t->value, $selected),
            'consent' => '1',
        ]);

        $response->assertRedirect();
        $this->assertDatabaseHas('scan_runs', [
            'user_id' => $user->id,
            'target_id' => $target->id,
            'consent_attested' => true,
        ]);

        $run = ScanRun::where('target_id', $target->id)->first();
        $this->assertNotNull($run);
        $this->assertCount(count($selected), $run->selected_tools);
    }

    public function test_scan_run_requires_consent(): void
    {
        $user = User::factory()->create();
        $target = Target::factory()->create([
            'user_id' => $user->id,
            'is_authorized' => true,
        ]);

        $response = $this->actingAs($user)->post(route('targets.scan-run', $target), [
            'tools' => [ToolName::Nmap->value],
            // no consent
        ]);

        $response->assertSessionHasErrors('consent');
        $this->assertDatabaseCount('scan_runs', 0);
    }

    public function test_scan_run_rejected_when_target_not_authorized(): void
    {
        $user = User::factory()->create();
        $target = Target::factory()->create([
            'user_id' => $user->id,
            'is_authorized' => false,
        ]);

        $response = $this->actingAs($user)->post(route('targets.scan-run', $target), [
            'tools' => [ToolName::Nmap->value],
            'consent' => '1',
        ]);

        $response->assertRedirect();
        $response->assertSessionHasErrors('scan');
        $this->assertDatabaseCount('scan_runs', 0);
    }

    public function test_user_cannot_scan_another_users_target(): void
    {
        $owner = User::factory()->create();
        $attacker = User::factory()->create();
        $target = Target::factory()->create([
            'user_id' => $owner->id,
            'is_authorized' => true,
        ]);

        $response = $this->actingAs($attacker)->post(route('targets.scan-run', $target), [
            'tools' => [ToolName::Nmap->value],
            'consent' => '1',
        ]);

        $response->assertForbidden();
        $this->assertDatabaseCount('scan_runs', 0);
    }

    public function test_index_lists_own_runs_only(): void
    {
        $user = User::factory()->create();
        $other = User::factory()->create();
        ScanRun::factory()->create(['user_id' => $user->id]);
        ScanRun::factory()->create(['user_id' => $other->id]);

        $response = $this->actingAs($user)->get(route('scan-runs.index'));
        $response->assertOk();

        // Only the current user's run should be returned.
        $response->assertInertia(fn ($page) => $page
            ->component('ScanRuns/Index')
            ->has('runs.data', 1)
        );
    }
}
