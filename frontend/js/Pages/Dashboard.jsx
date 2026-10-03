import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link } from '@inertiajs/react';
import { 
    ShieldCheckIcon, 
    ServerStackIcon, 
    BugAntIcon, 
    ExclamationTriangleIcon,
    MagnifyingGlassIcon,
    ArrowRightIcon,
    ChartBarIcon,
    DocumentTextIcon,
    GlobeAltIcon,
    LockClosedIcon
} from '@heroicons/react/24/outline';

const RUN_STATUS = {
    pending: 'text-exec-muted bg-white/[0.03] backdrop-blur-md border-white/[0.05]',
    running: 'text-exec-indigo bg-exec-indigo/10 border-exec-indigo/30 shadow-[0_0_15px_rgba(99,102,241,0.2)]',
    completed: 'text-exec-info bg-exec-info/10 border-exec-info/30 shadow-[0_0_10px_rgba(16,185,129,0.2)]',
    partial: 'text-exec-medium bg-exec-medium/10 border-exec-medium/30',
    failed: 'text-exec-critical bg-exec-critical/10 border-exec-critical/30 shadow-[0_0_10px_rgba(244,63,94,0.2)]',
};

function StatCard({ label, value, subtext, highlight, accent = 'text-white', Icon }) {
    return (
        <div className="bg-white/[0.02] backdrop-blur-2xl border border-white/[0.08] relative overflow-hidden rounded-2xl p-6 shadow-[0_4px_30px_rgba(0,0,0,0.1)] group hover:-translate-y-1 hover:border-exec-indigo/40 hover:bg-white/[0.04] transition-all duration-300">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.15] to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            
            <div className="flex items-start justify-between relative z-10">
                <div>
                    <p className="font-sans text-sm tracking-wide text-slate-400 font-medium">{label}</p>
                    <div className="flex items-end gap-3 mt-3">
                        <p className={`font-sans text-4xl font-bold tracking-tight transition-all duration-300 group-hover:translate-x-1 ${accent}`}>{value}</p>
                        {highlight && (
                            <span className="font-sans text-xs font-semibold px-2 py-1 rounded bg-exec-critical/20 text-exec-critical border border-exec-critical/30 mb-1">
                                {highlight}
                            </span>
                        )}
                    </div>
                    {subtext && <p className="font-sans text-xs text-slate-500 mt-2">{subtext}</p>}
                </div>
                {Icon && (
                    <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.08] text-slate-400 group-hover:text-exec-indigo group-hover:border-exec-indigo/40 group-hover:bg-exec-indigo/10 transition-all duration-300">
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
                        <div className="flex items-center gap-3">
                            <span className="font-sans text-[10px] px-2.5 py-1 rounded-full bg-exec-indigo/10 text-exec-indigo border border-exec-indigo/30 font-bold uppercase tracking-wider flex items-center gap-2 shadow-[0_0_10px_rgba(99,102,241,0.2)]">
                                <span className="h-1.5 w-1.5 rounded-full bg-exec-indigo animate-pulse"></span>
                                Global Perimeter
                            </span>
                            <span className="text-slate-500 text-sm font-sans">/</span>
                            <span className="font-sans text-xs text-slate-400 font-medium">Live Telemetry & Surface Health</span>
                        </div>
                        <h1 className="text-3xl font-sans font-bold text-white tracking-tight mt-3 drop-shadow-md">
                            Executive Posture Briefing
                        </h1>
                    </div>
                    <div className="flex items-center gap-3">
                        <Link
                            href={route('vulnerabilities.index')}
                            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/[0.03] backdrop-blur-md border border-white/[0.1] text-slate-200 font-sans text-sm font-semibold hover:bg-white/[0.08] transition-all shadow-sm group"
                        >
                            <DocumentTextIcon className="h-4 w-4 group-hover:text-exec-indigo transition-colors" />
                            CISO Briefing PDF
                        </Link>
                        <Link
                            href={route('quick-scan.index')}
                            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-exec-indigo to-[#8b5cf6] text-white font-sans text-sm font-bold hover:shadow-[0_0_20px_rgba(99,102,241,0.5)] active:scale-[0.98] transition-all relative overflow-hidden"
                        >
                            <div className="absolute inset-0 bg-white/20 hover:opacity-0 transition-opacity rounded-xl pointer-events-none"></div>
                            <GlobeAltIcon className="h-5 w-5" />
                            Run Global Diagnostic
                        </Link>
                    </div>
                </div>
            }
        >
            <Head title="Executive Dashboard" />

            <div className="py-10">
                <div className="mx-auto max-w-[1400px] space-y-10 px-4 sm:px-6 lg:px-8">
                    
                    {/* Top Stat Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 hud-fade-in">
                        <StatCard 
                            label="Monitored Endpoints & Cloud Workloads" 
                            value={`${stats.active_targets || 0}`} 
                            subtext="Active across all global perimeters"
                            Icon={ServerStackIcon} 
                        />
                        <StatCard 
                            label="Active Vulnerabilities & Threats" 
                            value={stats.unresolved || 0} 
                            highlight={stats.critical > 0 ? `${stats.critical} Action Required` : null}
                            subtext="Awaiting remediation workflows"
                            accent="text-white" 
                            Icon={BugAntIcon} 
                        />
                        <StatCard 
                            label="Compliance & Hygiene Score" 
                            value="94.8%" 
                            subtext="SOC 2 Type II, ISO 27001, FedRAMP"
                            accent="text-exec-info"
                            Icon={ShieldCheckIcon} 
                        />
                        <StatCard 
                            label="Composite Risk Exposure Index" 
                            value="78.2" 
                            subtext="Moderate Risk (-3.8% DoD reduction)"
                            accent="text-exec-high" 
                            Icon={LockClosedIcon} 
                        />
                    </div>

                    {/* Threat Matrix Bar */}
                    <div className="rounded-3xl border border-white/[0.08] bg-white/[0.02] backdrop-blur-2xl p-8 shadow-[0_8px_32px_rgba(0,0,0,0.2)] space-y-6 hud-fade-in hud-stagger-1 relative overflow-hidden group">
                        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.12] to-transparent"></div>
                        <div className="flex items-center justify-between relative z-10">
                            <h2 className="font-sans text-lg text-slate-100 font-semibold flex items-center gap-3">
                                Threat Severity Breakdown & Action Matrix
                            </h2>
                            <Link 
                                href={route('vulnerabilities.index')} 
                                className="font-sans text-sm text-slate-400 hover:text-white flex items-center gap-1.5 transition group font-medium bg-white/[0.03] px-3 py-1.5 rounded-lg border border-white/[0.05] hover:border-white/[0.2]"
                            >
                                <span>Global Action Queue</span>
                                <ArrowRightIcon className="h-4 w-4 group-hover:translate-x-1 group-hover:text-exec-indigo transition-all" />
                            </Link>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-5 gap-5 relative z-10">
                            {[
                                ['Critical', stats.critical || 0, 'Immediate Patching Required - RCE & VPN Gateways', 'text-exec-critical border-exec-critical/30 bg-exec-critical/5 hover:bg-exec-critical/10 hover:border-exec-critical hover:shadow-[0_0_20px_rgba(244,63,94,0.15)]'],
                                ['High', stats.high || 0, 'Access Control & SSRF Internal Ingress', 'text-exec-high border-exec-high/30 bg-exec-high/5 hover:bg-exec-high/10 hover:border-exec-high hover:shadow-[0_0_20px_rgba(245,158,11,0.15)]'],
                                ['Medium', stats.medium || 0, 'Config Drift & Outdated TLS Defaults', 'text-exec-medium border-exec-medium/30 bg-exec-medium/5 hover:bg-exec-medium/10 hover:border-exec-medium'],
                                ['Low', stats.low || 0, 'Header Disclosure & Cookie Misflags', 'text-exec-low border-exec-low/30 bg-exec-low/5 hover:bg-exec-low/10 hover:border-exec-low'],
                                ['Informational', stats.info || 0, 'Verified Ingress & DNS Catalogued', 'text-exec-info border-exec-info/30 bg-exec-info/5 hover:bg-exec-info/10 hover:border-exec-info'],
                            ].map(([label, value, desc, cls]) => (
                                <Link
                                    key={label}
                                    href={route('vulnerabilities.index', { severity: label.split(' ')[0].toLowerCase() })}
                                    className={`rounded-2xl border backdrop-blur-md p-5 transition-all duration-300 group block hover:-translate-y-1.5 relative overflow-hidden ${cls}`}
                                >
                                    <div className="absolute inset-x-0 top-0 h-px bg-current opacity-30"></div>
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="h-2 w-2 rounded-full bg-current shadow-[0_0_10px_currentColor]"></div>
                                        <p className="font-sans text-xs font-bold tracking-widest uppercase">{label}</p>
                                    </div>
                                    <p className="font-sans text-4xl font-bold group-hover:scale-105 transition-transform duration-200 origin-left mb-2 text-white drop-shadow-md">{value}</p>
                                    <p className="font-sans text-xs opacity-70 leading-relaxed text-slate-300 group-hover:opacity-100 transition-opacity">{desc}</p>
                                </Link>
                            ))}
                        </div>
                    </div>

                    {/* Main Dashboard Split View */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 hud-fade-in hud-stagger-2">
                        
                        {/* Left Column: Prioritized Incident Stream (65%) */}
                        <div className="lg:col-span-2 rounded-3xl border border-white/[0.08] bg-white/[0.02] backdrop-blur-2xl shadow-[0_8px_32px_rgba(0,0,0,0.2)] overflow-hidden flex flex-col relative">
                            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.12] to-transparent"></div>
                            
                            <div className="flex items-center justify-between border-b border-white/[0.08] px-8 py-5 bg-white/[0.01]">
                                <div className="flex items-center gap-3">
                                    <ChartBarIcon className="h-5 w-5 text-exec-indigo" />
                                    <h2 className="font-sans text-lg text-slate-100 font-semibold">
                                        Prioritized Incident Stream
                                    </h2>
                                </div>
                                <div className="flex gap-2">
                                    <span className="text-[10px] font-mono tracking-widest uppercase px-3 py-1 bg-white/[0.05] border border-white/[0.1] rounded-full text-slate-300">Live</span>
                                    <span className="text-[10px] font-mono tracking-widest uppercase px-3 py-1 hover:bg-white/[0.05] text-slate-500 cursor-pointer rounded-full transition-colors">Audit</span>
                                </div>
                            </div>

                            {recentRuns.length === 0 ? (
                                <div className="px-8 py-20 flex-1 flex flex-col items-center justify-center text-center">
                                    <div className="h-16 w-16 rounded-full bg-white/[0.03] border border-white/[0.05] flex items-center justify-center mb-4">
                                        <ShieldCheckIcon className="h-8 w-8 text-slate-600" />
                                    </div>
                                    <p className="text-sm font-sans text-slate-400 font-medium">No active security incidents recorded.</p>
                                    <p className="text-xs font-sans text-slate-500 mt-1 mb-6">Perimeter defenses are nominal and quiet.</p>
                                </div>
                            ) : (
                                <ul className="divide-y divide-white/[0.05] flex-1 overflow-y-auto max-h-[500px]">
                                    {recentRuns.map((run) => (
                                        <li key={run.id} className="hover:bg-white/[0.03] transition-colors duration-200">
                                            <Link
                                                href={route('scan-runs.show', run.id)}
                                                className="flex flex-col sm:flex-row sm:items-start justify-between px-8 py-6 gap-6 group"
                                            >
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-start gap-4">
                                                        <div className="pt-1.5 shrink-0">
                                                            <span className={`block h-3 w-3 rounded-full border border-black/20 ${run.findings_count > 0 ? 'bg-exec-high shadow-[0_0_12px_rgba(245,158,11,0.6)]' : 'bg-exec-info shadow-[0_0_12px_rgba(16,185,129,0.6)]'}`}></span>
                                                        </div>
                                                        <div>
                                                            <div className="flex items-center gap-3">
                                                                <p className="truncate font-sans text-base font-bold text-slate-100 group-hover:text-exec-indigo transition-colors drop-shadow-sm">
                                                                    {run.target ?? 'Global Asset Recon'}
                                                                </p>
                                                                {run.findings_count > 0 && (
                                                                    <span className="font-mono text-[9px] font-bold px-2 py-0.5 rounded border border-exec-high/50 bg-exec-high/20 text-exec-high">
                                                                        CVSS 8.4
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <p className="font-sans text-sm text-slate-400 mt-1.5 leading-relaxed">
                                                                {run.findings_count > 0 
                                                                    ? `Anomalous vector detected. Executive containment protocol recommended for immediate mitigation.` 
                                                                    : `Diagnostic cycle completed successfully. Automated defenses hold perimeter.`}
                                                            </p>
                                                            <p className="font-mono text-[10px] text-slate-500 mt-3 flex items-center gap-2">
                                                                <span>{run.created_at ? new Date(run.created_at).toLocaleString() : ''}</span>
                                                                <span>•</span>
                                                                <span className="text-exec-indigo/80">Probe ID: {String(run.id).substring(0,8)}</span>
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex flex-col items-end gap-3 shrink-0">
                                                    <span className={`rounded-lg border px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-widest ${RUN_STATUS[run.status] ?? RUN_STATUS.pending}`}>
                                                        {run.status_label}
                                                    </span>
                                                    {run.findings_count > 0 && (
                                                        <button className="text-xs font-sans font-semibold px-4 py-2 rounded-lg bg-white/[0.05] border border-white/[0.1] hover:bg-white/[0.1] hover:border-white/[0.2] text-slate-200 transition-all">
                                                            Isolate Endpoint
                                                        </button>
                                                    )}
                                                </div>
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            )}
                            
                            <div className="border-t border-white/[0.08] bg-black/20 p-4 flex items-center justify-between text-xs font-mono text-slate-500">
                                <div className="flex items-center gap-2">
                                    <span className="h-1.5 w-1.5 rounded-full bg-exec-indigo animate-pulse shadow-[0_0_8px_#6366f1]"></span>
                                    <span>Ingesting live packets...</span>
                                </div>
                                <div className="flex gap-4">
                                    <span className="hover:text-slate-300 cursor-pointer transition-colors">Filters</span>
                                    <span className="hover:text-slate-300 cursor-pointer transition-colors">Clear Stream</span>
                                </div>
                            </div>
                        </div>

                        {/* Right Column: Perimeter Radar & Surface (35%) */}
                        <div className="space-y-6">
                            <div className="rounded-3xl border border-white/[0.08] bg-white/[0.02] backdrop-blur-2xl shadow-[0_8px_32px_rgba(0,0,0,0.2)] p-6 relative overflow-hidden h-[300px] flex flex-col items-center justify-center group">
                                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.12] to-transparent"></div>
                                <h3 className="font-sans text-sm font-semibold text-slate-300 absolute top-6 left-6 z-10">Active Perimeter Clusters</h3>
                                
                                {/* Simulated Interactive Glass Radar */}
                                <div className="relative w-48 h-48 rounded-full border border-white/[0.05] flex items-center justify-center">
                                    <div className="absolute inset-0 rounded-full border border-white/[0.05] scale-75"></div>
                                    <div className="absolute inset-0 rounded-full border border-white/[0.05] scale-50"></div>
                                    <div className="absolute inset-0 rounded-full border border-exec-indigo/30 scale-25"></div>
                                    
                                    {/* Sweep beam */}
                                    <div className="absolute inset-0 rounded-full bg-[conic-gradient(from_0deg,transparent_0deg,rgba(99,102,241,0.02)_60deg,rgba(99,102,241,0.2)_120deg,transparent_121deg)] animate-[radar-scan_6s_linear_infinite]"></div>
                                    
                                    {/* Blips */}
                                    <div className="absolute top-[20%] left-[30%] w-2 h-2 rounded-full bg-exec-info shadow-[0_0_10px_#10b981] animate-ping opacity-75"></div>
                                    <div className="absolute bottom-[30%] right-[20%] w-2 h-2 rounded-full bg-exec-high shadow-[0_0_10px_#f59e0b] opacity-90"></div>
                                    <div className="absolute top-[60%] left-[70%] w-1.5 h-1.5 rounded-full bg-exec-indigo shadow-[0_0_10px_#6366f1] opacity-60"></div>
                                </div>
                                <p className="absolute bottom-6 font-mono text-[10px] text-slate-500 uppercase tracking-widest text-center">
                                    Sector Alpha-3 Secure<br/>
                                    14 Nodes Connected
                                </p>
                            </div>

                            <div className="rounded-3xl border border-white/[0.08] bg-white/[0.02] backdrop-blur-2xl shadow-[0_8px_32px_rgba(0,0,0,0.2)] p-6 relative overflow-hidden">
                                <h3 className="font-sans text-sm font-semibold text-slate-300 mb-5">Asset Inventory Distribution</h3>
                                <div className="space-y-4">
                                    <div>
                                        <div className="flex justify-between text-xs font-sans text-slate-400 mb-1.5">
                                            <span>REST APIs & Gateways</span>
                                            <span className="font-mono text-slate-300">42%</span>
                                        </div>
                                        <div className="h-1.5 w-full bg-white/[0.05] rounded-full overflow-hidden">
                                            <div className="h-full bg-exec-indigo w-[42%] shadow-[0_0_8px_#6366f1]"></div>
                                        </div>
                                    </div>
                                    <div>
                                        <div className="flex justify-between text-xs font-sans text-slate-400 mb-1.5">
                                            <span>Web Applications</span>
                                            <span className="font-mono text-slate-300">35%</span>
                                        </div>
                                        <div className="h-1.5 w-full bg-white/[0.05] rounded-full overflow-hidden">
                                            <div className="h-full bg-exec-info w-[35%] shadow-[0_0_8px_#10b981]"></div>
                                        </div>
                                    </div>
                                    <div>
                                        <div className="flex justify-between text-xs font-sans text-slate-400 mb-1.5">
                                            <span>Edge Ingress & Proxies</span>
                                            <span className="font-mono text-slate-300">18%</span>
                                        </div>
                                        <div className="h-1.5 w-full bg-white/[0.05] rounded-full overflow-hidden">
                                            <div className="h-full bg-exec-medium w-[18%] shadow-[0_0_8px_#eab308]"></div>
                                        </div>
                                    </div>
                                </div>
                                <div className="mt-8">
                                    <button className="w-full font-sans text-xs font-semibold uppercase tracking-widest py-3 rounded-xl border border-exec-indigo/30 text-exec-indigo hover:bg-exec-indigo/10 hover:border-exec-indigo/50 transition-all shadow-[0_0_15px_rgba(99,102,241,0.1)] hover:shadow-[0_0_20px_rgba(99,102,241,0.2)]">
                                        Initiate Surface Sweep
                                    </button>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
