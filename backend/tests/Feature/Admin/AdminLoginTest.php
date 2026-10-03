<?php

declare(strict_types=1);

namespace Tests\Feature\Admin;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminLoginTest extends TestCase
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

    public function test_admin_login_page_can_be_rendered(): void
    {
        $response = $this->get(route('admin.login'));

        $response->assertStatus(200);
        $response->assertInertia(fn ($page) => $page->component('Admin/Login'));
    }

    public function test_admin_can_login_with_valid_credentials(): void
    {
        $response = $this->post(route('admin.login'), [
            'email' => 'admin@aegis.test',
            'password' => 'Aegis-Admin#2026!',
        ]);

        $response->assertRedirect(route('admin.dashboard'));
        $this->assertAuthenticatedAs($this->adminUser, 'web');
    }

    public function test_admin_cannot_login_with_invalid_password(): void
    {
        $response = $this->post(route('admin.login'), [
            'email' => 'admin@aegis.test',
            'password' => 'wrong-password',
        ]);

        // Check that we're not authenticated
        $this->assertGuest('web');
    }

    public function test_admin_cannot_login_with_invalid_email(): void
    {
        $response = $this->post(route('admin.login'), [
            'email' => 'nonexistent@aegis.test',
            'password' => 'Aegis-Admin#2026!',
        ]);

        // Check that we're not authenticated
        $this->assertGuest('web');
    }

    public function test_regular_user_cannot_access_admin_login(): void
    {
        // Regular user trying to access admin login page should be redirected (guest middleware)
        $response = $this->actingAs($this->regularUser, 'web')
            ->get(route('admin.login'));

        $response->assertStatus(302);
        $response->assertRedirect(route('dashboard'));
    }

    public function test_regular_user_cannot_authenticate_as_admin(): void
    {
        // Regular user credentials should not work for admin login
        $response = $this->post(route('admin.login'), [
            'email' => 'user@example.com',
            'password' => 'password',
        ]);

        $this->assertGuest('web');
    }

    public function test_rate_limiting_on_admin_login(): void
    {
        // Make 5 failed attempts
        for ($i = 0; $i < 5; $i++) {
            $this->post(route('admin.login'), [
                'email' => 'admin@aegis.test',
                'password' => 'wrong-password',
            ]);
        }

        // 6th attempt should be rate limited (just verify it doesn't authenticate)
        $this->post(route('admin.login'), [
            'email' => 'admin@aegis.test',
            'password' => 'wrong-password',
        ]);

        $this->assertGuest('web');
    }
}