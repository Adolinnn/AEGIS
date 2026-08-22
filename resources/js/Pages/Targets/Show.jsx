import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import InputError from '@/Components/InputError';
import {
    ArrowLeftIcon, PlayIcon, ShieldCheckIcon, ShieldExclamationIcon,
    ClockIcon, BugAntIcon, CheckCircleIcon,
} from '@heroicons/react/24/outline';

const SEV = {
    critical: 'text-red-400 border-red-800 bg-red-900/20',
    high: 'text-orange-400 border-orange-800 bg-orange-900/20',
    medium: 'text-yellow-400 border-yellow-800 bg-yellow-900/20',
    low: 'text-blue-400 border-blue-800 bg-blue-900/20',
    info: 'text-gray-400 border-gray-700 bg-gray-900/40',
};
const RUN_STATUS = {
    pending: 'text-gray-400 bg-gray-900/40 border-gray-700',
    running: 'text-blue-400 bg-blue-900/30 border-blue-800',
    completed: 'text-green-400 bg-green-900/30 border-green-800',
    partial: 'text-yellow-400 bg-yellow-900/30 border-yellow-800',
    failed: 'text-red-400 bg-red-900/30 border-red-800',
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
                <div className="flex items-center gap-4">
                    <SecondaryButton onClick={() => router.visit(route('targets.index'))}>
                        <ArrowLeftIcon className="mr-2 h-5 w-5" /> Back
                    </SecondaryButton>
                    <div className="min-w-0">
                        <h2 className="truncate font-mono text-xl font-semibold text-gray-100">{target.domain_url}</h2>
                        {target.display_name && <p className="truncate text-sm text-gray-500">{target.display_name}</p>}
                    </div>
                    <span className={`ml-auto inline-flex items-center gap-1 rounded-full border px-3 py-1 font-mono text-xs ${authorized ? 'border-green-800 bg-green-900/20 text-green-400' : 'border-yellow-800 bg-yellow-900/20 text-yellow-400'}`}>
                        {authorized ? <ShieldCheckIcon className="h-4 w-4" /> : <ShieldExclamationIcon className="h-4 w-4" />}
                        {authorized ? 'AUTHORIZED' : 'NOT AUTHORIZED'}
                    </span>
                </div>
            }
        >
            <Head title={target.domain_url} />

            <div className="py-6">
                <div className="mx-auto grid max-w-7xl gap-6 px-4 sm:px-6 lg:grid-cols-3 lg:px-8">
                    {/* Launch panel */}
                    <div className="lg:col-span-2 space-y-6">
                        {flash.success && (
                            <div className="rounded-md border border-green-800 bg-green-900/30 px-4 py-3 text-sm text-green-300">{flash.success}</div>
                        )}

                        {!authorized && (
                            <div className="rounded-md border border-yellow-800 bg-yellow-900/20 px-4 py-3 text-sm text-yellow-300">
                                This target isn't authorized for scanning yet.{' '}
                                <Link href={route('targets.edit', target.id)} className="underline hover:text-yellow-200">Mark it authorized</Link> to enable scan runs.
                            </div>
                        )}

                        <form onSubmit={startScan} className="rounded-lg border border-gray-700 bg-gray-800 p-5">
                            <h3 className="mb-4 font-mono text-sm uppercase tracking-wider text-gray-400">Run a scan</h3>

                            <div className="space-y-2">
                                {availableTools.map((tool) => {
                                    const disabled = !tool.installed;
                                    return (
                                        <label
                                            key={tool.name}
                                            className={`flex items-start gap-3 rounded-lg border p-3 ${disabled ? 'cursor-not-allowed border-gray-800 bg-gray-900/40 opacity-60' : 'cursor-pointer border-gray-700 bg-gray-900/60 hover:border-red-500'}`}
                                        >
                                            <input
                                                type="checkbox"
                                                disabled={disabled}
                                                checked={data.tools.includes(tool.name)}
                                                onChange={() => toggleTool(tool.name)}
                                                className="mt-0.5 h-4 w-4 rounded border-gray-700 bg-gray-900 text-red-500 focus:ring-red-500"
                                            />
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-mono text-sm text-gray-100">{tool.label}</span>
                                                    {tool.name === 'builtin' && <span className="rounded bg-red-900/40 px-1.5 py-0.5 text-[10px] font-medium text-red-300">RECOMMENDED</span>}
                                                    {!tool.installed && <span className="text-[10px] font-medium text-gray-500">NOT INSTALLED</span>}
                                                </div>
                                                <p className="text-xs text-gray-500">{tool.description}</p>
                                            </div>
                                        </label>
                                    );
                                })}
                            </div>
                            <InputError message={errors.tools} className="mt-2" />

                            <label className="mt-4 flex items-start gap-3 rounded-lg border border-gray-700 bg-gray-900/60 p-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={data.consent}
                                    onChange={(e) => setData('consent', e.target.checked)}
                                    className="mt-0.5 h-4 w-4 rounded border-gray-700 bg-gray-900 text-red-500 focus:ring-red-500"
                                />
                                <span className="text-xs text-gray-400">{consentText}</span>
                            </label>
                            <InputError message={errors.consent} className="mt-1" />
                            <InputError message={errors.scan} className="mt-1" />

                            <div className="mt-4 flex justify-end">
                                <PrimaryButton disabled={!canStart}>
                                    <PlayIcon className="mr-2 h-4 w-4" />
                                    {processing ? 'Queuing…' : 'Start Scan'}
                                </PrimaryButton>
                            </div>
                        </form>

                        {/* Recent findings */}
                        <div className="rounded-lg border border-gray-800 bg-gray-900">
                            <div className="flex items-center justify-between border-b border-gray-800 px-5 py-3">
                                <h3 className="font-mono text-sm uppercase tracking-wider text-gray-400">Latest Findings</h3>
                                <Link href={route('targets.vulnerabilities', target.id)} className="text-sm text-red-400 hover:text-red-300">View all</Link>
                            </div>
                            {recentFindings.length === 0 ? (
                                <div className="px-5 py-10 text-center text-sm text-gray-500">No findings recorded yet.</div>
                            ) : (
                                <ul className="divide-y divide-gray-800">
                                    {recentFindings.map((f) => (
                                        <li key={f.id} className="flex items-center gap-3 px-5 py-3">
                                            <span className={`rounded border px-2 py-0.5 font-mono text-[10px] uppercase ${SEV[f.severity] ?? SEV.info}`}>{f.severity}</span>
                                            <div className="min-w-0 flex-1">
                                                <p className="truncate text-sm text-gray-100">{f.title}</p>
                                                <p className="text-xs text-gray-500">{f.tool} · {f.category}</p>
                                            </div>
                                            {f.is_resolved && <CheckCircleIcon className="h-4 w-4 text-green-500" title="Resolved" />}
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>

                    {/* Sidebar: runs + uptime */}
                    <div className="space-y-6">
                        <div className="rounded-lg border border-gray-800 bg-gray-900">
                            <div className="flex items-center justify-between border-b border-gray-800 px-5 py-3">
                                <h3 className="font-mono text-sm uppercase tracking-wider text-gray-400">Recent Runs</h3>
                                <BugAntIcon className="h-4 w-4 text-gray-600" />
                            </div>
                            {recentRuns.length === 0 ? (
                                <div className="px-5 py-8 text-center text-xs text-gray-500">No runs yet.</div>
                            ) : (
                                <ul className="divide-y divide-gray-800">
                                    {recentRuns.map((r) => (
                                        <li key={r.id}>
                                            <Link href={route('scan-runs.show', r.id)} className="flex items-center justify-between px-5 py-3 hover:bg-gray-800/50">
                                                <span className="font-mono text-xs text-gray-400">
                                                    {r.created_at ? new Date(r.created_at).toLocaleString() : ''}
                                                </span>
                                                <span className={`rounded-full border px-2 py-0.5 font-mono text-[10px] ${RUN_STATUS[r.status] ?? RUN_STATUS.pending}`}>{r.status_label}</span>
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>

                        <div className="rounded-lg border border-gray-800 bg-gray-900 p-5">
                            <div className="mb-3 flex items-center justify-between">
                                <h3 className="font-mono text-sm uppercase tracking-wider text-gray-400">Uptime</h3>
                                <ClockIcon className="h-4 w-4 text-gray-600" />
                            </div>
                            <p className="mb-3 text-xs text-gray-500">
                                Last check: {target.last_checked_at ? new Date(target.last_checked_at).toLocaleString() : 'Never'}
                            </p>
                            <div className="flex gap-2">
                                <SecondaryButton onClick={() => router.post(route('targets.check-uptime', target.id), {}, { preserveScroll: true })}>
                                    Check now
                                </SecondaryButton>
                                <Link href={route('targets.uptime-history', target.id)}>
                                    <SecondaryButton type="button">History</SecondaryButton>
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
