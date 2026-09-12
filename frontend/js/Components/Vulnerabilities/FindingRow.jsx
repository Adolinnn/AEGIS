import { useState } from 'react';
import { Link } from '@inertiajs/react';
import {
    ChevronDownIcon,
    ArrowUturnLeftIcon,
    CheckCircleIcon,
    SparklesIcon,
    ArrowTopRightOnSquareIcon
} from '@heroicons/react/24/outline';

const SEV = {
    critical: 'text-rose-400 border-rose-500/40 bg-rose-950/40 shadow-[0_0_8px_rgba(244,63,94,0.25)]',
    high: 'text-orange-400 border-orange-500/30 bg-orange-950/30',
    medium: 'text-amber-400 border-amber-500/30 bg-amber-950/30',
    low: 'text-cyan-400 border-cyan-500/30 bg-cyan-950/30',
    info: 'text-slate-400 border-slate-700 bg-slate-900/40',
};

export default function FindingRow({ finding, onResolve, onUnresolve, onPatch }) {
    const [open, setOpen] = useState(false);

    return (
        <li className="px-5 py-4 hover:bg-slate-800/40 hover:pl-6 transition-all duration-200">
            <div className="flex items-start gap-3">
                <button
                    onClick={() => setOpen((o) => !o)}
                    className="mt-0.5 text-slate-500 hover:text-slate-300 focus:outline-none transition"
                    aria-label="Toggle details"
                >
                    <ChevronDownIcon className={`h-4 w-4 transition-transform duration-200 ${open ? 'rotate-180 text-cyan-400' : ''}`} />
                </button>
                <span className={`cyber-badge font-mono text-[10px] uppercase font-bold ${SEV[finding.severity] ?? SEV.info}`}>
                    {finding.severity}
                </span>
                <div className="min-w-0 flex-1">
                    <p className={`font-mono text-sm font-semibold ${finding.is_resolved ? 'text-slate-500 line-through' : 'text-slate-100'}`}>
                        {finding.title}
                    </p>
                    <p className="font-mono text-xs text-slate-500 mt-1 flex flex-wrap items-center gap-2">
                        <span className="text-cyan-400/90">{finding.tool_label}</span>
                        <span>•</span>
                        <span className="text-slate-400">{finding.category}</span>
                        {finding.detected_at && (
                            <>
                                <span>•</span>
                                <span>Detected: {new Date(finding.detected_at).toLocaleDateString()}</span>
                            </>
                        )}
                    </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                    {finding.is_resolved ? (
                        <button
                            onClick={() => onUnresolve(finding)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-1 font-mono text-xs text-slate-300 hover:bg-slate-700 hover:text-white transition-all hover:scale-105 active:scale-95"
                        >
                            <ArrowUturnLeftIcon className="h-3.5 w-3.5" /> Reopen
                        </button>
                    ) : (
                        <button
                            onClick={() => onResolve(finding)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-950/40 px-3 py-1 font-mono text-xs font-semibold text-emerald-300 hover:bg-emerald-900/60 hover:text-emerald-100 transition-all shadow-sm hover:scale-105 active:scale-95"
                        >
                            <CheckCircleIcon className="h-3.5 w-3.5 text-emerald-400" /> Resolve
                        </button>
                    )}
                </div>
            </div>

            {open && (
                <div className="ml-9 mt-3.5 space-y-3.5 rounded-xl border border-white/[0.08] bg-[#050811] p-4 text-xs hud-fade-in shadow-inner">
                    {finding.description && (
                        <div>
                            <p className="mb-1 font-mono text-[10px] uppercase tracking-wider text-slate-400 font-bold">Vulnerability Description</p>
                            <p className="text-slate-200 leading-relaxed font-sans text-sm">{finding.description}</p>
                        </div>
                    )}

                    {finding.evidence && (
                        <div>
                            <p className="mb-1 font-mono text-[10px] uppercase tracking-wider text-slate-400 font-bold">Evidence / Captured Output</p>
                            <pre className="overflow-auto rounded-lg border border-slate-800 bg-[#020409] p-3.5 font-mono text-xs text-emerald-400 leading-relaxed shadow-inner">
                                {finding.evidence}
                            </pre>
                        </div>
                    )}

                    {finding.recommendation && (
                        <div>
                            <p className="mb-1 font-mono text-[10px] uppercase tracking-wider text-slate-400 font-bold">Recommended Mitigation</p>
                            <p className="text-rose-300 leading-relaxed font-sans text-xs">{finding.recommendation}</p>
                        </div>
                    )}

                    <div>
                        {finding.has_ai_patch ? (
                            <div>
                                <p className="mb-1 font-mono text-[10px] uppercase tracking-wider text-purple-400 font-bold flex items-center gap-1">
                                    <SparklesIcon className="h-3.5 w-3.5" /> AI Remediation Code Patch
                                </p>
                                <pre className="overflow-auto rounded-lg border border-purple-500/30 bg-purple-950/20 p-3.5 font-mono text-xs text-purple-200">
                                    {finding.ai_patch_snippet}
                                </pre>
                            </div>
                        ) : (
                            <button
                                onClick={() => onPatch(finding)}
                                className="inline-flex items-center gap-2 rounded-lg border border-purple-500/40 bg-purple-950/40 px-3 py-1.5 font-mono text-xs font-semibold text-purple-300 hover:bg-purple-900/60 hover:text-white transition shadow-sm hover:scale-105 active:scale-95"
                            >
                                <SparklesIcon className="h-3.5 w-3.5 text-purple-400" /> Synthesize AI Remediation Patch
                            </button>
                        )}
                    </div>

                    {finding.scan_run_id && (
                        <div className="pt-2 border-t border-slate-900 flex justify-end">
                            <Link
                                href={route('scan-runs.show', finding.scan_run_id)}
                                className="inline-flex items-center gap-1 text-[11px] text-cyan-400 hover:text-cyan-300 font-mono transition-colors hover:translate-x-0.5"
                            >
                                <span>Inspect Originating Scan #{finding.scan_run_id}</span>
                                <ArrowTopRightOnSquareIcon className="h-3 w-3" />
                            </Link>
                        </div>
                    )}
                </div>
            )}
        </li>
    );
}
