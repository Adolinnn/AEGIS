import { Head, Link, router } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import SecondaryButton from '@/Components/SecondaryButton';
import { CheckCircleIcon, ArrowUturnLeftIcon, SparklesIcon, ChevronDownIcon, BugAntIcon } from '@heroicons/react/24/outline';
import { useState } from 'react';

const SEV = {
    critical: 'text-red-400 border-red-800 bg-red-900/20',
    high: 'text-orange-400 border-orange-800 bg-orange-900/20',
    medium: 'text-yellow-400 border-yellow-800 bg-yellow-900/20',
    low: 'text-blue-400 border-blue-800 bg-blue-900/20',
    info: 'text-gray-400 border-gray-700 bg-gray-900/40',
};

function FindingRow({ finding, onResolve, onUnresolve, onPatch }) {
    const [open, setOpen] = useState(false);
    return (
        <li className="px-5 py-3">
            <div className="flex items-start gap-3">
                <button onClick={() => setOpen((o) => !o)} className="mt-0.5 text-gray-500 hover:text-gray-300">
                    <ChevronDownIcon className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} />
                </button>
                <span className={`mt-0.5 rounded border px-2 py-0.5 font-mono text-[10px] uppercase ${SEV[finding.severity] ?? SEV.info}`}>{finding.severity}</span>
                <div className="min-w-0 flex-1">
                    <p className={`truncate text-sm ${finding.is_resolved ? 'text-gray-500 line-through' : 'text-gray-100'}`}>{finding.title}</p>
                    <p className="text-xs text-gray-500">
                        {finding.target && (
                            <Link href={route('targets.vulnerabilities', finding.target.id)} className="text-gray-400 hover:text-red-400">
                                {finding.target.domain_url}
                            </Link>
                        )}
                        {' · '}{finding.tool_label} · {finding.category}
                    </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                    {finding.is_resolved ? (
                        <button onClick={() => onUnresolve(finding)} className="inline-flex items-center gap-1 rounded border border-gray-700 px-2 py-1 text-xs text-gray-300 hover:bg-gray-800">
                            <ArrowUturnLeftIcon className="h-3.5 w-3.5" /> Reopen
                        </button>
                    ) : (
                        <button onClick={() => onResolve(finding)} className="inline-flex items-center gap-1 rounded border border-green-800 px-2 py-1 text-xs text-green-400 hover:bg-green-900/20">
                            <CheckCircleIcon className="h-3.5 w-3.5" /> Resolve
                        </button>
                    )}
                </div>
            </div>

            {open && (
                <div className="ml-11 mt-3 space-y-3 text-sm">
                    {finding.description && <p className="text-gray-300">{finding.description}</p>}
                    {finding.evidence && (
                        <div>
                            <p className="mb-1 font-mono text-xs uppercase text-gray-500">Evidence</p>
                            <pre className="overflow-auto rounded bg-black p-3 font-mono text-xs text-green-400">{finding.evidence}</pre>
                        </div>
                    )}
                    {finding.recommendation && (
                        <div>
                            <p className="mb-1 font-mono text-xs uppercase text-gray-500">Recommendation</p>
                            <p className="text-gray-300">{finding.recommendation}</p>
                        </div>
                    )}
                    {finding.has_ai_patch ? (
                        <div>
                            <p className="mb-1 font-mono text-xs uppercase text-gray-500">AI Patch</p>
                            <pre className="overflow-auto rounded bg-black p-3 font-mono text-xs text-gray-200">{finding.ai_patch_snippet}</pre>
                        </div>
                    ) : (
                        <button onClick={() => onPatch(finding)} className="inline-flex items-center gap-1 rounded border border-gray-700 px-2 py-1 text-xs text-gray-300 hover:bg-gray-800">
                            <SparklesIcon className="h-3.5 w-3.5" /> Generate AI patch
                        </button>
                    )}
                    {finding.scan_run_id && (
                        <Link href={route('scan-runs.show', finding.scan_run_id)} className="block text-xs text-red-400 hover:text-red-300">
                            View originating scan run →
                        </Link>
                    )}
                </div>
            )}
        </li>
    );
}

function Stat({ label, value, accent }) {
    return (
        <div className="rounded-lg border border-gray-700 bg-gray-800 p-4 text-center">
            <p className={`font-mono text-2xl font-bold ${accent}`}>{value}</p>
            <p className="font-mono text-xs uppercase text-gray-500">{label}</p>
        </div>
    );
}

export default function VulnerabilitiesIndex({ findings, targets = [], filters = {}, severities = [], categories = [], stats }) {
    const setFilter = (key, value) => {
        const next = { ...filters, [key]: value === '' ? undefined : value };
        router.get(route('vulnerabilities.index'), next, { preserveScroll: true, preserveState: true });
    };

    const onResolve = (f) => router.post(route('vulnerabilities.resolve', f.id), {}, { preserveScroll: true });
    const onUnresolve = (f) => router.post(route('vulnerabilities.unresolve', f.id), {}, { preserveScroll: true });
    const onPatch = (f) => router.post(route('vulnerabilities.generate-patch', f.id), {}, { preserveScroll: true });

    return (
        <AuthenticatedLayout
            header={<h2 className="flex items-center gap-2 text-xl font-semibold text-gray-100"><BugAntIcon className="h-6 w-6 text-red-500" /> Vulnerabilities</h2>}
        >
            <Head title="Vulnerabilities" />

            <div className="py-6">
                <div className="mx-auto max-w-5xl space-y-4 px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                        <Stat label="Total" value={stats.total} accent="text-gray-100" />
                        <Stat label="Open" value={stats.unresolved} accent="text-yellow-400" />
                        <Stat label="Critical" value={stats.critical} accent="text-red-400" />
                        <Stat label="High" value={stats.high} accent="text-orange-400" />
                    </div>

                    <div className="flex flex-wrap gap-3 rounded-lg border border-gray-800 bg-gray-900 p-3">
                        <select value={filters.target_id ?? ''} onChange={(e) => setFilter('target_id', e.target.value)}
                            className="rounded-md border-gray-700 bg-gray-900 text-sm text-gray-200 focus:border-red-500 focus:ring-red-500">
                            <option value="">All targets</option>
                            {targets.map((t) => <option key={t.id} value={t.id}>{t.domain_url}</option>)}
                        </select>
                        <select value={filters.severity ?? ''} onChange={(e) => setFilter('severity', e.target.value)}
                            className="rounded-md border-gray-700 bg-gray-900 text-sm text-gray-200 focus:border-red-500 focus:ring-red-500">
                            <option value="">All severities</option>
                            {severities.map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                        <select value={filters.category ?? ''} onChange={(e) => setFilter('category', e.target.value)}
                            className="rounded-md border-gray-700 bg-gray-900 text-sm text-gray-200 focus:border-red-500 focus:ring-red-500">
                            <option value="">All categories</option>
                            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
                        </select>
                        <select value={filters.resolved ?? ''} onChange={(e) => setFilter('resolved', e.target.value)}
                            className="rounded-md border-gray-700 bg-gray-900 text-sm text-gray-200 focus:border-red-500 focus:ring-red-500">
                            <option value="">All statuses</option>
                            <option value="false">Unresolved</option>
                            <option value="true">Resolved</option>
                        </select>
                        {(filters.severity || filters.category || filters.target_id || filters.resolved !== undefined) && (
                            <SecondaryButton onClick={() => router.get(route('vulnerabilities.index'), {}, { preserveScroll: true })}>Clear</SecondaryButton>
                        )}
                    </div>

                    <div className="rounded-lg border border-gray-800 bg-gray-900">
                        {findings.data.length === 0 ? (
                            <div className="px-5 py-12 text-center text-sm text-gray-500">
                                No findings yet. Add a target and start a scan run to populate this list.
                            </div>
                        ) : (
                            <ul className="divide-y divide-gray-800">
                                {findings.data.map((f) => (
                                    <FindingRow key={f.id} finding={f} onResolve={onResolve} onUnresolve={onUnresolve} onPatch={onPatch} />
                                ))}
                            </ul>
                        )}
                    </div>

                    {findings.links && findings.links.length > 3 && (
                        <div className="flex flex-wrap justify-center gap-1">
                            {findings.links.map((link, i) => (
                                <button
                                    key={i}
                                    disabled={!link.url}
                                    onClick={() => link.url && router.get(link.url, {}, { preserveScroll: true })}
                                    className={`rounded px-3 py-1 text-sm ${link.active ? 'bg-red-600 text-white' : link.url ? 'text-gray-300 hover:bg-gray-800' : 'text-gray-600'}`}
                                    dangerouslySetInnerHTML={{ __html: link.label }}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
