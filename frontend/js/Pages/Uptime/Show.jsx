import { Head } from '@inertiajs/react';
import { usePage, router } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import Dropdown from '@/Components/Dropdown';
import { useState } from 'react';
import { ArrowLeftIcon, ChartBarIcon, PlayIcon, PauseIcon, MagnifyingGlassIcon, ChevronDownIcon, ChevronUpIcon, ExclamationTriangleIcon, CheckCircleIcon, XCircleIcon, ClockIcon, GlobeAltIcon } from '@heroicons/react/24/outline';
import { format } from 'date-fns';

export default function UptimeShow({ target, stats, logs, hourlyStats, dailyStats, days }) {
    const { auth } = usePage().props;
    const [showDeleteModal, setShowDeleteModal] = useState(false);

    const handleCheckUptime = () => {
        router.post(route('uptime.check', target.id), {}, {
            onSuccess: () => router.reload(),
        });
    };

    const handleBulkCheck = () => {
        router.post(route('uptime.bulk-check'), { target_ids: [target.id] }, {
            onSuccess: () => router.reload(),
        });
    };

    const getStatusBadge = (status) => {
        const colors = {
            up: 'text-exec-info bg-exec-info/10 border-exec-info/30 shadow-[0_0_10px_rgba(16,185,129,0.15)]',
            down: 'text-exec-critical bg-exec-critical/10 border-exec-critical/30 shadow-[0_0_10px_rgba(244,63,94,0.15)]',
            degraded: 'text-exec-high bg-exec-high/10 border-exec-high/30 shadow-[0_0_10px_rgba(245,158,11,0.15)]',
            unknown: 'text-slate-400 bg-white/[0.05] border-white/[0.1]',
        };
        const labels = { up: 'UP', down: 'DOWN', degraded: 'DEGRADED', unknown: 'UNKNOWN' };
        const icons = {
            up: <CheckCircleIcon className="h-3 w-3 mr-1" />,
            down: <XCircleIcon className="h-3 w-3 mr-1" />,
            degraded: <ExclamationTriangleIcon className="h-3 w-3 mr-1" />,
            unknown: <ClockIcon className="h-3 w-3 mr-1" />,
        };
        return (
            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-widest border ${colors[status] || colors.unknown}`}>
                {icons[status]}
                {labels[status] || 'UNKNOWN'}
            </span>
        );
    };

    const statusColor = stats.current_status
        ? (stats.current_status === 'up' ? 'text-exec-info' :
           stats.current_status === 'down' ? 'text-exec-critical' :
           stats.current_status === 'degraded' ? 'text-exec-high' : 'text-slate-400')
        : 'text-slate-400';
        
    const bgStatusColor = stats.current_status
        ? (stats.current_status === 'up' ? 'bg-exec-info/10 border-exec-info/30' :
           stats.current_status === 'down' ? 'bg-exec-critical/10 border-exec-critical/30' :
           stats.current_status === 'degraded' ? 'bg-exec-high/10 border-exec-high/30' : 'bg-white/[0.05] border-white/[0.1]')
        : 'bg-white/[0.05] border-white/[0.1]';

    return (
        <AuthenticatedLayout
            header={
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => router.visit(route('uptime.index'))}
                            className="p-2.5 rounded-xl border border-white/[0.08] bg-white/[0.02] text-slate-400 hover:text-white hover:border-white/[0.15] hover:bg-white/[0.04] transition-all hover:-translate-x-0.5 active:translate-x-0 backdrop-blur-md shadow-sm"
                        >
                            <ArrowLeftIcon className="h-5 w-5" />
                        </button>
                        <div>
                            <div className="flex items-center gap-3">
                                <span className="font-sans text-[10px] px-2.5 py-1 rounded-full bg-exec-indigo/10 text-exec-indigo border border-exec-indigo/30 font-bold uppercase tracking-wider flex items-center gap-2 shadow-[0_0_10px_rgba(99,102,241,0.2)]">
                                    <GlobeAltIcon className="h-3 w-3" />
                                    Target Asset
                                </span>
                                <span className="text-slate-500 text-sm font-sans">/</span>
                                <span className="font-sans text-xs text-slate-400 font-medium">Monitoring</span>
                            </div>
                            <h2 className="text-3xl font-sans font-bold text-white tracking-tight mt-3 drop-shadow-md">
                                {target.display_name || target.domain_url}
                            </h2>
                            <p className="text-sm text-slate-400 font-sans mt-1.5 font-medium">{target.domain_url}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <Dropdown>
                            <Dropdown.Trigger as="button" className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-bold text-slate-300 bg-white/[0.05] border border-white/[0.1] rounded-xl hover:bg-white/[0.1] transition-colors">
                                <MagnifyingGlassIcon className="h-4 w-4" /> Actions
                            </Dropdown.Trigger>
                            <Dropdown.Content className="w-56 bg-[#0a0f1a] border border-white/[0.1] shadow-2xl rounded-xl py-2">
                                <Dropdown.Link
                                    onClick={handleCheckUptime}
                                    className="block px-4 py-2.5 text-sm font-sans font-bold text-slate-300 hover:bg-white/[0.05] hover:text-white"
                                >
                                    <PlayIcon className="h-4 w-4 inline mr-2" /> Check Uptime Now
                                </Dropdown.Link>
                                <Dropdown.Link
                                    href={route('targets.show', target.id)}
                                    className="block px-4 py-2.5 text-sm font-sans font-bold text-slate-300 hover:bg-white/[0.05] hover:text-white"
                                >
                                    <GlobeAltIcon className="h-4 w-4 inline mr-2" /> View Target Dashboard
                                </Dropdown.Link>
                                <Dropdown.Link
                                    href={route('targets.edit', target.id)}
                                    className="block px-4 py-2.5 text-sm font-sans font-bold text-slate-300 hover:bg-white/[0.05] hover:text-white"
                                >
                                    Edit Target
                                </Dropdown.Link>
                            </Dropdown.Content>
                        </Dropdown>
                        <button 
                            onClick={handleCheckUptime}
                            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-exec-indigo to-[#8b5cf6] text-white font-sans text-sm font-bold hover:shadow-[0_0_20px_rgba(99,102,241,0.5)] active:scale-[0.98] transition-all relative overflow-hidden"
                        >
                            <div className="absolute inset-0 bg-white/20 hover:opacity-0 transition-opacity rounded-xl pointer-events-none"></div>
                            <PlayIcon className="h-4 w-4" /> Check Now
                        </button>
                    </div>
                </div>
            }
        >
            <Head title={`Uptime: ${target.display_name || target.domain_url}`} />

            <div className="py-10">
                <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8 space-y-8">
                    {/* Stats Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 hud-fade-in">
                        <div className="rounded-3xl border border-white/[0.08] bg-white/[0.02] backdrop-blur-2xl p-6 shadow-[0_8px_32px_rgba(0,0,0,0.2)] relative overflow-hidden group">
                            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.15] to-transparent"></div>
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="font-sans text-xs font-bold uppercase tracking-widest text-slate-400">UPTIME ({days}d)</p>
                                    <p className="text-3xl font-sans font-bold text-white mt-2 drop-shadow-md">{stats.uptime_percentage}%</p>
                                </div>
                                <div className={`p-4 rounded-2xl border ${bgStatusColor} shadow-lg`}>
                                    <span className={`font-mono text-xl font-bold uppercase tracking-widest ${statusColor}`}>
                                        {stats.current_status?.toUpperCase() || 'UNKNOWN'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="rounded-3xl border border-white/[0.08] bg-white/[0.02] backdrop-blur-2xl p-6 shadow-[0_8px_32px_rgba(0,0,0,0.2)] relative overflow-hidden group hover:border-white/[0.15] transition-colors">
                            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.15] to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="font-sans text-xs font-bold uppercase tracking-widest text-slate-400">AVG RESPONSE</p>
                                    <p className="text-3xl font-sans font-bold text-white mt-2 drop-shadow-md">
                                        {stats.average_response_time_ms ? `${stats.average_response_time_ms}ms` : 'N/A'}
                                    </p>
                                </div>
                                <div className="p-4 rounded-2xl bg-white/[0.05] border border-white/[0.05]">
                                    <ClockIcon className="h-7 w-7 text-slate-400" />
                                </div>
                            </div>
                        </div>

                        <div className="rounded-3xl border border-white/[0.08] bg-white/[0.02] backdrop-blur-2xl p-6 shadow-[0_8px_32px_rgba(0,0,0,0.2)] relative overflow-hidden group hover:border-white/[0.15] transition-colors">
                            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.15] to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="font-sans text-xs font-bold uppercase tracking-widest text-slate-400">TOTAL CHECKS</p>
                                    <p className="text-3xl font-sans font-bold text-white mt-2 drop-shadow-md">{stats.total_checks}</p>
                                </div>
                                <div className="p-4 rounded-2xl bg-white/[0.05] border border-white/[0.05]">
                                    <ChartBarIcon className="h-7 w-7 text-slate-400" />
                                </div>
                            </div>
                        </div>

                        <div className="rounded-3xl border border-white/[0.08] bg-white/[0.02] backdrop-blur-2xl p-6 shadow-[0_8px_32px_rgba(0,0,0,0.2)] relative overflow-hidden group hover:border-white/[0.15] transition-colors">
                            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.15] to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="font-sans text-xs font-bold uppercase tracking-widest text-slate-400">INTERVAL</p>
                                    <p className="text-3xl font-sans font-bold text-white mt-2 drop-shadow-md">{target.uptime_check_interval_minutes}m</p>
                                </div>
                                <div className="p-4 rounded-2xl bg-white/[0.05] border border-white/[0.05]">
                                    <ClockIcon className="h-7 w-7 text-slate-400" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Status Breakdown */}
                    <div className="rounded-3xl border border-white/[0.08] bg-white/[0.02] backdrop-blur-2xl p-8 shadow-[0_8px_32px_rgba(0,0,0,0.2)] relative overflow-hidden hud-fade-in hud-stagger-1">
                        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.12] to-transparent"></div>
                        <h3 className="text-sm font-sans font-bold uppercase tracking-widest text-slate-200 mb-6 flex items-center gap-2">
                            <ChartBarIcon className="h-5 w-5 text-exec-indigo" />
                            STATUS BREAKDOWN ({days}d)
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                            <div className="bg-exec-info/10 border border-exec-info/30 rounded-2xl p-6 text-center shadow-[0_4px_20px_rgba(16,185,129,0.1)]">
                                <p className="text-4xl font-bold font-sans text-exec-info">{stats.up_count}</p>
                                <p className="text-sm font-bold text-exec-info/80 mt-2 uppercase tracking-widest">UP</p>
                            </div>
                            <div className="bg-exec-high/10 border border-exec-high/30 rounded-2xl p-6 text-center shadow-[0_4px_20px_rgba(245,158,11,0.1)]">
                                <p className="text-4xl font-bold font-sans text-exec-high">{stats.degraded_count}</p>
                                <p className="text-sm font-bold text-exec-high/80 mt-2 uppercase tracking-widest">DEGRADED</p>
                            </div>
                            <div className="bg-exec-critical/10 border border-exec-critical/30 rounded-2xl p-6 text-center shadow-[0_4px_20px_rgba(244,63,94,0.1)]">
                                <p className="text-4xl font-bold font-sans text-exec-critical">{stats.down_count}</p>
                                <p className="text-sm font-bold text-exec-critical/80 mt-2 uppercase tracking-widest">DOWN</p>
                            </div>
                        </div>
                    </div>

                    {/* Charts Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 hud-fade-in hud-stagger-2">
                        {/* Hourly Stats Chart */}
                        <div className="rounded-3xl border border-white/[0.08] bg-white/[0.02] backdrop-blur-2xl p-8 shadow-[0_8px_32px_rgba(0,0,0,0.2)] relative overflow-hidden flex flex-col h-full">
                            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.12] to-transparent"></div>
                            <h3 className="text-sm font-sans font-bold uppercase tracking-widest text-slate-200 mb-6 flex items-center gap-2">
                                <ClockIcon className="h-5 w-5 text-exec-indigo" />
                                HOURLY UPTIME ({days}d)
                            </h3>
                            <div className="overflow-x-auto flex-1">
                                <table className="min-w-full text-sm">
                                    <thead>
                                        <tr className="text-left text-slate-400 font-sans text-xs font-semibold uppercase tracking-wider border-b border-white/[0.08]">
                                            <th className="pb-3 pr-4">HOUR</th>
                                            <th className="pb-3 pr-4 w-32">UPTIME</th>
                                            <th className="pb-3 pr-4">UP</th>
                                            <th className="pb-3 pr-4">DEGRADED</th>
                                            <th className="pb-3 pr-4">DOWN</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/[0.04]">
                                        {hourlyStats.slice(-24).reverse().map((hourStat) => (
                                            <tr key={hourStat.hour} className="hover:bg-white/[0.02] transition-colors">
                                                <td className="py-3 pr-4 font-mono text-xs text-slate-400">
                                                    {format(new Date(hourStat.hour), 'MMM d, HH:00')}
                                                </td>
                                                <td className="py-3 pr-4">
                                                    <div className="w-full bg-white/[0.05] rounded-full h-1.5 overflow-hidden">
                                                        <div
                                                            className={`h-full rounded-full transition-all ${
                                                                hourStat.uptime_pct === 100 ? 'bg-exec-info shadow-[0_0_8px_rgba(16,185,129,0.5)]' :
                                                                hourStat.uptime_pct >= 50 ? 'bg-exec-high shadow-[0_0_8px_rgba(245,158,11,0.5)]' : 'bg-exec-critical shadow-[0_0_8px_rgba(244,63,94,0.5)]'
                                                            }`}
                                                            style={{ width: `${hourStat.uptime_pct}%` }}
                                                        />
                                                    </div>
                                                </td>
                                                <td className="py-3 pr-4 font-mono text-xs font-bold text-exec-info">{hourStat.up}</td>
                                                <td className="py-3 pr-4 font-mono text-xs font-bold text-exec-high">{hourStat.degraded}</td>
                                                <td className="py-3 pr-4 font-mono text-xs font-bold text-exec-critical">{hourStat.down}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Daily Stats Chart */}
                        <div className="rounded-3xl border border-white/[0.08] bg-white/[0.02] backdrop-blur-2xl p-8 shadow-[0_8px_32px_rgba(0,0,0,0.2)] relative overflow-hidden flex flex-col h-full">
                            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.12] to-transparent"></div>
                            <h3 className="text-sm font-sans font-bold uppercase tracking-widest text-slate-200 mb-6 flex items-center gap-2">
                                <ChartBarIcon className="h-5 w-5 text-exec-indigo" />
                                DAILY UPTIME ({days}d)
                            </h3>
                            <div className="overflow-x-auto flex-1">
                                <table className="min-w-full text-sm">
                                    <thead>
                                        <tr className="text-left text-slate-400 font-sans text-xs font-semibold uppercase tracking-wider border-b border-white/[0.08]">
                                            <th className="pb-3 pr-4">DATE</th>
                                            <th className="pb-3 pr-4 w-32">UPTIME</th>
                                            <th className="pb-3 pr-4">UP</th>
                                            <th className="pb-3 pr-4">DEGRADED</th>
                                            <th className="pb-3 pr-4">DOWN</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/[0.04]">
                                        {dailyStats.reverse().map((dayStat) => (
                                            <tr key={dayStat.date} className="hover:bg-white/[0.02] transition-colors">
                                                <td className="py-3 pr-4 font-mono text-xs text-slate-400">
                                                    {format(new Date(dayStat.date), 'MMM d, yyyy')}
                                                </td>
                                                <td className="py-3 pr-4">
                                                    <div className="w-full bg-white/[0.05] rounded-full h-1.5 overflow-hidden">
                                                        <div
                                                            className={`h-full rounded-full transition-all ${
                                                                dayStat.uptime_pct === 100 ? 'bg-exec-info shadow-[0_0_8px_rgba(16,185,129,0.5)]' :
                                                                dayStat.uptime_pct >= 99 ? 'bg-emerald-400' :
                                                                dayStat.uptime_pct >= 95 ? 'bg-exec-high shadow-[0_0_8px_rgba(245,158,11,0.5)]' : 'bg-exec-critical shadow-[0_0_8px_rgba(244,63,94,0.5)]'
                                                            }`}
                                                            style={{ width: `${dayStat.uptime_pct}%` }}
                                                        />
                                                    </div>
                                                </td>
                                                <td className="py-3 pr-4 font-mono text-xs font-bold text-exec-info">{dayStat.up}</td>
                                                <td className="py-3 pr-4 font-mono text-xs font-bold text-exec-high">{dayStat.degraded}</td>
                                                <td className="py-3 pr-4 font-mono text-xs font-bold text-exec-critical">{dayStat.down}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    {/* Recent Logs */}
                    <div className="rounded-3xl border border-white/[0.08] bg-white/[0.02] backdrop-blur-2xl shadow-[0_8px_32px_rgba(0,0,0,0.2)] overflow-hidden hud-fade-in hud-stagger-3 relative">
                        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.12] to-transparent"></div>
                        <div className="px-6 py-5 border-b border-white/[0.08] bg-white/[0.01] flex items-center justify-between">
                            <h3 className="text-sm font-sans font-bold uppercase tracking-widest text-slate-200 flex items-center gap-2">
                                <ClockIcon className="h-5 w-5 text-slate-400" />
                                RECENT UPTIME CHECKS
                            </h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="min-w-full text-sm">
                                <thead>
                                    <tr className="text-left text-slate-400 font-sans text-xs font-semibold uppercase tracking-wider bg-white/[0.01] border-b border-white/[0.08]">
                                        <th className="px-6 py-4">TIME</th>
                                        <th className="px-6 py-4">STATUS</th>
                                        <th className="px-6 py-4">CODE</th>
                                        <th className="px-6 py-4">RESPONSE TIME</th>
                                        <th className="px-6 py-4">ERROR</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/[0.04]">
                                    {logs.length > 0 ? (
                                        logs.map((log) => (
                                            <tr key={log.id} className="hover:bg-white/[0.03] transition-colors">
                                                <td className="px-6 py-4 font-mono text-xs text-slate-400">
                                                    {format(new Date(log.checked_at), 'MMM d, HH:mm:ss')}
                                                </td>
                                                <td className="px-6 py-4">
                                                    {getStatusBadge(log.status)}
                                                </td>
                                                <td className="px-6 py-4 font-mono text-sm font-bold text-slate-300">
                                                    {log.status_code || '—'}
                                                </td>
                                                <td className="px-6 py-4 font-mono text-sm font-bold text-slate-300">
                                                    {log.response_time_ms ? (
                                                        <span className="flex items-center gap-1.5">
                                                            {log.response_time_ms}ms
                                                        </span>
                                                    ) : '—'}
                                                </td>
                                                <td className="px-6 py-4 text-xs font-sans font-medium text-exec-critical max-w-xs truncate">
                                                    {log.error_message || '—'}
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-12 text-center text-slate-400 font-sans font-medium">
                                                No uptime checks recorded yet. Click "Check Now" to start monitoring.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {logs.length > 0 && (
                            <div className="px-6 py-4 border-t border-white/[0.08] bg-white/[0.01]">
                                <p className="text-xs text-slate-500 font-sans font-medium text-center">
                                    Showing {logs.length} most recent checks. Check interval: {target.uptime_check_interval_minutes} minutes.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}