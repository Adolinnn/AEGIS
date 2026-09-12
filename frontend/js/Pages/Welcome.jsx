import { Head, Link } from '@inertiajs/react';
import ApplicationLogo from '@/Components/ApplicationLogo';
import { 
    ShieldCheckIcon, 
    CommandLineIcon, 
    SparklesIcon, 
    BugAntIcon,
    ArrowRightIcon,
    ServerStackIcon,
    LockClosedIcon
} from '@heroicons/react/24/outline';

export default function Welcome({ auth }) {
    return (
        <>
            <Head title="Aegis | Autonomous SecOps & Vulnerability Scanner" />
            
            <div className="min-h-screen bg-transparent text-slate-200 font-sans selection:bg-red-500 selection:text-white relative overflow-hidden">

                {/* Navbar */}
                <nav className="border-b border-white/[0.08] bg-[#070b14]/85 backdrop-blur-xl sticky top-0 z-50">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center h-16">
                        <div className="flex items-center gap-3">
                            <div className="p-1.5 rounded-lg bg-red-600/20 border border-red-500/40 text-red-400 shadow-[0_0_12px_rgba(244,63,94,0.3)]">
                                <ApplicationLogo className="h-6 w-auto" />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-white font-mono font-bold text-lg tracking-widest uppercase">
                                    Aegis
                                </span>
                                <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest -mt-1">
                                    SecOps Core
                                </span>
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            {auth.user ? (
                                <Link 
                                    href={route('dashboard')} 
                                    className="px-4 py-2 text-xs font-mono font-bold text-cyan-300 bg-cyan-950/60 border border-cyan-500/40 rounded-lg hover:bg-cyan-900/60 transition shadow-[0_0_12px_rgba(6,182,212,0.25)] flex items-center gap-1.5"
                                >
                                    <span>Enter Console</span>
                                    <ArrowRightIcon className="h-3.5 w-3.5" />
                                </Link>
                            ) : (
                                <>
                                    <Link 
                                        href={route('login')} 
                                        className="text-xs font-mono font-semibold text-slate-400 hover:text-white transition px-3 py-1.5"
                                    >
                                        Operator Login
                                    </Link>
                                    <Link 
                                        href={route('register')} 
                                        className="px-4 py-2 text-xs font-mono font-bold text-white bg-gradient-to-r from-red-600 to-rose-600 rounded-lg hover:from-red-500 hover:to-rose-500 transition shadow-[0_0_15px_rgba(244,63,94,0.4)]"
                                    >
                                        Deploy Platform
                                    </Link>
                                </>
                            )}
                        </div>
                    </div>
                </nav>

                {/* Hero Section */}
                <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-20 flex flex-col lg:flex-row items-center gap-12 relative z-10">
                    
                    {/* Left Copy */}
                    <div className="flex-1 space-y-6 text-center lg:text-left">
                        <div className="inline-flex items-center gap-2 px-3 py-1 border border-red-500/40 bg-red-950/40 text-red-300 text-xs font-mono rounded-full shadow-[0_0_12px_rgba(244,63,94,0.2)]">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                            <span>AUTONOMOUS THREAT HUNTING & PENTESTING</span>
                        </div>

                        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-mono font-extrabold text-white leading-tight tracking-tight">
                            Defend Web Assets with{' '}
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-rose-400 to-cyan-400">
                                Autonomous AI Recon
                            </span>
                        </h1>

                        <p className="text-sm sm:text-base text-slate-400 max-w-xl font-sans leading-relaxed">
                            Aegis orchestrates enterprise vulnerability scanning binaries (Nuclei, Nmap, Nikto, SQLMap) with intelligent AI agents that synthesize executive remediation roadmaps and copy-paste code patches.
                        </p>
                        
                        <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 pt-2">
                            <Link 
                                href={route('register')} 
                                className="px-6 py-3 text-xs font-mono font-bold text-white bg-gradient-to-r from-red-600 to-rose-600 rounded-lg hover:from-red-500 hover:to-rose-500 transition shadow-[0_0_20px_rgba(244,63,94,0.4)] flex items-center gap-2"
                            >
                                <CommandLineIcon className="h-4 w-4" />
                                Launch Operations Free
                            </Link>
                            <Link 
                                href={route('quick-scan.index')} 
                                className="px-6 py-3 text-xs font-mono font-bold text-cyan-300 border border-cyan-500/40 bg-cyan-950/30 rounded-lg hover:bg-cyan-900/40 transition flex items-center gap-2"
                            >
                                Try Live Recon Terminal
                            </Link>
                        </div>

                        {/* Telemetry Metrics */}
                        <div className="pt-6 border-t border-white/[0.08] grid grid-cols-3 gap-4 font-mono text-left">
                            <div>
                                <p className="text-lg font-bold text-white">10+ Security Tools</p>
                                <p className="text-[11px] text-slate-500">Nmap, Nuclei, Nikto, SQLMap</p>
                            </div>
                            <div>
                                <p className="text-lg font-bold text-cyan-400">Sub-Second</p>
                                <p className="text-[11px] text-slate-500">Synchronous Recon Pings</p>
                            </div>
                            <div>
                                <p className="text-lg font-bold text-rose-400">Auto-Patching</p>
                                <p className="text-[11px] text-slate-500">AI Code Remediation</p>
                            </div>
                        </div>
                    </div>

                    {/* Right Terminal Mockup */}
                    <div className="flex-1 w-full max-w-2xl">
                        <div className="bg-[#050811] border border-white/[0.12] rounded-2xl overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.8)] backdrop-blur-xl">
                            {/* Window Header */}
                            <div className="bg-[#090f1f] border-b border-white/[0.08] px-4 py-3 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="w-2.5 h-2.5 rounded-full bg-red-500"></div>
                                    <div className="w-2.5 h-2.5 rounded-full bg-yellow-500"></div>
                                    <div className="w-2.5 h-2.5 rounded-full bg-green-500"></div>
                                    <span className="ml-2 font-mono text-xs text-slate-400 font-semibold">aegis-recon-orchestrator.sh</span>
                                </div>
                                <span className="font-mono text-[10px] text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800">
                                    ACTIVE PIPELINE
                                </span>
                            </div>
                            
                            {/* Terminal Body */}
                            <div className="p-5 font-mono text-xs space-y-3.5 leading-relaxed bg-[#020409]">
                                <div className="text-slate-400 flex items-center gap-2">
                                    <span className="text-cyan-400 font-bold">[recon@aegis ~]$</span>
                                    <span className="text-slate-200">aegis scan --target https://api.corp.internal --engine full</span>
                                </div>
                                <div className="text-slate-500">
                                    [+] Initializing multi-tool runners (Nuclei v3, Nmap, SQLMap, SSLScan)...
                                </div>
                                <div className="text-slate-400">
                                    [+] Port 443/TLS 1.3: <span className="text-emerald-400 font-semibold">VALID (Let's Encrypt, 84 days remaining)</span>
                                </div>
                                <div className="text-rose-400 font-bold bg-rose-950/40 p-2.5 rounded border border-rose-500/40 shadow-[0_0_10px_rgba(244,63,94,0.2)]">
                                    [CRITICAL] SQLi Flaw Detected in /v1/auth/token endpoint (CVE-2024-XXXX)
                                </div>
                                
                                <div className="pt-2 border-t border-slate-800/80">
                                    <div className="text-cyan-300 font-bold flex items-center gap-1.5 mb-1.5">
                                        <SparklesIcon className="h-3.5 w-3.5 text-purple-400" />
                                        <span>AI Remediation Generator Dispatched Patch:</span>
                                    </div>
                                    <pre className="text-slate-300 bg-[#0c1428] p-3 rounded-lg border border-slate-800 font-mono text-[11px] overflow-x-auto text-emerald-400">
                                        <span className="text-slate-500">// Parameterized Query Defense</span><br />
                                        <span className="text-purple-400">const</span> user = <span className="text-purple-400">await</span> db.query(<br />
                                        &nbsp;&nbsp;<span className="text-amber-300">`SELECT * FROM users WHERE email = $1 AND active = true`</span>,<br />
                                        &nbsp;&nbsp;[req.body.email]<br />
                                        );
                                    </pre>
                                </div>
                            </div>
                        </div>
                    </div>
                </main>

                {/* Features Section */}
                <section className="border-t border-white/[0.08] bg-[#090e1b]/80 py-20 relative z-10">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
                        <div className="text-center max-w-2xl mx-auto space-y-3">
                            <span className="font-mono text-[10px] uppercase tracking-widest text-cyan-400 font-bold bg-cyan-950/60 border border-cyan-800 px-3 py-1 rounded-full">
                                ARCHITECTURE & CAPABILITIES
                            </span>
                            <h2 className="text-3xl font-mono font-bold text-white tracking-tight">
                                Built for Security Operations & Pentesting
                            </h2>
                            <p className="text-xs sm:text-sm text-slate-400 font-sans">
                                Unified vulnerability aggregation, real-time HTTP health telemetry, and AI security copilots.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {/* Card 1 */}
                            <div className="rounded-2xl border border-white/[0.08] bg-[#0c1428]/90 p-6 backdrop-blur-md hover:border-red-500/40 transition group">
                                <div className="p-3 rounded-xl bg-red-600/20 border border-red-500/30 text-red-400 w-fit mb-4 group-hover:scale-110 transition">
                                    <CommandLineIcon className="h-6 w-6" />
                                </div>
                                <h3 className="font-mono text-base font-bold text-white mb-2">
                                    Unified Security Tooling
                                </h3>
                                <p className="text-xs text-slate-400 leading-relaxed font-sans">
                                    Execute Nmap, Nuclei, Nikto, SQLMap, SSLScan, and WhatWeb asynchronously with structured telemetry aggregation.
                                </p>
                            </div>

                            {/* Card 2 */}
                            <div className="rounded-2xl border border-white/[0.08] bg-[#0c1428]/90 p-6 backdrop-blur-md hover:border-cyan-500/40 transition group">
                                <div className="p-3 rounded-xl bg-cyan-600/20 border border-cyan-500/30 text-cyan-400 w-fit mb-4 group-hover:scale-110 transition">
                                    <SparklesIcon className="h-6 w-6" />
                                </div>
                                <h3 className="font-mono text-base font-bold text-white mb-2">
                                    AI Remediation Intelligence
                                </h3>
                                <p className="text-xs text-slate-400 leading-relaxed font-sans">
                                    Context-aware LLM agents analyze finding evidence, determine business impact, and write production-ready code patches.
                                </p>
                            </div>

                            {/* Card 3 */}
                            <div className="rounded-2xl border border-white/[0.08] bg-[#0c1428]/90 p-6 backdrop-blur-md hover:border-emerald-500/40 transition group">
                                <div className="p-3 rounded-xl bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 w-fit mb-4 group-hover:scale-110 transition">
                                    <ServerStackIcon className="h-6 w-6" />
                                </div>
                                <h3 className="font-mono text-base font-bold text-white mb-2">
                                    Continuous Surveillance
                                </h3>
                                <p className="text-xs text-slate-400 leading-relaxed font-sans">
                                    Minute-by-minute uptime checks, SSL certificate expiration tracking, and latency performance matrices.
                                </p>
                            </div>
                        </div>
                    </div>
                </section>
            </div>
        </>
    );
}