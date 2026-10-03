<?php

declare(strict_types=1);

namespace Tests\Feature\Admin;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminRoutesTest extends TestCase
{
    use RefreshDatabase;

    protected User $adminUser;

    protected function setUp(): void
    {
        parent::setUp();

        $this->adminUser = User::factory()->create([
            'email' => 'admin@aegis.test',
            'password' => \Illuminate\Support\Facades\Hash::make('Aegis-Admin#2026!'),
            'is_admin' => true,
            'email_verified_at' => now(),
        ]);
    }

    public function test_admin_login_route_exists(): void
    {
        $this->assertTrue(route('admin.login') !== null);
        $this->assertStringContainsString('/admin/login', route('admin.login'));
    }

    public function test_admin_dashboard_route_exists(): void
    {
        $this->assertTrue(route('admin.dashboard') !== null);
        $this->assertStringContainsString('/admin/dashboard', route('admin.dashboard'));
    }

    public function test_admin_logout_route_exists(): void
    {
        $this->assertTrue(route('admin.logout') !== null);
        $this->assertStringContainsString('/admin/logout', route('admin.logout'));
    }

    public function test_admin_routes_have_admin_prefix(): void
    {
        $loginRoute = route('admin.login');
        $dashboardRoute = route('admin.dashboard');
        $logoutRoute = route('admin.logout');

        $this->assertStringStartsWith(url('/admin'), $loginRoute);
        $this->assertStringStartsWith(url('/admin'), $dashboardRoute);
        $this->assertStringStartsWith(url('/admin'), $logoutRoute);
    }

    public function test_admin_routes_use_correct_middleware(): void
    {
        $routes = $this->app['router']->getRoutes();

        $loginRoute = $routes->getByName('admin.login');
        $dashboardRoute = $routes->getByName('admin.dashboard');
        $logoutRoute = $routes->getByName('admin.logout');

        $this->assertNotNull($loginRoute);
        $this->assertNotNull($dashboardRoute);
        $this->assertNotNull($logoutRoute);

        // Login should have guest middleware
        $loginMiddleware = $loginRoute->middleware();
        $this->assertTrue(in_array('guest', $loginMiddleware) || in_array('guest:web', $loginMiddleware));

        // Dashboard should have admin middleware (which handles auth check internally)
        $dashboardMiddleware = $dashboardRoute->middleware();
        $this->assertContains('admin', $dashboardMiddleware);

        // Logout should have admin middleware
        $logoutMiddleware = $logoutRoute->middleware();
        $this->assertContains('admin', $logoutMiddleware);
    }

    public function test_admin_routes_are_registered(): void
    {
        $this->assertTrue($this->app['router']->has('admin.login'));
        $this->assertTrue($this->app['router']->has('admin.dashboard'));
        $this->assertTrue($this->app['router']->has('admin.logout'));
    }
}