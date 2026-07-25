import { Head } from '@inertiajs/react';
import { usePage, router, useForm } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import PrimaryButton from '@/Components/PrimaryButton';
import DangerButton from '@/Components/DangerButton';
import SecondaryButton from '@/Components/SecondaryButton';
import TextInput from '@/Components/TextInput';
import InputLabel from '@/Components/InputLabel';
import InputError from '@/Components/InputError';
import Checkbox from '@/Components/Checkbox';
import Dropdown from '@/Components/Dropdown';
import NavLink from '@/Components/NavLink';
import { useState } from 'react';
import { ChevronDownIcon, PlusIcon, MagnifyingGlassIcon, ShieldCheckIcon, ClockIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

export default function TargetsIndex({ targets, subscriptionTier, maxTargets, canAddTarget }) {
    const { auth } = usePage().props;
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [search, setSearch] = useState('');

    const { data, setData, post, processing, errors, reset } = useForm({
        domain_url: '',
        display_name: '',
        uptime_check_interval_minutes: 15,
        scan_types: ['xss', 'sqli', 'ssrf', 'misconfiguration'],
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

    const filteredTargets = targets.data.filter((target) =>
        target.domain_url.toLowerCase().includes(search.toLowerCase()) ||
        target.display_name?.toLowerCase().includes(search.toLowerCase())
    );

    const getStatusBadge = (target) => {
        const status = target.latest_uptime_log?.status || 'unknown';
        const colors = {
            up: 'bg-green-900/30 text-green-400 border-green-800',
            down: 'bg-red-900/30 text-red-400 border-red-800',
            degraded: 'bg-yellow-900/30 text-yellow-400 border-yellow-800',
            unknown: 'bg-gray-900/30 text-gray-400 border-gray-800',
        };
        const labels = { up: 'UP', down: 'DOWN', degraded: 'DEGRADED', unknown: 'UNKNOWN' };
        return (
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-mono font-medium border ${colors[status]}`}>
                {labels[status]}
            </span>
        );
    };

    const getVulnBadges = (vulns) => {
        if (!vulns?.length) return (
            <span className="text-green-400 font-mono text-sm">SECURE</span>
        );

        const critical = vulns.filter(v => v.severity === 'critical').length;
        const high = vulns.filter(v => v.severity === 'high').length;
        const medium = vulns.filter(v => v.severity === 'medium').length;

        return (
            <div className="flex items-center gap-1">
                {critical > 0 && <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-medium bg-red-900/30 text-red-400 border border-red-800">{critical} CRIT</span>}
                {high > 0 && <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-medium bg-red-900/20 text-red-400 border border-red-800">{high} HIGH</span>}
                {medium > 0 && <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-medium bg-yellow-900/20 text-yellow-400 border border-yellow-800">{medium} MED</span>}
                {vulns.filter(v => v.severity === 'low' || v.severity === 'info').length > 0 && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-medium bg-gray-900/20 text-gray-400 border border-gray-800">LOW</span>
                )}
            </div>
        );
    };

    return (
        <AuthenticatedLayout
            header={
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-semibold text-gray-100">Targets</h2>
                        <p className="text-sm text-gray-500">Monitor and scan your web assets</p>
                    </div>
                    <PrimaryButton onClick={() => setShowCreateModal(true)}>
                        <PlusIcon className="h-5 w-5 mr-2" />
                        Add Target
                    </PrimaryButton>
                </div>
            }
        >
            <Head title="Targets" />

            <div className="py-6">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    {/* Stats Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-gray-400 text-sm font-mono">TOTAL TARGETS</p>
                                    <p className="text-2xl font-bold text-gray-100 font-mono">{targets.total}</p>
                                </div>
                                <ShieldCheckIcon className="h-8 w-8 text-gray-600" />
                            </div>
                        </div>
                        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-gray-400 text-sm font-mono">ACTIVE</p>
                                    <p className="text-2xl font-bold text-green-400 font-mono">
                                        {targets.data.filter(t => t.is_active).length}
                                    </p>
                                </div>
                                <ClockIcon className="h-8 w-8 text-gray-600" />
                            </div>
                        </div>
                        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-gray-400 text-sm font-mono">VULNERABLE</p>
                                    <p className="text-2xl font-bold text-red-400 font-mono">
                                        {targets.data.filter(t => t.unresolved_vulnerabilities?.length > 0).length}
                                    </p>
                                </div>
                                <ExclamationTriangleIcon className="h-8 w-8 text-gray-600" />
                            </div>
                        </div>
                        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-gray-400 text-sm font-mono">TIER LIMIT</p>
                                    <p className="text-2xl font-bold text-blue-400 font-mono">
                                        {targets.total} / {maxTargets}
                                    </p>
                                </div>
                                <div className="h-8 w-8 bg-blue-900/30 rounded-lg flex items-center justify-center">
                                    <span className="text-xs font-bold text-blue-400">{subscriptionTier.toUpperCase()}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Search and Filter */}
                    <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 mb-6">
                        <div className="flex flex-col sm:flex-row gap-4">
                            <div className="relative flex-1">
                                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
                                <input
                                    type="text"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Search targets by domain or name..."
                                    className="w-full bg-gray-900 border border-gray-700 rounded-lg pl-10 pr-4 py-2 text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Targets Table */}
                    <div className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
                        <table className="w-full">
                            <thead className="bg-gray-900 border-b border-gray-700">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-mono font-medium text-gray-400 uppercase tracking-wider">TARGET</th>
                                    <th className="px-4 py-3 text-left text-xs font-mono font-medium text-gray-400 uppercase tracking-wider">STATUS</th>
                                    <th className="px-4 py-3 text-left text-xs font-mono font-medium text-gray-400 uppercase tracking-wider">UPTIME</th>
                                    <th className="px-4 py-3 text-left text-xs font-mono font-medium text-gray-400 uppercase tracking-wider">RESPONSE</th>
                                    <th className="px-4 py-3 text-left text-xs font-mono font-medium text-gray-400 uppercase tracking-wider">VULNERABILITIES</th>
                                    <th className="px-4 py-3 text-left text-xs font-mono font-medium text-gray-400 uppercase tracking-wider">LAST CHECK</th>
                                    <th className="px-4 py-3 text-right text-xs font-mono font-medium text-gray-400 uppercase tracking-wider pr-4">ACTIONS</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-700">
                                {filteredTargets.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="px-4 py-12 text-center text-gray-500">
                                            {search ? 'No targets match your search.' : 'No targets configured. Click "Add Target" to get started.'}
                                        </td>
                                    </tr>
                                ) : (
                                    filteredTargets.map((target) => (
                                        <tr key={target.id} className="hover:bg-gray-700/50 transition-colors">
                                            <td className="px-4 py-4">
                                                <div>
                                                    <p className="font-mono text-sm text-gray-100 truncate max-w-xs">
                                                        {target.domain_url}
                                                    </p>
                                                    {target.display_name && (
                                                        <p className="text-xs text-gray-500 truncate max-w-xs">{target.display_name}</p>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-4 py-4">
                                                {getStatusBadge(target)}
                                            </td>
                                            <td className="px-4 py-4">
                                                <span className="font-mono text-sm text-gray-300">
                                                    {target.uptime_percentage !== undefined
                                                        ? `${target.uptime_percentage.toFixed(2)}%`
                                                        : 'N/A'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-4">
                                                <span className="font-mono text-sm text-gray-300">
                                                    {target.average_response_time !== null
                                                        ? `${target.average_response_time}ms`
                                                        : 'N/A'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-4">
                                                {getVulnBadges(target.unresolved_vulnerabilities)}
                                            </td>
                                            <td className="px-4 py-4">
                                                <span className="font-mono text-xs text-gray-500">
                                                    {target.last_checked_at
                                                        ? new Date(target.last_checked_at).toLocaleString()
                                                        : 'Never'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-4 text-right">
                                                <Dropdown>
                                                    <Dropdown.Trigger as={SecondaryButton} className="w-full sm:w-auto">
                                                        <ChevronDownIcon className="h-4 w-4 mr-1" />
                                                        Actions
                                                    </Dropdown.Trigger>
                                                    <Dropdown.Content className="w-48">
                                                        <Dropdown.Link
                                                            href={route('targets.show', target.id)}
                                                            className="block px-3 py-2 text-sm text-gray-300 hover:bg-gray-800"
                                                        >
                                                            View Details
                                                        </Dropdown.Link>
                                                        <Dropdown.Link
                                                            href={route('targets.vulnerabilities', target.id)}
                                                            className="block px-3 py-2 text-sm text-gray-300 hover:bg-gray-800"
                                                        >
                                                            Vulnerabilities
                                                        </Dropdown.Link>
                                                        <Dropdown.Link
                                                            href={route('targets.uptime-history', target.id)}
                                                            className="block px-3 py-2 text-sm text-gray-300 hover:bg-gray-800"
                                                        >
                                                            Uptime History
                                                        </Dropdown.Link>
                                                        <div className="border-t border-gray-700 my-1" />
                                                        <Dropdown.Link
                                                            onClick={() => router.post(route('targets.check-uptime', target.id))}
                                                            className="block w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-gray-800"
                                                        >
                                                            Check Uptime
                                                        </Dropdown.Link>
                                                        <Dropdown.Link
                                                            onClick={() => router.post(route('targets.scan', target.id))}
                                                            className="block w-full text-left px-3 py-2 text-sm text-red-400 hover:bg-red-900/20"
                                                        >
                                                            Run Security Scan
                                                        </Dropdown.Link>
                                                        <div className="border-t border-gray-700 my-1" />
                                                        <Dropdown.Link
                                                            href={route('targets.edit', target.id)}
                                                            className="block w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-gray-800"
                                                        >
                                                            Edit
                                                        </Dropdown.Link>
                                                        <Dropdown.Link
                                                            method="post"
                                                            href={route('targets.destroy', target.id)}
                                                            as="button"
                                                            className="block w-full text-left px-3 py-2 text-sm text-red-400 hover:bg-red-900/20"
                                                        >
                                                            Delete
                                                        </Dropdown.Link>
                                                    </Dropdown.Content>
                                                </Dropdown>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>

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
                                                onClick={() => router.get(targets.prev_page_url, { preserveScroll: true })}
                                            >
                                                Previous
                                            </SecondaryButton>
                                        )}
                                        {targets.next_page_url && (
                                            <SecondaryButton
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

            {/* Create Target Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 z-50 overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4 text-center">
                        <div className="fixed inset-0 bg-gray-900/80 backdrop-blur-sm" onClick={() => setShowCreateModal(false)} />
                        <div className="relative bg-gray-800 border border-gray-700 rounded-lg shadow-xl w-full max-w-md">
                            <div className="p-6">
                                <h3 className="text-lg font-semibold text-gray-100 mb-4">Add New Target</h3>
                                <form onSubmit={submitCreateTarget}>
                                    <div className="space-y-4">
                                        <div>
                                            <InputLabel htmlFor="domain_url">Target URL</InputLabel>
                                            <TextInput
                                                id="domain_url"
                                                type="url"
                                                placeholder="https://example.com"
                                                required
                                                autoFocus
                                                value={data.domain_url}
                                                onChange={(e) => setData('domain_url', e.target.value)}
                                            />
                                            <InputError message={errors.domain_url} />
                                        </div>
                                        <div>
                                            <InputLabel htmlFor="display_name">Display Name (optional)</InputLabel>
                                            <TextInput
                                                id="display_name"
                                                type="text"
                                                placeholder="My Production API"
                                                value={data.display_name}
                                                onChange={(e) => setData('display_name', e.target.value)}
                                            />
                                        </div>
                                        <div>
                                            <InputLabel htmlFor="uptime_check_interval_minutes">Uptime Check Interval</InputLabel>
                                            <select
                                                id="uptime_check_interval_minutes"
                                                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-gray-100 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                                                value={data.uptime_check_interval_minutes}
                                                onChange={(e) => setData('uptime_check_interval_minutes', parseInt(e.target.value, 10))}
                                            >
                                                <option value="1">Every minute (Pro+)</option>
                                                <option value="5">Every 5 minutes</option>
                                                <option value="10">Every 10 minutes</option>
                                                <option value="15">Every 15 minutes</option>
                                                <option value="30">Every 30 minutes</option>
                                                <option value="60">Every hour</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-300 mb-2">Scan Types</label>
                                            <div className="space-y-2">
                                                {['xss', 'sqli', 'ssrf', 'misconfiguration'].map((type) => (
                                                    <label key={type} className="flex items-center gap-2 cursor-pointer">
                                                        <input
                                                            type="checkbox"
                                                            checked={data.scan_types.includes(type)}
                                                            onChange={(e) => {
                                                                if (e.target.checked) {
                                                                    setData('scan_types', [...data.scan_types, type]);
                                                                } else {
                                                                    setData('scan_types', data.scan_types.filter(t => t !== type));
                                                                }
                                                            }}
                                                            className="h-4 w-4 rounded border-gray-700 bg-gray-900 text-red-500 focus:ring-red-500"
                                                        />
                                                        <span className="text-sm text-gray-300 capitalize">{type.toUpperCase()}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="mt-6 flex justify-end gap-3">
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
                                            {processing ? 'Adding...' : 'Add Target'}
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