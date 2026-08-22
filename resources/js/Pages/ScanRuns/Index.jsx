import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import InputError from '@/Components/InputError';
import { PlusIcon, PlayIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { useEffect, useRef } from 'react';

const statusColor = {
    pending: 'text-gray-400 bg-gray-900/30 border-gray-400/20',
    running: 'text-blue-400 bg-blue-900/30 border-blue-400/20',
    completed: 'text-green-400 bg-green-900/30 border-green-400/20',
    partial: 'text-yellow-400 bg-yellow-900/30 border-yellow-400/20',
    failed: 'text-red-500 bg-red-900/40 border-red-500/30',
};

const NON_TERMINAL = ['pending', 'running'];

export default function ScanRunsIndex({ runs, targets = [], availableTools = [], consentText }) {
    const flash = usePage().props.flash ?? {};

    // Coerce to arrays defensively — Inertia can serialize a PHP associative
    // array as an object, which would break .map/.filter below.
    const toolList = Array.isArray(availableTools) ? availableTools : Object.values(availableTools ?? {});
    const targetList = Array.isArray(targets) ? targets : Object.values(targets ?? {});
    const runRows = runs?.data ?? [];

    const authorizedTargets = targetList.filter((t) => t.is_authorized);
    const hasLive = runRows.some((r) => NON_TERMINAL.includes(r.status));

    const { data, setData, post, processing, errors, reset } = useForm({
        target_id: authorizedTargets[0]?.id ?? '',
        tools: ['builtin'],
        consent: false,
        generate_report: true,
    });

    // Auto-refresh while any run is pending/running so status + findings
    // update. `replace: true` stops each poll from pushing a new browser
    // history entry (which otherwise breaks Back/nav after a while), and the
    // in-flight guard stops overlapping requests from racing a real click.
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
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-gray-100">Scan Runs</h2>
                    
                </div>
            }
        >
            <Head title="Scan Runs" />

            <div className="py-8">
                <div className="mx-auto max-w-6xl space-y-6 px-4 sm:px-6 lg:px-8">
                    {flash.success && (
                        <div className="rounded-md border border-green-800 bg-green-900/30 px-4 py-3 text-sm text-green-300">{flash.success}</div>
                    )}

                    {/* Run a scan */}
                    <form onSubmit={startScan} className="rounded-lg border border-gray-700 bg-gray-800 p-5">
                        <h3 className="mb-4 font-mono text-sm uppercase tracking-wider text-gray-400">Run a scan</h3>

                        {targetList.length === 0 ? (
                            <p className="text-sm text-gray-400">
                                No targets yet.{' '}
                                <Link href={route('targets.create')} className="text-red-400 hover:text-red-300 underline">Add a target</Link> to run a scan.
                            </p>
                        ) : authorizedTargets.length === 0 ? (
                            <p className="text-sm text-yellow-300">
                                You have targets, but none are authorized for scanning. Open a target and mark it authorized first.
                            </p>
                        ) : (
                            <>
                                <label className="mb-1 block text-xs font-mono uppercase text-gray-500">Target</label>
                                <select
                                    value={data.target_id}
                                    onChange={(e) => setData('target_id', e.target.value)}
                                    className="mb-4 w-full rounded-md border-gray-700 bg-gray-900 text-sm text-gray-100 focus:border-red-500 focus:ring-red-500"
                                >
                                    {authorizedTargets.map((t) => (
                                        <option key={t.id} value={t.id}>{t.domain_url}{t.display_name ? ` — ${t.display_name}` : ''}</option>
                                    ))}
                                </select>
                                <InputError message={errors.target_id} className="mb-2" />

                                <label className="mb-1 block text-xs font-mono uppercase text-gray-500">Scanners</label>
                                <div className="mb-3 grid gap-2 sm:grid-cols-2">
                                    {toolList.map((tool) => {
                                        const disabled = !tool.installed;
                                        return (
                                            <label
                                                key={tool.name}
                                                className={`flex items-start gap-2 rounded-lg border p-2.5 ${disabled ? 'cursor-not-allowed border-gray-800 bg-gray-900/40 opacity-60' : 'cursor-pointer border-gray-700 bg-gray-900/60 hover:border-red-500'}`}
                                            >
                                                <input
                                                    type="checkbox"
                                                    disabled={disabled}
                                                    checked={data.tools.includes(tool.name)}
                                                    onChange={() => toggleTool(tool.name)}
                                                    className="mt-0.5 h-4 w-4 rounded border-gray-700 bg-gray-900 text-red-500 focus:ring-red-500"
                                                />
                                                <div className="min-w-0">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="font-mono text-xs text-gray-100">{tool.label}</span>
                                                        {tool.name === 'builtin' && <span className="rounded bg-red-900/40 px-1 text-[9px] text-red-300">RECOMMENDED</span>}
                                                        {!tool.installed && <span className="text-[9px] text-gray-500">NOT INSTALLED</span>}
                                                    </div>
                                                </div>
                                            </label>
                                        );
                                    })}
                                </div>
                                <InputError message={errors.tools} className="mb-2" />

                                <label className="mb-3 flex items-start gap-2 rounded-lg border border-gray-700 bg-gray-900/60 p-3 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={data.consent}
                                        onChange={(e) => setData('consent', e.target.checked)}
                                        className="mt-0.5 h-4 w-4 rounded border-gray-700 bg-gray-900 text-red-500 focus:ring-red-500"
                                    />
                                    <span className="text-xs text-gray-400">{consentText}</span>
                                </label>
                                <InputError message={errors.consent} className="mb-2" />

                                <label className="mb-3 flex items-start gap-2 rounded-lg border border-gray-700 bg-gray-900/60 p-3 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={data.generate_report}
                                        onChange={(e) => setData('generate_report', e.target.checked)}
                                        className="mt-0.5 h-4 w-4 rounded border-gray-700 bg-gray-900 text-red-500 focus:ring-red-500"
                                    />
                                    <span className="text-xs text-gray-400">Generate AI report after scan completes (requires LLM API key)</span>
                                </label>
                                <InputError message={errors.generate_report} className="mb-2" />

                                <InputError message={errors.scan} className="mb-2" />

                                <div className="flex justify-end">
                                    <PrimaryButton disabled={!canStart}>
                                        <PlayIcon className="mr-2 h-4 w-4" />
                                        {processing ? 'Queuing…' : 'Start Scan'}
                                    </PrimaryButton>
                                </div>
                            </>
                        )}
                    </form>

                    {/* Runs list */}
                    <div className="flex items-center justify-between">
                        <h3 className="font-mono text-sm uppercase tracking-wider text-gray-400">History</h3>
                        {hasLive && (
                            <span className="inline-flex items-center gap-1.5 text-xs text-blue-400">
                                <ArrowPathIcon className="h-4 w-4 animate-spin" /> Live — refreshing…
                            </span>
                        )}
                    </div>

                    {runRows.length === 0 ? (
                        <div className="rounded-lg border border-gray-800 bg-gray-900/50 p-8 text-center text-gray-400">
                            No scan runs yet. Pick a target above and start a scan.
                        </div>
                    ) : (
                        <div className="overflow-hidden rounded-lg border border-gray-800 bg-gray-900/50">
                            <table className="min-w-full divide-y divide-gray-800">
                                <thead className="bg-gray-900/80">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">Target</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">Tools</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">Status</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">Findings</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">Started</th>
                                        <th className="px-4 py-3"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-800">
                                    {runRows.map((run) => {
                                        const findings = run.summary?.findings_total ?? run.findings?.length ?? 0;
                                        return (
                                            <tr key={run.id} className="hover:bg-gray-800/40">
                                                <td className="px-4 py-3 text-sm text-gray-200">
                                                    {run.target?.display_name ?? '—'}<br />
                                                    <span className="text-xs text-gray-500">{run.target?.domain_url}</span>
                                                </td>
                                                <td className="px-4 py-3 text-sm text-gray-400">{(run.selected_tools ?? []).join(', ')}</td>
                                                <td className="px-4 py-3">
                                                    <span className={`inline-flex items-center rounded border px-2 py-1 text-xs font-medium ${statusColor[run.status] ?? statusColor.pending}`}>
                                                        {run.status}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-sm text-gray-200">{findings}</td>
                                                <td className="px-4 py-3 text-sm text-gray-500">{run.created_at}</td>
                                                <td className="px-4 py-3 text-right">
                                                    <div className="flex justify-end gap-3">
                                                        <Link href={route('scan-runs.show', run.id)} className="text-sm text-red-400 hover:text-red-300">View</Link>
                                                        {run.target && (
                                                            <Link href={route('targets.vulnerabilities', run.target.id)} className="text-sm text-gray-400 hover:text-gray-200">Vulns</Link>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {runs.links && runs.links.length > 3 && (
                        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                            {runs.links.map((link, i) => {
                                const base = 'px-3 py-1 text-sm rounded border transition-colors';
                                const styles = link.active
                                    ? 'border-red-500 bg-red-900/30 text-red-300'
                                    : link.url === null
                                        ? 'border-gray-800 text-gray-600 cursor-not-allowed'
                                        : 'border-gray-800 text-gray-400 hover:bg-gray-800 hover:text-gray-200';
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
