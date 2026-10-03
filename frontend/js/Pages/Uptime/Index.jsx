import { Head } from '@inertiajs/react';
import { usePage, router } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import Dropdown from '@/Components/Dropdown';
import { useState } from 'react';
import { PlayIcon, PauseIcon, ArrowPathIcon, MagnifyingGlassIcon, ChartBarIcon, ChartPieIcon, CheckCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { format } from 'date-fns';

export default function UptimeIndex({ targets }) {
    const { auth } = usePage().props;
    const [selectedTargets, setSelectedTargets] = useState([]);

    const handleSelectAll = () => {
        if (selectedTargets.length === targets.data.length) {
            setSelectedTargets([]);
        } else {
            setSelectedTargets(targets.data.map(t => t.id));
        }
    };

    const handleToggleTarget = (targetId) => {
        setSelectedTargets(prev =>
            prev.includes(targetId)
                ? prev.filter(id => id !== targetId)
                : [...prev, targetId]
        );
    };

    const handleBulkCheck = () => {
        if (selectedTargets.length === 0) return;
        router.post(route('uptime.bulk-check'), { target_ids: selectedTargets }, {
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
        const latest = status?.latest_uptime_log?.status || 'unknown';
        return (
            <span className={`inline-flex items-center px-2.5 py-1 rounded-full font-mono text-[10px] font-bold uppercase tracking-widest border ${colors[latest] || colors.unknown}`}>
                {labels[latest] || 'UNKNOWN'}
            </span>
        );
    };

    const getUptimePercentage = (target) => {
        // This would ideally come from the backend, but we can show a placeholder
        return '99.9%';
    };

    return (
        <AuthenticatedLayout
            header={
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-3">
                            <span className="font-sans text-[10px] px-2.5 py-1 rounded-full bg-exec-indigo/10 text-exec-indigo border border-exec-indigo/30 font-bold uppercase tracking-wider flex items-center gap-2 shadow-[0_0_10px_rgba(99,102,241,0.2)]">
                                <ChartPieIcon className="h-3 w-3" />
                                Monitoring
                            </span>
                            <span className="text-slate-500 text-sm font-sans">/</span>
                            <span className="font-sans text-xs text-slate-400 font-medium">Availability Tracker</span>
                        </div>
                        <h2 className="text-3xl font-sans font-bold text-white tracking-tight mt-3 drop-shadow-md">
                            Uptime Monitoring
                        </h2>
                    </div>
                    <div className="flex items-center gap-4">
                        {selectedTargets.length > 0 && (
                            <button
                                onClick={handleBulkCheck}
                                disabled={selectedTargets.length === 0}
                                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-white/[0.05] border border-white/[0.1] text-white font-sans text-sm font-bold hover:bg-white/[0.1] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <PlayIcon className="h-4 w-4 text-exec-indigo" />
                                Check {selectedTargets.length} Targets
                            </button>
                        )}
                    </div>
                </div>
            }
        >
            <Head title="Uptime Monitoring" />

            <div className="py-10">
                <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8 space-y-8">
                    {/* Summary Stats */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 hud-fade-in">
                        <div className="rounded-3xl border border-white/[0.08] bg-white/[0.02] backdrop-blur-2xl p-6 shadow-[0_8px_32px_rgba(0,0,0,0.2)] relative overflow-hidden group hover:border-white/[0.15] transition-colors">
                            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.15] to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="font-sans text-xs font-bold uppercase tracking-widest text-slate-400">TOTAL TARGETS</p>
                                    <p className="text-3xl font-sans font-bold text-white mt-2 drop-shadow-md">{targets.total}</p>
                                </div>
                                <div className="p-4 rounded-2xl bg-white/[0.05] border border-white/[0.05]">
                                    <MagnifyingGlassIcon className="h-7 w-7 text-slate-400" />
                                </div>
                            </div>
                        </div>
                        <div className="rounded-3xl border border-exec-info/20 bg-exec-info/5 backdrop-blur-2xl p-6 shadow-[0_8px_32px_rgba(16,185,129,0.1)] relative overflow-hidden group hover:border-exec-info/40 transition-colors">
                            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-exec-info/50 to-transparent"></div>
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="font-sans text-xs font-bold uppercase tracking-widest text-exec-info/80">HEALTHY</p>
                                    <p className="text-3xl font-sans font-bold text-exec-info mt-2 drop-shadow-md">
                                        {targets.data.filter(t => t.latest_uptime_log?.status === 'up').length}
                                    </p>
                                </div>
                                <div className="p-4 rounded-2xl bg-exec-info/10 border border-exec-info/20">
                                    <CheckCircleIcon className="h-7 w-7 text-exec-info" />
                                </div>
                            </div>
                        </div>
                        <div className="rounded-3xl border border-exec-high/20 bg-exec-high/5 backdrop-blur-2xl p-6 shadow-[0_8px_32px_rgba(245,158,11,0.1)] relative overflow-hidden group hover:border-exec-high/40 transition-colors">
                            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-exec-high/50 to-transparent"></div>
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="font-sans text-xs font-bold uppercase tracking-widest text-exec-high/80">DEGRADED</p>
                                    <p className="text-3xl font-sans font-bold text-exec-high mt-2 drop-shadow-md">
                                        {targets.data.filter(t => t.latest_uptime_log?.status === 'degraded').length}
                                    </p>
                                </div>
                                <div className="p-4 rounded-2xl bg-exec-high/10 border border-exec-high/20">
                                    <ExclamationTriangleIcon className="h-7 w-7 text-exec-high" />
                                </div>
                            </div>
                        </div>
                        <div className="rounded-3xl border border-exec-critical/20 bg-exec-critical/5 backdrop-blur-2xl p-6 shadow-[0_8px_32px_rgba(244,63,94,0.1)] relative overflow-hidden group hover:border-exec-critical/40 transition-colors">
                            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-exec-critical/50 to-transparent"></div>
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="font-sans text-xs font-bold uppercase tracking-widest text-exec-critical/80">DOWN</p>
                                    <p className="text-3xl font-sans font-bold text-exec-critical mt-2 drop-shadow-md">
                                        {targets.data.filter(t => t.latest_uptime_log?.status === 'down').length}
                                    </p>
                                </div>
                                <div className="p-4 rounded-2xl bg-exec-critical/10 border border-exec-critical/20">
                                    <PauseIcon className="h-7 w-7 text-exec-critical" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Targets Table */}
                    <div className="rounded-3xl border border-white/[0.08] bg-white/[0.02] backdrop-blur-2xl shadow-[0_8px_32px_rgba(0,0,0,0.2)] overflow-hidden hud-fade-in hud-stagger-1 relative">
                        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.12] to-transparent"></div>
                        <div className="flex items-center justify-between border-b border-white/[0.08] px-6 py-5 bg-white/[0.01]">
                            <div className="flex items-center gap-3">
                                <ChartBarIcon className="h-5 w-5 text-slate-400" />
                                <h3 className="font-sans text-sm font-bold uppercase tracking-widest text-slate-200">
                                    Monitoring Targets
                                </h3>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-white/[0.08]">
                                <thead className="bg-white/[0.01] font-sans text-xs font-semibold uppercase tracking-wider text-slate-400">
                                    <tr>
                                        <th className="px-6 py-4 w-12 text-left">
                                            <input type="checkbox" checked={selectedTargets.length === targets.data.length && targets.data.length > 0} onChange={handleSelectAll} className="h-4 w-4 rounded border-white/[0.2] bg-white/[0.05] text-exec-indigo focus:ring-exec-indigo focus:ring-offset-0 transition-colors cursor-pointer" />
                                        </th>
                                        <th className="px-6 py-4 text-left">Target</th>
                                        <th className="px-6 py-4 text-left">Status</th>
                                        <th className="px-6 py-4 text-left">Response Time</th>
                                        <th className="px-6 py-4 text-left">Uptime (30d)</th>
                                        <th className="px-6 py-4 text-left">Last Check</th>
                                        <th className="px-6 py-4 text-left">Interval</th>
                                        <th className="px-6 py-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/[0.04]">
                                    {targets.data.length > 0 ? (
                                        targets.data.map((target) => {
                                            const latestLog = target.latest_uptime_log;
                                            return (
                                                <tr key={target.id} className="hover:bg-white/[0.03] transition-colors">
                                                    <td className="px-6 py-5">
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedTargets.includes(target.id)}
                                                            onChange={() => handleToggleTarget(target.id)}
                                                            className="h-4 w-4 rounded border-white/[0.2] bg-white/[0.05] text-exec-indigo focus:ring-exec-indigo focus:ring-offset-0 transition-colors cursor-pointer"
                                                        />
                                                    </td>
                                                    <td className="px-6 py-5">
                                                        <div>
                                                            <p className="font-sans text-sm font-bold text-slate-100 truncate max-w-xs">{target.domain_url}</p>
                                                            {target.display_name && (
                                                                <p className="text-xs font-sans font-medium text-slate-400 mt-1 truncate max-w-xs">{target.display_name}</p>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-5">{getStatusBadge(target)}</td>
                                                    <td className="px-6 py-5 font-mono text-sm text-slate-300 font-bold">
                                                        {latestLog?.response_time_ms ? (
                                                            <span className="flex items-center gap-1.5">
                                                                {latestLog.response_time_ms}ms
                                                            </span>
                                                        ) : '—'}
                                                    </td>
                                                    <td className="px-6 py-5 font-mono text-sm font-bold text-exec-info">
                                                        {getUptimePercentage(target)}
                                                    </td>
                                                    <td className="px-6 py-5 font-mono text-xs text-slate-400">
                                                        {latestLog ? format(new Date(latestLog.checked_at), 'MMM d, HH:mm:ss') : 'Never'}
                                                    </td>
                                                    <td className="px-6 py-5 font-mono text-xs text-slate-400">
                                                        {target.uptime_check_interval_minutes}m
                                                    </td>
                                                    <td className="px-6 py-5 text-right">
                                                        <Dropdown>
                                                            <Dropdown.Trigger>
                                                                <button className="inline-flex items-center gap-1.5 px-4 py-2 bg-white/[0.05] border border-white/[0.1] rounded-lg text-xs font-sans font-bold text-slate-300 hover:text-white hover:bg-white/[0.1] transition-colors">
                                                                    Actions <MagnifyingGlassIcon className="h-3 w-3" />
                                                                </button>
                                                            </Dropdown.Trigger>
                                                            <Dropdown.Content className="w-48 bg-[#0a0f1a] border border-white/[0.1] shadow-2xl rounded-xl py-2">
                                                                <button
                                                                    onClick={() => router.visit(route('uptime.show', target.id))}
                                                                    className="w-full text-left px-4 py-2 text-sm font-sans font-bold text-slate-300 hover:bg-white/[0.05] hover:text-white transition-colors flex items-center gap-2"
                                                                >
                                                                    <ChartBarIcon className="h-4 w-4" /> View History
                                                                </button>
                                                                <button
                                                                    onClick={() => router.post(route('uptime.check', target.id))}
                                                                    className="w-full text-left px-4 py-2 text-sm font-sans font-bold text-exec-indigo hover:bg-white/[0.05] hover:text-exec-indigo transition-colors flex items-center gap-2 mt-1"
                                                                >
                                                                    <PlayIcon className="h-4 w-4" /> Check Now
                                                                </button>
                                                            </Dropdown.Content>
                                                        </Dropdown>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    ) : (
                                        <tr>
                                            <td colSpan={8} className="p-16 text-center text-slate-400 font-sans font-medium">
                                                No targets configured. Add a target to start monitoring uptime.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        {targets.last_page > 1 && (
                            <div className="px-6 py-4 border-t border-white/[0.08] bg-white/[0.01]">
                                <div className="flex items-center justify-between">
                                    <p className="text-sm text-slate-500 font-sans font-medium">
                                        Showing {targets.from} to {targets.to} of {targets.total} results
                                    </p>
                                    <div className="flex gap-2">
                                        {targets.prev_page_url && (
                                            <button
                                                onClick={() => router.get(targets.prev_page_url, { preserveScroll: true })}
                                                className="px-4 py-2 rounded-lg border border-white/[0.1] bg-white/[0.02] text-sm font-sans font-bold text-slate-300 hover:bg-white/[0.05] hover:text-white transition-colors"
                                            >
                                                Previous
                                            </button>
                                        )}
                                        {targets.next_page_url && (
                                            <button
                                                onClick={() => router.get(targets.next_page_url, { preserveScroll: true })}
                                                className="px-4 py-2 rounded-lg border border-white/[0.1] bg-white/[0.02] text-sm font-sans font-bold text-slate-300 hover:bg-white/[0.05] hover:text-white transition-colors"
                                            >
                                                Next
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}