import { Head } from '@inertiajs/react';
import { usePage, router } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import DangerButton from '@/Components/DangerButton';
import Dropdown from '@/Components/Dropdown';
import Modal from '@/Components/Modal';
import { useState } from 'react';
import { ArrowLeftIcon, ShieldCheckIcon, ClockIcon, MagnifyingGlassIcon, ChevronDownIcon, EyeIcon, ArrowPathIcon, CheckIcon, XMarkIcon, DocumentTextIcon, CpuChipIcon } from '@heroicons/react/24/outline';
import { format } from 'date-fns';

export default function TargetVulnerabilities({ target, vulnerabilities, filters, severities, scanTypes }) {
    const { auth } = usePage().props;
    const [showGeneratePatch, setShowGeneratePatch] = useState(null);
    const [isGeneratingPatch, setIsGeneratingPatch] = useState(false);

    const handleGeneratePatch = (vuln) => {
        setShowGeneratePatch(vuln.id);
    };

    const handleConfirmGeneratePatch = (vulnId) => {
        setIsGeneratingPatch(true);
        router.post(route('vulnerabilities.generate-patch', vulnId), {}, {
            onSuccess: () => {
                setShowGeneratePatch(null);
                setIsGeneratingPatch(false);
                router.reload();
            },
            onError: () => setIsGeneratingPatch(false),
        });
    };

    const handleMarkResolved = (vuln) => {
        router.post(route('scans.mark-resolved', vuln.id), {}, {
            onSuccess: () => router.reload(),
        });
    };

    const handleMarkUnresolved = (vuln) => {
        router.post(route('scans.mark-unresolved', vuln.id), {}, {
            onSuccess: () => router.reload(),
        });
    };

    const handleReScan = (vuln) => {
        router.post(route('scans.re-scan', vuln.id), {}, {
            onSuccess: () => router.reload(),
        });
    };

    const severityColor = {
        critical: 'text-red-500 bg-red-900/40 border-red-500/30',
        high: 'text-red-400 bg-red-900/30 border-red-400/20',
        medium: 'text-yellow-400 bg-yellow-900/30 border-yellow-400/20',
        low: 'text-blue-400 bg-blue-900/30 border-blue-400/20',
        info: 'text-gray-400 bg-gray-900/30 border-gray-400/20',
    };

    const severityLabels = {
        critical: 'Critical',
        high: 'High',
        medium: 'Medium',
        low: 'Low',
        info: 'Info',
    };

    const scanTypeColor = {
        xss: 'text-red-400 bg-red-900/30 border-red-800',
        sqli: 'text-purple-400 bg-purple-900/30 border-purple-800',
        ssrf: 'text-orange-400 bg-orange-900/30 border-orange-800',
        misconfiguration: 'text-blue-400 bg-blue-900/30 border-blue-800',
    };

    return (
        <AuthenticatedLayout
            header={
                <div className="flex items-center justify-between">
                    <div>
                        <SecondaryButton onClick={() => router.visit(route('targets.show', target.id))} className="mb-2">
                            <ArrowLeftIcon className="h-5 w-5 mr-2" /> Back to Target
                        </SecondaryButton>
                        <h2 className="text-xl font-semibold text-gray-100">Vulnerabilities</h2>
                        <p className="text-sm text-gray-500">Security issues detected for {target.display_name || target.domain_url}</p>
                    </div>
                </div>
            }
        >
            <Head title={`Vulnerabilities - ${target.display_name || target.domain_url}`} />

            <div className="py-6">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    {/* Stats Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-gray-400 text-sm font-mono">TOTAL VULNS</p>
                                    <p className="text-2xl font-bold text-gray-100 font-mono">{vulnerabilities.total}</p>
                                </div>
                                <ShieldCheckIcon className="h-8 w-8 text-gray-600" />
                            </div>
                        </div>
                        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-gray-400 text-sm font-mono">UNRESOLVED</p>
                                    <p className="text-2xl font-bold text-red-400 font-mono">
                                        {vulnerabilities.data.filter(v => !v.is_resolved).length}
                                    </p>
                                </div>
                                <ClockIcon className="h-8 w-8 text-gray-600" />
                            </div>
                        </div>
                        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-gray-400 text-sm font-mono">CRITICAL</p>
                                    <p className="text-2xl font-bold text-red-500 font-mono">
                                        {vulnerabilities.data.filter(v => v.severity === 'critical' && !v.is_resolved).length}
                                    </p>
                                </div>
                                <MagnifyingGlassIcon className="h-8 w-8 text-gray-600" />
                            </div>
                        </div>
                        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-gray-400 text-sm font-mono">HIGH</p>
                                    <p className="text-2xl font-bold text-orange-400 font-mono">
                                        {vulnerabilities.data.filter(v => v.severity === 'high' && !v.is_resolved).length}
                                    </p>
                                </div>
                                <MagnifyingGlassIcon className="h-8 w-8 text-gray-600" />
                            </div>
                        </div>
                    </div>

                    {/* Filters */}
                    <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 mb-6">
                        <form onSubmit={(e) => e.preventDefault()} className="flex flex-wrap gap-4 items-end">
                            <div className="flex-1 min-w-[200px]">
                                <label className="block text-sm font-medium text-gray-400 mb-1">Severity</label>
                                <select
                                    name="severity"
                                    value={filters.severity || ''}
                                    onChange={(e) => router.get(route('targets.vulnerabilities', target.id), { ...filters, severity: e.target.value }, { preserveScroll: true })}
                                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-gray-100 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                                >
                                    <option value="">All Severities</option>
                                    {severities.map((s) => (
                                        <option key={s} value={s}>{severityLabels[s] ?? s}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex-1 min-w-[150px]">
                                <label className="block text-sm font-medium text-gray-400 mb-1">Type</label>
                                <select
                                    name="type"
                                    value={filters.type || ''}
                                    onChange={(e) => router.get(route('targets.vulnerabilities', target.id), { ...filters, type: e.target.value }, { preserveScroll: true })}
                                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-gray-100 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                                >
                                    <option value="">All Types</option>
                                    {scanTypes.map((t) => (
                                        <option key={t.value} value={t.value}>{(t.value ?? '').toUpperCase()}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex-1 min-w-[150px]">
                                <label className="block text-sm font-medium text-gray-400 mb-1">Status</label>
                                <select
                                    name="resolved"
                                    value={filters.resolved !== undefined ? String(filters.resolved) : ''}
                                    onChange={(e) => router.get(route('targets.vulnerabilities', target.id), { ...filters, resolved: e.target.value === 'true' ? true : e.target.value === 'false' ? false : undefined }, { preserveScroll: true })}
                                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-gray-100 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                                >
                                    <option value="">All</option>
                                    <option value="false">Unresolved</option>
                                    <option value="true">Resolved</option>
                                </select>
                            </div>

                            <SecondaryButton
                                type="button"
                                onClick={() => router.get(route('targets.vulnerabilities', target.id), {}, { preserveScroll: true })}
                            >
                                Clear Filters
                            </SecondaryButton>
                        </form>
                    </div>

                    {/* Vulnerabilities Table */}
                    <div className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-900 border-b border-gray-700">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-mono font-medium text-gray-400 uppercase tracking-wider">VULNERABILITY</th>
                                        <th className="px-4 py-3 text-left text-xs font-mono font-medium text-gray-400 uppercase tracking-wider">SEVERITY</th>
                                        <th className="px-4 py-3 text-left text-xs font-mono font-medium text-gray-400 uppercase tracking-wider">TYPE</th>
                                        <th className="px-4 py-3 text-left text-xs font-mono font-medium text-gray-400 uppercase tracking-wider">PARAMETER</th>
                                        <th className="px-4 py-3 text-left text-xs font-mono font-medium text-gray-400 uppercase tracking-wider">DETECTED</th>
                                        <th className="px-4 py-3 text-left text-xs font-mono font-medium text-gray-400 uppercase tracking-wider">STATUS</th>
                                        <th className="px-4 py-3 text-right text-xs font-mono font-medium text-gray-400 uppercase tracking-wider pr-4">ACTIONS</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-700">
                                    {vulnerabilities.data.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className="px-4 py-12 text-center text-gray-500">
                                                No vulnerabilities found matching your criteria.
                                            </td>
                                        </tr>
                                    ) : (
                                        vulnerabilities.data.map((vuln) => (
                                            <tr key={vuln.id} className="hover:bg-gray-700/50 transition-colors">
                                                <td className="px-4 py-4">
                                                    <div>
                                                        <p className="font-mono text-sm text-gray-100 truncate max-w-xs">
                                                            {vuln.payload_used}
                                                        </p>
                                                        <p className="text-xs text-gray-500 truncate max-w-xs">
                                                            {vuln.evidence}
                                                        </p>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-4">
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-mono font-medium border ${severityColor[vuln.severity] || severityColor.info}`}>
                                                        {vuln.severity?.toUpperCase()}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-4">
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-mono font-medium border ${scanTypeColor[vuln.vulnerability_type] || scanTypeColor.misconfiguration}`}>
                                                        {vuln.vulnerability_type?.toUpperCase()}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-4">
                                                    <span className="font-mono text-sm text-gray-400">
                                                        {vuln.vulnerable_parameter || 'N/A'}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-4">
                                                    <span className="font-mono text-xs text-gray-500">
                                                        {format(new Date(vuln.detected_at), 'MMM d, HH:mm')}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-4">
                                                    <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${vuln.is_resolved ? 'text-green-400 bg-green-900/30' : 'text-yellow-400 bg-yellow-900/30'}`}>
                                                        {vuln.is_resolved ? 'RESOLVED' : 'OPEN'}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-4 text-right">
                                                    <Dropdown>
                                                        <Dropdown.Trigger as={SecondaryButton} size="sm" className="w-full sm:w-auto">
                                                            <ChevronDownIcon className="h-4 w-4 mr-1" />
                                                            Actions
                                                        </Dropdown.Trigger>
                                                        <Dropdown.Content className="w-56">
                                                            <Dropdown.Link
                                                                onClick={() => router.visit(route('scans.show', vuln.id))}
                                                                className="block px-3 py-2 text-sm text-gray-300 hover:bg-gray-800"
                                                            >
                                                                <EyeIcon className="h-4 w-4 mr-2 inline" />
                                                                View Details
                                                            </Dropdown.Link>
                                                            {vuln.ai_patch_snippet ? (
                                                                <Dropdown.Link
                                                                    onClick={() => router.visit(route('scans.show', vuln.id))}
                                                                    className="block px-3 py-2 text-sm text-gray-300 hover:bg-gray-800"
                                                                >
                                                                    <DocumentTextIcon className="h-4 w-4 mr-2 inline" />
                                                                    View AI Patch
                                                                </Dropdown.Link>
                                                            ) : (
                                                                <Dropdown.Link
                                                                    onClick={() => handleGeneratePatch(vuln)}
                                                                    disabled={!auth.user?.subscription_tier?.hasAiRemediation?.() || auth.user?.subscription_tier?.hasAiRemediation === false}
                                                                    className="block px-3 py-2 text-sm text-gray-300 hover:bg-gray-800"
                                                                >
                                                                    <CpuChipIcon className="h-4 w-4 mr-2 inline" />
                                                                    Generate AI Patch
                                                                </Dropdown.Link>
                                                            )}
                                                            <div className="border-t border-gray-700 my-1" />
                                                            {!vuln.is_resolved ? (
                                                                <Dropdown.Link
                                                                    onClick={() => handleMarkResolved(vuln)}
                                                                    className="block w-full text-left px-3 py-2 text-sm text-green-400 hover:bg-green-900/20"
                                                                >
                                                                    Mark as Resolved
                                                                </Dropdown.Link>
                                                            ) : (
                                                                <Dropdown.Link
                                                                    onClick={() => handleMarkUnresolved(vuln)}
                                                                    className="block w-full text-left px-3 py-2 text-sm text-yellow-400 hover:bg-yellow-900/20"
                                                                >
                                                                    Mark as Unresolved
                                                                </Dropdown.Link>
                                                            )}
                                                            <Dropdown.Link
                                                                onClick={() => handleReScan(vuln)}
                                                                className="block w-full text-left px-3 py-2 text-sm text-blue-400 hover:bg-blue-900/20"
                                                            >
                                                                <ArrowPathIcon className="h-4 w-4 mr-2 inline" />
                                                                Re-scan This Type
                                                            </Dropdown.Link>
                                                        </Dropdown.Content>
                                                    </Dropdown>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        {vulnerabilities.last_page > 1 && (
                            <div className="px-4 py-3 border-t border-gray-700">
                                <div className="flex items-center justify-between">
                                    <p className="text-sm text-gray-500 font-mono">
                                        Showing {vulnerabilities.from} to {vulnerabilities.to} of {vulnerabilities.total} results
                                    </p>
                                    <div className="flex gap-2">
                                        {vulnerabilities.prev_page_url && (
                                            <SecondaryButton
                                                size="sm"
                                                onClick={() => router.get(vulnerabilities.prev_page_url, { preserveScroll: true })}
                                            >
                                                Previous
                                            </SecondaryButton>
                                        )}
                                        {vulnerabilities.next_page_url && (
                                            <SecondaryButton
                                                size="sm"
                                                onClick={() => router.get(vulnerabilities.next_page_url, { preserveScroll: true })}
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

            {/* Generate AI Patch Modal */}
            <Modal show={!!showGeneratePatch} onClose={() => setShowGeneratePatch(null)} title="Generate AI Remediation Patch" size="md">
                <div className="space-y-4">
                    <p className="text-gray-400 text-sm">
                        This will use AI to generate a code patch for the selected vulnerability.
                        This requires a Pro or Agency plan.
                    </p>
                    <div className="pt-4 border-t border-gray-700 flex justify-end gap-3">
                        <SecondaryButton onClick={() => setShowGeneratePatch(null)}>Cancel</SecondaryButton>
                        <PrimaryButton onClick={() => handleConfirmGeneratePatch(showGeneratePatch)} disabled={isGeneratingPatch}>
                            {isGeneratingPatch ? 'Generating...' : 'Generate Patch'}
                        </PrimaryButton>
                    </div>
                </div>
            </Modal>
        </AuthenticatedLayout>
    );
}