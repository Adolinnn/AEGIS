import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link } from '@inertiajs/react';
import { 
    ShieldCheckIcon, 
    ServerStackIcon, 
    BugAntIcon, 
    ExclamationTriangleIcon,
    MagnifyingGlassIcon,
    CommandLineIcon,
    ArrowRightIcon
} from '@heroicons/react/24/outline';

const RUN_STATUS = {
    pending: 'text-slate-400 bg-slate-900/60 border-slate-700',
    running: 'text-cyan-400 bg-cyan-950/60 border-cyan-500/40 shadow-[0_0_10px_rgba(6,182,212,0.2)]',
    completed: 'text-emerald-400 bg-emerald-950/60 border-emerald-500/40 shadow-[0_0_10px_rgba(16,185,129,0.2)]',
    partial: 'text-amber-400 bg-amber-950/60 border-amber-500/40',
    failed: 'text-rose-400 bg-rose-950/60 border-rose-500/40 shadow-[0_0_10px_rgba(244,63,94,0.2)]',
};

function StatCard({ label, value, subtext, accent = 'text-slate-100', glowColor = '', Icon }) {
    return (
        <div className="cyber-card-interactive relative overflow-hidden rounded-xl p-5 shadow-[0_4px_20px_rgba(0,0,0,0.4)] group">
            {/* Ambient neon backdrop flare on hover */}
            {glowColor && (
                <div className={`absolute -right-6 -top-6 w-28 h-28 rounded-full blur-2xl pointer-events-none opacity-20 group-hover:opacity-60 transition-all duration-500 group-hover:scale-125 ${glowColor}`}></div>
            )}
            <div className="flex items-start justify-between relative z-10">
                <div>
                    <p className="font-mono text-[11px] uppercase tracking-widest text-slate-400 font-semibold">{label}</p>
                    <p className={`font-mono text-3xl font-extrabold tracking-tight mt-2 transition-all duration-300 group-hover:translate-x-1 ${accent}`}>{value}</p>
                    {subtext && <p className="font-mono text-[10px] text-slate-500 mt-1">{subtext}</p>}
                </div>
                {Icon && (
                    <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800 text-slate-400 group-hover:text-cyan-300 group-hover:border-cyan-500/50 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-md">
                        <Icon className="h-6 w-6" />
                    </div>
                )}
            </div>
        </div>
    );
}

export default function Dashboard({ stats, recentRuns = [] }) {
    return (
        <AuthenticatedLayout
            header={
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="font-mono text-[10px] uppercase tracking-widest px-2 py-0.5 rounded bg-red-950/60 text-red-400 border border-red-800/60 font-semibold">
                                SOC MONITOR
                            </span>
                            <span className="font-mono text-xs text-slate-500">Node: LocalHost</span>
                        </div>
                        <h1 className="text-2xl font-mono font-bold text-white tracking-tight mt-1">
                            Security Operations Center
                        </h1>
                    </div>
                    <div className="flex items-center gap-2.5">
                        <Link
                            href={route('quick-scan.index')}
                            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-slate-900 border border-cyan-500/40 text-cyan-300 font-mono text-xs font-semibold uppercase tracking-wider hover:bg-cyan-950/40 hover:border-cyan-400 hover:shadow-[0_0_12px_rgba(6,182,212,0.25)] active:scale-[0.98] transition-all"
                        >
                            <MagnifyingGlassIcon className="h-4 w-4" />
                            Quick Recon
                        </Link>
                    </div>
                </div>
            }
        >
            <Head title="SOC Dashboard" />

            <div className="py-8">
                <div className="mx-auto max-w-7xl space-y-8 px-4 sm:px-6 lg:px-8">
                    
                    {/* Top Stat Grid with Staggered Fade */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 hud-fade-in">
                        <StatCard 
                            label="Active Targets" 
                            value={`${stats.active_targets} / ${stats.targets}`} 
                            subtext="Monitored domains & hosts"
                            Icon={ServerStackIcon} 
                        />
                        <StatCard 
                            label="Total Scans" 
                            value={stats.scan_runs} 
                            subtext="Completed execution runs"
                            accent="text-cyan-300"
                            glowColor="bg-cyan-500"
                            Icon={ShieldCheckIcon} 
                        />
                        <StatCard 
                            label="Unresolved Findings" 
                            value={stats.unresolved} 
                            subtext="Awaiting remediation"
                            accent="text-amber-400" 
                            glowColor="bg-amber-500"
                            Icon={BugAntIcon} 
                        />
                        <StatCard 
                            label="Critical Exposures" 
                            value={stats.critical} 
                            subtext="Requires immediate patch"
                            accent="text-rose-400" 
                            glowColor="bg-rose-500"
                            Icon={ExclamationTriangleIcon} 
                        />
                    </div>

                    {/* Threat Matrix Bar with Laser Sweep Header */}
                    <div className="laser-beam-header rounded-xl border border-white/[0.08] bg-[#0c1428]/90 p-5 backdrop-blur-md shadow-lg space-y-3 hud-fade-in hud-stagger-1">
                        <div className="flex items-center justify-between">
                            <h2 className="font-mono text-xs uppercase tracking-widest text-slate-300 font-bold flex items-center gap-2">
                                <span className="relative flex h-2.5 w-2.5">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
                                </span>
                                Vulnerability Threat Severity Matrix
                            </h2>
                            <Link 
                                href={route('vulnerabilities.index')} 
                                className="font-mono text-xs text-red-400 hover:text-red-300 flex items-center gap-1 transition group"
                            >
                                <span>Triage all</span>
                                <ArrowRightIcon className="h-3 w-3 group-hover:translate-x-1 transition-transform" />
                            </Link>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                            {[
                                ['Critical', stats.critical, 'text-rose-400 border-rose-500/30 bg-rose-950/20 hover:border-rose-500/80 hover:shadow-[0_0_20px_rgba(244,63,94,0.35)] hover:-translate-y-1'],
                                ['High', stats.high, 'text-orange-400 border-orange-500/30 bg-orange-950/20 hover:border-orange-500/80 hover:shadow-[0_0_20px_rgba(249,115,22,0.3)] hover:-translate-y-1'],
                                ['Medium', stats.medium, 'text-amber-400 border-amber-500/30 bg-amber-950/20 hover:border-amber-500/80 hover:shadow-[0_0_20px_rgba(245,158,11,0.3)] hover:-translate-y-1'],
                                ['Low', stats.low, 'text-cyan-400 border-cyan-500/30 bg-cyan-950/20 hover:border-cyan-500/80 hover:shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:-translate-y-1'],
                                ['Info', stats.info, 'text-slate-400 border-slate-700/60 bg-slate-900/30 hover:border-slate-500 hover:shadow-[0_0_15px_rgba(100,116,139,0.2)] hover:-translate-y-1'],
                            ].map(([label, value, cls]) => (
                                <Link
                                    key={label}
                                    href={route('vulnerabilities.index', { severity: label.toLowerCase() })}
                                    className={`rounded-lg border p-3.5 text-center transition-all duration-300 group block ${cls}`}
                                >
                                    <p className="font-mono text-2xl font-extrabold group-hover:scale-110 transition-transform duration-200">{value}</p>
                                    <p className="font-mono text-[10px] uppercase tracking-wider font-semibold text-slate-400 mt-0.5">{label}</p>
                                </Link>
                            ))}
                        </div>
                    </div>

                    {/* Recent Scan Runs Operations Feed */}
                    <div className="laser-beam-header rounded-xl border border-white/[0.08] bg-[#0c1428]/90 backdrop-blur-md shadow-lg overflow-hidden hud-fade-in hud-stagger-2">
                        <div className="flex items-center justify-between border-b border-white/[0.08] px-5 py-4 bg-[#090f1f]">
                            <div className="flex items-center gap-2">
                                <CommandLineIcon className="h-4 w-4 text-cyan-400" />
                                <h2 className="font-mono text-xs uppercase tracking-widest text-slate-200 font-bold">
                                    Recent Security Operations
                                </h2>
                            </div>
                            <Link href={route('scan-runs.index')} className="font-mono text-xs text-red-400 hover:text-red-300 flex items-center gap-1 transition group">
                                <span>Operation history</span>
                                <ArrowRightIcon className="h-3 w-3 group-hover:translate-x-1 transition-transform" />
                            </Link>
                        </div>

                        {recentRuns.length === 0 ? (
                            <div className="px-5 py-12 text-center text-xs font-mono text-slate-500 space-y-3">
                                <div>No scan operations registered yet.</div>
                                <Link
                                    href={route('targets.index')}
                                    className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-300 hover:text-white hover:border-slate-500 hover:scale-105 transition-all text-xs font-mono"
                                >
                                    Deploy First Target
                                </Link>
                            </div>
                        ) : (
                            <ul className="divide-y divide-white/[0.05]">
                                {recentRuns.map((run) => (
                                    <li key={run.id} className="hover:bg-slate-800/50 hover:pl-2 transition-all duration-200">
                                        <Link
                                            href={route('scan-runs.show', run.id)}
                                            className="flex flex-col sm:flex-row sm:items-center justify-between px-5 py-3.5 gap-3"
                                        >
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-mono text-[10px] text-slate-500">#{run.id}</span>
                                                    <p className="truncate font-mono text-sm font-semibold text-slate-100 hover:text-cyan-400 transition-colors">
                                                        {run.target ?? '—'}
                                                    </p>
                                                </div>
                                                <p className="font-mono text-[11px] text-slate-500 mt-0.5">
                                                    {run.created_at ? new Date(run.created_at).toLocaleString() : ''}
                                                </p>
                                            </div>

                                            <div className="flex items-center gap-3 shrink-0">
                                                <span className="font-mono text-xs px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-slate-300">
                                                    <strong className={run.findings_count > 0 ? 'text-amber-400' : 'text-slate-400'}>
                                                        {run.findings_count}
                                                    </strong> findings
                                                </span>
                                                <span className={`rounded-full border px-2.5 py-0.5 font-mono text-[11px] font-semibold uppercase tracking-wider transition-transform group-hover:scale-105 ${RUN_STATUS[run.status] ?? RUN_STATUS.pending}`}>
                                                    {run.status_label}
                                                </span>
                                            </div>
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                </div>
            </div>
        </AuthenticatedLayout>
    );
}
