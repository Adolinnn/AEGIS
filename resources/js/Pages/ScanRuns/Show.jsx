import { Head, Link, router, usePage } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import PrimaryButton from '@/Components/PrimaryButton';
import { ArrowLeftIcon, ArrowPathIcon, SparklesIcon } from '@heroicons/react/24/outline';
import { useEffect, useRef, useState } from 'react';

const NON_TERMINAL = ['pending', 'running'];

const severityColor = {
    critical: 'text-red-500 bg-red-900/40 border-red-500/30',
    high: 'text-red-400 bg-red-900/30 border-red-400/20',
    medium: 'text-yellow-400 bg-yellow-900/30 border-yellow-400/20',
    low: 'text-blue-400 bg-blue-900/30 border-blue-400/20',
    info: 'text-gray-400 bg-gray-900/30 border-gray-400/20',
};

const statusColor = {
    pending: 'text-gray-400 bg-gray-900/30 border-gray-400/20',
    running: 'text-blue-400 bg-blue-900/30 border-blue-400/20',
    completed: 'text-green-400 bg-green-900/30 border-green-400/20',
    partial: 'text-yellow-400 bg-yellow-900/30 border-yellow-400/20',
    failed: 'text-red-500 bg-red-900/40 border-red-500/30',
};

export default function ScanRunShow({ run, target, findings, toolOutputs = [], report }) {
    const live = NON_TERMINAL.includes(run.status);
    const outputs = Array.isArray(toolOutputs) ? toolOutputs : Object.values(toolOutputs ?? {});
    const [activeTab, setActiveTab] = useState(0);
    const [generating, setGenerating] = useState(false);
    const [reportTimedOut, setReportTimedOut] = useState(false);
    const termRef = useRef(null);
    const inFlight = useRef(false);
    const errors = usePage().props.errors ?? {};

    // Real-time trace: while the run is pending/running, poll for fresh tool
    // output every 1.2s. Tool rows are streamed server-side (RunToolJob
    // updates the row a few times a second while the process runs), so each
    // poll here surfaces genuinely new output, not just the final result.
    //
    // Two things matter for navigation to keep working while this polls:
    //   - `replace: true` so each poll REPLACES the current history entry
    //     instead of pushing a new one — without it, the browser accumulates
    //     one history entry per poll tick and Back/nav links start feeling
    //     broken almost immediately.
    //   - an in-flight guard so overlapping requests (a slow response plus
    //     the next timer tick) can't pile up and race a real navigation.
    useEffect(() => {
        if (!live) return;
        const id = setInterval(() => {
            if (inFlight.current) return;
            inFlight.current = true;
            router.reload({
                only: ['run', 'findings', 'toolOutputs', 'report'],
                preserveScroll: true,
                replace: true,
                onFinish: () => { inFlight.current = false; },
            });
        }, 1200);
        return () => clearInterval(id);
    }, [live]);

    // Poll for the AI report while it's generating in the background — same
    // replace:true + in-flight discipline as above — and give up after ~2
    // minutes so a failed job doesn't spin the UI forever.
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

    // Auto-scroll the terminal to the bottom whenever new output lands, but
    // only while that tab is still actively streaming.
    useEffect(() => {
        if (activeIsRunning && termRef.current) {
            termRef.current.scrollTop = termRef.current.scrollHeight;
        }
    }, [active?.output, activeIsRunning]);

    return (
        <AuthenticatedLayout header={<h2 className="text-xl font-semibold text-gray-100">Tool Scan Run #{run.id}</h2>}>
            <Head title={`Scan Run #${run.id}`} />

            <div className="py-8">
                <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 space-y-6">
                    <div className="flex items-center justify-between">
                        <Link href={route('scan-runs.index')} className="inline-flex items-center text-sm text-gray-400 hover:text-gray-200">
                            <ArrowLeftIcon className="h-4 w-4 mr-1" /> Back to scan runs
                        </Link>
                        {live && (
                            <span className="inline-flex items-center gap-1.5 text-xs text-blue-400">
                                <ArrowPathIcon className="h-4 w-4 animate-spin" /> Live — refreshing…
                            </span>
                        )}
                    </div>

                    {/* Run summary */}
                    <div className="rounded-lg border border-gray-800 bg-gray-900/50 p-5">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                                <div className="text-lg font-medium text-gray-100">{target.display_name}</div>
                                <div className="text-sm text-gray-500">{target.domain_url}</div>
                            </div>
                            <span className={`inline-flex items-center rounded border px-3 py-1 text-sm font-medium ${statusColor[run.status] ?? statusColor.pending}`}>
                                {run.status_label ?? run.status}
                            </span>
                        </div>
                        <div className="mt-4 flex flex-wrap gap-6 text-sm text-gray-400">
                            <div>
                                <span className="text-gray-500">Tools:</span>{' '}
                                {(run.selected_tools ?? []).join(', ') || '—'}
                            </div>
                            <div>
                                <span className="text-gray-500">Findings:</span>{' '}
                                {run.summary?.findings_total ?? findings.length}
                            </div>
                            <div>
                                <span className="text-gray-500">Started:</span>{' '}
                                {run.created_at}
                            </div>
                            {run.finished_at && (
                                <div>
                                    <span className="text-gray-500">Finished:</span>{' '}
                                    {run.finished_at}
                                </div>
                            )}
                        </div>
                        {run.tools_failed?.length > 0 && (
                            <div className="mt-3 text-sm text-yellow-400">
                                Some tools failed: {run.tools_failed.join(', ')}
                            </div>
                        )}
                    </div>

                    {/* Tool output terminal */}
                    <div className="rounded-lg border border-gray-800 bg-gray-900/50">
                        <div className="flex items-center justify-between border-b border-gray-800 px-5 py-3">
                            <h3 className="font-mono text-sm uppercase tracking-wider text-gray-400">Tool Output</h3>
                            {outputs.some((o) => o.status === 'running') && (
                                <span className="inline-flex items-center gap-1.5 font-mono text-xs text-green-400">
                                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-400" /> LIVE
                                </span>
                            )}
                        </div>
                        {outputs.length === 0 ? (
                            <div className="p-6 text-center text-sm text-gray-500">
                                {live ? 'Waiting for tools to report…' : 'No tool output was captured for this run.'}
                            </div>
                        ) : (
                            <div>
                                <div className="flex flex-wrap border-b border-gray-800">
                                    {outputs.map((o, i) => {
                                        const dotColor = o.status === 'running'
                                            ? 'text-green-400 animate-pulse'
                                            : o.timed_out || (o.exit_code !== null && o.exit_code !== 0)
                                                ? 'text-yellow-500'
                                                : 'text-green-500';
                                        return (
                                            <button
                                                key={i}
                                                onClick={() => setActiveTab(i)}
                                                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition ${
                                                    activeTab === i
                                                        ? 'border-b-2 border-red-500 text-red-400'
                                                        : 'text-gray-400 hover:text-gray-200'
                                                }`}
                                            >
                                                <span className={dotColor}>●</span>
                                                {o.tool_label}
                                                {o.status === 'running' ? (
                                                    <span className="text-xs text-green-500">running…</span>
                                                ) : (
                                                    <span className="text-xs text-gray-600">({o.findings_count})</span>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                                {outputs[activeTab] && (
                                    <div className="p-4">
                                        <div className="mb-2 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-xs text-gray-500">
                                            {outputs[activeTab].command && <span className="break-all text-gray-400">$ {outputs[activeTab].command}</span>}
                                            <span>exit: {outputs[activeTab].exit_code ?? (outputs[activeTab].status === 'running' ? 'running' : 'n/a')}</span>
                                            {outputs[activeTab].timed_out && <span className="text-yellow-400">timed out</span>}
                                            <span>{outputs[activeTab].findings_count} finding(s)</span>
                                        </div>
                                        <pre
                                            ref={activeIsRunning ? termRef : null}
                                            className="max-h-[32rem] overflow-auto whitespace-pre-wrap break-words rounded-md bg-black p-4 font-mono text-xs leading-relaxed text-green-400"
                                        >
                                            {outputs[activeTab].output || '(no output)'}
                                            {outputs[activeTab].status === 'running' && (
                                                <span className="ml-0.5 inline-block h-3 w-1.5 animate-pulse bg-green-400 align-middle" />
                                            )}
                                        </pre>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* AI report panel */}
                    {report ? (
                        <div className="rounded-lg border border-red-900/40 bg-red-950/10 p-5">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-semibold text-gray-100">AI Report</h3>
                                <div className="flex items-center gap-2">
                                    <span className="rounded border border-gray-800 px-2 py-1 text-xs text-gray-400">
                                        {report.provider} · {report.risk_level} ({report.risk_score})
                                    </span>
                                    <button
                                        onClick={generateReport}
                                        disabled={generating}
                                        className="inline-flex items-center gap-1 rounded border border-gray-800 px-2 py-1 text-xs text-gray-400 hover:text-gray-200 disabled:opacity-50"
                                    >
                                        <ArrowPathIcon className={`h-3.5 w-3.5 ${generating ? 'animate-spin' : ''}`} />
                                        {generating ? 'Regenerating…' : 'Regenerate'}
                                    </button>
                                </div>
                            </div>

                            {report.payload?.executive_summary && (
                                <p className="mt-3 text-sm leading-relaxed text-gray-300">
                                    {report.payload.executive_summary}
                                </p>
                            )}

                            {report.payload?.prioritized_findings?.length > 0 && (
                                <div className="mt-5">
                                    <h4 className="text-sm font-semibold uppercase tracking-wider text-gray-400">Prioritized Findings</h4>
                                    <ul className="mt-2 space-y-3">
                                        {report.payload.prioritized_findings.map((pf, i) => (
                                            <li key={i} className="rounded border border-gray-800 bg-gray-900/50 p-3">
                                                <div className="flex items-center gap-2">
                                                    <span className={`inline-flex items-center rounded border px-2 py-0.5 text-xs font-medium ${severityColor[pf.severity] ?? severityColor.info}`}>
                                                        {pf.severity}
                                                    </span>
                                                    <span className="text-sm font-medium text-gray-200">{pf.title}</span>
                                                </div>
                                                {pf.why_it_matters && (
                                                    <p className="mt-1 text-sm text-gray-400">{pf.why_it_matters}</p>
                                                )}
                                                {pf.recommendation && (
                                                    <p className="mt-1 text-sm text-red-300">→ {pf.recommendation}</p>
                                                )}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {report.payload?.remediation_plan?.length > 0 && (
                                <div className="mt-5">
                                    <h4 className="text-sm font-semibold uppercase tracking-wider text-gray-400">Remediation Plan</h4>
                                    <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-gray-300">
                                        {report.payload.remediation_plan.map((step, i) => (
                                            <li key={i}>{step}</li>
                                        ))}
                                    </ol>
                                </div>
                            )}

                            {report.payload?.methodology && (
                                <p className="mt-4 text-xs text-gray-500">Methodology: {report.payload.methodology}</p>
                            )}
                        </div>
                    ) : (
                        <div className="rounded-lg border border-gray-800 bg-gray-900/50 p-6 text-center">
                            {generating ? (
                                <div className="flex items-center justify-center gap-2 text-sm text-blue-400">
                                    <ArrowPathIcon className="h-4 w-4 animate-spin" />
                                    Generating AI report… this can take up to a minute.
                                </div>
                            ) : (
                                <>
                                    <SparklesIcon className="mx-auto mb-2 h-6 w-6 text-red-500" />
                                    <p className="mx-auto mb-4 max-w-md text-sm text-gray-400">
                                        Generate an AI security report for this run — an executive summary, prioritized risks,
                                        and a step-by-step remediation plan written from the findings above.
                                    </p>
                                    {errors.report && <p className="mb-3 text-sm text-red-400">{errors.report}</p>}
                                    {reportTimedOut && (
                                        <p className="mb-3 text-sm text-yellow-400">
                                            The report didn't finish in time — the generation job likely failed.
                                            Check <span className="font-mono">storage/logs/laravel.log</span> for the error, then try again.
                                        </p>
                                    )}
                                    <PrimaryButton onClick={generateReport} disabled={live || findings.length === 0}>
                                        <SparklesIcon className="mr-2 h-4 w-4" /> Generate AI Report
                                    </PrimaryButton>
                                    {live && <p className="mt-2 text-xs text-gray-600">Wait for the scan to finish first.</p>}
                                    {!live && findings.length === 0 && (
                                        <p className="mt-2 text-xs text-gray-600">No findings to report on for this run.</p>
                                    )}
                                </>
                            )}
                        </div>
                    )}

                    {/* Findings table */}
                    <div className="overflow-hidden rounded-lg border border-gray-800 bg-gray-900/50">
                        <div className="border-b border-gray-800 px-5 py-3 text-sm font-semibold uppercase tracking-wider text-gray-400">
                            Findings ({findings.length})
                        </div>
                        {findings.length === 0 ? (
                            <div className="p-6 text-center text-sm text-gray-500">No findings recorded for this run.</div>
                        ) : (
                            <table className="min-w-full divide-y divide-gray-800">
                                <thead className="bg-gray-900/80">
                                    <tr>
                                        <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-400">Severity</th>
                                        <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-400">Tool</th>
                                        <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-400">Finding</th>
                                        <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-400">Recommendation</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-800">
                                    {findings.map((f) => (
                                        <tr key={f.id} className="align-top hover:bg-gray-800/40">
                                            <td className="px-4 py-3">
                                                <span className={`inline-flex items-center rounded border px-2 py-1 text-xs font-medium ${severityColor[f.severity] ?? severityColor.info}`}>
                                                    {f.severity}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-xs text-gray-400">{f.tool}</td>
                                            <td className="px-4 py-3">
                                                <div className="text-sm text-gray-200">{f.title}</div>
                                                {f.evidence && (
                                                    <code className="mt-1 block whitespace-pre-wrap text-xs text-gray-500">{f.evidence}</code>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-red-300">{f.recommendation ?? '—'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
