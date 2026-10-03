import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';
import { Transition } from '@headlessui/react';
import { useForm } from '@inertiajs/react';
import { useRef } from 'react';
import { CheckCircleIcon } from '@heroicons/react/24/outline';

export default function UpdatePasswordForm({ className = '' }) {
    const passwordInput = useRef();
    const currentPasswordInput = useRef();

    const {
        data,
        setData,
        errors,
        put,
        reset,
        processing,
        recentlySuccessful,
    } = useForm({
        current_password: '',
        password: '',
        password_confirmation: '',
    });

    const updatePassword = (e) => {
        e.preventDefault();

        put(route('password.update'), {
            preserveScroll: true,
            onSuccess: () => reset(),
            onError: (errors) => {
                if (errors.password) {
                    reset('password', 'password_confirmation');
                    passwordInput.current.focus();
                }

                if (errors.current_password) {
                    reset('current_password');
                    currentPasswordInput.current.focus();
                }
            },
        });
    };

    return (
        <section className={className}>
            <header className="mb-8">
                <p className="mt-1 text-sm font-sans font-medium text-slate-400">
                    Ensure your account is using a long, random password to stay secure.
                </p>
            </header>

            <form onSubmit={updatePassword} className="space-y-6">
                <div>
                    <InputLabel
                        htmlFor="current_password"
                        value="Current Password"
                        className="text-[10px] font-sans font-bold uppercase tracking-widest text-slate-400 mb-2"
                    />

                    <TextInput
                        id="current_password"
                        ref={currentPasswordInput}
                        value={data.current_password}
                        onChange={(e) =>
                            setData('current_password', e.target.value)
                        }
                        type="password"
                        className="mt-1 block w-full bg-black/30 border-white/[0.1] text-white focus:border-exec-high focus:ring-exec-high rounded-xl h-11 px-4 transition-colors placeholder:text-slate-600"
                        autoComplete="current-password"
                        placeholder="••••••••••••"
                    />

                    <InputError
                        message={errors.current_password}
                        className="mt-2 text-exec-critical"
                    />
                </div>

                <div>
                    <InputLabel htmlFor="password" value="New Password" className="text-[10px] font-sans font-bold uppercase tracking-widest text-slate-400 mb-2" />

                    <TextInput
                        id="password"
                        ref={passwordInput}
                        value={data.password}
                        onChange={(e) => setData('password', e.target.value)}
                        type="password"
                        className="mt-1 block w-full bg-black/30 border-white/[0.1] text-white focus:border-exec-high focus:ring-exec-high rounded-xl h-11 px-4 transition-colors placeholder:text-slate-600"
                        autoComplete="new-password"
                        placeholder="••••••••••••"
                    />

                    <InputError message={errors.password} className="mt-2 text-exec-critical" />
                </div>

                <div>
                    <InputLabel
                        htmlFor="password_confirmation"
                        value="Confirm Password"
                        className="text-[10px] font-sans font-bold uppercase tracking-widest text-slate-400 mb-2"
                    />

                    <TextInput
                        id="password_confirmation"
                        value={data.password_confirmation}
                        onChange={(e) =>
                            setData('password_confirmation', e.target.value)
                        }
                        type="password"
                        className="mt-1 block w-full bg-black/30 border-white/[0.1] text-white focus:border-exec-high focus:ring-exec-high rounded-xl h-11 px-4 transition-colors placeholder:text-slate-600"
                        autoComplete="new-password"
                        placeholder="••••••••••••"
                    />

                    <InputError
                        message={errors.password_confirmation}
                        className="mt-2 text-exec-critical"
                    />
                </div>

                <div className="flex items-center gap-4 pt-4">
                    <button 
                        disabled={processing}
                        className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl border border-exec-high/30 bg-exec-high/10 text-exec-high font-sans text-sm font-bold hover:bg-exec-high/20 transition-all hover:shadow-[0_0_15px_rgba(245,158,11,0.2)] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Save Password
                    </button>

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
