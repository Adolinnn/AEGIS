<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Enums\SubscriptionTier;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Self-service subscription management. There is no payment gateway wired
 * up — "subscribing" just activates the chosen tier on the account — but the
 * plan structure, limits, and eligibility rules (e.g. Student requiring a
 * .edu email) are enforced for real.
 */
class BillingController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();

        return Inertia::render('Billing/Index', [
            'currentTier' => $user->subscription_tier->value,
            'plans' => collect(SubscriptionTier::subscribable())->map(fn (SubscriptionTier $tier) => [
                'value' => $tier->value,
                'label' => $tier->label(),
                'tagline' => $tier->tagline(),
                'price' => $tier->price(),
                'price_note' => $tier->priceNote(),
                'features' => $tier->features(),
                'max_seats' => $tier->maxSeats(),
            ])->values(),
            'freePlan' => [
                'value' => SubscriptionTier::Free->value,
                'label' => SubscriptionTier::Free->label(),
                'tagline' => SubscriptionTier::Free->tagline(),
                'price' => SubscriptionTier::Free->price(),
                'features' => SubscriptionTier::Free->features(),
            ],
            'hasEduEmail' => $user->hasEduEmail(),
        ]);
    }

    public function subscribe(Request $request): RedirectResponse
    {
        $request->validate([
            'tier' => ['required', 'string', 'in:' . implode(',', array_map(
                fn (SubscriptionTier $t) => $t->value,
                SubscriptionTier::subscribable()
            ))],
        ]);

        $tier = SubscriptionTier::from($request->string('tier')->toString());
        $user = $request->user();

        if ($tier === SubscriptionTier::Student && ! $user->hasEduEmail()) {
            return back()->withErrors([
                'tier' => 'The Student plan requires a .edu email address on your account.',
            ]);
        }

        $user->update(['subscription_tier' => $tier]);

        return back()->with('success', "You're now on the {$tier->label()} plan.");
    }

    public function cancel(Request $request): RedirectResponse
    {
        $request->user()->update(['subscription_tier' => SubscriptionTier::Free]);

        return back()->with('success', 'Subscription cancelled — moved back to the Free plan.');
    }
}
