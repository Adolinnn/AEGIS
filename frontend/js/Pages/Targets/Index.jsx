import { useState } from 'react';
import { Head, usePage, router, useForm, Link } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import TextInput from '@/Components/TextInput';
import InputLabel from '@/Components/InputLabel';
import InputError from '@/Components/InputError';
import { 
    PlusIcon, 
    PlayIcon, 
    MagnifyingGlassIcon, 
    ShieldCheckIcon, 
    ClockIcon, 
    ExclamationTriangleIcon,
    ServerIcon,
    ShieldExclamationIcon,
    ArrowRightIcon
} from '@heroicons/react/24/outline';

export default function TargetsIndex({ targets, subscriptionTier, maxTargets, canAddTarget }) {
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [search, setSearch] = useState('');

    const { data, setData, post, processing, errors, reset } = useForm({
        domain_url: '',
        display_name: '',
        uptime_check_interval_minutes: 15,
        scan_types: ['xss', 'sqli', 'ssrf', 'misconfiguration'],
        is_authorized: false,
    });

    const submitCreateTarget = (e) => {
        e.preventDefault();
        post(route('targets.store'), {
            onSuccess: () => {
                setShowCreateModal(false);
                reset();
            },
        });
    };

    const targetItems = targets?.data ?? [];
    const filteredTargets = targetItems.filter((target) =>
        target.domain_url.toLowerCase().includes(search.toLowerCase()) ||
        target.display_name?.toLowerCase().includes(search.toLowerCase())
    );

    const getStatusBadge = (target) => {
        const status = target.latest_uptime_log?.status || 'unknown';
        const colors = {
            up: 'text-emerald-400 bg-emerald-950/50 border-emerald-500/40 shadow-[0_0_10px_rgba(16,185,129,0.3)]',
            down: 'text-rose-400 bg-rose-950/50 border-rose-500/40 shadow-[0_0_10px_rgba(244,63,94,0.3)]',
            degraded: 'text-amber-400 bg-amber-950/50 border-amber-500/40 shadow-[0_0_10px_rgba(245,158,11,0.2)]',
            unknown: 'text-slate-400 bg-slate-900/50 border-slate-700/40',
        };
        return (
            <span className={`cyber-badge font-mono text-[10px] font-bold ${colors[status] ?? colors.unknown}`}>
                <span className={`relative flex h-2 w-2`}>
                    {status === 'up' ? (
                        <>
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                        </>
                    ) : status === 'down' ? (
                        <>
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                        </>
                    ) : (
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-slate-500"></span>
                    )}
                </span>
                {status.toUpperCase()}
            </span>
        );
    };

    const getVulnBadges = (vulns) => {
        if (!vulns?.length) return (
            <span className="font-mono text-xs text-emerald-400 font-semibold flex items-center gap-1">
                <span>✓</span> SECURE
            </span>
        );

        const critical = vulns.filter(v => v.severity === 'critical').length;
        const high = vulns.filter(v => v.severity === 'high').length;
        const medium = vulns.filter(v => v.severity === 'medium').length;

        return (
            <div className="flex items-center gap-1.5">
                {critical > 0 && (
                    <span className="cyber-badge text-rose-400 bg-rose-950/50 border-rose-500/40 font-bold shadow-[0_0_10px_rgba(244,63,94,0.35)]">
                        {critical} CRIT
                    </span>
                )}
                {high > 0 && (
                    <span className="cyber-badge text-orange-400 bg-orange-950/50 border-orange-500/40 font-bold">
                        {high} HIGH
                    </span>
                )}
                {medium > 0 && (
                    <span className="cyber-badge text-amber-400 bg-amber-950/50 border-amber-500/40 font-bold">
                        {medium} MED
                    </span>
                )}
            </div>
        );
    };

    return (
        <AuthenticatedLayout
            header={
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="font-mono text-[10px] uppercase tracking-widest px-2 py-0.5 rounded bg-cyan-950/60 text-cyan-400 border border-cyan-800/60 font-semibold">
                                ASSET SURVEILLANCE
                            </span>
                            <span className="font-mono text-xs text-slate-500">Domain & Host Telemetry</span>
                        </div>
                        <h1 className="text-2xl font-mono font-bold text-white tracking-tight mt-1">
                            Monitored Targets
                        </h1>
                    </div>
                    <div className="text-right">
                        <PrimaryButton onClick={() => setShowCreateModal(true)} disabled={!canAddTarget}>
                            <PlusIcon className="h-4 w-4 mr-2" />
                            Add Target Asset
                        </PrimaryButton>
                        {!canAddTarget && (
                            <p className="mt-1 font-mono text-[10px] text-amber-400">
                                Limit reached ({maxTargets}) on {subscriptionTier?.label ?? subscriptionTier} plan.
                            </p>
                        )}
                    </div>
                </div>
            }
        >
            <Head title="Targets" />

            <div className="py-8">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-6">
                    
                    {/* Stat Matrix Cards with 3D Hover Lift and Glow Flares */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 hud-fade-in">
                        <div className="cyber-card-interactive relative overflow-hidden rounded-xl p-4 shadow-lg group">
                            <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full blur-2xl pointer-events-none opacity-20 group-hover:opacity-50 transition-opacity bg-slate-500"></div>
                            <div className="flex items-center justify-between relative z-10">
                                <div>
                                    <p className="font-mono text-[10px] uppercase tracking-widest text-slate-400 font-semibold">TOTAL ASSETS</p>
                                    <p className="font-mono text-2xl font-bold text-white mt-1 group-hover:translate-x-0.5 transition-transform">{targets.total}</p>
                                </div>
                                <div className="p-2 rounded-lg bg-slate-900/80 border border-slate-800 text-slate-400 group-hover:text-cyan-300 group-hover:border-cyan-500/40 group-hover:scale-110 transition-all duration-300">
                                    <ServerIcon className="h-6 w-6" />
                                </div>
                            </div>
                        </div>

                        <div className="cyber-card-interactive relative overflow-hidden rounded-xl p-4 shadow-lg group">
                            <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full blur-2xl pointer-events-none opacity-20 group-hover:opacity-50 transition-opacity bg-emerald-500"></div>
                            <div className="flex items-center justify-between relative z-10">
                                <div>
                                    <p className="font-mono text-[10px] uppercase tracking-widest text-slate-400 font-semibold">SURVEILLANCE ACTIVE</p>
                                    <p className="font-mono text-2xl font-bold text-emerald-400 mt-1 group-hover:translate-x-0.5 transition-transform">
                                        {targetItems.filter(t => t.is_active).length}
                                    </p>
                                </div>
                                <div className="p-2 rounded-lg bg-slate-900/80 border border-slate-800 text-slate-400 group-hover:text-emerald-300 group-hover:border-emerald-500/40 group-hover:scale-110 transition-all duration-300">
                                    <ClockIcon className="h-6 w-6" />
                                </div>
                            </div>
                        </div>

                        <div className="cyber-card-interactive relative overflow-hidden rounded-xl p-4 shadow-lg group">
                            <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full blur-2xl pointer-events-none opacity-20 group-hover:opacity-50 transition-opacity bg-rose-500"></div>
                            <div className="flex items-center justify-between relative z-10">
                                <div>
                                    <p className="font-mono text-[10px] uppercase tracking-widest text-slate-400 font-semibold">EXPOSURES DETECTED</p>
                                    <p className="font-mono text-2xl font-bold text-rose-400 mt-1 group-hover:translate-x-0.5 transition-transform">
                                        {targetItems.filter(t => t.unresolved_findings?.length > 0).length}
                                    </p>
                                </div>
                                <div className="p-2 rounded-lg bg-slate-900/80 border border-slate-800 text-slate-400 group-hover:text-rose-300 group-hover:border-rose-500/40 group-hover:scale-110 transition-all duration-300">
                                    <ShieldExclamationIcon className="h-6 w-6" />
                                </div>
                            </div>
                        </div>

                        <div className="cyber-card-interactive relative overflow-hidden rounded-xl p-4 shadow-lg group">
                            <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full blur-2xl pointer-events-none opacity-20 group-hover:opacity-50 transition-opacity bg-cyan-500"></div>
                            <div className="flex items-center justify-between relative z-10">
                                <div>
                                    <p className="font-mono text-[10px] uppercase tracking-widest text-slate-400 font-semibold">CAPACITY</p>
                                    <p className="font-mono text-2xl font-bold text-cyan-400 mt-1 group-hover:translate-x-0.5 transition-transform">
                                        {targets.total} / {maxTargets > 999999 ? '∞' : maxTargets}
                                    </p>
                                </div>
                                <div className="px-2 py-1 bg-cyan-950/80 border border-cyan-800 rounded font-mono text-[10px] font-bold text-cyan-300 group-hover:border-cyan-500/60 transition-colors">
                                    {(subscriptionTier?.value ?? subscriptionTier ?? 'FREE').toUpperCase()}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Search & Filter Bar */}
                    <div className="laser-beam-header rounded-xl border border-white/[0.08] bg-[#0c1428]/90 p-4 backdrop-blur-md hud-fade-in hud-stagger-1 shadow-lg">
                        <div className="relative">
                            <MagnifyingGlassIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search targets by domain, host IP, or label..."
                                className="w-full rounded-lg border border-slate-700/80 bg-[#070b14] pl-10 pr-4 py-2 font-mono text-sm text-slate-100 placeholder-slate-600 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 shadow-inner transition-colors"
                            />
                        </div>
                    </div>

                    {/* Targets Table with Laser Beam Header */}
                    <div className="laser-beam-header rounded-xl border border-white/[0.08] bg-[#0c1428]/90 backdrop-blur-md shadow-xl overflow-hidden hud-fade-in hud-stagger-2">
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-white/[0.06]">
                                <thead className="bg-[#070c18] font-mono text-[10px] uppercase tracking-wider text-slate-400">
                                <tr>
                                    <th className="px-5 py-3.5 text-left">TARGET ASSET</th>
                                    <th className="px-4 py-3.5 text-left">STATUS</th>
                                    <th className="px-4 py-3.5 text-left">UPTIME</th>
                                    <th className="px-4 py-3.5 text-left">LATENCY</th>
                                    <th className="px-4 py-3.5 text-left">SECURITY FINDINGS</th>
                                    <th className="px-4 py-3.5 text-left">LAST PROBED</th>
                                    <th className="px-5 py-3.5 text-right">ACTION</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/[0.04]">
                                {filteredTargets.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="px-5 py-12 text-center font-mono text-xs text-slate-500">
                                            {search ? 'No targets matched the search query.' : 'No targets configured. Click "Add Target Asset" to register your first domain.'}
                                        </td>
                                    </tr>
                                ) : (
                                    filteredTargets.map((target) => (
                                        <tr
                                            key={target.id}
                                            className="hover:bg-slate-800/40 hover:pl-2 transition-all duration-200 cursor-pointer group"
                                            onClick={() => router.visit(route('targets.show', target.id))}
                                        >
                                            <td className="px-5 py-4" onClick={(e) => e.stopPropagation()}>
                                                <Link href={route('targets.show', target.id)} className="block">
                                                    <p className="font-mono text-xs font-semibold text-slate-100 group-hover:text-cyan-400 transition-colors truncate max-w-xs">
                                                        {target.domain_url}
                                                    </p>
                                                    {target.display_name && (
                                                        <p className="text-[11px] text-slate-500 truncate max-w-xs font-sans mt-0.5">{target.display_name}</p>
                                                    )}
                                                </Link>
                                            </td>
                                            <td className="px-4 py-4 whitespace-nowrap">
                                                {getStatusBadge(target)}
                                            </td>
                                            <td className="px-4 py-4 whitespace-nowrap">
                                                <span className="font-mono text-xs text-slate-300 font-semibold">
                                                    {target.uptime_percentage !== undefined
                                                        ? `${target.uptime_percentage.toFixed(2)}%`
                                                        : '—'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-4 whitespace-nowrap">
                                                <span className="font-mono text-xs text-slate-400">
                                                    {target.latest_uptime_log?.response_time_ms != null
                                                        ? `${target.latest_uptime_log.response_time_ms}ms`
                                                        : target.average_response_time != null
                                                        ? `${target.average_response_time}ms`
                                                        : '—'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-4 whitespace-nowrap">
                                                {getVulnBadges(target.unresolved_findings)}
                                            </td>
                                            <td className="px-4 py-4 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                                                {target.latest_uptime_log?.checked_at
                                                    ? new Date(target.latest_uptime_log.checked_at).toLocaleTimeString()
                                                    : target.last_checked_at
                                                    ? new Date(target.last_checked_at).toLocaleTimeString()
                                                    : 'Never'}
                                            </td>
                                            <td className="px-5 py-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                                                <Link
                                                    href={route('scan-runs.index', { target_id: target.id })}
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-500/40 bg-red-950/40 text-xs font-mono font-semibold text-red-300 hover:bg-red-900/60 hover:text-white hover:border-red-400 transition-all shadow-[0_0_10px_rgba(244,63,94,0.2)] hover:scale-105 active:scale-95"
                                                    title="Launch vulnerability scan"
                                                >
                                                    <PlayIcon className="h-3.5 w-3.5 text-red-400" />
                                                    <span>Scan</span>
                                                </Link>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                </div>
            </div>

            {/* Create Target Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 z-50 overflow-y-auto hud-fade-in">
                    <div className="flex min-h-full items-center justify-center p-4 text-center">
                        <div className="fixed inset-0 bg-[#04070e]/85 backdrop-blur-md transition-opacity" onClick={() => setShowCreateModal(false)} />
                        <div className="laser-beam-header relative bg-[#0c1428] border border-slate-700/80 rounded-xl shadow-2xl w-full max-w-lg text-left overflow-hidden">
                            <div className="p-6 space-y-5">
                                <div className="border-b border-slate-800 pb-3">
                                    <h3 className="text-base font-mono font-bold text-slate-100 uppercase tracking-wider">
                                        Register Target Asset
                                    </h3>
                                    <p className="font-mono text-xs text-slate-400 mt-1">
                                        Add a domain URL or IP host for continuous surveillance.
                                    </p>
                                </div>

                                <form onSubmit={submitCreateTarget} className="space-y-4">
                                    <div>
                                        <InputLabel htmlFor="domain_url" value="Target URL / Host" className="font-mono text-xs text-slate-300 uppercase" />
                                        <TextInput
                                            id="domain_url"
                                            type="url"
                                            placeholder="https://example.com"
                                            required
                                            autoFocus
                                            className="w-full mt-1"
                                            value={data.domain_url}
                                            onChange={(e) => setData('domain_url', e.target.value)}
                                        />
                                        <InputError message={errors.domain_url} className="mt-1" />
                                    </div>

                                    <div>
                                        <InputLabel htmlFor="display_name" value="Display Label (Optional)" className="font-mono text-xs text-slate-300 uppercase" />
                                        <TextInput
                                            id="display_name"
                                            type="text"
                                            placeholder="Production Cluster API"
                                            className="w-full mt-1"
                                            value={data.display_name}
                                            onChange={(e) => setData('display_name', e.target.value)}
                                        />
                                    </div>

                                    <div className="rounded-lg border border-slate-800 bg-[#070b14] p-3.5">
                                        <label className="flex items-start gap-2.5 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={data.is_authorized}
                                                onChange={(e) => setData('is_authorized', e.target.checked)}
                                                className="mt-0.5 h-4 w-4 rounded border-slate-700 bg-slate-900 text-red-500 focus:ring-red-500"
                                            />
                                            <span className="font-mono text-xs text-slate-300 leading-relaxed">
                                                I confirm I am authorized to perform security scanning against this target asset.
                                            </span>
                                        </label>
                                        <InputError message={errors.is_authorized} className="mt-1" />
                                    </div>

                                    <div className="flex justify-end gap-3 pt-2 border-t border-slate-800">
                                        <SecondaryButton
                                            type="button"
                                            onClick={() => {
                                                setShowCreateModal(false);
                                                reset();
                                            }}
                                        >
                                            Cancel
                                        </SecondaryButton>
                                        <PrimaryButton type="submit" disabled={processing}>
                                            {processing ? 'Registering...' : 'Add Target Asset'}
                                        </PrimaryButton>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </AuthenticatedLayout>
    );
}