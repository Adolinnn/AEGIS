import { Head } from '@inertiajs/react';
import { usePage, router } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import Dropdown from '@/Components/Dropdown';
import { useState } from 'react';
import { PlayIcon, PauseIcon, ArrowPathIcon, MagnifyingGlassIcon, ChartBarIcon } from '@heroicons/react/24/outline';
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
            up: 'text-green-400 bg-green-900/30 border-green-800',
            down: 'text-red-400 bg-red-900/30 border-red-800',
            degraded: 'text-yellow-400 bg-yellow-900/30 border-yellow-800',
            unknown: 'text-gray-400 bg-gray-900/30 border-gray-800',
        };
        const labels = { up: 'UP', down: 'DOWN', degraded: 'DEGRADED', unknown: 'UNKNOWN' };
        const latest = status?.latest_uptime_log?.status || 'unknown';
        return (
            <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium border ${colors[latest] || colors.unknown}`}>
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
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-semibold text-gray-100">Uptime Monitoring</h2>
                        <p className="text-sm text-gray-500">Monitor the availability and performance of your targets</p>
                    </div>
                    <div className="flex gap-2">
                        {selectedTargets.length > 0 && (
                            <SecondaryButton onClick={handleBulkCheck} disabled={selectedTargets.length === 0}>
                                <PlayIcon className="h-4 w-4 mr-2" />
                                Check {selectedTargets.length} Targets
                            </SecondaryButton>
                        )}
                    </div>
                </div>
            }
        >
            <Head title="Uptime Monitoring" />

            <div className="py-6">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    {/* Summary Stats */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-gray-400 text-sm font-mono">TOTAL TARGETS</p>
                                    <p className="text-2xl font-bold text-gray-100 font-mono">{targets.total}</p>
                                </div>
                                <MagnifyingGlassIcon className="h-8 w-8 text-gray-600" />
                            </div>
                        </div>
                        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-gray-400 text-sm font-mono">HEALTHY</p>
                                    <p className="text-2xl font-bold text-green-400 font-mono">
                                        {targets.data.filter(t => t.latest_uptime_log?.status === 'up').length}
                                    </p>
                                </div>
                                <ChartBarIcon className="h-8 w-8 text-gray-600" />
                            </div>
                        </div>
                        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-gray-400 text-sm font-mono">DEGRADED</p>
                                    <p className="text-2xl font-bold text-yellow-400 font-mono">
                                        {targets.data.filter(t => t.latest_uptime_log?.status === 'degraded').length}
                                    </p>
                                </div>
                                <PauseIcon className="h-8 w-8 text-gray-600" />
                            </div>
                        </div>
                        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-gray-400 text-sm font-mono">DOWN</p>
                                    <p className="text-2xl font-bold text-red-400 font-mono">
                                        {targets.data.filter(t => t.latest_uptime_log?.status === 'down').length}
                                    </p>
                                </div>
                                <PlayIcon className="h-8 w-8 text-gray-600" />
                            </div>
                        </div>
                    </div>

                    {/* Targets Table */}
                    <div className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="text-left text-gray-500 font-mono text-xs uppercase border-b border-gray-700 bg-gray-900/50">
                                        <th className="p-3 w-10"><input type="checkbox" checked={selectedTargets.length === targets.data.length && targets.data.length > 0} onChange={handleSelectAll} className="h-4 w-4 rounded border-gray-700 bg-gray-900 text-red-500 focus:ring-red-500" /></th>
                                        <th className="p-3">TARGET</th>
                                        <th className="p-3">STATUS</th>
                                        <th className="p-3">RESPONSE TIME</th>
                                        <th className="p-3">UPTIME (30d)</th>
                                        <th className="p-3">LAST CHECK</th>
                                        <th className="p-3">CHECK INTERVAL</th>
                                        <th className="p-3 w-32">ACTIONS</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-700">
                                    {targets.data.length > 0 ? (
                                        targets.data.map((target) => {
                                            const latestLog = target.latest_uptime_log;
                                            return (
                                                <tr key={target.id} className="hover:bg-gray-700/50">
                                                    <td className="p-3">
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedTargets.includes(target.id)}
                                                            onChange={() => handleToggleTarget(target.id)}
                                                            className="h-4 w-4 rounded border-gray-700 bg-gray-900 text-red-500 focus:ring-red-500"
                                                        />
                                                    </td>
                                                    <td className="p-3">
                                                        <div>
                                                            <p className="font-mono text-gray-100 truncate max-w-xs">{target.domain_url}</p>
                                                            {target.display_name && (
                                                                <p className="text-xs text-gray-500 truncate max-w-xs">{target.display_name}</p>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="p-3">{getStatusBadge(target)}</td>
                                                    <td className="p-3 font-mono text-gray-300">
                                                        {latestLog?.response_time_ms ? `${latestLog.response_time_ms}ms` : '—'}
                                                    </td>
                                                    <td className="p-3 font-mono text-gray-300">
                                                        {getUptimePercentage(target)}
                                                    </td>
                                                    <td className="p-3 font-mono text-gray-400">
                                                        {latestLog ? format(new Date(latestLog.checked_at), 'MMM d, HH:mm:ss') : 'Never'}
                                                    </td>
                                                    <td className="p-3 font-mono text-gray-400">
                                                        {target.uptime_check_interval_minutes}m
                                                    </td>
                                                    <td className="p-3">
                                                        <Dropdown>
                                                            <Dropdown.Trigger as={SecondaryButton} size="sm" className="w-full">
                                                                <MagnifyingGlassIcon className="h-3 w-3 mr-1" /> Actions
                                                            </Dropdown.Trigger>
                                                            <Dropdown.Content className="w-48">
                                                                <Dropdown.Link
                                                                    onClick={() => router.visit(route('uptime.show', target.id))}
                                                                    className="block px-3 py-2 text-sm text-gray-300 hover:bg-gray-800"
                                                                >
                                                                    <ChartBarIcon className="h-3 w-3 inline mr-1" /> View History
                                                                </Dropdown.Link>
                                                                <Dropdown.Link
                                                                    onClick={() => router.post(route('uptime.check', target.id))}
                                                                    className="block px-3 py-2 text-sm text-gray-300 hover:bg-gray-800"
                                                                >
                                                                    <PlayIcon className="h-3 w-3 inline mr-1" /> Check Now
                                                                </Dropdown.Link>
                                                            </Dropdown.Content>
                                                        </Dropdown>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    ) : (
                                        <tr>
                                            <td colSpan={8} className="p-8 text-center text-gray-500">
                                                No targets configured. Add a target to start monitoring uptime.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        {targets.last_page > 1 && (
                            <div className="px-4 py-3 border-t border-gray-700">
                                <div className="flex items-center justify-between">
                                    <p className="text-sm text-gray-500 font-mono">
                                        Showing {targets.from} to {targets.to} of {targets.total} results
                                    </p>
                                    <div className="flex gap-2">
                                        {targets.prev_page_url && (
                                            <SecondaryButton
                                                size="sm"
                                                onClick={() => router.get(targets.prev_page_url, { preserveScroll: true })}
                                            >
                                                Previous
                                            </SecondaryButton>
                                        )}
                                        {targets.next_page_url && (
                                            <SecondaryButton
                                                size="sm"
                                                onClick={() => router.get(targets.next_page_url, { preserveScroll: true })}
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