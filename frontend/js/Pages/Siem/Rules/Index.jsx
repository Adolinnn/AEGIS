import React from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';
import { ShieldExclamationIcon, DocumentTextIcon, KeyIcon, ClockIcon, ChartBarIcon } from '@heroicons/react/24/outline';

export default function RulesIndex({ auth, rules }) {
    const getSeverityColor = (sev) => {
        switch (sev) {
            case 'critical': return 'text-exec-critical bg-exec-critical/10 border-exec-critical/30 shadow-[0_0_10px_rgba(244,63,94,0.15)]';
            case 'high': return 'text-exec-high bg-exec-high/10 border-exec-high/30 shadow-[0_0_10px_rgba(245,158,11,0.15)]';
            case 'medium': return 'text-exec-medium bg-exec-medium/10 border-exec-medium/30 shadow-[0_0_10px_rgba(99,102,241,0.15)]';
            case 'low': return 'text-exec-info bg-exec-info/10 border-exec-info/30 shadow-[0_0_10px_rgba(16,185,129,0.15)]';
            default: return 'text-slate-400 bg-white/[0.05] border-white/[0.1]';
        }
    };

    return (
        <AuthenticatedLayout user={auth.user}>
            <Head title="Detection Rules" />

            <div className="py-10 max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <div className="flex items-center gap-3">
                            <span className="font-sans text-[10px] px-2.5 py-1 rounded-full bg-exec-indigo/10 text-exec-indigo border border-exec-indigo/30 font-bold uppercase tracking-wider flex items-center gap-2 shadow-[0_0_10px_rgba(99,102,241,0.2)]">
                                <ShieldExclamationIcon className="h-3 w-3" />
                                Threat Logic
                            </span>
                            <span className="text-slate-500 text-sm font-sans">/</span>
                            <span className="font-sans text-xs text-slate-400 font-medium">Security Information & Event Management</span>
                        </div>
                        <h2 className="text-3xl font-sans font-bold text-white tracking-tight mt-3 drop-shadow-md">
                            Detection Rules
                        </h2>
                    </div>
                    <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl border border-exec-info/30 bg-exec-info/10">
                        <div className="w-2 h-2 rounded-full bg-exec-info animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                        <span className="text-xs font-sans font-bold text-exec-info uppercase tracking-widest">{rules.length} Active Rules</span>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 hud-fade-in">
                    {rules.map(rule => (
                        <div key={rule.key} className="rounded-3xl border border-white/[0.08] bg-white/[0.02] backdrop-blur-2xl p-6 shadow-[0_8px_32px_rgba(0,0,0,0.2)] relative overflow-hidden group hover:border-white/[0.15] transition-all duration-300 flex flex-col">
                            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.15] to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                            
                            <div className="flex justify-between items-start mb-4">
                                <h3 className="text-lg font-sans font-bold text-white pr-4">{rule.title}</h3>
                                <span className={`shrink-0 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-widest border ${getSeverityColor(rule.severity)}`}>
                                    {rule.severity}
                                </span>
                            </div>
                            
                            <div className="text-sm text-slate-400 font-sans font-medium mb-6 flex-1 line-clamp-3">
                                {rule.description}
                            </div>
                            
                            <div className="grid grid-cols-2 gap-3 pt-5 border-t border-white/[0.08]">
                                <div className="bg-white/[0.02] p-3 rounded-xl border border-white/[0.05] shadow-sm">
                                    <p className="text-[10px] font-sans font-bold uppercase tracking-widest text-slate-500 mb-1 flex items-center gap-1.5">
                                        <KeyIcon className="h-3.5 w-3.5 text-exec-indigo" />
                                        Key
                                    </p>
                                    <p className="text-exec-indigo/80 font-mono text-xs font-bold mt-1.5 truncate">{rule.key}</p>
                                </div>
                                {rule.mitre ? (
                                    <div className="bg-white/[0.02] p-3 rounded-xl border border-white/[0.05] shadow-sm">
                                        <p className="text-[10px] font-sans font-bold uppercase tracking-widest text-slate-500 mb-1 flex items-center gap-1.5">
                                            <DocumentTextIcon className="h-3.5 w-3.5 text-exec-high" />
                                            MITRE
                                        </p>
                                        <p className="text-exec-high/80 font-mono text-xs font-bold mt-1.5 truncate">{rule.mitre}</p>
                                    </div>
                                ) : (
                                    <div className="bg-white/[0.02] p-3 rounded-xl border border-white/[0.05] shadow-sm flex items-center justify-center">
                                        <p className="text-xs text-slate-600 font-mono font-medium">N/A</p>
                                    </div>
                                )}
                                <div className="bg-white/[0.02] p-3 rounded-xl border border-white/[0.05] shadow-sm">
                                    <p className="text-[10px] font-sans font-bold uppercase tracking-widest text-slate-500 mb-1 flex items-center gap-1.5">
                                        <ChartBarIcon className="h-3.5 w-3.5 text-exec-info" />
                                        Threshold
                                    </p>
                                    <p className="text-exec-info/80 font-mono text-xs font-bold mt-1.5 truncate">{rule.threshold}</p>
                                </div>
                                <div className="bg-white/[0.02] p-3 rounded-xl border border-white/[0.05] shadow-sm">
                                    <p className="text-[10px] font-sans font-bold uppercase tracking-widest text-slate-500 mb-1 flex items-center gap-1.5">
                                        <ClockIcon className="h-3.5 w-3.5 text-slate-300" />
                                        Window
                                    </p>
                                    <p className="text-slate-200 font-mono text-xs font-bold mt-1.5 truncate">{rule.window}m</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
