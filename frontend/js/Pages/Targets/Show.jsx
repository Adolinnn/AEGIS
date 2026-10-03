import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import InputError from '@/Components/InputError';
import {
    ArrowLeftIcon, PlayIcon, ShieldCheckIcon, ShieldExclamationIcon,
    ClockIcon, BugAntIcon, CheckCircleIcon, SparklesIcon, GlobeAltIcon
} from '@heroicons/react/24/outline';

const SEV = {
    critical: 'text-exec-critical border-exec-critical/40 bg-exec-critical/10 shadow-[0_0_8px_rgba(244,63,94,0.15)]',
    high: 'text-exec-high border-exec-high/30 bg-exec-high/10',
    medium: 'text-exec-medium border-exec-medium/30 bg-exec-medium/10',
    low: 'text-exec-info border-exec-info/30 bg-exec-info/10',
    info: 'text-slate-400 border-slate-700 bg-white/[0.05]',
};

const RUN_STATUS = {
    pending: 'text-slate-400 bg-white/[0.05] border-white/[0.1]',
    running: 'text-exec-indigo bg-exec-indigo/10 border-exec-indigo/30 shadow-[0_0_12px_rgba(99,102,241,0.2)]',
    completed: 'text-exec-info bg-exec-info/10 border-exec-info/30 shadow-[0_0_12px_rgba(16,185,129,0.2)]',
    partial: 'text-exec-medium bg-exec-medium/10 border-exec-medium/30',
    failed: 'text-exec-critical bg-exec-critical/10 border-exec-critical/30 shadow-[0_0_12px_rgba(244,63,94,0.2)]',
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
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <Link 
                            href={route('targets.index')} 
                            className="p-2.5 rounded-xl border border-white/[0.08] bg-white/[0.02] text-slate-400 hover:text-white hover:border-white/[0.15] hover:bg-white/[0.04] transition-all hover:-translate-x-0.5 active:translate-x-0 backdrop-blur-md shadow-sm"
                        >
                            <ArrowLeftIcon className="h-5 w-5" />
                        </Link>
                        <div>
                            <div className="flex items-center gap-3">
                                <span className="font-sans text-[10px] px-2.5 py-1 rounded-full bg-exec-indigo/10 text-exec-indigo border border-exec-indigo/30 font-bold uppercase tracking-wider flex items-center gap-2 shadow-[0_0_10px_rgba(99,102,241,0.2)]">
                                    <GlobeAltIcon className="h-3 w-3" />
                                    Target Asset
                                </span>
                                <span className="text-slate-500 text-sm font-sans">/</span>
                                <span className="font-sans text-xs text-slate-400 font-medium">Host Surveillance</span>
                            </div>
                            <h1 className="text-3xl font-sans font-bold text-white tracking-tight mt-3 drop-shadow-md">
                                {target.domain_url}
                            </h1>
                            {target.display_name && <p className="text-sm text-slate-400 font-sans mt-1.5 font-medium">{target.display_name}</p>}
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <span className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2 font-sans text-xs font-bold uppercase tracking-widest ${
                            authorized ? 'border-exec-info/40 bg-exec-info/10 text-exec-info shadow-[0_0_15px_rgba(16,185,129,0.15)]' : 'border-exec-high/40 bg-exec-high/10 text-exec-high'
                        }`}>
                            {authorized ? <ShieldCheckIcon className="h-4 w-4" /> : <ShieldExclamationIcon className="h-4 w-4" />}
                            {authorized ? 'AUTHORIZED' : 'NOT AUTHORIZED'}
                        </span>
                        <Link href={route('scan-runs.index', { target_id: target.id })}>
                            <SecondaryButton type="button" className="text-sm px-6 py-2.5 bg-white/[0.05] border-white/[0.1] text-white hover:bg-white/[0.1]">
                                <PlayIcon className="h-4 w-4 mr-2 text-exec-indigo" />
                                Scan History
                            </SecondaryButton>
                        </Link>
                    </div>
                </div>
            }
        >
            <Head title={target.domain_url} />

            <div className="py-10">
                <div className="mx-auto grid max-w-[1400px] gap-8 px-4 sm:px-6 lg:grid-cols-3 lg:px-8">
                    
                    {/* Launch Panel */}
                    <div className="lg:col-span-2 space-y-8">
                        {flash.success && (
                            <div className="rounded-2xl border border-exec-info/40 bg-exec-info/10 p-5 font-sans text-sm text-exec-info shadow-[0_4px_20px_rgba(16,185,129,0.15)] flex items-center gap-3 hud-fade-in backdrop-blur-md">
                                <span className="font-mono text-xs font-bold uppercase tracking-widest text-white px-2 py-1 bg-exec-info rounded">Success</span>
                                <span>{flash.success}</span>
                            </div>
                        )}

                        {!authorized && (
                            <div className="rounded-2xl border border-exec-high/30 bg-exec-high/10 p-5 text-sm text-exec-high shadow-[0_4px_20px_rgba(245,158,11,0.15)] hud-fade-in backdrop-blur-md font-sans">
                                ⚠️ This target is not marked as authorized yet.{' '}
                                <Link href={route('targets.edit', target.id)} className="underline hover:text-white font-bold transition-colors">
                                    Authorize target
                                </Link> to dispatch multi-tool scans.
                            </div>
                        )}

                        {/* Scanner Configuration Form */}
                        <form onSubmit={startScan} className="rounded-3xl border border-white/[0.08] bg-white/[0.02] backdrop-blur-2xl p-8 shadow-[0_8px_32px_rgba(0,0,0,0.2)] hud-fade-in relative overflow-hidden">
                            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.15] to-transparent"></div>
                            
                            <div className="flex items-center justify-between border-b border-white/[0.08] pb-5 mb-6">
                                <h3 className="font-sans text-lg font-bold text-white flex items-center gap-3">
                                    <div className="p-2 rounded-lg bg-exec-indigo/10 border border-exec-indigo/30">
                                        <PlayIcon className="h-5 w-5 text-exec-indigo" />
                                    </div>
                                    Dispatch Security Scan
                                </h3>
                                <span className="font-sans text-xs font-bold text-exec-indigo px-3 py-1.5 rounded-full bg-exec-indigo/10 border border-exec-indigo/20">
                                    {data.tools.length} tool(s) selected
                                </span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {availableTools.map((tool) => {
                                    const disabled = !tool.installed;
                                    const isSelected = data.tools.includes(tool.name);
                                    return (
                                        <label
                                            key={tool.name}
                                            className={`flex items-start gap-4 rounded-xl border p-4 cursor-pointer select-none transition-all relative overflow-hidden ${
                                                disabled ? 'cursor-not-allowed opacity-50 border-white/[0.05] bg-black/20' :
                                                isSelected ? 'border-exec-indigo/50 bg-exec-indigo/10 shadow-[0_4px_15px_rgba(99,102,241,0.1)] -translate-y-1' :
                                                'border-white/[0.08] bg-white/[0.02] hover:border-white/[0.15] hover:bg-white/[0.04]'
                                            }`}
                                        >
                                            {isSelected && <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-exec-indigo to-transparent"></div>}
                                            <input
                                                type="checkbox"
                                                disabled={disabled}
                                                checked={isSelected}
                                                onChange={() => toggleTool(tool.name)}
                                                className="mt-0.5 h-4 w-4 rounded border-white/[0.2] bg-white/[0.05] text-exec-indigo focus:ring-exec-indigo focus:ring-offset-0 transition-colors"
                                            />
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-sans text-sm font-bold text-slate-100">{tool.label}</span>
                                                    {tool.name === 'builtin' && (
                                                        <span className="px-1.5 py-0.5 rounded font-sans text-[9px] font-bold uppercase tracking-wider text-exec-indigo bg-exec-indigo/20 border border-exec-indigo/40">RECOMMENDED</span>
                                                    )}
                                                    {!tool.installed && (
                                                        <span className="font-sans text-[10px] font-medium text-slate-500">NOT INSTALLED</span>
                                                    )}
                                                </div>
                                                <p className="text-xs text-slate-400 font-sans mt-1.5 font-medium line-clamp-2">{tool.description}</p>
                                            </div>
                                        </label>
                                    );
                                })}
                            </div>
                            <InputError message={errors.tools} className="mt-3" />

                            <label className="mt-6 flex items-start gap-4 rounded-xl border border-white/[0.08] bg-white/[0.02] p-5 cursor-pointer hover:border-white/[0.15] hover:bg-white/[0.04] transition-all">
                                <input
                                    type="checkbox"
                                    checked={data.consent}
                                    onChange={(e) => setData('consent', e.target.checked)}
                                    className="mt-0.5 h-4 w-4 rounded border-white/[0.2] bg-white/[0.05] text-exec-critical focus:ring-exec-critical focus:ring-offset-0"
                                />
                                <span className="text-sm text-slate-300 font-sans font-medium leading-relaxed">{consentText}</span>
                            </label>
                            <InputError message={errors.consent} className="mt-2" />
                            <InputError message={errors.scan} className="mt-2" />

                            <div className="mt-8 flex justify-end">
                                <button 
                                    type="submit"
                                    disabled={!canStart} 
                                    className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-gradient-to-r from-exec-critical to-rose-600 text-white font-sans text-sm font-bold hover:shadow-[0_0_20px_rgba(244,63,94,0.5)] active:scale-[0.98] transition-all relative overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <div className="absolute inset-0 bg-white/20 hover:opacity-0 transition-opacity rounded-xl pointer-events-none"></div>
                                    <PlayIcon className="h-5 w-5" />
                                    {processing ? 'Queuing Scan…' : 'Execute Scan'}
                                </button>
                            </div>
                        </form>

                        {/* Recent Findings Table */}
                        <div className="rounded-3xl border border-white/[0.08] bg-white/[0.02] backdrop-blur-2xl shadow-[0_8px_32px_rgba(0,0,0,0.2)] overflow-hidden hud-fade-in hud-stagger-1 relative">
                            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.12] to-transparent"></div>
                            
                            <div className="flex items-center justify-between border-b border-white/[0.08] px-6 py-5 bg-white/[0.01]">
                                <h3 className="font-sans text-sm font-bold uppercase tracking-widest text-slate-200 flex items-center gap-3">
                                    <BugAntIcon className="h-5 w-5 text-exec-high" />
                                    Latest Discovered Findings
                                </h3>
                                <Link href={route('targets.vulnerabilities', target.id)} className="text-sm font-bold text-exec-indigo hover:text-white transition-colors underline underline-offset-4">
                                    View all findings →
                                </Link>
                            </div>

                            {recentFindings.length === 0 ? (
                                <div className="px-6 py-12 text-center font-sans text-sm text-slate-400 font-medium">
                                    No vulnerabilities recorded for this target yet.
                                </div>
                            ) : (
                                <ul className="divide-y divide-white/[0.04]">
                                    {recentFindings.map((f) => (
                                        <li key={f.id} className="flex items-center gap-4 px-6 py-5 hover:bg-white/[0.03] hover:pl-7 transition-all duration-200 cursor-pointer">
                                            <span className={`px-2.5 py-1 rounded-full border font-mono text-[10px] font-bold uppercase tracking-widest ${SEV[f.severity] ?? SEV.info}`}>{f.severity}</span>
                                            <div className="min-w-0 flex-1">
                                                <p className="truncate font-sans text-sm font-bold text-slate-100">{f.title}</p>
                                                <p className="text-xs font-sans text-slate-400 font-medium mt-1">{f.tool} · {f.category}</p>
                                            </div>
                                            {f.is_resolved && (
                                                <CheckCircleIcon className="h-5 w-5 text-exec-info shrink-0" title="Resolved" />
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>

                    {/* Sidebar: Recent Runs */}
                    <div className="space-y-8">
                        <div className="rounded-3xl border border-white/[0.08] bg-white/[0.02] backdrop-blur-2xl shadow-[0_8px_32px_rgba(0,0,0,0.2)] overflow-hidden hud-fade-in hud-stagger-2 relative">
                            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.12] to-transparent"></div>
                            
                            <div className="flex items-center justify-between border-b border-white/[0.08] px-6 py-5 bg-white/[0.01]">
                                <h3 className="font-sans text-sm font-bold uppercase tracking-widest text-slate-200">
                                    Recent Operations
                                </h3>
                                <Link href={route('scan-runs.index', { target_id: target.id })} className="text-sm font-bold text-exec-indigo hover:text-white transition-colors">
                                    All ({recentRuns.length})
                                </Link>
                            </div>

                            {recentRuns.length === 0 ? (
                                <div className="px-6 py-10 text-center font-sans text-sm text-slate-400 font-medium">No scan runs executed yet.</div>
                            ) : (
                                <ul className="divide-y divide-white/[0.04]">
                                    {recentRuns.map((r) => (
                                        <li key={r.id}>
                                            <Link 
                                                href={route('scan-runs.show', r.id)} 
                                                className="flex flex-col gap-2 px-6 py-4 hover:bg-white/[0.03] hover:pl-7 transition-all duration-200"
                                            >
                                                <div className="flex items-center justify-between">
                                                    <span className="font-sans text-xs font-bold text-slate-300">
                                                        {r.created_at ? new Date(r.created_at).toLocaleDateString() : ''}
                                                    </span>
                                                    <span className={`px-2.5 py-1 rounded-full border font-mono text-[9px] font-bold uppercase tracking-widest ${RUN_STATUS[r.status] ?? RUN_STATUS.pending}`}>
                                                        {r.status_label}
                                                    </span>
                                                </div>
                                                <div className="font-sans text-[11px] text-slate-500 font-medium truncate">
                                                    Tools: {(r.selected_tools || []).join(', ')}
                                                </div>
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
