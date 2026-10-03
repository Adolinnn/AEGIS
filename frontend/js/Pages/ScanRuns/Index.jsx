import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import PrimaryButton from '@/Components/PrimaryButton';
import InputError from '@/Components/InputError';
import { 
    PlayIcon, 
    ArrowPathIcon,
    CommandLineIcon,
    ShieldCheckIcon,
    SparklesIcon,
    ArrowTopRightOnSquareIcon
} from '@heroicons/react/24/outline';
import { useEffect, useRef } from 'react';

const statusColor = {
    pending: 'text-slate-400 bg-white/[0.05] border-white/[0.1]',
    running: 'text-exec-indigo bg-exec-indigo/10 border-exec-indigo/30 shadow-[0_0_10px_rgba(99,102,241,0.2)]',
    completed: 'text-exec-info bg-exec-info/10 border-exec-info/30 shadow-[0_0_10px_rgba(16,185,129,0.2)]',
    partial: 'text-exec-medium bg-exec-medium/10 border-exec-medium/30',
    failed: 'text-exec-critical bg-exec-critical/10 border-exec-critical/30 shadow-[0_0_10px_rgba(244,63,94,0.2)]',
};

const NON_TERMINAL = ['pending', 'running'];

export default function ScanRunsIndex({ runs, targets = [], availableTools = [], consentText, selectedTargetId = null }) {
    const flash = usePage().props.flash ?? {};

    const toolList = Array.isArray(availableTools) ? availableTools : Object.values(availableTools ?? {});
    const targetList = Array.isArray(targets) ? targets : Object.values(targets ?? {});
    const runRows = runs?.data ?? [];

    const authorizedTargets = targetList.filter((t) => t.is_authorized);
    const hasLive = runRows.some((r) => NON_TERMINAL.includes(r.status));

    const initialTargetId = selectedTargetId && authorizedTargets.some(t => t.id === Number(selectedTargetId))
        ? Number(selectedTargetId)
        : (authorizedTargets[0]?.id ?? '');

    const { data, setData, post, processing, errors, reset } = useForm({
        target_id: initialTargetId,
        tools: ['builtin'],
        consent: false,
        generate_report: true,
    });

    const inFlight = useRef(false);
    useEffect(() => {
        if (!hasLive) return;
        const id = setInterval(() => {
            if (inFlight.current) return;
            inFlight.current = true;
            router.reload({
                only: ['runs'],
                preserveScroll: true,
                replace: true,
                onFinish: () => { inFlight.current = false; },
            });
        }, 4000);
        return () => clearInterval(id);
    }, [hasLive]);

    const toggleTool = (name) => {
        setData('tools', data.tools.includes(name)
            ? data.tools.filter((t) => t !== name)
            : [...data.tools, name]);
    };

    const selectAllTools = () => {
        setData('tools', toolList.filter(t => t.installed).map(t => t.name));
    };

    const startScan = (e) => {
        e.preventDefault();
        if (!data.target_id) return;
        post(route('targets.scan-run', data.target_id), {
            preserveScroll: true,
            onSuccess: () => reset('consent'),
        });
    };

    const canStart = data.target_id && data.consent && data.tools.length > 0 && !processing;

    return (
        <AuthenticatedLayout
            header={
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-3">
                            <span className="font-sans text-[10px] px-2.5 py-1 rounded-full bg-exec-critical/10 text-exec-critical border border-exec-critical/30 font-bold uppercase tracking-wider flex items-center gap-2 shadow-[0_0_10px_rgba(244,63,94,0.2)]">
                                <CommandLineIcon className="h-3 w-3" />
                                Vulnerability Runner
                            </span>
                            <span className="text-slate-500 text-sm font-sans">/</span>
                            <span className="font-sans text-xs text-slate-400 font-medium">Orchestrated Security Pipeline</span>
                        </div>
                        <h1 className="text-3xl font-sans font-bold text-white tracking-tight mt-3 drop-shadow-md">
                            Scan Operations & Runs
                        </h1>
                    </div>
                </div>
            }
        >
            <Head title="Scan Runs" />

            <div className="py-10">
                <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8 space-y-8">
                    
                    {flash.success && (
                        <div className="rounded-2xl border border-exec-info/40 bg-exec-info/10 p-5 font-sans text-sm text-exec-info shadow-[0_4px_20px_rgba(16,185,129,0.15)] flex items-center gap-3 hud-fade-in backdrop-blur-md">
                            <span className="font-mono text-xs font-bold uppercase tracking-widest text-white px-2 py-1 bg-exec-info rounded">Success</span>
                            <span>{flash.success}</span>
                        </div>
                    )}

                    {/* Launch Operation Dispatcher */}
                    <form onSubmit={startScan} className="rounded-3xl border border-white/[0.08] bg-white/[0.02] backdrop-blur-2xl p-8 shadow-[0_8px_32px_rgba(0,0,0,0.2)] space-y-6 hud-fade-in relative overflow-hidden">
                        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-exec-critical/50 to-transparent"></div>
                        <div className="flex items-center justify-between border-b border-white/[0.08] pb-5">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-exec-critical/10 border border-exec-critical/30">
                                    <CommandLineIcon className="h-5 w-5 text-exec-critical" />
                                </div>
                                <h2 className="font-sans text-lg font-bold text-white tracking-tight">
                                    Dispatch Security Tool Scan
                                </h2>
                            </div>
                            {authorizedTargets.length > 0 && (
                                <button
                                    type="button"
                                    onClick={selectAllTools}
                                    className="font-sans text-xs font-bold text-exec-indigo hover:text-white transition-colors underline underline-offset-4"
                                >
                                    Select All Installed Tools
                                </button>
                            )}
                        </div>

                        {targetList.length === 0 ? (
                            <div className="py-8 text-center font-sans text-sm text-slate-400">
                                No targets configured.{' '}
                                <Link href={route('targets.create')} className="text-exec-indigo hover:text-white underline underline-offset-4 font-bold transition-colors">
                                    Add a target
                                </Link>{' '}
                                to launch vulnerability scans.
                            </div>
                        ) : authorizedTargets.length === 0 ? (
                            <div className="py-6 text-center font-sans text-sm text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                                Targets exist, but none are authorized for tool execution. Open a target and confirm authorization first.
                            </div>
                        ) : (
                            <>
                                <div>
                                    <label className="mb-2 block font-sans text-xs font-bold uppercase tracking-widest text-slate-400">
                                        Target Destination
                                    </label>
                                    <select
                                        value={data.target_id}
                                        onChange={(e) => setData('target_id', e.target.value)}
                                        className="w-full rounded-xl border border-white/[0.1] bg-white/[0.03] px-4 py-3.5 font-sans text-sm text-white focus:border-exec-indigo focus:outline-none focus:ring-1 focus:ring-exec-indigo shadow-inner hover:bg-white/[0.05] transition-colors"
                                    >
                                        {authorizedTargets.map((t) => (
                                            <option key={t.id} value={t.id} className="bg-[#0f111a] text-white">
                                                {t.domain_url} {t.display_name ? `(${t.display_name})` : ''}
                                            </option>
                                        ))}
                                    </select>
                                    <InputError message={errors.target_id} className="mt-2" />
                                </div>

                                {/* Tool Matrix Selection with Glass Cards */}
                                <div>
                                    <label className="mb-3 block font-sans text-xs font-bold uppercase tracking-widest text-slate-400">
                                        Active Tool Adapters
                                    </label>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                        {toolList.map((tool) => {
                                            const disabled = !tool.installed;
                                            const isSelected = data.tools.includes(tool.name);
                                            return (
                                                <label
                                                    key={tool.name}
                                                    className={`flex items-start gap-4 rounded-xl border p-4 transition-all duration-300 relative overflow-hidden ${
                                                        disabled
                                                            ? 'cursor-not-allowed border-white/[0.05] bg-black/20 opacity-50'
                                                            : isSelected
                                                            ? 'cursor-pointer border-exec-indigo/50 bg-exec-indigo/10 shadow-[0_4px_20px_rgba(99,102,241,0.15)] -translate-y-1'
                                                            : 'cursor-pointer border-white/[0.08] bg-white/[0.02] hover:border-white/[0.15] hover:bg-white/[0.04]'
                                                    }`}
                                                >
                                                    {isSelected && <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-exec-indigo to-transparent"></div>}
                                                    <input
                                                        type="checkbox"
                                                        disabled={disabled}
                                                        checked={isSelected}
                                                        onChange={() => toggleTool(tool.name)}
                                                        className="mt-0.5 h-4 w-4 rounded border-white/[0.2] bg-white/[0.05] text-exec-indigo focus:ring-exec-indigo focus:ring-offset-0"
                                                    />
                                                    <div className="min-w-0">
                                                        <div className="flex items-center gap-2 font-sans text-sm font-bold text-white">
                                                            <span>{tool.label}</span>
                                                            {tool.name === 'builtin' && (
                                                                <span className="rounded bg-exec-indigo/20 border border-exec-indigo/40 px-1.5 py-0.5 text-[9px] text-exec-indigo tracking-wider uppercase">
                                                                    BUILT-IN
                                                                </span>
                                                            )}
                                                            {!tool.installed && (
                                                                <span className="text-[10px] text-slate-500 font-medium">
                                                                    [MISSING]
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p className="text-xs text-slate-400 line-clamp-2 mt-1.5 font-sans font-medium">
                                                            {tool.description}
                                                        </p>
                                                    </div>
                                                </label>
                                            );
                                        })}
                                    </div>
                                    <InputError message={errors.tools} className="mt-2" />
                                </div>

                                {/* Consent Attestation */}
                                <div className="space-y-4 pt-4">
                                    <label className="flex items-start gap-4 rounded-xl border border-white/[0.08] bg-white/[0.02] p-5 cursor-pointer hover:border-white/[0.15] hover:bg-white/[0.04] transition-all">
                                        <input
                                            type="checkbox"
                                            checked={data.consent}
                                            onChange={(e) => setData('consent', e.target.checked)}
                                            className="mt-0.5 h-4 w-4 rounded border-white/[0.2] bg-white/[0.05] text-exec-critical focus:ring-exec-critical focus:ring-offset-0"
                                        />
                                        <span className="font-sans text-sm text-slate-300 leading-relaxed font-medium">
                                            {consentText || 'I confirm I am authorized to conduct automated security assessment against this target.'}
                                        </span>
                                    </label>
                                    <InputError message={errors.consent} className="mt-2" />

                                    <label className="flex items-start gap-4 rounded-xl border border-white/[0.08] bg-white/[0.02] p-5 cursor-pointer hover:border-white/[0.15] hover:bg-white/[0.04] transition-all">
                                        <input
                                            type="checkbox"
                                            checked={data.generate_report}
                                            onChange={(e) => setData('generate_report', e.target.checked)}
                                            className="mt-0.5 h-4 w-4 rounded border-white/[0.2] bg-white/[0.05] text-exec-indigo focus:ring-exec-indigo focus:ring-offset-0"
                                        />
                                        <div className="flex items-center gap-2 font-sans text-sm font-medium text-slate-300">
                                            <SparklesIcon className="h-5 w-5 text-exec-indigo" />
                                            <span>Automatically synthesize AI Security Report upon completion</span>
                                        </div>
                                    </label>
                                    <InputError message={errors.generate_report} className="mt-2" />
                                </div>

                                <div className="flex justify-end pt-4 border-t border-white/[0.08]">
                                    <button 
                                        type="submit"
                                        disabled={!canStart} 
                                        className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-gradient-to-r from-exec-critical to-rose-600 text-white font-sans text-sm font-bold hover:shadow-[0_0_20px_rgba(244,63,94,0.5)] active:scale-[0.98] transition-all relative overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <div className="absolute inset-0 bg-white/20 hover:opacity-0 transition-opacity rounded-xl pointer-events-none"></div>
                                        <PlayIcon className="h-5 w-5" />
                                        {processing ? 'Queuing Execution…' : 'Queue Scan Operation'}
                                    </button>
                                </div>
                            </>
                        )}
                    </form>

                    {/* Operations History Table */}
                    <div className="rounded-3xl border border-white/[0.08] bg-white/[0.02] backdrop-blur-2xl shadow-[0_8px_32px_rgba(0,0,0,0.2)] overflow-hidden hud-fade-in hud-stagger-1 relative">
                        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.12] to-transparent"></div>
                        <div className="flex items-center justify-between border-b border-white/[0.08] px-6 py-5 bg-white/[0.01]">
                            <div className="flex items-center gap-3">
                                <ShieldCheckIcon className="h-5 w-5 text-slate-400" />
                                <h3 className="font-sans text-sm font-bold uppercase tracking-widest text-slate-200">
                                    Operations History
                                </h3>
                                {selectedTargetId && (
                                    <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-exec-indigo bg-exec-indigo/10 border border-exec-indigo/30 px-2.5 py-1 rounded-full">
                                        Target #{selectedTargetId}
                                    </span>
                                )}
                            </div>
                            {hasLive && (
                                <span className="inline-flex items-center gap-2 font-sans text-xs font-bold text-exec-indigo bg-exec-indigo/10 px-3 py-1.5 rounded-full border border-exec-indigo/20">
                                    <ArrowPathIcon className="h-4 w-4 animate-spin" /> Auto-refreshing
                                </span>
                            )}
                        </div>

                        {runRows.length === 0 ? (
                            <div className="p-12 text-center font-sans text-sm text-slate-400 font-medium">
                                No scan runs found. Select a target above to launch an assessment.
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-white/[0.08]">
                                    <thead className="bg-white/[0.01] font-sans text-xs font-semibold uppercase tracking-wider text-slate-400">
                                        <tr>
                                            <th className="px-6 py-4 text-left">Target</th>
                                            <th className="px-6 py-4 text-left">Tools Executed</th>
                                            <th className="px-6 py-4 text-left">Status</th>
                                            <th className="px-6 py-4 text-left">Findings</th>
                                            <th className="px-6 py-4 text-left">Timestamp</th>
                                            <th className="px-6 py-4 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/[0.04]">
                                        {runRows.map((run) => {
                                            const findingsCount = run.summary?.findings_total ?? run.findings?.length ?? 0;
                                            return (
                                                <tr key={run.id} className="hover:bg-white/[0.03] hover:pl-2 transition-all duration-200">
                                                    <td className="px-6 py-5">
                                                        <Link 
                                                            href={route('scan-runs.show', run.id)} 
                                                            className="font-sans text-sm font-bold text-slate-100 hover:text-exec-indigo transition-colors"
                                                        >
                                                            {run.target?.domain_url ?? '—'}
                                                        </Link>
                                                        {run.target?.display_name && (
                                                            <div className="text-[11px] text-slate-500 font-sans mt-1">
                                                                {run.target.display_name}
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-5 font-mono text-[11px] text-slate-400 max-w-[200px] truncate">
                                                        {(run.selected_tools ?? []).join(', ')}
                                                    </td>
                                                    <td className="px-6 py-5 whitespace-nowrap">
                                                        <span className={`px-2.5 py-1 rounded-full border font-mono text-[10px] font-bold uppercase tracking-widest ${statusColor[run.status] ?? statusColor.pending}`}>
                                                            {run.status}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-5 font-mono text-sm font-bold text-amber-400">
                                                        {findingsCount}
                                                    </td>
                                                    <td className="px-6 py-5 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                                                        {run.created_at ? new Date(run.created_at).toLocaleString() : '—'}
                                                    </td>
                                                    <td className="px-6 py-5 text-right whitespace-nowrap">
                                                        <Link
                                                            href={route('scan-runs.show', run.id)}
                                                            className="inline-flex items-center gap-1.5 font-sans text-xs font-bold text-exec-indigo hover:text-white transition-colors hover:translate-x-1"
                                                        >
                                                            <span>Telemetry</span>
                                                            <ArrowTopRightOnSquareIcon className="h-4 w-4" />
                                                        </Link>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    {/* Pagination */}
                    {runs.links && runs.links.length > 3 && (
                        <div className="flex flex-wrap items-center justify-center gap-2 font-sans text-sm font-bold">
                            {runs.links.map((link, i) => {
                                const base = 'px-4 py-2 rounded-xl border transition-all';
                                const styles = link.active
                                    ? 'border-exec-indigo/50 bg-exec-indigo/20 text-white shadow-[0_4px_15px_rgba(99,102,241,0.2)]'
                                    : link.url === null
                                    ? 'border-white/[0.05] text-slate-600 cursor-not-allowed'
                                    : 'border-white/[0.1] bg-white/[0.02] text-slate-400 hover:bg-white/[0.05] hover:text-white';
                                return link.url === null ? (
                                    <span key={i} className={`${base} ${styles}`} dangerouslySetInnerHTML={{ __html: link.label }} />
                                ) : (
                                    <Link key={i} href={link.url} className={`${base} ${styles}`} preserveScroll dangerouslySetInnerHTML={{ __html: link.label }} />
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
