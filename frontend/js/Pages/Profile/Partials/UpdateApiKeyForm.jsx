import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';
import { Transition } from '@headlessui/react';
import { useForm } from '@inertiajs/react';
import { useRef } from 'react';
import { CheckCircleIcon, ArrowPathIcon } from '@heroicons/react/24/outline';

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
            data: { llm_api_key: '', llm_provider: '', llm_base_url: '', llm_model: '', clear_all: true },
            onSuccess: () => reset('llm_api_key'),
        });
    };

    return (
        <section className={className}>
            <header className="mb-8">
                <p className="mt-1 text-sm font-sans font-medium text-slate-400 leading-relaxed">
                    Used for AI security reports, patch suggestions, and the chat assistant. By default the
                    server's provider is used (<span className="font-mono text-exec-info bg-exec-info/10 px-1.5 py-0.5 rounded">{llmProvider}</span>).
                    Set these to override it with your own account — your own API key, base URL, and model —
                    stored encrypted and used instead of the server's.
                </p>
            </header>

            <form onSubmit={submit} className="space-y-6">
                <div>
                    <InputLabel htmlFor="llm_provider" value="Provider" className="text-[10px] font-sans font-bold uppercase tracking-widest text-slate-400 mb-2" />
                    <select
                        id="llm_provider"
                        value={data.llm_provider}
                        onChange={(e) => setData('llm_provider', e.target.value)}
                        className="mt-1 block w-full bg-black/30 border-white/[0.1] text-white focus:border-exec-info focus:ring-exec-info rounded-xl h-11 px-4 transition-colors font-sans"
                    >
                        <option value="" className="bg-[#050a16] text-slate-300">Use server default ({llmProvider})</option>
                        <option value="openai" className="bg-[#050a16] text-slate-300">OpenAI (or OpenAI-compatible)</option>
                        <option value="openrouter" className="bg-[#050a16] text-slate-300">OpenRouter</option>
                        <option value="anthropic" className="bg-[#050a16] text-slate-300">Anthropic</option>
                    </select>
                    <InputError message={errors.llm_provider} className="mt-2 text-exec-critical" />
                </div>

                <div>
                    <InputLabel htmlFor="llm_base_url" value="Base URL (optional)" className="text-[10px] font-sans font-bold uppercase tracking-widest text-slate-400 mb-2" />
                    <TextInput
                        id="llm_base_url"
                        className="mt-1 block w-full bg-black/30 border-white/[0.1] text-white focus:border-exec-info focus:ring-exec-info rounded-xl h-11 px-4 transition-colors font-mono text-sm placeholder:text-slate-600"
                        value={data.llm_base_url}
                        onChange={(e) => setData('llm_base_url', e.target.value)}
                        placeholder="https://openrouter.ai/api/v1"
                        autoComplete="off"
                    />
                    <p className="mt-2 text-xs font-sans text-slate-500">
                        Leave blank to use the provider's default endpoint. Set this to point at a different
                        OpenAI-compatible endpoint (self-hosted proxy, Azure OpenAI, etc.) for OpenAI/OpenRouter providers.
                    </p>
                    <InputError message={errors.llm_base_url} className="mt-2 text-exec-critical" />
                </div>

                <div>
                    <InputLabel htmlFor="llm_model" value="Model (optional)" className="text-[10px] font-sans font-bold uppercase tracking-widest text-slate-400 mb-2" />
                    <TextInput
                        id="llm_model"
                        className="mt-1 block w-full bg-black/30 border-white/[0.1] text-white focus:border-exec-info focus:ring-exec-info rounded-xl h-11 px-4 transition-colors font-mono text-sm placeholder:text-slate-600"
                        value={data.llm_model}
                        onChange={(e) => setData('llm_model', e.target.value)}
                        placeholder="anthropic/claude-3.5-sonnet"
                        autoComplete="off"
                    />
                    <InputError message={errors.llm_model} className="mt-2 text-exec-critical" />
                </div>

                <div>
                    <InputLabel htmlFor="llm_api_key" value={hasLlmApiKey ? 'Replace API key' : 'API key'} className="text-[10px] font-sans font-bold uppercase tracking-widest text-slate-400 mb-2" />

                    <TextInput
                        id="llm_api_key"
                        ref={keyInput}
                        type="password"
                        className="mt-1 block w-full bg-black/30 border-white/[0.1] text-white focus:border-exec-info focus:ring-exec-info rounded-xl h-11 px-4 transition-colors font-mono text-sm placeholder:text-slate-600"
                        value={data.llm_api_key}
                        onChange={(e) => setData('llm_api_key', e.target.value)}
                        placeholder={hasLlmApiKey ? '•••••••••••••••••••••• (saved — enter a new key to replace)' : 'sk-or-v1-...'}
                        autoComplete="off"
                    />

                    <InputError message={errors.llm_api_key} className="mt-2 text-exec-critical" />
                </div>

                <div className="flex flex-wrap items-center gap-4 pt-4">
                    <button 
                        disabled={processing}
                        className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl border border-exec-info/30 bg-exec-info/10 text-exec-info font-sans text-sm font-bold hover:bg-exec-info/20 transition-all hover:shadow-[0_0_15px_rgba(6,182,212,0.2)] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Save Configuration
                    </button>

                    {(hasLlmApiKey || userLlmProvider || userLlmBaseUrl || userLlmModel) && (
                        <button 
                            type="button" 
                            onClick={clearAll} 
                            disabled={processing}
                            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-white/[0.05] border border-white/[0.1] text-slate-400 font-sans text-sm font-bold hover:bg-white/[0.1] hover:text-white transition-all disabled:opacity-50"
                        >
                            <ArrowPathIcon className="w-4 h-4" />
                            Reset to Server Default
                        </button>
                    )}

                    <Transition
                        show={recentlySuccessful}
                        enter="transition ease-in-out duration-300"
                        enterFrom="opacity-0 translate-y-1"
                        enterTo="opacity-100 translate-y-0"
                        leave="transition ease-in-out duration-300"
                        leaveFrom="opacity-100"
                        leaveTo="opacity-0"
                    >
                        <p className="text-sm font-sans font-bold text-exec-info flex items-center gap-1.5">
                            <CheckCircleIcon className="w-4 h-4" />
                            Saved.
                        </p>
                    </Transition>
                </div>
            </form>
        </section>
    );
}
