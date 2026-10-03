import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';
import GuestLayout from '@/Layouts/GuestLayout';
import { Head, Link, useForm } from '@inertiajs/react';
import { PaperAirplaneIcon, ArrowLeftIcon } from '@heroicons/react/24/outline';

export default function ForgotPassword({ status }) {
    const { data, setData, post, processing, errors } = useForm({
        email: '',
    });

    const submit = (e) => {
        e.preventDefault();
        post(route('password.email'));
    };

    return (
        <GuestLayout>
            <Head title="Forgot Password" />

            <div className="mb-8">
                <Link href={route('login')} className="inline-flex items-center gap-1.5 text-[10px] font-sans font-bold uppercase tracking-widest text-slate-500 hover:text-slate-300 transition-colors mb-4">
                    <ArrowLeftIcon className="w-3 h-3" /> Back to Login
                </Link>
                <h2 className="text-xl font-sans font-bold text-white tracking-tight mb-2">Password Recovery</h2>
                <p className="text-sm font-sans font-medium text-slate-400">
                    Forgot your password? No problem. Just let us know your email
                    address and we will email you a password reset link.
                </p>
            </div>

            {status && (
                <div className="mb-6 text-sm font-sans font-bold text-exec-info bg-exec-info/10 border border-exec-info/30 p-3 rounded-xl flex items-center justify-center text-center">
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
                        className="block w-full bg-black/50 border-white/[0.1] text-white focus:border-exec-indigo focus:ring-exec-indigo rounded-xl h-12 px-4 transition-colors placeholder:text-slate-600"
                        isFocused={true}
                        onChange={(e) => setData('email', e.target.value)}
                        placeholder="admin@aegis.local"
                        required
                    />

                    <InputError message={errors.email} className="mt-2 text-exec-critical" />
                </div>

                <div className="mt-8">
                    <button 
                        type="submit" 
                        disabled={processing}
                        className="w-full flex justify-center items-center gap-2 px-6 py-3.5 rounded-xl bg-gradient-to-r from-exec-indigo to-[#8b5cf6] text-white font-sans text-sm font-bold hover:shadow-[0_0_20px_rgba(99,102,241,0.5)] active:scale-[0.98] transition-all relative overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <div className="absolute inset-0 bg-white/20 hover:opacity-0 transition-opacity rounded-xl pointer-events-none"></div>
                        {processing ? 'Sending Link...' : 'Email Reset Link'}
                        {!processing && <PaperAirplaneIcon className="w-4 h-4" />}
                    </button>
                </div>
            </form>
        </GuestLayout>
    );
}
