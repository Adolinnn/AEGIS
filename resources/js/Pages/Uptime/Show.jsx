import { Head } from '@inertiajs/react';
import { usePage, router } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import Dropdown from '@/Components/Dropdown';
import { useState } from 'react';
import { ArrowLeftIcon, ChartBarIcon, PlayIcon, PauseIcon, MagnifyingGlassIcon, ChevronDownIcon, ChevronUpIcon, ExclamationTriangleIcon, CheckCircleIcon, XCircleIcon, ClockIcon } from '@heroicons/react/24/outline';
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
            up: 'text-green-400 bg-green-900/30 border-green-800',
            down: 'text-red-400 bg-red-900/30 border-red-800',
            degraded: 'text-yellow-400 bg-yellow-900/30 border-yellow-800',
            unknown: 'text-gray-400 bg-gray-900/30 border-gray-800',
        };
        const labels = { up: 'UP', down: 'DOWN', degraded: 'DEGRADED', unknown: 'UNKNOWN' };
        const icons = {
            up: <CheckCircleIcon className="h-3 w-3 mr-1" />,
            down: <XCircleIcon className="h-3 w-3 mr-1" />,
            degraded: <ExclamationTriangleIcon className="h-3 w-3 mr-1" />,
            unknown: <ClockIcon className="h-3 w-3 mr-1" />,
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
                        <h2 className="text-xl font-semibold text-gray-100">{target.display_name || target.domain_url}</h2>
                        <p className="text-sm text-gray-500 font-mono">{target.domain_url}</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <Dropdown>
                            <Dropdown.Trigger as="button" className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-300 bg-gray-800 border border-gray-700 rounded-lg hover:bg-gray-700">
                                <MagnifyingGlassIcon className="h-4 w-4" /> Actions
                            </Dropdown.Trigger>
                            <Dropdown.Content className="w-56">
                                <Dropdown.Link
                                    onClick={handleCheckUptime}
                                    className="block px-3 py-2 text-sm text-gray-300 hover:bg-gray-800"
                                >
                                    <PlayIcon className="h-4 w-4 inline mr-2" /> Check Uptime Now
                                </Dropdown.Link>
                                <Dropdown.Link
                                    href={route('targets.show', target.id)}
                                    className="block px-3 py-2 text-sm text-gray-300 hover:bg-gray-800"
                                >
                                    <ArrowLeftIcon className="h-4 w-4 inline mr-2" /> Back to Target
                                </Dropdown.Link>
                                <Dropdown.Link
                                    href={route('targets.edit', target.id)}
                                    className="block px-3 py-2 text-sm text-gray-300 hover:bg-gray-800"
                                >
                                    Edit Target
                                </Dropdown.Link>
                            </Dropdown.Content>
                        </Dropdown>
                        <SecondaryButton onClick={handleCheckUptime}>
                            <PlayIcon className="h-4 w-4 mr-2" /> Check Now
                        </SecondaryButton>
                        <SecondaryButton onClick={() => router.visit(route('uptime.index'))}>
                            <ArrowLeftIcon className="h-4 w-4 mr-2" /> All Targets
                        </SecondaryButton>
                    </div>
                </div>
            }
        >
            <Head title={`Uptime: ${target.display_name || target.domain_url}`} />

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
                                <ClockIcon className="h-8 w-8 text-gray-600" />
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
                                    <ClockIcon className="h-5 w-5 text-gray-400" />
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

                    {/* Hourly Stats Chart */}
                    <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
                        <h3 className="text-sm font-medium text-gray-400 mb-4">HOURLY UPTIME ({days}d)</h3>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="text-left text-gray-500 font-mono text-xs uppercase border-b border-gray-700">
                                        <th className="pb-2 pr-4">HOUR</th>
                                        <th className="pb-2 pr-4">UPTIME</th>
                                        <th className="pb-2 pr-4">UP</th>
                                        <th className="pb-2 pr-4">DEGRADED</th>
                                        <th className="pb-2 pr-4">DOWN</th>
                                        <th className="pb-2 pr-4">AVG RESPONSE</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-700">
                                    {hourlyStats.slice(-24).reverse().map((hourStat) => (
                                        <tr key={hourStat.hour} className="hover:bg-gray-700/50">
                                            <td className="py-2 pr-4 font-mono text-gray-400">
                                                {format(new Date(hourStat.hour), 'MMM d, HH:00')}
                                            </td>
                                            <td className="py-2 pr-4">
                                                <div className="w-full bg-gray-900 rounded-full h-2">
                                                    <div
                                                        className={`h-2 rounded-full transition-all ${
                                                            hourStat.uptime_pct === 100 ? 'bg-green-500' :
                                                            hourStat.uptime_pct >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                                                        }`}
                                                        style={{ width: `${hourStat.uptime_pct}%` }}
                                                    />
                                                </div>
                                            </td>
                                            <td className="py-2 pr-4 font-mono text-green-400">{hourStat.up}</td>
                                            <td className="py-2 pr-4 font-mono text-yellow-400">{hourStat.degraded}</td>
                                            <td className="py-2 pr-4 font-mono text-red-400">{hourStat.down}</td>
                                            <td className="py-2 pr-4 font-mono text-gray-300">
                                                {hourStat.avg_response_ms ? `${hourStat.avg_response_ms}ms` : '—'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Daily Stats Chart */}
                    <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
                        <h3 className="text-sm font-medium text-gray-400 mb-4">DAILY UPTIME ({days}d)</h3>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="text-left text-gray-500 font-mono text-xs uppercase border-b border-gray-700">
                                        <th className="pb-2 pr-4">DATE</th>
                                        <th className="pb-2 pr-4">UPTIME</th>
                                        <th className="pb-2 pr-4">UP</th>
                                        <th className="pb-2 pr-4">DEGRADED</th>
                                        <th className="pb-2 pr-4">DOWN</th>
                                        <th className="pb-2 pr-4">AVG RESPONSE</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-700">
                                    {dailyStats.reverse().map((dayStat) => (
                                        <tr key={dayStat.date} className="hover:bg-gray-700/50">
                                            <td className="py-2 pr-4 font-mono text-gray-400">
                                                {format(new Date(dayStat.date), 'MMM d, yyyy')}
                                            </td>
                                            <td className="py-2 pr-4">
                                                <div className="w-full bg-gray-900 rounded-full h-2">
                                                    <div
                                                        className={`h-2 rounded-full transition-all ${
                                                            dayStat.uptime_pct === 100 ? 'bg-green-500' :
                                                            dayStat.uptime_pct >= 99 ? 'bg-green-400' :
                                                            dayStat.uptime_pct >= 95 ? 'bg-yellow-500' : 'bg-red-500'
                                                        }`}
                                                        style={{ width: `${dayStat.uptime_pct}%` }}
                                                    />
                                                </div>
                                            </td>
                                            <td className="py-2 pr-4 font-mono text-green-400">{dayStat.up}</td>
                                            <td className="py-2 pr-4 font-mono text-yellow-400">{dayStat.degraded}</td>
                                            <td className="py-2 pr-4 font-mono text-red-400">{dayStat.down}</td>
                                            <td className="py-2 pr-4 font-mono text-gray-300">
                                                {dayStat.avg_response_ms ? `${dayStat.avg_response_ms}ms` : '—'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Recent Logs */}
                    <div className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
                        <div className="p-4 border-b border-gray-700 flex items-center justify-between">
                            <h3 className="text-sm font-medium text-gray-400">RECENT UPTIME CHECKS</h3>
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
                                    {logs.length > 0 ? (
                                        logs.map((log) => (
                                            <tr key={log.id} className="hover:bg-gray-700/50">
                                                <td className="p-3 font-mono text-gray-400">
                                                    {format(new Date(log.checked_at), 'MMM d, HH:mm:ss')}
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
                                                No uptime checks recorded yet. Click "Check Now" to start monitoring.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {logs.length > 0 && (
                            <div className="p-4 border-t border-gray-700">
                                <p className="text-xs text-gray-500 font-mono text-center">
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