import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';
import GuestLayout from '@/Layouts/GuestLayout';
import { Head, useForm } from '@inertiajs/react';
import { KeyIcon } from '@heroicons/react/24/outline';

export default function ResetPassword({ token, email }) {
    const { data, setData, post, processing, errors, reset } = useForm({
        token: token,
        email: email,
        password: '',
        password_confirmation: '',
    });

    const submit = (e) => {
        e.preventDefault();

        post(route('password.store'), {
            onFinish: () => reset('password', 'password_confirmation'),
        });
    };

    return (
        <GuestLayout>
            <Head title="Reset Password" />

            <div className="mb-8">
                <h2 className="text-xl font-sans font-bold text-white tracking-tight mb-2">Reset Password</h2>
                <p className="text-sm font-sans font-medium text-slate-400">Please enter your new password below.</p>
            </div>

            <form onSubmit={submit}>
                <div>
                    <InputLabel htmlFor="email" value="Email Address" className="text-[10px] font-sans font-bold uppercase tracking-widest text-slate-400 mb-2" />

                    <TextInput
                        id="email"
                        type="email"
                        name="email"
                        value={data.email}
                        className="block w-full bg-black/50 border-white/[0.1] text-white focus:border-exec-indigo focus:ring-exec-indigo rounded-xl h-12 px-4 transition-colors placeholder:text-slate-600"
                        autoComplete="username"
                        onChange={(e) => setData('email', e.target.value)}
                        required
                    />

                    <InputError message={errors.email} className="mt-2 text-exec-critical" />
                </div>

                <div className="mt-6">
                    <InputLabel htmlFor="password" value="New Password" className="text-[10px] font-sans font-bold uppercase tracking-widest text-slate-400 mb-2" />

                    <TextInput
                        id="password"
                        type="password"
                        name="password"
                        value={data.password}
                        className="block w-full bg-black/50 border-white/[0.1] text-white focus:border-exec-indigo focus:ring-exec-indigo rounded-xl h-12 px-4 transition-colors placeholder:text-slate-600"
                        autoComplete="new-password"
                        isFocused={true}
                        onChange={(e) => setData('password', e.target.value)}
                        placeholder="••••••••••••"
                        required
                    />

                    <InputError message={errors.password} className="mt-2 text-exec-critical" />
                </div>

                <div className="mt-6">
                    <InputLabel
                        htmlFor="password_confirmation"
                        value="Confirm New Password"
                        className="text-[10px] font-sans font-bold uppercase tracking-widest text-slate-400 mb-2"
                    />

                    <TextInput
                        type="password"
                        id="password_confirmation"
                        name="password_confirmation"
                        value={data.password_confirmation}
                        className="block w-full bg-black/50 border-white/[0.1] text-white focus:border-exec-indigo focus:ring-exec-indigo rounded-xl h-12 px-4 transition-colors placeholder:text-slate-600"
                        autoComplete="new-password"
                        onChange={(e) =>
                            setData('password_confirmation', e.target.value)
                        }
                        placeholder="••••••••••••"
                        required
                    />

                    <InputError
                        message={errors.password_confirmation}
                        className="mt-2 text-exec-critical"
                    />
                </div>

                <div className="mt-8">
                    <button 
                        type="submit" 
                        disabled={processing}
                        className="w-full flex justify-center items-center gap-2 px-6 py-3.5 rounded-xl bg-gradient-to-r from-exec-indigo to-[#8b5cf6] text-white font-sans text-sm font-bold hover:shadow-[0_0_20px_rgba(99,102,241,0.5)] active:scale-[0.98] transition-all relative overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <div className="absolute inset-0 bg-white/20 hover:opacity-0 transition-opacity rounded-xl pointer-events-none"></div>
                        {processing ? 'Resetting...' : 'Reset Password'}
                        {!processing && <KeyIcon className="w-4 h-4" />}
                    </button>
                </div>
            </form>
        </GuestLayout>
    );
}
