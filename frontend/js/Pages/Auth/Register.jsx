import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';
import GuestLayout from '@/Layouts/GuestLayout';
import { Head, Link, useForm } from '@inertiajs/react';
import { UserPlusIcon } from '@heroicons/react/24/outline';

export default function Register() {
    const { data, setData, post, processing, errors, reset } = useForm({
        name: '',
        email: '',
        password: '',
        password_confirmation: '',
    });

    const submit = (e) => {
        e.preventDefault();

        post(route('register'), {
            onFinish: () => reset('password', 'password_confirmation'),
        });
    };

    return (
        <GuestLayout>
            <Head title="Register" />

            <div className="mb-8">
                <h2 className="text-xl font-sans font-bold text-white tracking-tight mb-2">Create Account</h2>
                <p className="text-sm font-sans font-medium text-slate-400">Join the platform to access executive security insights.</p>
            </div>

            <form onSubmit={submit}>
                <div>
                    <InputLabel htmlFor="name" value="Full Name" className="text-[10px] font-sans font-bold uppercase tracking-widest text-slate-400 mb-2" />

                    <TextInput
                        id="name"
                        name="name"
                        value={data.name}
                        className="mt-1 block w-full bg-black/50 border-white/[0.1] text-white focus:border-exec-indigo focus:ring-exec-indigo rounded-xl h-12 px-4 transition-colors placeholder:text-slate-600"
                        autoComplete="name"
                        isFocused={true}
                        onChange={(e) => setData('name', e.target.value)}
                        placeholder="John Doe"
                        required
                    />

                    <InputError message={errors.name} className="mt-2 text-exec-critical" />
                </div>

                <div className="mt-6">
                    <InputLabel htmlFor="email" value="Email Address" className="text-[10px] font-sans font-bold uppercase tracking-widest text-slate-400 mb-2" />

                    <TextInput
                        id="email"
                        type="email"
                        name="email"
                        value={data.email}
                        className="mt-1 block w-full bg-black/50 border-white/[0.1] text-white focus:border-exec-indigo focus:ring-exec-indigo rounded-xl h-12 px-4 transition-colors placeholder:text-slate-600"
                        autoComplete="username"
                        onChange={(e) => setData('email', e.target.value)}
                        placeholder="admin@aegis.local"
                        required
                    />

                    <InputError message={errors.email} className="mt-2 text-exec-critical" />
                </div>

                <div className="mt-6">
                    <InputLabel htmlFor="password" value="Password" className="text-[10px] font-sans font-bold uppercase tracking-widest text-slate-400 mb-2" />

                    <TextInput
                        id="password"
                        type="password"
                        name="password"
                        value={data.password}
                        className="mt-1 block w-full bg-black/50 border-white/[0.1] text-white focus:border-exec-indigo focus:ring-exec-indigo rounded-xl h-12 px-4 transition-colors placeholder:text-slate-600"
                        autoComplete="new-password"
                        onChange={(e) => setData('password', e.target.value)}
                        placeholder="••••••••••••"
                        required
                    />

                    <InputError message={errors.password} className="mt-2 text-exec-critical" />
                </div>

                <div className="mt-6">
                    <InputLabel
                        htmlFor="password_confirmation"
                        value="Confirm Password"
                        className="text-[10px] font-sans font-bold uppercase tracking-widest text-slate-400 mb-2"
                    />

                    <TextInput
                        id="password_confirmation"
                        type="password"
                        name="password_confirmation"
                        value={data.password_confirmation}
                        className="mt-1 block w-full bg-black/50 border-white/[0.1] text-white focus:border-exec-indigo focus:ring-exec-indigo rounded-xl h-12 px-4 transition-colors placeholder:text-slate-600"
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

                <div className="mt-8 flex items-center justify-between">
                    <Link
                        href={route('login')}
                        className="text-sm font-sans font-bold text-slate-400 hover:text-white transition-colors"
                    >
                        Already registered?
                    </Link>

                    <button 
                        type="submit" 
                        disabled={processing}
                        className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-exec-indigo to-[#8b5cf6] text-white font-sans text-sm font-bold hover:shadow-[0_0_20px_rgba(99,102,241,0.5)] active:scale-[0.98] transition-all relative overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <div className="absolute inset-0 bg-white/20 hover:opacity-0 transition-opacity rounded-xl pointer-events-none"></div>
                        {processing ? 'Registering...' : 'Register'}
                        {!processing && <UserPlusIcon className="w-4 h-4" />}
                    </button>
                </div>
            </form>
        </GuestLayout>
    );
}
