import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import InputError from '@/Components/InputError';
import {
    ArrowLeftIcon, PlayIcon, ShieldCheckIcon, ShieldExclamationIcon,
    ClockIcon, BugAntIcon, CheckCircleIcon, SparklesIcon
} from '@heroicons/react/24/outline';

const SEV = {
    critical: 'text-rose-400 border-rose-500/40 bg-rose-950/40 shadow-[0_0_8px_rgba(244,63,94,0.25)]',
    high: 'text-orange-400 border-orange-500/30 bg-orange-950/30',
    medium: 'text-amber-400 border-amber-500/30 bg-amber-950/30',
    low: 'text-cyan-400 border-cyan-500/30 bg-cyan-950/30',
    info: 'text-slate-400 border-slate-700 bg-slate-900/40',
};

const RUN_STATUS = {
    pending: 'text-slate-400 bg-slate-900/60 border-slate-700',
    running: 'text-cyan-400 bg-cyan-950/60 border-cyan-500/40 shadow-[0_0_12px_rgba(6,182,212,0.3)]',
    completed: 'text-emerald-400 bg-emerald-950/60 border-emerald-500/40 shadow-[0_0_12px_rgba(16,185,129,0.3)]',
    partial: 'text-amber-400 bg-amber-950/60 border-amber-500/40',
    failed: 'text-rose-400 bg-rose-950/60 border-rose-500/40 shadow-[0_0_12px_rgba(244,63,94,0.3)]',
};

export default function TargetShow({ target, recentFindings = [], recentRuns = [], availableTools = [], consentText }) {
    const flash = usePage().props.flash ?? {};
    const authorized = !!target.is_authorized;

    const { data, setData, post, processing, errors } = useForm({
        tools: ['builtin'],
        consent: false,
    });

    const toggleTool = (name) => {
        setData('tools', data.tools.includes(name)
            ? data.tools.filter((t) => t !== name)
            : [...data.tools, name]);
    };

    const startScan = (e) => {
        e.preventDefault();
        post(route('targets.scan-run', target.id), { preserveScroll: true });
    };

    const canStart = authorized && data.consent && data.tools.length > 0 && !processing;

    return (
        <AuthenticatedLayout
            header={
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <Link 
                            href={route('targets.index')} 
                            className="p-1.5 rounded-lg border border-slate-800 bg-slate-900/80 text-slate-400 hover:text-white hover:border-slate-700 transition-all hover:scale-105 active:scale-95"
                        >
                            <ArrowLeftIcon className="h-4 w-4" />
                        </Link>
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="font-mono text-[10px] uppercase tracking-widest px-2 py-0.5 rounded bg-red-950/60 text-red-400 border border-red-800/60 font-semibold">
                                    TARGET ASSET
                                </span>
                                <span className="font-mono text-xs text-slate-500">Host Surveillance</span>
                            </div>
                            <h1 className="text-xl font-mono font-bold text-white tracking-tight mt-1">
                                {target.domain_url}
                            </h1>
                            {target.display_name && <p className="text-xs text-slate-400 font-sans mt-0.5">{target.display_name}</p>}
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <span className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1 font-mono text-xs font-bold uppercase tracking-wider ${
                            authorized ? 'border-emerald-500/40 bg-emerald-950/50 text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.2)]' : 'border-amber-500/40 bg-amber-950/50 text-amber-400'
                        }`}>
                            {authorized ? <ShieldCheckIcon className="h-4 w-4 text-emerald-400" /> : <ShieldExclamationIcon className="h-4 w-4 text-amber-400" />}
                            {authorized ? 'AUTHORIZED' : 'NOT AUTHORIZED'}
                        </span>
                        <Link href={route('scan-runs.index', { target_id: target.id })}>
                            <SecondaryButton type="button" className="text-xs">
                                <PlayIcon className="h-3.5 w-3.5 mr-1.5 text-red-400" />
                                Scan History
                            </SecondaryButton>
                        </Link>
                    </div>
                </div>
            }
        >
            <Head title={target.domain_url} />

            <div className="py-8">
                <div className="mx-auto grid max-w-7xl gap-6 px-4 sm:px-6 lg:grid-cols-3 lg:px-8">
                    
                    {/* Launch Panel */}
                    <div className="lg:col-span-2 space-y-6">
                        {flash.success && (
                            <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/40 px-4 py-3 font-mono text-xs text-emerald-300 shadow-lg hud-fade-in">
                                {flash.success}
                            </div>
                        )}

                        {!authorized && (
                            <div className="rounded-xl border border-amber-500/30 bg-amber-950/40 px-4 py-3 text-xs text-amber-300 shadow-lg hud-fade-in">
                                ⚠️ This target is not marked as authorized yet.{' '}
                                <Link href={route('targets.edit', target.id)} className="underline hover:text-amber-200 font-semibold font-mono">
                                    Authorize target
                                </Link> to dispatch multi-tool scans.
                            </div>
                        )}

                        {/* Scanner Configuration Form */}
                        <form onSubmit={startScan} className="laser-beam-header rounded-xl border border-white/[0.08] bg-[#0c1428]/95 p-6 backdrop-blur-md shadow-xl hud-fade-in">
                            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3 mb-4">
                                <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                                    <span>◈</span> Dispatch Security Scan
                                </h3>
                                <span className="font-mono text-[11px] text-cyan-400">
                                    {data.tools.length} tool(s) selected
                                </span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                {availableTools.map((tool) => {
                                    const disabled = !tool.installed;
                                    const isSelected = data.tools.includes(tool.name);
                                    return (
                                        <label
                                            key={tool.name}
                                            className={`cyber-card-interactive flex items-start gap-3 rounded-lg border p-3 cursor-pointer select-none transition-all ${
                                                disabled ? 'cursor-not-allowed opacity-50 border-slate-800 bg-[#070b14]' :
                                                isSelected ? 'border-cyan-500/60 bg-slate-800/40 shadow-sm' :
                                                'border-slate-800 bg-[#070b14]'
                                            }`}
                                        >
                                            <input
                                                type="checkbox"
                                                disabled={disabled}
                                                checked={isSelected}
                                                onChange={() => toggleTool(tool.name)}
                                                className="mt-0.5 h-4 w-4 rounded border-slate-700 bg-[#070b14] text-red-500 focus:ring-red-500"
                                            />
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-mono text-xs font-bold text-slate-100">{tool.label}</span>
                                                    {tool.name === 'builtin' && (
                                                        <span className="cyber-badge font-mono text-[9px] text-cyan-300 bg-cyan-950/60 border-cyan-800">RECOMMENDED</span>
                                                    )}
                                                    {!tool.installed && (
                                                        <span className="font-mono text-[10px] text-slate-500">NOT INSTALLED</span>
                                                    )}
                                                </div>
                                                <p className="text-[11px] text-slate-400 font-sans mt-0.5 line-clamp-2">{tool.description}</p>
                                            </div>
                                        </label>
                                    );
                                })}
                            </div>
                            <InputError message={errors.tools} className="mt-2" />

                            <label className="mt-4 flex items-start gap-3 rounded-lg border border-slate-800 bg-[#070b14] p-3.5 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={data.consent}
                                    onChange={(e) => setData('consent', e.target.checked)}
                                    className="mt-0.5 h-4 w-4 rounded border-slate-700 bg-slate-900 text-red-500 focus:ring-red-500"
                                />
                                <span className="text-xs text-slate-400 font-sans leading-relaxed">{consentText}</span>
                            </label>
                            <InputError message={errors.consent} className="mt-1" />
                            <InputError message={errors.scan} className="mt-1" />

                            <div className="mt-5 flex justify-end">
                                <PrimaryButton disabled={!canStart}>
                                    <PlayIcon className="mr-2 h-4 w-4" />
                                    {processing ? 'Queuing Scan…' : 'Execute Scan'}
                                </PrimaryButton>
                            </div>
                        </form>

                        {/* Recent Findings Table */}
                        <div className="laser-beam-header rounded-xl border border-white/[0.08] bg-[#0c1428]/95 backdrop-blur-md shadow-xl overflow-hidden hud-fade-in hud-stagger-1">
                            <div className="flex items-center justify-between border-b border-white/[0.08] px-5 py-3.5 bg-[#090f1f]">
                                <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                                    <BugAntIcon className="h-4 w-4 text-amber-400" />
                                    Latest Discovered Findings
                                </h3>
                                <Link href={route('targets.vulnerabilities', target.id)} className="text-xs text-red-400 hover:text-red-300 font-mono">
                                    View all findings →
                                </Link>
                            </div>
                            {recentFindings.length === 0 ? (
                                <div className="px-5 py-10 text-center font-mono text-xs text-slate-500">
                                    No vulnerabilities recorded for this target yet.
                                </div>
                            ) : (
                                <ul className="divide-y divide-white/[0.04]">
                                    {recentFindings.map((f) => (
                                        <li key={f.id} className="flex items-center gap-3 px-5 py-3.5 hover:bg-slate-800/40 hover:pl-6 transition-all duration-200">
                                            <span className={`cyber-badge ${SEV[f.severity] ?? SEV.info}`}>{f.severity}</span>
                                            <div className="min-w-0 flex-1">
                                                <p className="truncate font-mono text-xs font-semibold text-slate-100">{f.title}</p>
                                                <p className="text-[11px] font-mono text-slate-500 mt-0.5">{f.tool} · {f.category}</p>
                                            </div>
                                            {f.is_resolved && (
                                                <CheckCircleIcon className="h-4 w-4 text-emerald-400 shrink-0" title="Resolved" />
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>

                    {/* Sidebar: Recent Runs */}
                    <div className="space-y-6">
                        <div className="laser-beam-header rounded-xl border border-white/[0.08] bg-[#0c1428]/95 backdrop-blur-md shadow-xl overflow-hidden hud-fade-in hud-stagger-2">
                            <div className="flex items-center justify-between border-b border-white/[0.08] px-5 py-3.5 bg-[#090f1f]">
                                <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-slate-300">
                                    Recent Operations
                                </h3>
                                <Link href={route('scan-runs.index', { target_id: target.id })} className="text-xs text-red-400 hover:text-red-300 font-mono">
                                    All ({recentRuns.length})
                                </Link>
                            </div>
                            {recentRuns.length === 0 ? (
                                <div className="px-5 py-8 text-center font-mono text-xs text-slate-500">No scan runs executed yet.</div>
                            ) : (
                                <ul className="divide-y divide-white/[0.04]">
                                    {recentRuns.map((r) => (
                                        <li key={r.id}>
                                            <Link 
                                                href={route('scan-runs.show', r.id)} 
                                                className="flex items-center justify-between px-5 py-3 hover:bg-slate-800/40 hover:pl-6 transition-all duration-200"
                                            >
                                                <span className="font-mono text-xs text-slate-300">
                                                    {r.created_at ? new Date(r.created_at).toLocaleDateString() : ''}
                                                </span>
                                                <span className={`cyber-badge ${RUN_STATUS[r.status] ?? RUN_STATUS.pending}`}>
                                                    {r.status_label}
                                                </span>
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>

                </div>
            </div>
        </AuthenticatedLayout>
    );
}
