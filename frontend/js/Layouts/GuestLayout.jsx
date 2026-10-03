import ApplicationLogo from '@/Components/ApplicationLogo';
import { Link } from '@inertiajs/react';

export default function GuestLayout({ children }) {
    return (
        <div className="min-h-screen flex flex-col sm:justify-center items-center pt-6 sm:pt-0 bg-transparent text-slate-100 font-sans relative selection:bg-exec-indigo/30 selection:text-white">
            
            {/* Global background effects */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-exec-indigo/10 via-[#030408] to-[#030408]"></div>
                <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-exec-indigo/10 rounded-full blur-[120px] pointer-events-none"></div>
            </div>

            <div className="relative z-10 hud-fade-in mt-10 sm:mt-0 mb-6">
                <Link href="/" className="flex items-center gap-4 group">
                    <div className="p-3 rounded-2xl bg-gradient-to-br from-exec-indigo/20 to-transparent border border-exec-indigo/40 group-hover:border-exec-indigo/80 group-hover:scale-105 transition-all duration-300 shadow-[0_0_20px_rgba(99,102,241,0.3)]">
                        <ApplicationLogo className="block h-10 w-auto" />
                    </div>
                    <div className="flex flex-col">
                        <span className="font-sans text-2xl font-bold tracking-tight text-white group-hover:text-exec-indigo transition-colors">
                            Aegis Command
                        </span>
                        <span className="font-sans text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                            Executive Portal
                        </span>
                    </div>
                </Link>
            </div>

            <div className="relative z-10 w-full sm:max-w-md px-8 py-8 bg-[#050a16]/80 border border-white/[0.08] backdrop-blur-2xl shadow-[0_8px_40px_rgba(0,0,0,0.5)] overflow-hidden sm:rounded-3xl hud-fade-in hud-stagger-1 group">
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.2] to-transparent"></div>
                {children}
            </div>
            
            <div className="mt-8 text-center text-slate-500 font-mono text-[10px] uppercase tracking-widest relative z-10">
                Secure access restricted to authorized personnel.
            </div>
        </div>
    );
}
