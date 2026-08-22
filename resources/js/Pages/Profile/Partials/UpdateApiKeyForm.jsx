import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import TextInput from '@/Components/TextInput';
import { Transition } from '@headlessui/react';
import { useForm } from '@inertiajs/react';
import { useRef } from 'react';

export default function UpdateApiKeyForm({
    hasLlmApiKey,
    llmProvider,
    userLlmProvider,
    userLlmBaseUrl,
    userLlmModel,
    status,
    className = '',
}) {
    const keyInput = useRef(null);

    const { data, setData, patch, errors, processing, recentlySuccessful, reset } = useForm({
        llm_api_key: '',
        llm_provider: userLlmProvider ?? '',
        llm_base_url: userLlmBaseUrl ?? '',
        llm_model: userLlmModel ?? '',
    });

    const submit = (e) => {
        e.preventDefault();
        patch(route('profile.api-key.update'), {
            preserveScroll: true,
            onSuccess: () => reset('llm_api_key'),
        });
    };

    const clearAll = () => {
        setData({ llm_api_key: '', llm_provider: '', llm_base_url: '', llm_model: '' });
        patch(route('profile.api-key.update'), {
            preserveScroll: true,
            data: { llm_api_key: '', llm_provider: '', llm_base_url: '', llm_model: '' },
            onSuccess: () => reset('llm_api_key'),
        });
    };

    return (
        <section className={className}>
            <header>
                <h2 className="text-lg font-medium text-gray-100">AI Provider Settings</h2>
                <p className="mt-1 text-sm text-gray-400">
                    Used for AI security reports, patch suggestions, and the chat assistant. By default the
                    server's provider is used (<span className="font-mono text-gray-300">{llmProvider}</span>).
                    Set these to override it with your own account — your own API key, base URL, and model —
                    stored encrypted and used instead of the server's.
                </p>
            </header>

            <form onSubmit={submit} className="mt-6 space-y-6">
                <div>
                    <InputLabel htmlFor="llm_provider" value="Provider" />
                    <select
                        id="llm_provider"
                        value={data.llm_provider}
                        onChange={(e) => setData('llm_provider', e.target.value)}
                        className="mt-1 block w-full rounded-md border-gray-700 bg-gray-800 text-gray-100 shadow-sm focus:border-red-500 focus:ring-red-500"
                    >
                        <option value="">Use server default ({llmProvider})</option>
                        <option value="openai">OpenAI (or OpenAI-compatible)</option>
                        <option value="openrouter">OpenRouter</option>
                        <option value="anthropic">Anthropic</option>
                    </select>
                    <InputError message={errors.llm_provider} className="mt-2" />
                </div>

                <div>
                    <InputLabel htmlFor="llm_base_url" value="Base URL (optional)" />
                    <TextInput
                        id="llm_base_url"
                        className="mt-1 block w-full font-mono"
                        value={data.llm_base_url}
                        onChange={(e) => setData('llm_base_url', e.target.value)}
                        placeholder="https://openrouter.ai/api/v1"
                        autoComplete="off"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                        Leave blank to use the provider's default endpoint. Set this to point at a different
                        OpenAI-compatible endpoint (self-hosted proxy, Azure OpenAI, etc.) for OpenAI/OpenRouter providers.
                    </p>
                    <InputError message={errors.llm_base_url} className="mt-2" />
                </div>

                <div>
                    <InputLabel htmlFor="llm_model" value="Model (optional)" />
                    <TextInput
                        id="llm_model"
                        className="mt-1 block w-full font-mono"
                        value={data.llm_model}
                        onChange={(e) => setData('llm_model', e.target.value)}
                        placeholder="anthropic/claude-3.5-sonnet"
                        autoComplete="off"
                    />
                    <InputError message={errors.llm_model} className="mt-2" />
                </div>

                <div>
                    <InputLabel htmlFor="llm_api_key" value={hasLlmApiKey ? 'Replace API key' : 'API key'} />

                    <TextInput
                        id="llm_api_key"
                        ref={keyInput}
                        type="password"
                        className="mt-1 block w-full font-mono"
                        value={data.llm_api_key}
                        onChange={(e) => setData('llm_api_key', e.target.value)}
                        placeholder={hasLlmApiKey ? '•••••••••••••••••••••• (saved — enter a new key to replace)' : 'sk-or-v1-...'}
                        autoComplete="off"
                    />

                    <InputError message={errors.llm_api_key} className="mt-2" />
                </div>

                <div className="flex items-center gap-4">
                    <PrimaryButton disabled={processing}>Save</PrimaryButton>

                    {(hasLlmApiKey || userLlmProvider || userLlmBaseUrl || userLlmModel) && (
                        <SecondaryButton type="button" onClick={clearAll} disabled={processing}>
                            Reset to server default
                        </SecondaryButton>
                    )}

                    <Transition
                        show={recentlySuccessful}
                        enter="transition ease-in-out"
                        enterFrom="opacity-0"
                        leave="transition ease-in-out"
                        leaveTo="opacity-0"
                    >
                        <p className="text-sm text-gray-400">Saved.</p>
                    </Transition>
                </div>
            </form>
        </section>
    );
}
