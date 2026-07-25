import { Head } from '@inertiajs/react';
import { usePage, router } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import Dropdown from '@/Components/Dropdown';
import { useState } from 'react';
import { ArrowLeftIcon, ChartBarIcon, PlayIcon, MagnifyingGlassIcon, ChevronDownIcon } from '@heroicons/react/24/outline';
import { format } from 'date-fns';

export default function TargetUptimeHistory({ target, logs, stats, days }) {
    const { auth } = usePage().props;

    const handleCheckUptime = () => {
        router.post(route('targets.check-uptime', target.id), {}, {
            onSuccess: () => router.reload(),
        });
    };

    const getStatusBadge = (status) => {
        const colors = {
            up: 'text-green-400 bg-green-900/30 border-green-800',
            down: 'text-red-400 bg-red-900/30 border-red-800',
            degraded: 'text-yellow-400 bg-yellow-900/30 border-yellow-800',
            unknown: 'text-gray-400 bg-gray-900/30 border-gray-800',
        };
        const labels = { up: 'UP', down: 'DOWN', degraded: 'DEGRADED', unknown: 'UNKNOWN' };
        const icons = {
            up: <svg className="h-3 w-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>,
            down: <svg className="h-3 w-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>,
            degraded: <svg className="h-3 w-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>,
            unknown: <svg className="h-3 w-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
        };
        return (
            <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium border ${colors[status] || colors.unknown}`}>
                {icons[status]}
                {labels[status] || 'UNKNOWN'}
            </span>
        );
    };

    const statusColor = stats.current_status
        ? (stats.current_status === 'up' ? 'text-green-400' :
           stats.current_status === 'down' ? 'text-red-400' :
           stats.current_status === 'degraded' ? 'text-yellow-400' : 'text-gray-400')
        : 'text-gray-400';

    return (
        <AuthenticatedLayout
            header={
                <div className="flex items-center justify-between">
                    <div>
                        <SecondaryButton onClick={() => router.visit(route('targets.show', target.id))} className="mb-2">
                            <ArrowLeftIcon className="h-5 w-5 mr-2" /> Back to Target
                        </SecondaryButton>
                        <h2 className="text-xl font-semibold text-gray-100">Uptime History</h2>
                        <p className="text-sm text-gray-500">{target.display_name || target.domain_url} • Last {days} days</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <SecondaryButton onClick={handleCheckUptime}>
                            <PlayIcon className="h-4 w-4 mr-2" /> Check Now
                        </SecondaryButton>
                        <SecondaryButton onClick={() => router.visit(route('uptime.index'))}>
                            <ArrowLeftIcon className="h-5 w-5 mr-2" /> All Targets
                        </SecondaryButton>
                    </div>
                </div>
            }
        >
            <Head title={`Uptime History - ${target.display_name || target.domain_url}`} />

            <div className="py-6">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-6">
                    {/* Stats Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-gray-400 text-sm font-mono">UPTIME ({days}d)</p>
                                    <p className="text-3xl font-bold font-mono text-gray-100">{stats.uptime_percentage}%</p>
                                </div>
                                <div className={`p-3 rounded-lg ${statusColor === 'text-green-400' ? 'bg-green-900/30' : statusColor === 'text-red-400' ? 'bg-red-900/30' : statusColor === 'text-yellow-400' ? 'bg-yellow-900/30' : 'bg-gray-900/30'}`}>
                                    <span className={`font-mono text-2xl ${statusColor}`}>
                                        {stats.current_status?.toUpperCase() || 'UNKNOWN'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-gray-400 text-sm font-mono">AVG RESPONSE</p>
                                    <p className="text-3xl font-bold font-mono text-gray-100">
                                        {stats.average_response_time_ms ? `${stats.average_response_time_ms}ms` : 'N/A'}
                                    </p>
                                </div>
                                <svg className="h-8 w-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            </div>
                        </div>

                        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-gray-400 text-sm font-mono">TOTAL CHECKS</p>
                                    <p className="text-3xl font-bold font-mono text-gray-100">{stats.total_checks}</p>
                                </div>
                                <ChartBarIcon className="h-8 w-8 text-gray-600" />
                            </div>
                        </div>

                        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-gray-400 text-sm font-mono">CHECK INTERVAL</p>
                                    <p className="text-3xl font-bold font-mono text-gray-100">{target.uptime_check_interval_minutes}m</p>
                                </div>
                                <div className="h-8 w-8 bg-gray-700 rounded-lg flex items-center justify-center">
                                    <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Status Breakdown */}
                    <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                        <h3 className="text-sm font-medium text-gray-400 mb-4">STATUS BREAKDOWN ({days}d)</h3>
                        <div className="grid grid-cols-3 gap-4">
                            <div className="bg-green-900/20 border border-green-800 rounded-lg p-4 text-center">
                                <p className="text-2xl font-bold font-mono text-green-400">{stats.up_count}</p>
                                <p className="text-xs text-green-300">UP</p>
                            </div>
                            <div className="bg-yellow-900/20 border border-yellow-800 rounded-lg p-4 text-center">
                                <p className="text-2xl font-bold font-mono text-yellow-400">{stats.degraded_count}</p>
                                <p className="text-xs text-yellow-300">DEGRADED</p>
                            </div>
                            <div className="bg-red-900/20 border border-red-800 rounded-lg p-4 text-center">
                                <p className="text-2xl font-bold font-mono text-red-400">{stats.down_count}</p>
                                <p className="text-xs text-red-300">DOWN</p>
                            </div>
                        </div>
                    </div>

                    {/* Time Range Selector */}
                    <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                        <div className="flex items-center gap-4">
                            <label className="text-sm font-medium text-gray-400">Time Range:</label>
                            <select
                                value={days}
                                onChange={(e) => router.visit(route('targets.uptime-history', target.id), { days: parseInt(e.target.value) }, { preserveScroll: true })}
                                className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-gray-100 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                            >
                                <option value="7">Last 7 days</option>
                                <option value="30">Last 30 days</option>
                                <option value="90">Last 90 days</option>
                            </select>
                        </div>
                    </div>

                    {/* Logs Table */}
                    <div className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
                        <div className="p-4 border-b border-gray-700 flex items-center justify-between">
                            <h3 className="text-sm font-medium text-gray-400">UPTIME CHECK LOGS ({logs.total} total)</h3>
                            <SecondaryButton onClick={handleCheckUptime} size="sm">
                                <PlayIcon className="h-4 w-4 mr-1" /> Check Now
                            </SecondaryButton>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="text-left text-gray-500 font-mono text-xs uppercase border-b border-gray-700 bg-gray-900/50">
                                        <th className="p-3">TIME</th>
                                        <th className="p-3">STATUS</th>
                                        <th className="p-3">CODE</th>
                                        <th className="p-3">RESPONSE TIME</th>
                                        <th className="p-3">ERROR</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-700">
                                    {logs.data.length > 0 ? (
                                        logs.data.map((log) => (
                                            <tr key={log.id} className="hover:bg-gray-700/50">
                                                <td className="p-3 font-mono text-gray-400">
                                                    {format(new Date(log.checked_at), 'MMM d, yyyy HH:mm:ss')}
                                                </td>
                                                <td className="p-3">
                                                    {getStatusBadge(log.status)}
                                                </td>
                                                <td className="p-3 font-mono text-gray-300">
                                                    {log.status_code || '—'}
                                                </td>
                                                <td className="p-3 font-mono text-gray-300">
                                                    {log.response_time_ms ? `${log.response_time_ms}ms` : '—'}
                                                </td>
                                                <td className="p-3 text-gray-500 max-w-xs truncate">
                                                    {log.error_message || '—'}
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={5} className="p-8 text-center text-gray-500">
                                                No uptime checks recorded for this period.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        {logs.last_page > 1 && (
                            <div className="px-4 py-3 border-t border-gray-700">
                                <div className="flex items-center justify-between">
                                    <p className="text-sm text-gray-500 font-mono">
                                        Showing {logs.from} to {logs.to} of {logs.total} results
                                    </p>
                                    <div className="flex gap-2">
                                        {logs.prev_page_url && (
                                            <SecondaryButton
                                                size="sm"
                                                onClick={() => router.get(logs.prev_page_url, { preserveScroll: true })}
                                            >
                                                Previous
                                            </SecondaryButton>
                                        )}
                                        {logs.next_page_url && (
                                            <SecondaryButton
                                                size="sm"
                                                onClick={() => router.get(logs.next_page_url, { preserveScroll: true })}
                                            >
                                                Next
                                            </SecondaryButton>
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