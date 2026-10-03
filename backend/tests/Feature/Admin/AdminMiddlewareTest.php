<?php

declare(strict_types=1);

namespace Tests\Feature\Admin;

use App\Http\Middleware\EnsureUserIsAdmin;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;
use Tests\TestCase;

class AdminMiddlewareTest extends TestCase
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

    public function test_admin_middleware_allows_admin_user(): void
    {
        $middleware = new EnsureUserIsAdmin();

        $request = Request::create('/admin/dashboard', 'GET');
        $request->setUserResolver(fn () => $this->adminUser);

        $response = $middleware->handle($request, fn ($request) => response('OK', 200));

        $this->assertEquals(200, $response->getStatusCode());
    }

    public function test_admin_middleware_blocks_regular_user(): void
    {
        $this->actingAs($this->regularUser, 'web');

        $response = $this->get(route('admin.dashboard'));

        $response->assertStatus(403);
    }

    public function test_admin_middleware_redirects_unauthenticated_user(): void
    {
        $middleware = new EnsureUserIsAdmin();

        $request = Request::create('/admin/dashboard', 'GET');
        $request->setUserResolver(fn () => null);

        $response = $middleware->handle($request, fn ($request) => response('OK', 200));

        $this->assertEquals(302, $response->getStatusCode());
        $this->assertStringContainsString(route('admin.login'), $response->getTargetUrl());
    }

    public function test_admin_middleware_registered_in_kernel(): void
    {
        $kernel = $this->app->make(\Illuminate\Contracts\Http\Kernel::class);
        $middleware = $kernel->getRouteMiddleware();

        $this->assertArrayHasKey('admin', $middleware);
        $this->assertEquals(\App\Http\Middleware\EnsureUserIsAdmin::class, $middleware['admin']);
    }
}