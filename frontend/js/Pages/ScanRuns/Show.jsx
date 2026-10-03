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
    CheckCircleIcon,
    ShieldCheckIcon
} from '@heroicons/react/24/outline';
import { useEffect, useRef, useState } from 'react';

const NON_TERMINAL = ['pending', 'running'];

const severityColor = {
    critical: 'text-exec-critical bg-exec-critical/10 border-exec-critical/40 shadow-[0_0_10px_rgba(244,63,94,0.2)]',
    high: 'text-exec-high bg-exec-high/10 border-exec-high/30',
    medium: 'text-exec-medium bg-exec-medium/10 border-exec-medium/30',
    low: 'text-exec-info bg-exec-info/10 border-exec-info/30',
    info: 'text-slate-400 bg-white/[0.05] border-white/[0.1]',
};

const statusColor = {
    pending: 'text-slate-400 bg-white/[0.05] border-white/[0.1]',
    running: 'text-exec-indigo bg-exec-indigo/10 border-exec-indigo/30 shadow-[0_0_12px_rgba(99,102,241,0.2)]',
    completed: 'text-exec-info bg-exec-info/10 border-exec-info/30 shadow-[0_0_12px_rgba(16,185,129,0.2)]',
    partial: 'text-exec-medium bg-exec-medium/10 border-exec-medium/30',
    failed: 'text-exec-critical bg-exec-critical/10 border-exec-critical/30 shadow-[0_0_12px_rgba(244,63,94,0.2)]',
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
                    <div className="flex items-center gap-4">
                        <Link 
                            href={route('scan-runs.index')} 
                            className="p-2.5 rounded-xl border border-white/[0.08] bg-white/[0.02] text-slate-400 hover:text-white hover:border-white/[0.15] hover:bg-white/[0.04] transition-all hover:-translate-x-0.5 active:translate-x-0 backdrop-blur-md shadow-sm"
                        >
                            <ArrowLeftIcon className="h-5 w-5" />
                        </Link>
                        <div>
                            <div className="flex items-center gap-3">
                                <span className="font-sans text-[10px] px-2.5 py-1 rounded-full bg-exec-indigo/10 text-exec-indigo border border-exec-indigo/30 font-bold uppercase tracking-wider flex items-center gap-2 shadow-[0_0_10px_rgba(99,102,241,0.2)]">
                                    <CommandLineIcon className="h-3 w-3" />
                                    RUN #{run.id}
                                </span>
                                <span className="text-slate-500 text-sm font-sans">/</span>
                                <span className="font-sans text-xs text-slate-400 font-medium">Live Telemetry Stream</span>
                            </div>
                            <h1 className="text-3xl font-sans font-bold text-white tracking-tight mt-3 drop-shadow-md">
                                {target.display_name || target.domain_url}
                            </h1>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        {live && (
                            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-exec-indigo/10 border border-exec-indigo/30 text-exec-indigo font-sans text-xs font-bold shadow-[0_0_15px_rgba(99,102,241,0.2)]">
                                <ArrowPathIcon className="h-4 w-4 animate-spin" />
                                <span>LIVE TELEMETRY STREAM</span>
                            </span>
                        )}
                        <span className={`inline-flex items-center rounded-xl border px-4 py-2 font-sans text-xs font-bold uppercase tracking-widest transition-transform ${statusColor[run.status] ?? statusColor.pending}`}>
                            {run.status_label ?? run.status}
                        </span>
                    </div>
                </div>
            }
        >
            <Head title={`Scan Run #${run.id}`} />

            <div className="py-10">
                <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8 space-y-8">
                    
                    {/* Run Summary Telemetry Bar */}
                    <div className="rounded-3xl border border-white/[0.08] bg-white/[0.02] backdrop-blur-2xl p-8 shadow-[0_8px_32px_rgba(0,0,0,0.2)] hud-fade-in relative overflow-hidden group">
                        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.12] to-transparent"></div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 font-sans relative z-10">
                            <div className="space-y-1.5">
                                <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Target Host</span>
                                <p className="text-white font-bold text-lg truncate">{target.domain_url}</p>
                            </div>
                            <div className="space-y-1.5">
                                <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Dispatched Tools</span>
                                <p className="text-exec-indigo font-bold text-lg truncate">{(run.selected_tools ?? []).join(', ') || '—'}</p>
                            </div>
                            <div className="space-y-1.5">
                                <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Discovered Findings</span>
                                <p className="text-amber-400 font-bold text-lg">
                                    {run.summary?.findings_total ?? findings.length} issue(s)
                                </p>
                            </div>
                            <div className="space-y-1.5">
                                <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Operation Timing</span>
                                <p className="text-slate-400 text-sm font-medium">
                                    {run.created_at ? new Date(run.created_at).toLocaleTimeString() : '—'}
                                    {run.finished_at && ` → ${new Date(run.finished_at).toLocaleTimeString()}`}
                                </p>
                            </div>
                        </div>

                        {run.tools_failed?.length > 0 && (
                            <div className="mt-6 pt-5 border-t border-exec-critical/30 text-sm font-sans text-exec-critical flex items-center gap-3 font-bold">
                                <div className="p-1.5 rounded-lg bg-exec-critical/10 border border-exec-critical/30">
                                    <ShieldExclamationIcon className="h-4 w-4 text-exec-critical shrink-0" />
                                </div>
                                <span>Execution warnings on: {run.tools_failed.join(', ')}</span>
                            </div>
                        )}
                    </div>

                    {/* Tool Output Tabs & Telemetry Terminal */}
                    <div className="space-y-4 hud-fade-in hud-stagger-1">
                        {/* Tab Switcher */}
                        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.08] pb-2 px-1">
                            <div className="flex flex-wrap gap-2">
                                {outputs.length === 0 ? (
                                    <div className="px-4 py-2 text-sm font-sans font-medium text-slate-400">
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
                                                className={`flex items-center gap-2.5 px-5 py-2.5 font-sans text-xs font-bold uppercase tracking-widest rounded-xl transition-all ${
                                                    activeTab === i
                                                        ? 'bg-white/[0.05] text-white border border-white/[0.1] shadow-[0_0_15px_rgba(255,255,255,0.05)]'
                                                        : 'text-slate-400 hover:text-white hover:bg-white/[0.03] border border-transparent'
                                                }`}
                                            >
                                                <span className={`w-2 h-2 rounded-full ${
                                                    isRunning ? 'bg-exec-info animate-ping shadow-[0_0_8px_#10b981]' :
                                                    hasFailed ? 'bg-exec-high shadow-[0_0_6px_#f59e0b]' :
                                                    'bg-exec-info'
                                                }`}></span>
                                                <span>{o.tool_label}</span>
                                                {isRunning ? (
                                                    <span className="text-[10px] text-exec-indigo animate-pulse font-mono">[RUNNING]</span>
                                                ) : (
                                                    <span className="text-[10px] text-slate-500 font-mono font-normal">({o.findings_count})</span>
                                                )}
                                            </button>
                                        );
                                    })
                                )}
                            </div>
                        </div>

                        {/* Enhanced Telemetry Terminal */}
                        <div className="rounded-2xl border border-white/[0.08] bg-black/40 backdrop-blur-xl overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
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
                                <div className="p-16 text-center font-sans text-sm text-slate-400 font-medium">
                                    {live ? 'Awaiting telemetry response from runner…' : 'No output captured for this run.'}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* AI Security & Remediation Report Card */}
                    {report ? (
                        <div className="rounded-3xl border border-exec-indigo/30 bg-white/[0.02] p-8 backdrop-blur-2xl shadow-[0_8px_32px_rgba(0,0,0,0.2)] space-y-8 hud-fade-in hud-stagger-2 relative overflow-hidden">
                            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-exec-indigo to-transparent"></div>
                            <div className="flex flex-wrap items-center justify-between gap-6 border-b border-white/[0.08] pb-6">
                                <div className="flex items-center gap-4">
                                    <div className="p-2.5 rounded-xl bg-exec-indigo/10 border border-exec-indigo/30 text-exec-indigo shadow-[0_0_15px_rgba(99,102,241,0.2)]">
                                        <SparklesIcon className="h-6 w-6" />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-sans font-bold text-white tracking-tight">
                                            AI Security Assessment & Remediation Report
                                        </h2>
                                        <p className="font-sans text-xs text-slate-400 mt-1 font-medium">
                                            Model Provider: <span className="text-exec-indigo font-bold uppercase">{report.provider}</span> • Generated: {report.generated_at ? new Date(report.generated_at).toLocaleString() : 'Just now'}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-3 rounded-xl border border-white/[0.1] bg-white/[0.03] px-5 py-2.5 font-sans text-sm font-medium">
                                        <span className="text-slate-400">Risk Score:</span>
                                        <span className={`font-bold ${
                                            (report.risk_score ?? 0) >= 70 ? 'text-exec-critical' :
                                            (report.risk_score ?? 0) >= 40 ? 'text-exec-high' :
                                            'text-exec-info'
                                        }`}>
                                            {report.risk_score ?? 0}/100 ({report.risk_level?.toUpperCase() ?? 'INFO'})
                                        </span>
                                    </div>

                                    <button
                                        onClick={generateReport}
                                        disabled={generating}
                                        className="inline-flex items-center gap-2 rounded-xl border border-white/[0.1] bg-white/[0.05] px-5 py-2.5 font-sans text-sm font-bold text-white hover:bg-white/[0.1] transition-all disabled:opacity-50"
                                    >
                                        <ArrowPathIcon className={`h-4 w-4 ${generating ? 'animate-spin' : ''}`} />
                                        {generating ? 'Regenerating…' : 'Regenerate'}
                                    </button>
                                </div>
                            </div>

                            {/* Plain English Stakeholder Summary */}
                            {(report.payload?.plain_english_summary || report.payload?.executive_summary) && (
                                <div className="rounded-2xl border border-exec-indigo/30 bg-exec-indigo/10 p-6 space-y-3 relative overflow-hidden">
                                    <div className="flex items-center gap-2 font-sans text-sm font-bold text-exec-indigo uppercase tracking-widest">
                                        <span>◈</span> Plain English Executive Summary
                                    </div>
                                    <p className="text-sm leading-relaxed text-indigo-100/90 whitespace-pre-line font-medium">
                                        {report.payload?.plain_english_summary || report.payload?.executive_summary}
                                    </p>
                                </div>
                            )}

                            {/* Detailed Findings & Concrete Remediation Instructions */}
                            {((report.payload?.key_findings?.length > 0) || (report.payload?.prioritized_findings?.length > 0)) && (
                                <div className="space-y-5">
                                    <h3 className="font-sans text-sm font-bold uppercase tracking-widest text-slate-400">
                                        Prioritized Actionable Findings & Fixes
                                    </h3>
                                    <div className="space-y-4">
                                        {(report.payload?.key_findings || report.payload?.prioritized_findings || []).map((pf, i) => (
                                            <div key={i} className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 space-y-4 hover:border-white/[0.15] transition-colors relative overflow-hidden">
                                                <div className="flex items-center gap-3">
                                                    <span className={`px-2.5 py-1 rounded-full border font-mono text-[10px] font-bold uppercase tracking-widest ${severityColor[pf.severity] ?? severityColor.info}`}>
                                                        {pf.severity}
                                                    </span>
                                                    <h4 className="font-sans text-base font-bold text-white">{pf.title}</h4>
                                                </div>

                                                {pf.plain_english_explanation && (
                                                    <p className="text-sm text-slate-300 font-medium">
                                                        <span className="font-bold text-slate-100">Analysis: </span>
                                                        {pf.plain_english_explanation}
                                                    </p>
                                                )}

                                                {pf.business_impact && (
                                                    <p className="text-sm text-exec-high">
                                                        <span className="font-bold">⚠️ Risk Impact: </span>
                                                        {pf.business_impact}
                                                    </p>
                                                )}

                                                {(pf.remediation_method || pf.recommendation) && (
                                                    <div className="rounded-xl border border-exec-info/30 bg-exec-info/10 p-5 text-sm text-emerald-200 space-y-2">
                                                        <div className="font-sans font-bold text-exec-info">🛠 Remediation Method:</div>
                                                        <p className="leading-relaxed whitespace-pre-line text-emerald-100/90 font-medium">
                                                            {pf.remediation_method || pf.recommendation}
                                                        </p>
                                                    </div>
                                                )}

                                                {pf.code_or_config_example && (
                                                    <div className="space-y-2">
                                                        <span className="font-sans text-xs font-bold text-slate-400 uppercase tracking-widest">Remediation Code Snippet:</span>
                                                        <pre className="overflow-x-auto rounded-xl bg-[#050710] p-4 font-mono text-xs leading-relaxed text-exec-info border border-white/[0.08]">
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
                                <div className="space-y-5 pt-4">
                                    <h3 className="font-sans text-sm font-bold uppercase tracking-widest text-slate-400">
                                        Remediation Roadmap
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                                        {(report.payload?.remediation_roadmap || []).map((phase, idx) => (
                                            <div key={idx} className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 space-y-3 relative overflow-hidden">
                                                <div className="flex items-center gap-3">
                                                    <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-exec-indigo/20 border border-exec-indigo/40 font-mono text-xs font-bold text-exec-indigo">
                                                        0{idx + 1}
                                                    </span>
                                                    <h4 className="font-sans font-bold text-sm text-slate-100 uppercase tracking-wide">{phase.phase}</h4>
                                                </div>
                                                {phase.objective && (
                                                    <p className="text-xs text-slate-400 italic font-medium">{phase.objective}</p>
                                                )}
                                                <ul className="space-y-2 pt-2">
                                                    {(phase.actions || []).map((act, aIdx) => (
                                                        <li key={aIdx} className="text-sm text-slate-300 font-medium flex items-start gap-2">
                                                            <span className="text-exec-indigo font-bold mt-0.5">›</span>
                                                            <span className="leading-relaxed">{act}</span>
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
                        <div className="rounded-3xl border border-white/[0.08] bg-white/[0.02] p-12 text-center backdrop-blur-2xl shadow-[0_8px_32px_rgba(0,0,0,0.2)] space-y-5 hud-fade-in hud-stagger-2 relative overflow-hidden">
                            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.12] to-transparent"></div>
                            {generating ? (
                                <div className="flex items-center justify-center gap-3 font-sans text-base font-bold text-exec-indigo">
                                    <ArrowPathIcon className="h-6 w-6 animate-spin" />
                                    Synthesizing Executive AI Security Assessment…
                                </div>
                            ) : (
                                <>
                                    <div className="inline-flex p-4 rounded-2xl bg-exec-indigo/10 border border-exec-indigo/30 text-exec-indigo shadow-[0_0_15px_rgba(99,102,241,0.2)]">
                                        <SparklesIcon className="h-8 w-8" />
                                    </div>
                                    <h3 className="font-sans text-xl font-bold text-white tracking-tight">
                                        Automated Executive & Engineering Report
                                    </h3>
                                    <p className="mx-auto max-w-lg text-sm text-slate-400 leading-relaxed font-medium">
                                        Generate an elaborative assessment synthesizing findings into executive takeaways, business risk metrics, and copy-paste remediation patches.
                                    </p>
                                    {errors.report && <p className="font-sans text-sm font-bold text-exec-critical">{errors.report}</p>}
                                    {reportTimedOut && (
                                        <p className="font-sans text-sm font-bold text-exec-high">
                                            Report generation timed out. Verify your AI API key in Profile settings.
                                        </p>
                                    )}
                                    <div className="pt-4">
                                        <button 
                                            onClick={generateReport} 
                                            disabled={live || findings.length === 0}
                                            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-gradient-to-r from-exec-indigo to-[#8b5cf6] text-white font-sans text-sm font-bold hover:shadow-[0_0_20px_rgba(99,102,241,0.5)] active:scale-[0.98] transition-all relative overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            <div className="absolute inset-0 bg-white/20 hover:opacity-0 transition-opacity rounded-xl pointer-events-none"></div>
                                            <SparklesIcon className="h-5 w-5" /> 
                                            Generate AI Report
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                    {/* Discovered Findings Matrix Table */}
                    <div className="rounded-3xl border border-white/[0.08] bg-white/[0.02] backdrop-blur-2xl shadow-[0_8px_32px_rgba(0,0,0,0.2)] overflow-hidden hud-fade-in hud-stagger-3 relative">
                        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.12] to-transparent"></div>
                        <div className="flex items-center justify-between border-b border-white/[0.08] px-6 py-5 bg-white/[0.01]">
                            <div className="flex items-center gap-3">
                                <ShieldExclamationIcon className="h-5 w-5 text-exec-high" />
                                <h3 className="font-sans text-sm font-bold uppercase tracking-widest text-slate-200">
                                    Discovered Vulnerabilities & Findings ({findings.length})
                                </h3>
                            </div>
                        </div>

                        {findings.length === 0 ? (
                            <div className="p-12 text-center font-sans text-sm text-slate-400 font-medium">
                                No security vulnerabilities detected in this scan run.
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-white/[0.08]">
                                    <thead className="bg-white/[0.01] font-sans text-xs font-semibold uppercase tracking-wider text-slate-400">
                                        <tr>
                                            <th className="px-6 py-4 text-left">Severity</th>
                                            <th className="px-6 py-4 text-left">Tool</th>
                                            <th className="px-6 py-4 text-left">Vulnerability Title</th>
                                            <th className="px-6 py-4 text-left">Recommended Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/[0.04]">
                                        {findings.map((f) => (
                                            <tr key={f.id} className="hover:bg-white/[0.03] hover:pl-2 transition-all duration-200">
                                                <td className="px-6 py-5 whitespace-nowrap">
                                                    <span className={`px-2.5 py-1 rounded-full border font-mono text-[10px] font-bold uppercase tracking-widest ${severityColor[f.severity] ?? severityColor.info}`}>
                                                        {f.severity}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-5 font-sans font-bold text-sm text-exec-indigo whitespace-nowrap">
                                                    {f.tool}
                                                </td>
                                                <td className="px-6 py-5">
                                                    <div className="font-sans text-sm font-bold text-slate-100">{f.title}</div>
                                                    {f.evidence && (
                                                        <code className="mt-2 block max-w-xl truncate font-mono text-xs text-slate-400 bg-[#050710] px-3 py-1.5 rounded-lg border border-white/[0.08]">
                                                            {f.evidence}
                                                        </code>
                                                    )}
                                                </td>
                                                <td className="px-6 py-5 font-sans text-sm font-medium text-exec-high">
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
