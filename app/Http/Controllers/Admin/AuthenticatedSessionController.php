<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Enums\ScanType;
use App\Enums\VulnerabilitySeverity;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\AdminLoginRequest;
use App\Models\Target;
use App\Models\User;
use App\Models\VulnerabilityLog;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class AuthenticatedSessionController extends Controller
{
    public function create(): Response
    {
        return Inertia::render('Admin/Login', [
            'status' => session('status'),
        ]);
    }

    public function store(AdminLoginRequest $request): RedirectResponse
    {
        $request->authenticate();

        $request->session()->regenerate();

        return redirect()->intended(route('admin.dashboard', absolute: false));
    }

    public function destroy(Request $request): RedirectResponse
    {
        Auth::guard('web')->logout();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect()->route('admin.login');
    }

    public function dashboard(Request $request): Response
    {
        return Inertia::render('Admin/Dashboard', [
            'admin' => $request->user()->only(['id', 'name', 'email']),
            'stats' => [
                'total_users' => User::count(),
                'total_targets' => Target::count(),
                'active_targets' => Target::where('is_active', true)->count(),
                'total_vulnerabilities' => VulnerabilityLog::count(),
                'unresolved_vulnerabilities' => VulnerabilityLog::where('is_resolved', false)->count(),
            ],
            'recentUsers' => User::latest()->limit(10)->get(['id', 'name', 'email', 'subscription_tier', 'created_at']),
            'recentTargets' => Target::with('user:id,name,email')->latest()->limit(10)->get(['id', 'user_id', 'domain_url', 'display_name', 'is_active', 'last_scanned_at']),
            'recentVulnerabilities' => VulnerabilityLog::with('target:id,domain_url,user_id')->latest('detected_at')->limit(15)->get(),
            'severities' => VulnerabilitySeverity::cases(),
            'scanTypes' => ScanType::cases(),
        ]);
    }
}