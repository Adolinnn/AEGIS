import ApplicationLogo from '@/Components/ApplicationLogo';
import { Link } from '@inertiajs/react';

export default function GuestLayout({ children }) {
    return (
        <div className="min-h-screen flex flex-col sm:justify-center items-center pt-6 sm:pt-0 bg-transparent text-slate-100 font-sans relative selection:bg-red-500 selection:text-white">
            <div className="relative z-10 hud-fade-in">
                <Link href="/" className="flex items-center gap-3 group">
                    <div className="p-2.5 rounded-xl bg-gradient-to-br from-red-600/20 to-transparent border border-red-500/40 group-hover:border-red-500/80 group-hover:scale-105 transition-all duration-300 shadow-[0_0_20px_rgba(244,63,94,0.3)]">
                        <ApplicationLogo className="block h-8 w-auto" />
                    </div>
                    <div className="flex flex-col">
                        <span className="font-mono text-xl font-bold tracking-widest text-white uppercase group-hover:text-red-400 transition-colors">
                            Aegis
                        </span>
                        <span className="font-mono text-[10px] text-slate-500 uppercase tracking-widest -mt-1">
                            SecOps Operations Center
                        </span>
                    </div>
                </Link>
            </div>

            <div className="laser-beam-header relative z-10 w-full sm:max-w-md mt-6 px-7 py-6 bg-[#0c1428]/95 border border-white/[0.08] backdrop-blur-xl shadow-2xl overflow-hidden sm:rounded-2xl hud-fade-in hud-stagger-1">
                {children}
            </div>
        </div>
    );
}
