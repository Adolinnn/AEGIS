<?php

declare(strict_types=1);

namespace Tests\Feature\Admin;

use App\Models\Target;
use App\Models\UptimeLog;
use App\Models\User;
use App\Models\Finding;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminDashboardTest extends TestCase
{
    use RefreshDatabase;

    protected User $adminUser;
    protected User $regularUser;

    protected function setUp(): void
    {
        parent::setUp();

        $this->adminUser = User::factory()->create([
            'email' => 'admin@aegis.test',
            'password' => \Illuminate\Support\Facades\Hash::make('Aegis-Admin#2026!'),
            'is_admin' => true,
            'email_verified_at' => now(),
        ]);

        $this->regularUser = User::factory()->create([
            'email' => 'user@example.com',
            'password' => \Illuminate\Support\Facades\Hash::make('password'),
            'is_admin' => false,
            'email_verified_at' => now(),
        ]);
    }

    public function test_admin_can_access_dashboard_after_login(): void
    {
        $this->actingAs($this->adminUser, 'web');

        $response = $this->get(route('admin.dashboard'));

        $response->assertStatus(200);
        $response->assertInertia(fn ($page) => $page->component('Admin/Dashboard'));
    }

    public function test_admin_dashboard_shows_correct_stats(): void
    {
        // Create test data
        User::factory()->count(5)->create();
        Target::factory()->count(10)->create(['is_active' => true]);
        Target::factory()->count(3)->create(['is_active' => false]);
        Finding::factory()->count(20)->create(['is_resolved' => false]);
        Finding::factory()->count(5)->resolved()->create();

        $this->actingAs($this->adminUser, 'web');

        $response = $this->get(route('admin.dashboard'));

        $response->assertStatus(200);
        $response->assertInertia(fn ($page) =>
            $page->component('Admin/Dashboard')
                ->has('stats', 5)
                ->has('recentUsers', 10)
                ->has('recentTargets', 10)
                ->has('recentVulnerabilities', 15)
        );
    }

    public function test_regular_user_cannot_access_admin_dashboard(): void
    {
        $this->actingAs($this->regularUser, 'web');

        $response = $this->get(route('admin.dashboard'));

        $response->assertStatus(403);
    }

    public function test_unauthenticated_user_redirected_to_admin_login(): void
    {
        $response = $this->get(route('admin.dashboard'));

        // Unauthenticated users should be redirected to admin login
        $response->assertRedirect(route('admin.login'));
    }

    public function test_admin_can_logout(): void
    {
        $this->actingAs($this->adminUser, 'web');

        $response = $this->post(route('admin.logout'));

        $response->assertRedirect(route('admin.login'));
        $this->assertGuest('web');
    }
}