import Checkbox from '@/Components/Checkbox';
import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';
import GuestLayout from '@/Layouts/GuestLayout';
import { Head, Link, useForm } from '@inertiajs/react';
import { ArrowRightIcon } from '@heroicons/react/24/outline';

export default function Login({ status, canResetPassword }) {
    const { data, setData, post, processing, errors, reset } = useForm({
        email: '',
        password: '',
        remember: false,
    });

    const submit = (e) => {
        e.preventDefault();

        post(route('login'), {
            onFinish: () => reset('password'),
        });
    };

    return (
        <GuestLayout>
            <Head title="Log in" />

            <div className="mb-8">
                <h2 className="text-xl font-sans font-bold text-white tracking-tight mb-2">Welcome Back</h2>
                <p className="text-sm font-sans font-medium text-slate-400">Please enter your credentials to access the portal.</p>
            </div>

            {status && (
                <div className="mb-6 text-sm font-sans font-bold text-exec-info bg-exec-info/10 border border-exec-info/30 p-3 rounded-xl">
                    {status}
                </div>
            )}

            <form onSubmit={submit}>
                <div>
                    <InputLabel htmlFor="email" value="Email Address" className="text-[10px] font-sans font-bold uppercase tracking-widest text-slate-400 mb-2" />

                    <TextInput
                        id="email"
                        type="email"
                        name="email"
                        value={data.email}
                        className="mt-1 block w-full bg-black/50 border-white/[0.1] text-white focus:border-exec-indigo focus:ring-exec-indigo rounded-xl h-12 px-4 transition-colors placeholder:text-slate-600"
                        autoComplete="username"
                        isFocused={true}
                        onChange={(e) => setData('email', e.target.value)}
                        placeholder="admin@aegis.local"
                    />

                    <InputError message={errors.email} className="mt-2 text-exec-critical" />
                </div>

                <div className="mt-6">
                    <div className="flex justify-between items-center mb-2">
                        <InputLabel htmlFor="password" value="Password" className="text-[10px] font-sans font-bold uppercase tracking-widest text-slate-400" />
                        {canResetPassword && (
                            <Link
                                href={route('password.request')}
                                className="text-[10px] font-sans font-bold text-exec-indigo hover:text-exec-indigo/80 transition-colors uppercase tracking-widest"
                            >
                                Forgot password?
                            </Link>
                        )}
                    </div>

                    <TextInput
                        id="password"
                        type="password"
                        name="password"
                        value={data.password}
                        className="mt-1 block w-full bg-black/50 border-white/[0.1] text-white focus:border-exec-indigo focus:ring-exec-indigo rounded-xl h-12 px-4 transition-colors placeholder:text-slate-600"
                        autoComplete="current-password"
                        onChange={(e) => setData('password', e.target.value)}
                        placeholder="••••••••••••"
                    />

                    <InputError message={errors.password} className="mt-2 text-exec-critical" />
                </div>

                <div className="mt-6 block">
                    <label className="flex items-center cursor-pointer group">
                        <Checkbox
                            name="remember"
                            checked={data.remember}
                            onChange={(e) =>
                                setData('remember', e.target.checked)
                            }
                            className="bg-black/50 border-white/[0.2] text-exec-indigo rounded focus:ring-exec-indigo h-5 w-5"
                        />
                        <span className="ms-3 text-sm font-sans font-medium text-slate-400 group-hover:text-slate-300 transition-colors">
                            Keep me securely logged in
                        </span>
                    </label>
                </div>

                <div className="mt-8 flex items-center justify-between">
                    <Link
                        href={route('register')}
                        className="text-sm font-sans font-bold text-slate-400 hover:text-white transition-colors"
                    >
                        Create account
                    </Link>

                    <button 
                        type="submit" 
                        disabled={processing}
                        className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-exec-indigo to-[#8b5cf6] text-white font-sans text-sm font-bold hover:shadow-[0_0_20px_rgba(99,102,241,0.5)] active:scale-[0.98] transition-all relative overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <div className="absolute inset-0 bg-white/20 hover:opacity-0 transition-opacity rounded-xl pointer-events-none"></div>
                        {processing ? 'Authenticating...' : 'Sign In'}
                        {!processing && <ArrowRightIcon className="w-4 h-4" />}
                    </button>
                </div>
            </form>
        </GuestLayout>
    );
}
