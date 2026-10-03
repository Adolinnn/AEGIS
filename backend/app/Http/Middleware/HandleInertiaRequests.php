<?php

namespace App\Http\Middleware;

use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that is loaded on the first page visit.
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determine the current asset version.
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        $user = $request->user();

        return [
            ...parent::share($request),
            'auth' => [
                'user' => $user,
                'trial_active' => $user ? $user->hasActiveTrial() : false,
                'trial_days_remaining' => $user ? $user->trialDaysRemaining() : 0,
                'siem_badge_count' => $user ? \App\Models\SiemAlert::where('user_id', $user->id)->where('status', 'open')->whereIn('severity', ['high', 'critical'])->count() : 0,
            ],
            'flash' => [
                'new_agent' => $request->session()->get('new_agent'),
                'install_token' => $request->session()->get('install_token'),
                'rotated_agent' => $request->session()->get('rotated_agent'),
            ],
        ];
    }
}
