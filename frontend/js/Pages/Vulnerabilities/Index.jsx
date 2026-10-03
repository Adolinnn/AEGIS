import { Head, Link, router } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import SecondaryButton from '@/Components/SecondaryButton';
import {
    CheckCircleIcon, 
    ArrowUturnLeftIcon, 
    SparklesIcon, 
    ChevronDownIcon,
    BugAntIcon, 
    GlobeAltIcon, 
    PlayIcon, 
    ShieldCheckIcon,
    ArrowTopRightOnSquareIcon,
    CommandLineIcon
} from '@heroicons/react/24/outline';
import { useState, useMemo } from 'react';

import TargetVulnerabilitySection from '@/Components/Vulnerabilities/TargetVulnerabilitySection';

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

export default function VulnerabilitiesIndex({
    findings,
    targets = [],
    filters = {},
    severities = [],
    categories = [],
    stats = {},
}) {
    const activeTargetId = filters.target_id ? Number(filters.target_id) : null;

    const setFilter = (key, value) => {
        const next = { ...filters, [key]: value === '' ? undefined : value };
        router.get(route('vulnerabilities.index'), next, { preserveScroll: true, preserveState: true });
    };

    const onResolve = (f) => router.post(route('vulnerabilities.resolve', f.id), {}, { preserveScroll: true });
    const onUnresolve = (f) => router.post(route('vulnerabilities.unresolve', f.id), {}, { preserveScroll: true });
    const onPatch = (f) => router.post(route('vulnerabilities.generate-patch', f.id), {}, { preserveScroll: true });

    const targetSections = useMemo(() => {
        const findingsList = findings.data ?? [];
        if (activeTargetId) {
            const currentTarget = targets.find((t) => t.id === activeTargetId);
            if (currentTarget) {
                return [{
                    target: currentTarget,
                    findings: findingsList.filter((f) => f.target?.id === activeTargetId),
                }];
            }
        }
        return targets.map((t) => ({
            target: t,
            findings: findingsList.filter((f) => f.target?.id === t.id),
        }));
    }, [findings.data, targets, activeTargetId]);

    return (
        <AuthenticatedLayout
            header={
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-3">
                            <span className="font-sans text-[10px] px-2.5 py-1 rounded-full bg-exec-critical/10 text-exec-critical border border-exec-critical/30 font-bold uppercase tracking-wider flex items-center gap-2 shadow-[0_0_10px_rgba(244,63,94,0.2)]">
                                <BugAntIcon className="h-3 w-3" />
                                Threat Intel
                            </span>
                            <span className="text-slate-500 text-sm font-sans">/</span>
                            <span className="font-sans text-xs text-slate-400 font-medium">Unified Findings Repository</span>
                        </div>
                        <h1 className="text-3xl font-sans font-bold text-white tracking-tight mt-3 drop-shadow-md">
                            Vulnerability Triage & Remediation Hub
                        </h1>
                    </div>
                </div>
            }
        >
            <Head title="Vulnerabilities" />

            <div className="py-10">
                <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8 space-y-8">
                    
                    {/* Stat Matrix Cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 hud-fade-in">
                        <StatCard label="Total Findings" value={stats.total ?? 0} accent="text-slate-100" />
                        <StatCard label="Unresolved Issues" value={stats.unresolved ?? 0} accent="text-exec-high" />
                        <StatCard label="Critical Exposures" value={stats.critical ?? 0} accent="text-exec-critical" />
                        <StatCard label="High Risks" value={stats.high ?? 0} accent="text-orange-400" />
                        <StatCard label="Targets Affected" value={stats.targets_affected ?? 0} accent="text-exec-indigo" />
                    </div>

                    {/* Target Navigation Chips */}
                    <div className="flex items-center gap-3 overflow-x-auto pb-2 hud-fade-in hud-stagger-1 no-scrollbar">
                        <button
                            onClick={() => setFilter('target_id', '')}
                            className={`inline-flex items-center gap-2 shrink-0 rounded-xl px-5 py-3 font-sans text-xs font-bold transition-all relative overflow-hidden ${
                                !activeTargetId
                                    ? 'border border-exec-indigo/50 bg-exec-indigo/10 text-white shadow-[0_0_15px_rgba(99,102,241,0.2)]'
                                    : 'border border-white/[0.08] bg-white/[0.02] text-slate-400 hover:bg-white/[0.05] hover:text-white backdrop-blur-md'
                            }`}
                        >
                            {!activeTargetId && <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-exec-indigo to-transparent"></div>}
                            <GlobeAltIcon className="h-4 w-4" />
                            All Targets ({targets.length})
                        </button>

                        {targets.map((t) => {
                            const isSelected = activeTargetId === t.id;
                            const unresCount = t.unresolved_findings_count ?? 0;
                            return (
                                <button
                                    key={t.id}
                                    onClick={() => setFilter('target_id', isSelected ? '' : t.id)}
                                    className={`inline-flex items-center gap-3 shrink-0 rounded-xl px-5 py-3 font-sans text-xs font-bold transition-all relative overflow-hidden ${
                                        isSelected
                                            ? 'border border-exec-indigo/50 bg-exec-indigo/10 text-white shadow-[0_0_15px_rgba(99,102,241,0.2)]'
                                            : 'border border-white/[0.08] bg-white/[0.02] text-slate-400 hover:bg-white/[0.05] hover:text-white backdrop-blur-md'
                                    }`}
                                >
                                    {isSelected && <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-exec-indigo to-transparent"></div>}
                                    <span className="truncate max-w-[250px]">{t.domain_url}</span>
                                    {unresCount > 0 ? (
                                        <span className="px-2 py-0.5 rounded font-mono text-[10px] font-bold text-exec-critical bg-exec-critical/10 border border-exec-critical/30">
                                            {unresCount}
                                        </span>
                                    ) : (
                                        <span className="px-2 py-0.5 rounded font-mono text-[10px] font-bold text-exec-info bg-exec-info/10 border border-exec-info/30">
                                            ✓
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    {/* Filter Bar */}
                    <div className="flex flex-wrap items-center gap-4 rounded-3xl border border-white/[0.08] bg-white/[0.02] p-6 shadow-[0_8px_32px_rgba(0,0,0,0.2)] backdrop-blur-2xl hud-fade-in hud-stagger-2 relative overflow-hidden">
                        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.12] to-transparent"></div>
                        
                        <div className="flex flex-wrap items-center gap-4 w-full">
                            <select
                                value={filters.target_id ?? ''}
                                onChange={(e) => setFilter('target_id', e.target.value)}
                                className="rounded-xl border border-white/[0.1] bg-white/[0.03] text-sm text-slate-200 font-sans font-medium focus:border-exec-indigo focus:ring-1 focus:ring-exec-indigo shadow-inner py-2.5 pl-4 pr-10 hover:bg-white/[0.05] transition-colors"
                            >
                                <option value="">All targets ({targets.length})</option>
                                {targets.map((t) => (
                                    <option key={t.id} value={t.id}>
                                        {t.domain_url} {t.display_name ? `(${t.display_name})` : ''}
                                    </option>
                                ))}
                            </select>

                            <select
                                value={filters.severity ?? ''}
                                onChange={(e) => setFilter('severity', e.target.value)}
                                className="rounded-xl border border-white/[0.1] bg-white/[0.03] text-sm text-slate-200 font-sans font-medium focus:border-exec-indigo focus:ring-1 focus:ring-exec-indigo shadow-inner py-2.5 pl-4 pr-10 hover:bg-white/[0.05] transition-colors"
                            >
                                <option value="">All severities</option>
                                {severities.map((s) => (
                                    <option key={s} value={s}>{s.toUpperCase()}</option>
                                ))}
                            </select>

                            <select
                                value={filters.category ?? ''}
                                onChange={(e) => setFilter('category', e.target.value)}
                                className="rounded-xl border border-white/[0.1] bg-white/[0.03] text-sm text-slate-200 font-sans font-medium focus:border-exec-indigo focus:ring-1 focus:ring-exec-indigo shadow-inner py-2.5 pl-4 pr-10 hover:bg-white/[0.05] transition-colors"
                            >
                                <option value="">All categories</option>
                                {categories.map((c) => (
                                    <option key={c} value={c}>{c}</option>
                                ))}
                            </select>

                            <select
                                value={filters.resolved ?? ''}
                                onChange={(e) => setFilter('resolved', e.target.value)}
                                className="rounded-xl border border-white/[0.1] bg-white/[0.03] text-sm text-slate-200 font-sans font-medium focus:border-exec-indigo focus:ring-1 focus:ring-exec-indigo shadow-inner py-2.5 pl-4 pr-10 hover:bg-white/[0.05] transition-colors"
                            >
                                <option value="">All statuses</option>
                                <option value="false">Unresolved Only</option>
                                <option value="true">Resolved Only</option>
                            </select>

                            {(filters.severity || filters.category || filters.target_id || filters.resolved !== undefined) && (
                                <SecondaryButton
                                    onClick={() => router.get(route('vulnerabilities.index'), {}, { preserveScroll: true })}
                                    className="text-sm bg-white/[0.05] border-white/[0.1] hover:bg-white/[0.1] text-white py-2.5"
                                >
                                    Reset Filters
                                </SecondaryButton>
                            )}
                        </div>
                    </div>

                    {/* Target Vulnerability Sections */}
                    {targets.length === 0 ? (
                        <div className="rounded-3xl border border-white/[0.08] bg-white/[0.02] p-16 text-center backdrop-blur-2xl space-y-4 hud-fade-in relative overflow-hidden">
                            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.12] to-transparent"></div>
                            <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-white/[0.03] border border-white/[0.05] mb-4">
                                <BugAntIcon className="h-10 w-10 text-slate-500" />
                            </div>
                            <p className="text-lg font-sans font-bold text-white tracking-tight">No targets registered</p>
                            <p className="text-sm font-sans text-slate-400 font-medium">Add a target to begin scanning and cataloging vulnerabilities.</p>
                            <div className="pt-4">
                                <Link
                                    href={route('targets.index')}
                                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-exec-indigo to-[#8b5cf6] text-white font-sans text-sm font-bold hover:shadow-[0_0_20px_rgba(99,102,241,0.5)] transition-all"
                                >
                                    <GlobeAltIcon className="h-5 w-5" />
                                    Go to Asset Surveillance
                                </Link>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-8">
                            {targetSections.map(({ target, findings: targetFindings }) => (
                                <TargetVulnerabilitySection
                                    key={target.id}
                                    target={target}
                                    findings={targetFindings}
                                    onResolve={onResolve}
                                    onUnresolve={onUnresolve}
                                    onPatch={onPatch}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
