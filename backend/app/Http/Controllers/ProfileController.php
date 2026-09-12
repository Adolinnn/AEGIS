<?php

namespace App\Http\Controllers;

use App\Http\Requests\ProfileUpdateRequest;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Redirect;
use Inertia\Inertia;
use Inertia\Response;

class ProfileController extends Controller
{
    /**
     * Display the user's profile form.
     */
    public function edit(Request $request): Response
    {
        $user = $request->user();

        return Inertia::render('Profile/Edit', [
            'mustVerifyEmail' => $request->user() instanceof MustVerifyEmail,
            'status' => session('status'),
            'hasLlmApiKey' => filled($user->llm_api_key),
            'llmProvider' => config('services.llm.provider', 'openai'),
            'userLlmProvider' => $user->llm_provider,
            'userLlmBaseUrl' => $user->llm_base_url,
            'userLlmModel' => $user->llm_model,
        ]);
    }

    /**
     * Save (or clear) the user's own AI provider settings — API key, and
     * optionally provider/base URL/model to fully override the server's
     * default provider rather than only swapping the key underneath it.
     * Used in place of the server-wide config when generating AI
     * reports/patches/chat replies for this user.
     */
    public function updateApiKey(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'llm_api_key' => ['nullable', 'string', 'max:512'],
            'llm_provider' => ['nullable', 'string', 'in:openai,anthropic,openrouter'],
            'llm_base_url' => ['nullable', 'string', 'url', 'max:512'],
            'llm_model' => ['nullable', 'string', 'max:255'],
        ]);

        $user = $request->user();
        $updates = [
            'llm_provider' => filled($validated['llm_provider'] ?? null) ? $validated['llm_provider'] : null,
            'llm_base_url' => filled($validated['llm_base_url'] ?? null) ? $validated['llm_base_url'] : null,
            'llm_model' => filled($validated['llm_model'] ?? null) ? $validated['llm_model'] : null,
        ];

        if (filled($validated['llm_api_key'] ?? null)) {
            $updates['llm_api_key'] = $validated['llm_api_key'];
        } elseif ($request->boolean('clear_key') || $request->boolean('clear_all')) {
            $updates['llm_api_key'] = null;
        }

        $user->update($updates);

        return Redirect::route('profile.edit')->with('status', 'api-key-updated');
    }

    /**
     * Update the user's profile information.
     */
    public function update(ProfileUpdateRequest $request): RedirectResponse
    {
        $request->user()->fill($request->validated());

        if ($request->user()->isDirty('email')) {
            $request->user()->email_verified_at = null;
        }

        $request->user()->save();

        return Redirect::route('profile.edit');
    }

    /**
     * Delete the user's account.
     */
    public function destroy(Request $request): RedirectResponse
    {
        $request->validate([
            'password' => ['required', 'current_password'],
        ]);

        $user = $request->user();

        Auth::logout();

        $user->delete();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return Redirect::to('/');
    }
}
