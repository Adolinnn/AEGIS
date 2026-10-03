import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';
import GuestLayout from '@/Layouts/GuestLayout';
import { Head, useForm } from '@inertiajs/react';
import { LockClosedIcon } from '@heroicons/react/24/outline';

export default function ConfirmPassword() {
    const { data, setData, post, processing, errors, reset } = useForm({
        password: '',
    });

    const submit = (e) => {
        e.preventDefault();

        post(route('password.confirm'), {
            onFinish: () => reset('password'),
        });
    };

    return (
        <GuestLayout>
            <Head title="Confirm Password" />

            <div className="mb-8 flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-2xl bg-exec-high/10 border border-exec-high/30 flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(245,158,11,0.2)]">
                    <LockClosedIcon className="w-8 h-8 text-exec-high" />
                </div>
                <h2 className="text-xl font-sans font-bold text-white tracking-tight mb-2">Security Verification</h2>
                <p className="text-sm font-sans font-medium text-slate-400">
                    This is a secure area of the application. Please confirm your
                    password before continuing.
                </p>
            </div>

            <form onSubmit={submit}>
                <div>
                    <InputLabel htmlFor="password" value="Password" className="text-[10px] font-sans font-bold uppercase tracking-widest text-slate-400 mb-2" />

                    <TextInput
                        id="password"
                        type="password"
                        name="password"
                        value={data.password}
                        className="block w-full bg-black/50 border-white/[0.1] text-white focus:border-exec-high focus:ring-exec-high rounded-xl h-12 px-4 transition-colors placeholder:text-slate-600"
                        isFocused={true}
                        onChange={(e) => setData('password', e.target.value)}
                        placeholder="••••••••••••"
                        required
                    />

                    <InputError message={errors.password} className="mt-2 text-exec-critical" />
                </div>

                <div className="mt-8">
                    <button 
                        type="submit" 
                        disabled={processing}
                        className="w-full flex justify-center items-center gap-2 px-6 py-3.5 rounded-xl border border-exec-high/30 bg-exec-high/10 text-exec-high font-sans text-sm font-bold hover:bg-exec-high/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-[0_0_15px_rgba(245,158,11,0.2)]"
                    >
                        {processing ? 'Verifying...' : 'Confirm Identity'}
                    </button>
                </div>
            </form>
        </GuestLayout>
    );
}
