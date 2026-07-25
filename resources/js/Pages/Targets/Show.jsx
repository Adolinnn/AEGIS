import { Head } from '@inertiajs/react';
import { usePage, router, Link } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import PrimaryButton from '@/Components/PrimaryButton';
import DangerButton from '@/Components/DangerButton';
import SecondaryButton from '@/Components/SecondaryButton';
import TextInput from '@/Components/TextInput';
import InputLabel from '@/Components/InputLabel';
import InputError from '@/Components/InputError';
import Dropdown from '@/Components/Dropdown';
import NavLink from '@/Components/NavLink';
import Modal from '@/Components/Modal';
import { useState } from 'react';
import { ArrowLeftIcon, ShieldCheckIcon, ClockIcon, MagnifyingGlassIcon, PlayIcon, PauseIcon, TrashIcon, PencilIcon } from '@heroicons/react/24/outline';
import { format } from 'date-fns';

export default function TargetShow({ target, uptimeStats, recentUptimeLogs, recentVulnerabilities, scanTypes, availableTools = [], consentText = 'I confirm I own or am authorized to scan this target.' }) {
    const { auth } = usePage().props;

    const severityColor = {
        critical: 'text-red-500 bg-red-900/40 border-red-500/30',
        high: 'text-red-400 bg-red-900/30 border-red-400/20',
        medium: 'text-yellow-400 bg-yellow-900/30 border-yellow-400/20',
        low: 'text-blue-400 bg-blue-900/30 border-blue-400/20',
        info: 'text-gray-400 bg-gray-900/30 border-gray-400/20',
    };

    const severityLabels = {
        critical: 'CRITICAL',
        high: 'HIGH',
        medium: 'MEDIUM',
        low: 'LOW',
        info: 'INFO',
    };
    const [showScanModal, setShowScanModal] = useState(false);
    const [selectedScanTypes, setSelectedScanTypes] = useState(['xss', 'sqli', 'ssrf', 'misconfiguration']);
    const [isScanning, setIsScanning] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);

    const handleScanTypeChange = (type) => {
        setSelectedScanTypes(prev =>
            prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
        );
    };

    const handleScan = () => {
        setIsScanning(true);
        router.post(route('targets.scan', target.id), {
            scan_types: selectedScanTypes,
        }, {
            onSuccess: () => {
                setShowScanModal(false);
                setIsScanning(false);
                router.reload();
            },
            onError: () => setIsScanning(false),
        });
    };

    const handleCheckUptime = () => {
        router.post(route('targets.check-uptime', target.id), {}, {
            onSuccess: () => router.reload(),
        });
    };

    const handleDelete = () => {
        router.delete(route('targets.destroy', target.id), {
            onSuccess: () => router.visit(route('targets.index')),
        });
        setShowDeleteModal(false);
    };

    const statusColor = {
        up: 'text-green-400 bg-green-900/30',
        down: 'text-red-400 bg-red-900/30',
        degraded: 'text-yellow-400 bg-yellow-900/30',
        unknown: 'text-gray-400 bg-gray-900/30',
    }[target.latest_uptime_log?.status || 'unknown'];

    const statusLabel = target.latest_uptime_log?.status?.toUpperCase() || 'UNKNOWN';

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
                                <PencilIcon className="h-4 w-4" />
                                Actions
                            </Dropdown.Trigger>
                            <Dropdown.Content className="w-48">
                                <Dropdown.Link
                                    href={route('targets.edit', target.id)}
                                    className="block px-3 py-2 text-sm text-gray-300 hover:bg-gray-800"
                                >
                                    Edit Target
                                </Dropdown.Link>
                                <Dropdown.Link
                                    onClick={() => setShowScanModal(true)}
                                    className="block px-3 py-2 text-sm text-gray-300 hover:bg-gray-800"
                                >
                                    Run Security Scan
                                </Dropdown.Link>
                                <Dropdown.Link
                                    onClick={handleCheckUptime}
                                    className="block px-3 py-2 text-sm text-gray-300 hover:bg-gray-800"
                                >
                                    Check Uptime Now
                                </Dropdown.Link>
                                <div className="border-t border-gray-700 my-1" />
                                <Dropdown.Link
                                    onClick={() => setShowDeleteModal(true)}
                                    className="block px-3 py-2 text-sm text-red-400 hover:bg-red-900/20"
                                >
                                    Delete Target
                                </Dropdown.Link>
                            </Dropdown.Content>
                        </Dropdown>
                        <SecondaryButton onClick={() => router.visit(route('targets.index'))}>
                            <ArrowLeftIcon className="h-5 w-5 mr-2" /> Back
                        </SecondaryButton>
                    </div>
                </div>
            }
        >
            <Head title={target.display_name || target.domain_url} />

            <div className="py-6">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-6">
                    {/* Status Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-500">Uptime (30d)</p>
                                    <p className="text-3xl font-bold font-mono text-gray-100">{uptimeStats.uptime_percentage}%</p>
                                </div>
                                <div className={`p-3 rounded-lg ${statusColor}`}>
                                    {statusLabel}
                                </div>
                            </div>
                        </div>

                        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-500">Avg Response</p>
                                    <p className="text-3xl font-bold font-mono text-gray-100">
                                        {uptimeStats.average_response_time_ms ? `${uptimeStats.average_response_time_ms}ms` : 'N/A'}
                                    </p>
                                </div>
                                <ClockIcon className="h-8 w-8 text-gray-600" />
                            </div>
                        </div>

                        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-500">Total Checks (30d)</p>
                                    <p className="text-3xl font-bold font-mono text-gray-100">{uptimeStats.total_checks}</p>
                                </div>
                                <MagnifyingGlassIcon className="h-8 w-8 text-gray-600" />
                            </div>
                        </div>

                        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-500">Unresolved Vulns</p>
                                    <p className="text-3xl font-bold font-mono text-red-400">
                                        {recentVulnerabilities.filter(v => !v.is_resolved).length}
                                    </p>
                                </div>
                                <ShieldCheckIcon className="h-8 w-8 text-gray-600" />
                            </div>
                        </div>
                    </div>

                    {/* Tool Scanner (orchestrated security CLI tools) */}
                    <ToolScannerCard target={target} consentText={consentText} availableTools={availableTools} />

                    {/* Tabs */}
                    <div className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
                        <nav className="flex border-b border-gray-700" aria-label="Tabs">
                            <button
                                onClick={() => router.visit(route('targets.show', target.id))}
                                className="flex-1 px-4 py-3 text-sm font-medium text-gray-300 hover:text-gray-100 hover:bg-gray-700 border-b-2 border-red-500"
                            >
                                Overview
                            </button>
                            <button
                                onClick={() => router.visit(route('targets.vulnerabilities', target.id))}
                                className="flex-1 px-4 py-3 text-sm font-medium text-gray-500 hover:text-gray-300 hover:bg-gray-700"
                            >
                                Vulnerabilities
                            </button>
                            <button
                                onClick={() => router.visit(route('targets.uptime-history', target.id))}
                                className="flex-1 px-4 py-3 text-sm font-medium text-gray-500 hover:text-gray-300 hover:bg-gray-700"
                            >
                                Uptime History
                            </button>
                        </nav>

                        <div className="p-6 space-y-6">
                            {/* Recent Uptime Logs */}
                            <div>
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-lg font-semibold text-gray-100">Recent Uptime Checks</h3>
                                    <SecondaryButton onClick={handleCheckUptime}>
                                        <PlayIcon className="h-4 w-4 mr-2" /> Check Now
                                    </SecondaryButton>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="text-left text-gray-500 font-mono text-xs uppercase border-b border-gray-700">
                                                <th className="pb-2 pr-4">Time</th>
                                                <th className="pb-2 pr-4">Status</th>
                                                <th className="pb-2 pr-4">Code</th>
                                                <th className="pb-2 pr-4">Response</th>
                                                <th className="pb-2 pr-4">Error</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-700">
                                            {recentUptimeLogs.length > 0 ? (
                                                recentUptimeLogs.map((log) => (
                                                    <tr key={log.id} className="hover:bg-gray-700/50">
                                                        <td className="py-2 pr-4 font-mono text-gray-400">
                                                            {format(new Date(log.checked_at), 'MMM d, HH:mm:ss')}
                                                        </td>
                                                        <td className="py-2 pr-4">
                                                            <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${statusColor[log.status] || statusColor.unknown}`}>
                                                                {log.status.toUpperCase()}
                                                            </span>
                                                        </td>
                                                        <td className="py-2 pr-4 font-mono text-gray-300">
                                                            {log.status_code || '—'}
                                                        </td>
                                                        <td className="py-2 pr-4 font-mono text-gray-300">
                                                            {log.response_time_ms ? `${log.response_time_ms}ms` : '—'}
                                                        </td>
                                                        <td className="py-2 pr-4 text-gray-500 max-w-xs truncate">
                                                            {log.error_message || '—'}
                                                        </td>
                                                    </tr>
                                                ))
                                            ) : (
                                                <tr>
                                                    <td colSpan={5} className="py-8 text-center text-gray-500">No uptime checks yet</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Recent Vulnerabilities */}
                            <div>
                                <h3 className="text-lg font-semibold text-gray-100 mb-4">Recent Vulnerabilities</h3>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="text-left text-gray-500 font-mono text-xs uppercase border-b border-gray-700">
                                                <th className="pb-2 pr-4">Type</th>
                                                <th className="pb-2 pr-4">Severity</th>
                                                <th className="pb-2 pr-4">Parameter</th>
                                                <th className="pb-2 pr-4">Detected</th>
                                                <th className="pb-2 pr-4">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-700">
                                            {recentVulnerabilities.length > 0 ? (
                                                recentVulnerabilities.slice(0, 10).map((vuln) => (
                                                    <tr key={vuln.id} className="hover:bg-gray-700/50">
                                                        <td className="py-2 pr-4 font-mono text-gray-300 capitalize">{vuln.vulnerability_type}</td>
                                                        <td className="py-2 pr-4">
                                                            <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${severityColor[vuln.severity] || severityColor.info}`}>
                                                                {severityLabels[vuln.severity] || vuln.severity.toUpperCase()}
                                                            </span>
                                                        </td>
                                                        <td className="py-2 pr-4 font-mono text-gray-400">{vuln.vulnerable_parameter || 'N/A'}</td>
                                                        <td className="py-2 pr-4 font-mono text-gray-400">
                                                            {format(new Date(vuln.detected_at), 'MMM d, HH:mm')}
                                                        </td>
                                                        <td className="py-2 pr-4">
                                                            <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${vuln.is_resolved ? 'text-green-400 bg-green-900/30' : 'text-yellow-400 bg-yellow-900/30'}`}>
                                                                {vuln.is_resolved ? 'Resolved' : 'Open'}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))
                                            ) : (
                                                <tr>
                                                    <td colSpan={5} className="py-8 text-center text-gray-500">No vulnerabilities detected</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Scan Modal */}
            <Modal show={showScanModal} onClose={() => setShowScanModal(false)} title="Run Security Scan" size="md">
                <div className="space-y-4">
                    <p className="text-gray-400 text-sm">Select scan types to run against <span className="font-mono text-gray-200">{target.domain_url}</span></p>
                    <div className="grid grid-cols-2 gap-3">
                        {scanTypes.map((type) => (
                            <label key={type.value} className="flex items-center gap-2 cursor-pointer p-3 bg-gray-900 border border-gray-700 rounded-lg hover:border-red-500 transition-colors">
                                <input
                                    type="checkbox"
                                    checked={selectedScanTypes.includes(type.value)}
                                    onChange={() => handleScanTypeChange(type.value)}
                                    className="h-4 w-4 rounded border-gray-700 bg-gray-900 text-red-500 focus:ring-red-500"
                                />
                                <div>
                                    <span className="font-mono text-sm font-medium text-gray-100 capitalize">{type.value.toUpperCase()}</span>
                                    <p className="text-xs text-gray-500">{type.label}</p>
                                </div>
                            </label>
                        ))}
                    </div>
                    <div className="pt-4 border-t border-gray-700 flex justify-end gap-3">
                        <SecondaryButton onClick={() => setShowScanModal(false)}>Cancel</SecondaryButton>
                        <PrimaryButton onClick={handleScan} disabled={isScanning || selectedScanTypes.length === 0}>
                            {isScanning ? 'Queuing...' : 'Queue Scan'}
                        </PrimaryButton>
                    </div>
                </div>
            </Modal>

            {/* Delete Modal */}
            <Modal show={showDeleteModal} onClose={() => setShowDeleteModal(false)} title="Delete Target" size="sm">
                <p className="text-gray-400">Are you sure you want to delete <span className="font-mono text-red-400">{target.domain_url}</span>? This will remove all associated uptime logs and vulnerability data. This action cannot be undone.</p>
                <div className="mt-6 flex justify-end gap-3">
                    <SecondaryButton onClick={() => setShowDeleteModal(false)}>Cancel</SecondaryButton>
                    <DangerButton onClick={handleDelete}>Delete Target</DangerButton>
                </div>
            </Modal>
        </AuthenticatedLayout>
    );
}

function ToolScannerCard({ target, consentText, availableTools }) {
    const installedTools = availableTools ?? [];
    const [selected, setSelected] = useState(
        installedTools.filter((t) => t.installed).map((t) => t.name)
    );
    const [consent, setConsent] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const toggle = (name) => {
        setSelected((prev) =>
            prev.includes(name) ? prev.filter((t) => t !== name) : [...prev, name]
        );
    };

    const handleRun = () => {
        if (!consent) return;
        setSubmitting(true);
        router.post(
            route('targets.scan-run', target.id),
            { tools: selected, consent: true },
            {
                onSuccess: () => {
                    setSubmitting(false);
                    router.visit(route('scan-runs.index'));
                },
                onError: () => setSubmitting(false),
            }
        );
    };

    const anyInstalled = installedTools.some((t) => t.installed);

    return (
        <div className="rounded-lg border border-red-900/40 bg-red-950/10 p-5">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-100">Tool Scanner</h3>
                <Link
                    href={route('scan-runs.index')}
                    className="text-sm text-red-400 hover:text-red-300"
                >
                    View scan runs →
                </Link>
            </div>
            <p className="mt-1 text-sm text-gray-400">
                Run real security tools (nmap, wpscan, gobuster, sqlmap) against this target and generate an AI report.
            </p>

            <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {installedTools.length === 0 || !anyInstalled ? (
                    <div className="text-sm text-yellow-400">
                        No scanning tools are installed on the host. Install nmap, wpscan, gobuster, or sqlmap to enable this.
                    </div>
                ) : (
                    installedTools.map((tool) => (
                        <label
                            key={tool.name}
                            className={`flex items-start gap-2 rounded border p-3 text-sm ${
                                tool.installed
                                    ? 'border-gray-800 bg-gray-900/50 cursor-pointer'
                                    : 'border-gray-800 bg-gray-900/30 opacity-50 cursor-not-allowed'
                            }`}
                        >
                            <input
                                type="checkbox"
                                className="mt-1"
                                disabled={!tool.installed}
                                checked={selected.includes(tool.name)}
                                onChange={() => toggle(tool.name)}
                            />
                            <span>
                                <span className="font-medium text-gray-200">{tool.label}</span>
                                <span className="block text-xs text-gray-500">{tool.description}</span>
                                {!tool.installed && (
                                    <span className="text-xs text-yellow-400">not installed</span>
                                )}
                            </span>
                        </label>
                    ))
                )}
            </div>

            <div className="mt-4 flex items-start gap-2">
                <input
                    type="checkbox"
                    id="tool-consent"
                    className="mt-1"
                    checked={consent}
                    onChange={(e) => setConsent(e.target.checked)}
                />
                <label htmlFor="tool-consent" className="text-xs text-gray-400">
                    {consentText}
                </label>
            </div>

            <div className="mt-4">
                <PrimaryButton
                    onClick={handleRun}
                    disabled={!consent || selected.length === 0 || submitting}
                >
                    {submitting ? 'Queuing…' : 'Run Tool Scan'}
                </PrimaryButton>
            </div>
        </div>
    );
}