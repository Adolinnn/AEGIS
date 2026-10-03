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
    GlobeAltIcon,
    ArrowRightIcon
} from '@heroicons/react/24/outline';

function StatCard({ label, value, subtext, highlight, accent = 'text-white', Icon }) {
    return (
        <div className="bg-white/[0.02] backdrop-blur-2xl border border-white/[0.08] relative overflow-hidden rounded-2xl p-6 shadow-[0_4px_30px_rgba(0,0,0,0.1)] group hover:-translate-y-1 hover:border-exec-indigo/40 hover:bg-white/[0.04] transition-all duration-300">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.15] to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            
            <div className="flex items-start justify-between relative z-10">
                <div>
                    <p className="font-sans text-xs uppercase tracking-widest text-slate-400 font-bold">{label}</p>
                    <div className="flex items-end gap-3 mt-3">
                        <p className={`font-sans text-4xl font-bold tracking-tight transition-all duration-300 group-hover:translate-x-1 ${accent}`}>{value}</p>
                        {highlight && (
                            <span className="font-sans text-[10px] font-bold px-2 py-1 rounded bg-white/[0.05] text-cyan-400 border border-white/[0.1] mb-1">
                                {highlight}
                            </span>
                        )}
                    </div>
                    {subtext && <p className="font-sans text-xs text-slate-500 mt-2">{subtext}</p>}
                </div>
                {Icon && (
                    <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.08] text-slate-400 group-hover:text-exec-indigo group-hover:border-exec-indigo/40 group-hover:bg-exec-indigo/10 transition-all duration-300">
                        <Icon className="h-6 w-6" />
                    </div>
                )}
            </div>
        </div>
    );
}

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
            up: 'text-exec-info border-exec-info/30 bg-exec-info/10 shadow-[0_0_10px_rgba(16,185,129,0.2)]',
            down: 'text-exec-critical border-exec-critical/30 bg-exec-critical/10 shadow-[0_0_10px_rgba(244,63,94,0.2)]',
            degraded: 'text-exec-high border-exec-high/30 bg-exec-high/10 shadow-[0_0_10px_rgba(245,158,11,0.2)]',
            unknown: 'text-slate-400 bg-white/[0.05] border-white/[0.1]',
        };
        return (
            <span className={`px-2.5 py-1 rounded-full border font-mono text-[10px] font-bold flex items-center gap-1.5 w-max ${colors[status] ?? colors.unknown}`}>
                <span className={`relative flex h-1.5 w-1.5`}>
                    {status === 'up' ? (
                        <>
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-exec-info opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-exec-info"></span>
                        </>
                    ) : status === 'down' ? (
                        <>
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-exec-critical opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-exec-critical"></span>
                        </>
                    ) : (
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-slate-500"></span>
                    )}
                </span>
                {status.toUpperCase()}
            </span>
        );
    };

    const getVulnBadges = (vulns) => {
        if (!vulns?.length) return (
            <span className="font-mono text-[10px] text-exec-info font-bold uppercase tracking-widest flex items-center gap-1">
                <span>✓</span> SECURE
            </span>
        );

        const critical = vulns.filter(v => v.severity === 'critical').length;
        const high = vulns.filter(v => v.severity === 'high').length;
        const medium = vulns.filter(v => v.severity === 'medium').length;

        return (
            <div className="flex items-center gap-1.5">
                {critical > 0 && (
                    <span className="px-2 py-0.5 rounded text-exec-critical bg-exec-critical/10 border border-exec-critical/30 font-bold font-mono text-[9px]">
                        {critical} CRIT
                    </span>
                )}
                {high > 0 && (
                    <span className="px-2 py-0.5 rounded text-exec-high bg-exec-high/10 border border-exec-high/30 font-bold font-mono text-[9px]">
                        {high} HIGH
                    </span>
                )}
                {medium > 0 && (
                    <span className="px-2 py-0.5 rounded text-exec-medium bg-exec-medium/10 border border-exec-medium/30 font-bold font-mono text-[9px]">
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
                        <div className="flex items-center gap-3">
                            <span className="font-sans text-[10px] px-2.5 py-1 rounded-full bg-exec-indigo/10 text-exec-indigo border border-exec-indigo/30 font-bold uppercase tracking-wider flex items-center gap-2 shadow-[0_0_10px_rgba(99,102,241,0.2)]">
                                <GlobeAltIcon className="h-3 w-3" />
                                Asset Surveillance
                            </span>
                            <span className="text-slate-500 text-sm font-sans">/</span>
                            <span className="font-sans text-xs text-slate-400 font-medium">Domain & Host Telemetry</span>
                        </div>
                        <h1 className="text-3xl font-sans font-bold text-white tracking-tight mt-3 drop-shadow-md">
                            Monitored Targets
                        </h1>
                    </div>
                    <div className="text-right">
                        <button
                            onClick={() => setShowCreateModal(true)}
                            disabled={!canAddTarget}
                            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-exec-indigo to-[#8b5cf6] text-white font-sans text-sm font-bold hover:shadow-[0_0_20px_rgba(99,102,241,0.5)] active:scale-[0.98] transition-all relative overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <div className="absolute inset-0 bg-white/20 hover:opacity-0 transition-opacity rounded-xl pointer-events-none"></div>
                            <PlusIcon className="h-5 w-5" />
                            Add Target Asset
                        </button>
                        {!canAddTarget && (
                            <p className="mt-2 font-mono text-[10px] text-exec-high">
                                Limit reached ({maxTargets}) on {subscriptionTier?.label ?? subscriptionTier} plan.
                            </p>
                        )}
                    </div>
                </div>
            }
        >
            <Head title="Targets" />

            <div className="py-10">
                <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8 space-y-8">
                    
                    {/* Stat Matrix Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 hud-fade-in">
                        <StatCard 
                            label="Total Assets" 
                            value={targets.total} 
                            Icon={ServerIcon} 
                        />
                        <StatCard 
                            label="Surveillance Active" 
                            value={targetItems.filter(t => t.is_active).length}
                            accent="text-exec-info" 
                            Icon={ClockIcon} 
                        />
                        <StatCard 
                            label="Exposures Detected" 
                            value={targetItems.filter(t => t.unresolved_findings?.length > 0).length}
                            accent="text-exec-critical" 
                            Icon={ShieldExclamationIcon} 
                        />
                        <StatCard 
                            label="Capacity" 
                            value={`${targets.total} / ${maxTargets > 999999 ? '∞' : maxTargets}`}
                            highlight={(subscriptionTier?.value ?? subscriptionTier ?? 'FREE').toUpperCase()}
                            Icon={ShieldCheckIcon} 
                        />
                    </div>

                    {/* Search & Filter Bar */}
                    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4 backdrop-blur-2xl hud-fade-in hud-stagger-1 shadow-lg relative overflow-hidden">
                        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.12] to-transparent"></div>
                        <div className="relative">
                            <MagnifyingGlassIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search targets by domain, host IP, or label..."
                                className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] pl-12 pr-4 py-3 font-sans text-sm text-slate-100 placeholder-slate-500 focus:border-exec-indigo/50 focus:outline-none focus:ring-1 focus:ring-exec-indigo/50 transition-all shadow-inner backdrop-blur-md"
                            />
                        </div>
                    </div>

                    {/* Targets Table */}
                    <div className="rounded-3xl border border-white/[0.08] bg-white/[0.02] backdrop-blur-2xl shadow-[0_8px_32px_rgba(0,0,0,0.2)] overflow-hidden hud-fade-in hud-stagger-2 relative">
                        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.12] to-transparent"></div>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-white/[0.08]">
                                <thead className="bg-white/[0.01]">
                                    <tr>
                                        <th className="px-6 py-4 text-left font-sans text-xs font-semibold uppercase tracking-wider text-slate-400">Target Asset</th>
                                        <th className="px-6 py-4 text-left font-sans text-xs font-semibold uppercase tracking-wider text-slate-400">Status</th>
                                        <th className="px-6 py-4 text-left font-sans text-xs font-semibold uppercase tracking-wider text-slate-400">Uptime</th>
                                        <th className="px-6 py-4 text-left font-sans text-xs font-semibold uppercase tracking-wider text-slate-400">Latency</th>
                                        <th className="px-6 py-4 text-left font-sans text-xs font-semibold uppercase tracking-wider text-slate-400">Security Findings</th>
                                        <th className="px-6 py-4 text-left font-sans text-xs font-semibold uppercase tracking-wider text-slate-400">Last Probed</th>
                                        <th className="px-6 py-4 text-right font-sans text-xs font-semibold uppercase tracking-wider text-slate-400">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/[0.04]">
                                    {filteredTargets.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className="px-6 py-16 text-center">
                                                <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-white/[0.03] border border-white/[0.05] mb-4">
                                                    <GlobeAltIcon className="h-8 w-8 text-slate-600" />
                                                </div>
                                                <p className="text-sm font-sans text-slate-400 font-medium">
                                                    {search ? 'No targets matched the search query.' : 'No targets configured.'}
                                                </p>
                                                {!search && (
                                                    <p className="text-xs font-sans text-slate-500 mt-1">Click "Add Target Asset" to register your first domain.</p>
                                                )}
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredTargets.map((target) => (
                                            <tr
                                                key={target.id}
                                                className="hover:bg-white/[0.03] hover:pl-2 transition-all duration-200 cursor-pointer group"
                                                onClick={() => router.visit(route('targets.show', target.id))}
                                            >
                                                <td className="px-6 py-5" onClick={(e) => e.stopPropagation()}>
                                                    <Link href={route('targets.show', target.id)} className="block">
                                                        <p className="font-sans text-sm font-bold text-slate-100 group-hover:text-exec-indigo transition-colors truncate max-w-xs drop-shadow-sm">
                                                            {target.domain_url}
                                                        </p>
                                                        {target.display_name && (
                                                            <p className="text-[11px] text-slate-500 truncate max-w-xs font-sans mt-1">{target.display_name}</p>
                                                        )}
                                                    </Link>
                                                </td>
                                                <td className="px-6 py-5 whitespace-nowrap">
                                                    {getStatusBadge(target)}
                                                </td>
                                                <td className="px-6 py-5 whitespace-nowrap">
                                                    <span className="font-mono text-xs text-slate-300 font-bold">
                                                        {target.uptime_percentage !== undefined
                                                            ? `${target.uptime_percentage.toFixed(2)}%`
                                                            : '—'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-5 whitespace-nowrap">
                                                    <span className="font-mono text-xs text-slate-400">
                                                        {target.latest_uptime_log?.response_time_ms != null
                                                            ? `${target.latest_uptime_log.response_time_ms}ms`
                                                            : target.average_response_time != null
                                                            ? `${target.average_response_time}ms`
                                                            : '—'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-5 whitespace-nowrap">
                                                    {getVulnBadges(target.unresolved_findings)}
                                                </td>
                                                <td className="px-6 py-5 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                                                    {target.latest_uptime_log?.checked_at
                                                        ? new Date(target.latest_uptime_log.checked_at).toLocaleTimeString()
                                                        : target.last_checked_at
                                                        ? new Date(target.last_checked_at).toLocaleTimeString()
                                                        : 'Never'}
                                                </td>
                                                <td className="px-6 py-5 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                                                    <Link
                                                        href={route('scan-runs.index', { target_id: target.id })}
                                                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-exec-critical/30 bg-exec-critical/10 text-xs font-sans font-bold text-exec-critical hover:bg-exec-critical hover:text-white hover:border-exec-critical transition-all hover:shadow-[0_0_15px_rgba(244,63,94,0.4)]"
                                                        title="Launch vulnerability scan"
                                                    >
                                                        <PlayIcon className="h-4 w-4" />
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
                <div className="fixed inset-0 z-50 overflow-y-auto hud-fade-in flex items-center justify-center p-4">
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={() => setShowCreateModal(false)} />
                    <div className="relative bg-white/[0.02] backdrop-blur-2xl border border-white/[0.1] rounded-3xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] w-full max-w-lg text-left overflow-hidden">
                        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.15] to-transparent"></div>
                        <div className="p-8 space-y-6">
                            <div className="border-b border-white/[0.08] pb-4">
                                <h3 className="text-xl font-sans font-bold text-white tracking-tight">
                                    Register Target Asset
                                </h3>
                                <p className="font-sans text-xs text-slate-400 mt-2">
                                    Add a domain URL or IP host for continuous surveillance.
                                </p>
                            </div>

                            <form onSubmit={submitCreateTarget} className="space-y-5">
                                <div>
                                    <InputLabel htmlFor="domain_url" value="Target URL / Host" className="font-sans text-xs text-slate-300 font-bold uppercase tracking-wider mb-2" />
                                    <TextInput
                                        id="domain_url"
                                        type="url"
                                        placeholder="https://example.com"
                                        required
                                        autoFocus
                                        className="w-full bg-white/[0.03] border-white/[0.1] text-white focus:border-exec-indigo focus:ring-exec-indigo"
                                        value={data.domain_url}
                                        onChange={(e) => setData('domain_url', e.target.value)}
                                    />
                                    <InputError message={errors.domain_url} className="mt-2" />
                                </div>

                                <div>
                                    <InputLabel htmlFor="display_name" value="Display Label (Optional)" className="font-sans text-xs text-slate-300 font-bold uppercase tracking-wider mb-2" />
                                    <TextInput
                                        id="display_name"
                                        type="text"
                                        placeholder="Production Cluster API"
                                        className="w-full bg-white/[0.03] border-white/[0.1] text-white focus:border-exec-indigo focus:ring-exec-indigo"
                                        value={data.display_name}
                                        onChange={(e) => setData('display_name', e.target.value)}
                                    />
                                </div>

                                <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
                                    <label className="flex items-start gap-3 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={data.is_authorized}
                                            onChange={(e) => setData('is_authorized', e.target.checked)}
                                            className="mt-0.5 h-4 w-4 rounded border-white/[0.2] bg-white/[0.05] text-exec-indigo focus:ring-exec-indigo focus:ring-offset-0"
                                        />
                                        <span className="font-sans text-xs text-slate-300 leading-relaxed font-medium">
                                            I confirm I am authorized to perform security scanning against this target asset.
                                        </span>
                                    </label>
                                    <InputError message={errors.is_authorized} className="mt-2" />
                                </div>

                                <div className="flex justify-end gap-3 pt-4 border-t border-white/[0.08]">
                                    <SecondaryButton
                                        type="button"
                                        onClick={() => {
                                            setShowCreateModal(false);
                                            reset();
                                        }}
                                        className="bg-white/[0.05] border-white/[0.1] text-white hover:bg-white/[0.1]"
                                    >
                                        Cancel
                                    </SecondaryButton>
                                    <PrimaryButton type="submit" disabled={processing} className="bg-exec-indigo border-exec-indigo hover:bg-exec-indigo/80">
                                        {processing ? 'Registering...' : 'Add Target Asset'}
                                    </PrimaryButton>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </AuthenticatedLayout>
    );
}