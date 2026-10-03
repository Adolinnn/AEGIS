import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';
import { Head, useForm } from '@inertiajs/react';
import { ShieldExclamationIcon, LockClosedIcon } from '@heroicons/react/24/outline';

export default function AdminLogin({ status }) {
    const { data, setData, post, processing, errors, reset } = useForm({
        email: '',
        password: '',
    });

    const submit = (e) => {
        e.preventDefault();

        post(route('admin.login'), {
            onFinish: () => reset('password'),
        });
    };

    return (
        <div className="min-h-screen flex flex-col justify-center items-center bg-[#030408] text-gray-300 px-4 relative overflow-hidden">
            <Head title="Admin Login" />

            {/* Global background effects */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-exec-critical/5 via-[#030408] to-[#030408]"></div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-exec-critical/10 rounded-full blur-[120px] pointer-events-none"></div>
                
                {/* Crosshairs & HUD Elements */}
                <div className="absolute top-0 bottom-0 left-[10%] w-px bg-gradient-to-b from-transparent via-exec-critical/20 to-transparent"></div>
                <div className="absolute top-0 bottom-0 right-[10%] w-px bg-gradient-to-b from-transparent via-exec-critical/20 to-transparent"></div>
                <div className="absolute top-[10%] left-0 right-0 h-px bg-gradient-to-r from-transparent via-exec-critical/20 to-transparent"></div>
                <div className="absolute bottom-[10%] left-0 right-0 h-px bg-gradient-to-r from-transparent via-exec-critical/20 to-transparent"></div>
            </div>

            <div className="relative z-10 w-full max-w-md animate-[hud-fade-in_0.5s_ease-out]">
                <div className="flex flex-col items-center mb-8">
                    <div className="w-16 h-16 rounded-2xl bg-exec-critical/10 border border-exec-critical/30 flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(244,63,94,0.3)]">
                        <ShieldExclamationIcon className="w-8 h-8 text-exec-critical" />
                    </div>
                    <div className="text-exec-critical font-sans font-bold text-sm tracking-[0.4em] uppercase mb-2">
                        Aegis Command
                    </div>
                    <h1 className="text-3xl font-sans font-bold text-white tracking-tight drop-shadow-md">
                        Restricted Access
                    </h1>
                </div>

                <div className="rounded-3xl border border-exec-critical/20 bg-[#050a16]/80 backdrop-blur-2xl p-8 shadow-[0_0_50px_rgba(244,63,94,0.15)] relative overflow-hidden group">
                    <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-exec-critical/50 to-transparent"></div>
                    <div className="absolute inset-0 bg-exec-critical/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>

                    {status && (
                        <div className="mb-6 text-sm font-sans font-bold text-exec-info bg-exec-info/10 border border-exec-info/30 p-3 rounded-xl flex items-center justify-center">
                            {status}
                        </div>
                    )}

                    <form onSubmit={submit} className="relative z-10">
                        <div>
                            <InputLabel
                                htmlFor="email"
                                value="Admin Email"
                                className="text-[10px] font-sans font-bold uppercase tracking-widest text-slate-400 mb-2"
                            />

                            <TextInput
                                id="email"
                                type="email"
                                name="email"
                                value={data.email}
                                className="block w-full bg-black/50 border-white/[0.1] text-white focus:border-exec-critical focus:ring-exec-critical rounded-xl h-12 px-4 transition-colors placeholder:text-slate-600"
                                autoComplete="username"
                                isFocused={true}
                                onChange={(e) => setData('email', e.target.value)}
                                placeholder="operator@aegis.com"
                            />

                            <InputError message={errors.email} className="mt-2 text-exec-critical" />
                        </div>

                        <div className="mt-6">
                            <InputLabel
                                htmlFor="password"
                                value="Authorization Key"
                                className="text-[10px] font-sans font-bold uppercase tracking-widest text-slate-400 mb-2"
                            />

                            <TextInput
                                id="password"
                                type="password"
                                name="password"
                                value={data.password}
                                className="block w-full bg-black/50 border-white/[0.1] text-white focus:border-exec-critical focus:ring-exec-critical rounded-xl h-12 px-4 transition-colors placeholder:text-slate-600"
                                autoComplete="current-password"
                                onChange={(e) => setData('password', e.target.value)}
                                placeholder="••••••••••••"
                            />

                            <InputError message={errors.password} className="mt-2 text-exec-critical" />
                        </div>

                        <button
                            type="submit"
                            disabled={processing}
                            className="mt-8 w-full flex justify-center items-center gap-3 px-6 py-3.5 bg-exec-critical text-white rounded-xl font-sans text-sm font-bold tracking-wide hover:bg-exec-critical/90 focus:outline-none focus:ring-2 focus:ring-exec-critical/50 focus:ring-offset-2 focus:ring-offset-[#030408] disabled:opacity-50 transition-all hover:shadow-[0_0_20px_rgba(244,63,94,0.4)] hover:scale-[1.02] active:scale-[0.98]"
                        >
                            <LockClosedIcon className="w-5 h-5" />
                            {processing ? 'Verifying Credentials...' : 'Initiate Override'}
                        </button>
                    </form>
                </div>

                <p className="mt-8 text-[10px] font-mono font-bold uppercase tracking-widest text-slate-600 text-center">
                    Authorized personnel only. All access attempts are logged.
                </p>
            </div>
        </div>
    );
}