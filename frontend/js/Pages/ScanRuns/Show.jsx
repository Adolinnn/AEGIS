import { Head, Link, router, usePage } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import PrimaryButton from '@/Components/PrimaryButton';
import TelemetryTerminal from '@/Components/TelemetryTerminal';
import {
    ArrowLeftIcon,
    ArrowPathIcon,
    SparklesIcon,
    CommandLineIcon,
    ShieldExclamationIcon,
    ClipboardDocumentIcon,
    CheckIcon,
    DocumentTextIcon,
    CheckCircleIcon
} from '@heroicons/react/24/outline';
import { useEffect, useRef, useState } from 'react';

const NON_TERMINAL = ['pending', 'running'];

const severityColor = {
    critical: 'text-rose-400 bg-rose-950/40 border-rose-500/40 shadow-[0_0_10px_rgba(244,63,94,0.2)]',
    high: 'text-orange-400 bg-orange-950/40 border-orange-500/30',
    medium: 'text-amber-400 bg-amber-950/40 border-amber-500/30',
    low: 'text-cyan-400 bg-cyan-950/40 border-cyan-500/30',
    info: 'text-slate-400 bg-slate-900/40 border-slate-700/40',
};

const statusColor = {
    pending: 'text-slate-400 bg-slate-900/60 border-slate-700',
    running: 'text-cyan-400 bg-cyan-950/60 border-cyan-500/40 shadow-[0_0_12px_rgba(6,182,212,0.3)]',
    completed: 'text-emerald-400 bg-emerald-950/60 border-emerald-500/40 shadow-[0_0_12px_rgba(16,185,129,0.3)]',
    partial: 'text-amber-400 bg-amber-950/60 border-amber-500/40',
    failed: 'text-rose-400 bg-rose-950/60 border-rose-500/40 shadow-[0_0_12px_rgba(244,63,94,0.3)]',
};

export default function ScanRunShow({ run, target, findings, toolOutputs = [], report }) {
    const live = NON_TERMINAL.includes(run.status);
    const initialOutputs = Array.isArray(toolOutputs) ? toolOutputs : Object.values(toolOutputs ?? {});
    const [realtimeOutputs, setRealtimeOutputs] = useState(initialOutputs);
    const [activeTab, setActiveTab] = useState(0);
    const [generating, setGenerating] = useState(false);
    const [reportTimedOut, setReportTimedOut] = useState(false);
    const [copied, setCopied] = useState(false);
    const termRef = useRef(null);
    const inFlight = useRef(false);
    const errors = usePage().props.errors ?? {};
    
    const outputs = realtimeOutputs;

    // Sync state with props if they change via Inertia
    useEffect(() => {
        setRealtimeOutputs(Array.isArray(toolOutputs) ? toolOutputs : Object.values(toolOutputs ?? {}));
    }, [toolOutputs]);

    // WebSockets Real-time Telemetry
    useEffect(() => {
        if (!window.Echo) return;

        const channel = window.Echo.private(`scan-run.${run.id}`);
        
        channel.listen('ScanToolOutputUpdated', (e) => {
            setRealtimeOutputs((prev) => {
                const updated = [...prev];
                const index = updated.findIndex((o) => o.tool === e.tool || o.tool_name === e.tool);
                if (index !== -1) {
                    updated[index] = {
                        ...updated[index],
                        output: e.output,
                        status: e.status,
                        exit_code: e.exit_code,
                        findings_count: e.findings_count
                    };
                } else {
                    updated.push({
                        tool: e.tool,
                        tool_label: e.tool.toUpperCase(),
                        tool_name: e.tool,
                        output: e.output,
                        status: e.status,
                        exit_code: e.exit_code,
                        findings_count: e.findings_count
                    });
                }
                return updated;
            });
            
            if (e.status === 'completed' || e.status === 'failed') {
                router.reload({ only: ['run', 'findings', 'report'], preserveScroll: true });
            }
        });

        return () => {
            window.Echo.leave(`scan-run.${run.id}`);
        };
    }, [run.id]);

    // AI Report polling
    useEffect(() => {
        if (!generating) return;
        let attempts = 0;
        const id = setInterval(() => {
            attempts += 1;
            if (attempts > 30) {
                clearInterval(id);
                setGenerating(false);
                setReportTimedOut(true);
                return;
            }
            if (inFlight.current) return;
            inFlight.current = true;
            router.reload({
                only: ['report'],
                preserveScroll: true,
                replace: true,
                onFinish: () => { inFlight.current = false; },
            });
        }, 4000);
        return () => clearInterval(id);
    }, [generating]);

    useEffect(() => {
        if (report || errors.report) setGenerating(false);
    }, [report, errors.report]);

    const generateReport = () => {
        setReportTimedOut(false);
        setGenerating(true);
        router.post(route('scan-runs.generate-report', run.id), {}, {
            preserveScroll: true,
            onError: () => setGenerating(false),
        });
    };

    const active = outputs[activeTab];
    const activeIsRunning = active?.status === 'running';

    // Auto-scroll terminal
    useEffect(() => {
        if (activeIsRunning && termRef.current) {
            termRef.current.scrollTop = termRef.current.scrollHeight;
        }
    }, [active?.output, activeIsRunning]);

    const copyTerminalLog = () => {
        if (!active?.output) return;
        navigator.clipboard.writeText(active.output);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <AuthenticatedLayout 
            header={
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <Link 
                            href={route('scan-runs.index')} 
                            className="p-1.5 rounded-lg border border-slate-800 bg-slate-900/80 text-slate-400 hover:text-white hover:border-slate-700 hover:scale-105 active:scale-95 transition-all"
                        >
                            <ArrowLeftIcon className="h-4 w-4" />
                        </Link>
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="font-mono text-[10px] uppercase tracking-widest px-2 py-0.5 rounded bg-cyan-950/60 text-cyan-400 border border-cyan-800/60 font-semibold">
                                    RUN #{run.id}
                                </span>
                                <span className="font-mono text-xs text-slate-500">Live Telemetry Stream</span>
                            </div>
                            <h1 className="text-xl font-mono font-bold text-white tracking-tight mt-1">
                                {target.display_name || target.domain_url}
                            </h1>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {live && (
                            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-cyan-950/60 border border-cyan-500/40 text-cyan-300 font-mono text-xs font-semibold shadow-[0_0_15px_rgba(6,182,212,0.2)]">
                                <ArrowPathIcon className="h-3.5 w-3.5 animate-spin text-cyan-400" />
                                <span>LIVE TELEMETRY STREAM</span>
                            </span>
                        )}
                        <span className={`inline-flex items-center rounded-lg border px-3 py-1 font-mono text-xs font-bold uppercase tracking-wider transition-transform ${statusColor[run.status] ?? statusColor.pending}`}>
                            {run.status_label ?? run.status}
                        </span>
                    </div>
                </div>
            }
        >
            <Head title={`Scan Run #${run.id}`} />

            <div className="py-8">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-6">
                    
                    {/* Run Summary Telemetry Bar */}
                    <div className="cyber-card-interactive relative overflow-hidden rounded-xl border border-white/[0.08] p-5 shadow-xl hud-fade-in group">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 font-mono text-xs relative z-10">
                            <div className="space-y-1">
                                <span className="text-[10px] text-slate-500 uppercase tracking-widest">Target Host</span>
                                <p className="text-slate-200 font-semibold truncate">{target.domain_url}</p>
                            </div>
                            <div className="space-y-1">
                                <span className="text-[10px] text-slate-500 uppercase tracking-widest">Dispatched Tools</span>
                                <p className="text-cyan-400 font-semibold truncate">{(run.selected_tools ?? []).join(', ') || '—'}</p>
                            </div>
                            <div className="space-y-1">
                                <span className="text-[10px] text-slate-500 uppercase tracking-widest">Discovered Findings</span>
                                <p className="text-amber-400 font-bold">
                                    {run.summary?.findings_total ?? findings.length} issue(s)
                                </p>
                            </div>
                            <div className="space-y-1">
                                <span className="text-[10px] text-slate-500 uppercase tracking-widest">Operation Timing</span>
                                <p className="text-slate-400 text-[11px]">
                                    {run.created_at ? new Date(run.created_at).toLocaleTimeString() : '—'}
                                    {run.finished_at && ` → ${new Date(run.finished_at).toLocaleTimeString()}`}
                                </p>
                            </div>
                        </div>

                        {run.tools_failed?.length > 0 && (
                            <div className="mt-3.5 pt-3 border-t border-rose-900/40 text-xs font-mono text-rose-300 flex items-center gap-2">
                                <ShieldExclamationIcon className="h-4 w-4 text-rose-400 shrink-0" />
                                <span>Execution warnings on: {run.tools_failed.join(', ')}</span>
                            </div>
                        )}
                    </div>

                    {/* Tool Output Tabs & Telemetry Terminal */}
                    <div className="space-y-2 hud-fade-in hud-stagger-1">
                        {/* Tab Switcher */}
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.08] pb-1 px-1">
                            <div className="flex flex-wrap gap-1">
                                {outputs.length === 0 ? (
                                    <div className="px-3 py-2 text-xs font-mono text-slate-500">
                                        {live ? 'Initializing tool adapters…' : 'No tool outputs captured'}
                                    </div>
                                ) : (
                                    outputs.map((o, i) => {
                                        const isRunning = o.status === 'running';
                                        const hasFailed = o.timed_out || (o.exit_code !== null && o.exit_code !== 0);
                                        return (
                                            <button
                                                key={i}
                                                onClick={() => setActiveTab(i)}
                                                className={`flex items-center gap-2 px-3.5 py-2 font-mono text-xs font-semibold uppercase tracking-wider rounded-t-lg transition ${
                                                    activeTab === i
                                                        ? 'bg-[#070c18] text-cyan-300 border-t-2 border-x border-cyan-500/50 border-b-transparent shadow-lg'
                                                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/30'
                                                }`}
                                            >
                                                <span className={`w-2 h-2 rounded-full ${
                                                    isRunning ? 'bg-emerald-400 animate-ping shadow-[0_0_8px_#10b981]' :
                                                    hasFailed ? 'bg-amber-400 shadow-[0_0_6px_#f59e0b]' :
                                                    'bg-emerald-500'
                                                }`}></span>
                                                <span>{o.tool_label}</span>
                                                {isRunning ? (
                                                    <span className="text-[10px] text-cyan-400 animate-pulse">[RUNNING]</span>
                                                ) : (
                                                    <span className="text-[10px] text-slate-500 font-normal">({o.findings_count})</span>
                                                )}
                                            </button>
                                        );
                                    })
                                )}
                            </div>
                        </div>

                        {/* Enhanced Telemetry Terminal */}
                        {outputs[activeTab] ? (
                            <TelemetryTerminal
                                title={`aegis-secops://${outputs[activeTab].tool_name || outputs[activeTab].tool_label?.toLowerCase()}-telemetry`}
                                command={outputs[activeTab].command}
                                output={outputs[activeTab].output || ''}
                                isRunning={outputs[activeTab].status === 'running'}
                                status={outputs[activeTab].status}
                                exitCode={outputs[activeTab].exit_code}
                                findingsCount={outputs[activeTab].findings_count}
                            />
                        ) : (
                            <div className="laser-beam-header rounded-xl border border-white/[0.08] bg-[#0c1428]/95 p-12 text-center font-mono text-xs text-slate-500">
                                {live ? 'Awaiting telemetry response from runner…' : 'No output captured for this run.'}
                            </div>
                        )}
                    </div>

                    {/* AI Security & Remediation Report Card */}
                    {report ? (
                        <div className="laser-beam-header rounded-xl border border-red-500/30 bg-gradient-to-b from-[#0e162a] to-[#080d1a] p-6 backdrop-blur-md shadow-2xl space-y-6 hud-fade-in hud-stagger-2">
                            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.08] pb-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-lg bg-red-600/20 border border-red-500/40 text-red-400 shadow-[0_0_12px_rgba(244,63,94,0.3)]">
                                        <SparklesIcon className="h-6 w-6" />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-mono font-bold text-white tracking-tight">
                                            AI Security Assessment & Remediation Report
                                        </h2>
                                        <p className="font-mono text-xs text-slate-400 mt-0.5">
                                            Model Provider: <span className="text-cyan-400 uppercase">{report.provider}</span> • Generated: {report.generated_at ? new Date(report.generated_at).toLocaleString() : 'Just now'}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3">
                                    <div className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900/90 px-3.5 py-1.5 font-mono text-xs">
                                        <span className="text-slate-400">Risk Score:</span>
                                        <span className={`font-bold ${
                                            (report.risk_score ?? 0) >= 70 ? 'text-rose-400' :
                                            (report.risk_score ?? 0) >= 40 ? 'text-amber-400' :
                                            'text-emerald-400'
                                        }`}>
                                            {report.risk_score ?? 0}/100 ({report.risk_level?.toUpperCase() ?? 'INFO'})
                                        </span>
                                    </div>

                                    <button
                                        onClick={generateReport}
                                        disabled={generating}
                                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 font-mono text-xs text-slate-300 hover:bg-slate-700 hover:text-white transition disabled:opacity-50"
                                    >
                                        <ArrowPathIcon className={`h-3.5 w-3.5 ${generating ? 'animate-spin' : ''}`} />
                                        {generating ? 'Regenerating…' : 'Regenerate'}
                                    </button>
                                </div>
                            </div>

                            {/* Plain English Stakeholder Summary */}
                            {(report.payload?.plain_english_summary || report.payload?.executive_summary) && (
                                <div className="rounded-lg border border-cyan-500/30 bg-cyan-950/20 p-4 space-y-1.5">
                                    <div className="flex items-center gap-2 font-mono text-xs font-bold text-cyan-300 uppercase tracking-wider">
                                        <span>◈</span> Plain English Executive Summary
                                    </div>
                                    <p className="text-xs leading-relaxed text-cyan-100/90 whitespace-pre-line">
                                        {report.payload?.plain_english_summary || report.payload?.executive_summary}
                                    </p>
                                </div>
                            )}

                            {/* Detailed Findings & Concrete Remediation Instructions */}
                            {((report.payload?.key_findings?.length > 0) || (report.payload?.prioritized_findings?.length > 0)) && (
                                <div className="space-y-4">
                                    <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-slate-400">
                                        Prioritized Actionable Findings & Fixes
                                    </h3>
                                    <div className="space-y-3">
                                        {(report.payload?.key_findings || report.payload?.prioritized_findings || []).map((pf, i) => (
                                            <div key={i} className="cyber-card-interactive rounded-lg border border-slate-800 p-4 space-y-3">
                                                <div className="flex items-center gap-2.5">
                                                    <span className={`cyber-badge font-mono text-[10px] font-bold uppercase ${severityColor[pf.severity] ?? severityColor.info}`}>
                                                        {pf.severity}
                                                    </span>
                                                    <h4 className="font-mono text-sm font-semibold text-slate-100">{pf.title}</h4>
                                                </div>

                                                {pf.plain_english_explanation && (
                                                    <p className="text-xs text-slate-300">
                                                        <span className="font-semibold text-slate-400">Analysis: </span>
                                                        {pf.plain_english_explanation}
                                                    </p>
                                                )}

                                                {pf.business_impact && (
                                                    <p className="text-xs text-amber-300/90">
                                                        <span className="font-semibold text-amber-400">⚠️ Risk Impact: </span>
                                                        {pf.business_impact}
                                                    </p>
                                                )}

                                                {(pf.remediation_method || pf.recommendation) && (
                                                    <div className="rounded-md border border-emerald-500/30 bg-emerald-950/20 p-3 text-xs text-emerald-200 space-y-1">
                                                        <div className="font-mono font-bold text-emerald-300">🛠 Remediation Method:</div>
                                                        <p className="leading-relaxed whitespace-pre-line text-emerald-100/90 font-sans">
                                                            {pf.remediation_method || pf.recommendation}
                                                        </p>
                                                    </div>
                                                )}

                                                {pf.code_or_config_example && (
                                                    <div className="space-y-1">
                                                        <span className="font-mono text-[10px] text-slate-400 uppercase">Remediation Code Snippet:</span>
                                                        <pre className="overflow-x-auto rounded bg-black/90 p-3 font-mono text-xs leading-relaxed text-emerald-400 border border-slate-800">
                                                            {pf.code_or_config_example}
                                                        </pre>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Remediation Roadmap */}
                            {((report.payload?.remediation_roadmap?.length > 0) || (report.payload?.remediation_plan?.length > 0)) && (
                                <div className="space-y-3 pt-2">
                                    <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-slate-400">
                                        Remediation Roadmap
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                        {(report.payload?.remediation_roadmap || []).map((phase, idx) => (
                                            <div key={idx} className="rounded-lg border border-slate-800 bg-[#070d1a] p-4 space-y-2">
                                                <div className="flex items-center gap-2">
                                                    <span className="flex h-5 w-5 items-center justify-center rounded bg-red-950/80 border border-red-500/40 font-mono text-[10px] font-bold text-red-300">
                                                        0{idx + 1}
                                                    </span>
                                                    <h4 className="font-mono font-semibold text-xs text-slate-200 uppercase">{phase.phase}</h4>
                                                </div>
                                                {phase.objective && (
                                                    <p className="text-[11px] text-slate-400 italic">{phase.objective}</p>
                                                )}
                                                <ul className="space-y-1.5 pt-1">
                                                    {(phase.actions || []).map((act, aIdx) => (
                                                        <li key={aIdx} className="text-xs text-slate-300 flex items-start gap-1.5">
                                                            <span className="text-cyan-400 font-bold">›</span>
                                                            <span>{act}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="laser-beam-header rounded-xl border border-white/[0.08] bg-[#0c1428]/90 p-8 text-center backdrop-blur-md shadow-xl space-y-3 hud-fade-in hud-stagger-2">
                            {generating ? (
                                <div className="flex items-center justify-center gap-2 font-mono text-sm text-cyan-400">
                                    <ArrowPathIcon className="h-5 w-5 animate-spin" />
                                    Synthesizing Executive AI Security Assessment…
                                </div>
                            ) : (
                                <>
                                    <div className="p-3 mx-auto w-fit rounded-xl bg-red-950/40 border border-red-500/30 text-red-400">
                                        <SparklesIcon className="h-6 w-6" />
                                    </div>
                                    <h3 className="font-mono text-base font-bold text-slate-200">
                                        Automated Executive & Engineering Report
                                    </h3>
                                    <p className="mx-auto max-w-md text-xs text-slate-400 leading-relaxed font-sans">
                                        Generate an elaborative assessment synthesizing findings into executive takeaways, business risk metrics, and copy-paste remediation patches.
                                    </p>
                                    {errors.report && <p className="font-mono text-xs text-rose-400">{errors.report}</p>}
                                    {reportTimedOut && (
                                        <p className="font-mono text-xs text-amber-400">
                                            Report generation timed out. Verify your AI API key in Profile settings.
                                        </p>
                                    )}
                                    <div className="pt-2">
                                        <PrimaryButton onClick={generateReport} disabled={live || findings.length === 0}>
                                            <SparklesIcon className="mr-2 h-4 w-4" /> Generate AI Report
                                        </PrimaryButton>
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                    {/* Discovered Findings Matrix Table with Laser Beam Header */}
                    <div className="laser-beam-header rounded-xl border border-white/[0.08] bg-[#0c1428]/90 backdrop-blur-md shadow-xl overflow-hidden hud-fade-in hud-stagger-3">
                        <div className="flex items-center justify-between border-b border-white/[0.08] px-5 py-4 bg-[#090f1f]">
                            <div className="flex items-center gap-2">
                                <ShieldExclamationIcon className="h-4 w-4 text-amber-400" />
                                <h3 className="font-mono text-xs font-bold uppercase tracking-widest text-slate-200">
                                    Discovered Vulnerabilities & Findings ({findings.length})
                                </h3>
                            </div>
                        </div>

                        {findings.length === 0 ? (
                            <div className="p-8 text-center font-mono text-xs text-slate-500">
                                No security vulnerabilities detected in this scan run.
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-white/[0.06]">
                                    <thead className="bg-[#070c18] font-mono text-[10px] uppercase tracking-wider text-slate-400">
                                        <tr>
                                            <th className="px-5 py-3 text-left">Severity</th>
                                            <th className="px-4 py-3 text-left">Tool</th>
                                            <th className="px-4 py-3 text-left">Vulnerability Title</th>
                                            <th className="px-5 py-3 text-left">Recommended Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/[0.04]">
                                        {findings.map((f) => (
                                            <tr key={f.id} className="hover:bg-slate-800/40 hover:pl-2 transition-all duration-200">
                                                <td className="px-5 py-3.5 whitespace-nowrap">
                                                    <span className={`cyber-badge ${severityColor[f.severity] ?? severityColor.info}`}>
                                                        {f.severity}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3.5 font-mono text-xs text-cyan-400/90 whitespace-nowrap">
                                                    {f.tool}
                                                </td>
                                                <td className="px-4 py-3.5">
                                                    <div className="font-mono text-xs font-semibold text-slate-100">{f.title}</div>
                                                    {f.evidence && (
                                                        <code className="mt-1 block max-w-xl truncate font-mono text-[11px] text-slate-500 bg-slate-900/80 px-2 py-0.5 rounded border border-slate-800">
                                                            {f.evidence}
                                                        </code>
                                                    )}
                                                </td>
                                                <td className="px-5 py-3.5 font-sans text-xs text-rose-300/90">
                                                    {f.recommendation ?? '—'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                </div>
            </div>
        </AuthenticatedLayout>
    );
}
