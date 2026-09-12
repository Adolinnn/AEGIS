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
import Stat from '@/Components/StatCard';

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
                <div className="flex items-center justify-between">
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="font-mono text-[10px] uppercase tracking-widest px-2 py-0.5 rounded bg-red-950/60 text-red-400 border border-red-800/60 font-semibold">
                                THREAT INTEL
                            </span>
                            <span className="font-mono text-xs text-slate-500">Unified Findings Repository</span>
                        </div>
                        <h1 className="text-2xl font-mono font-bold text-white tracking-tight mt-1">
                            Vulnerability Triage & Remediation Hub
                        </h1>
                    </div>
                </div>
            }
        >
            <Head title="Vulnerabilities" />

            <div className="py-8">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-6">
                    
                    {/* Stat Matrix Cards with Cyber Lift */}
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 hud-fade-in">
                        <Stat label="Total Findings" value={stats.total ?? 0} accent="text-slate-100" />
                        <Stat label="Unresolved Issues" value={stats.unresolved ?? 0} accent="text-amber-400" glowColor="bg-amber-500" />
                        <Stat label="Critical Exposures" value={stats.critical ?? 0} accent="text-rose-400" glowColor="bg-rose-500" />
                        <Stat label="High Risks" value={stats.high ?? 0} accent="text-orange-400" glowColor="bg-orange-500" />
                        <Stat label="Targets Affected" value={stats.targets_affected ?? 0} accent="text-purple-400" glowColor="bg-purple-500" />
                    </div>

                    {/* Target Navigation Chips */}
                    <div className="flex items-center gap-2 overflow-x-auto pb-1 hud-fade-in hud-stagger-1">
                        <button
                            onClick={() => setFilter('target_id', '')}
                            className={`inline-flex items-center gap-1.5 shrink-0 rounded-lg px-3.5 py-2 font-mono text-xs font-semibold transition hover:scale-105 active:scale-95 ${
                                !activeTargetId
                                    ? 'border border-red-500/50 bg-red-950/50 text-red-200 shadow-[0_0_10px_rgba(244,63,94,0.25)]'
                                    : 'border border-slate-800 bg-[#0c1428] text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                            }`}
                        >
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
                                    className={`inline-flex items-center gap-2 shrink-0 rounded-lg px-3.5 py-2 font-mono text-xs font-semibold transition hover:scale-105 active:scale-95 ${
                                        isSelected
                                            ? 'border border-red-500/50 bg-red-950/50 text-red-200 shadow-[0_0_10px_rgba(244,63,94,0.25)]'
                                            : 'border border-slate-800 bg-[#0c1428] text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                                    }`}
                                >
                                    <span className="truncate max-w-[200px]">{t.domain_url}</span>
                                    {unresCount > 0 ? (
                                        <span className="cyber-badge text-rose-400 bg-rose-950/60 border-rose-500/40 text-[9px] px-1.5 py-0.2">
                                            {unresCount}
                                        </span>
                                    ) : (
                                        <span className="cyber-badge text-emerald-400 bg-emerald-950/40 border-emerald-500/30 text-[9px] px-1.5 py-0.2">
                                            ✓
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    {/* Filter Bar */}
                    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-white/[0.08] bg-[#0c1428]/90 p-4 shadow-lg hud-fade-in hud-stagger-2">
                        <select
                            value={filters.target_id ?? ''}
                            onChange={(e) => setFilter('target_id', e.target.value)}
                            className="rounded-lg border border-slate-700/80 bg-[#070b14] text-xs text-slate-200 font-mono focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 shadow-inner"
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
                            className="rounded-lg border border-slate-700/80 bg-[#070b14] text-xs text-slate-200 font-mono focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 shadow-inner"
                        >
                            <option value="">All severities</option>
                            {severities.map((s) => (
                                <option key={s} value={s}>{s.toUpperCase()}</option>
                            ))}
                        </select>

                        <select
                            value={filters.category ?? ''}
                            onChange={(e) => setFilter('category', e.target.value)}
                            className="rounded-lg border border-slate-700/80 bg-[#070b14] text-xs text-slate-200 font-mono focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 shadow-inner"
                        >
                            <option value="">All categories</option>
                            {categories.map((c) => (
                                <option key={c} value={c}>{c}</option>
                            ))}
                        </select>

                        <select
                            value={filters.resolved ?? ''}
                            onChange={(e) => setFilter('resolved', e.target.value)}
                            className="rounded-lg border border-slate-700/80 bg-[#070b14] text-xs text-slate-200 font-mono focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 shadow-inner"
                        >
                            <option value="">All statuses</option>
                            <option value="false">Unresolved Only</option>
                            <option value="true">Resolved Only</option>
                        </select>

                        {(filters.severity || filters.category || filters.target_id || filters.resolved !== undefined) && (
                            <SecondaryButton
                                onClick={() => router.get(route('vulnerabilities.index'), {}, { preserveScroll: true })}
                                className="text-xs"
                            >
                                Reset Filters
                            </SecondaryButton>
                        )}
                    </div>

                    {/* Target Vulnerability Sections */}
                    {targets.length === 0 ? (
                        <div className="rounded-xl border border-white/[0.08] bg-[#0c1428]/90 p-12 text-center font-mono text-xs text-slate-400 space-y-3 hud-fade-in">
                            <BugAntIcon className="mx-auto h-10 w-10 text-slate-600" />
                            <p className="text-sm font-semibold text-slate-200">No targets registered</p>
                            <Link
                                href={route('targets.create')}
                                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-gradient-to-r from-red-600 to-rose-600 text-white font-mono text-xs font-semibold hover:scale-105 transition-all"
                            >
                                Add Target
                            </Link>
                        </div>
                    ) : (
                        <div className="space-y-6">
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
