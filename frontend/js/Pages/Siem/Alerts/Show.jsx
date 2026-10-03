import React, { useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router } from '@inertiajs/react';
import SecondaryButton from '@/Components/SecondaryButton';
import DangerButton from '@/Components/DangerButton';
import { ShieldExclamationIcon, CheckCircleIcon, XCircleIcon, ExclamationTriangleIcon, SparklesIcon, DocumentTextIcon, GlobeAltIcon, ServerIcon, ClockIcon, ChartBarIcon } from '@heroicons/react/24/outline';

export default function AlertsShow({ auth, alert, evidence, rule_info }) {
    const [status, setStatus] = useState(alert.status);
    
    const updateStatus = (newStatus) => {
        router.post(route('siem.alerts.update-status', alert.id), {
            status: newStatus
        }, {
            preserveScroll: true,
            onSuccess: () => setStatus(newStatus)
        });
    };

    const getSeverityColor = (sev) => {
        switch (sev) {
            case 'critical': return 'text-exec-critical bg-exec-critical/10 border-exec-critical/40 shadow-[0_0_15px_rgba(244,63,94,0.2)]';
            case 'high': return 'text-exec-high bg-exec-high/10 border-exec-high/40 shadow-[0_0_15px_rgba(245,158,11,0.2)]';
            case 'medium': return 'text-exec-medium bg-exec-medium/10 border-exec-medium/40 shadow-[0_0_15px_rgba(99,102,241,0.2)]';
            case 'low': return 'text-exec-info bg-exec-info/10 border-exec-info/40 shadow-[0_0_15px_rgba(16,185,129,0.2)]';
            default: return 'text-slate-400 bg-white/[0.05] border-white/[0.1]';
        }
    };

    return (
        <AuthenticatedLayout user={auth.user}>
            <Head title={`Alert: ${alert.title}`} />

            <div className="py-10 max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
                
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div className="flex-1">
                        <div className="flex items-center gap-3 mb-4">
                            <span className={`px-3 py-1.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-widest border ${getSeverityColor(alert.severity)}`}>
                                {alert.severity}
                            </span>
                            <span className="text-slate-500 text-sm font-sans">/</span>
                            <span className="font-sans text-xs text-slate-400 font-medium">Security Alert</span>
                        </div>
                        <h2 className="text-3xl font-sans font-bold text-white tracking-tight drop-shadow-md">
                            {alert.title}
                        </h2>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-3 bg-white/[0.02] p-2 rounded-2xl border border-white/[0.08] backdrop-blur-md">
                        {status === 'open' && (
                            <button 
                                onClick={() => updateStatus('acknowledged')}
                                className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-exec-high/30 bg-exec-high/10 text-exec-high font-sans text-sm font-bold hover:bg-exec-high/20 transition-all hover:shadow-[0_0_15px_rgba(245,158,11,0.2)]"
                            >
                                <ExclamationTriangleIcon className="h-4 w-4" />
                                Acknowledge
                            </button>
                        )}
                        {status !== 'resolved' && (
                            <button 
                                onClick={() => updateStatus('resolved')}
                                className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-exec-info/30 bg-exec-info/10 text-exec-info font-sans text-sm font-bold hover:bg-exec-info/20 transition-all hover:shadow-[0_0_15px_rgba(16,185,129,0.2)]"
                            >
                                <CheckCircleIcon className="h-4 w-4" />
                                Mark Resolved
                            </button>
                        )}
                        {status !== 'false_positive' && (
                            <button 
                                onClick={() => updateStatus('false_positive')}
                                className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-white/[0.1] bg-white/[0.02] text-slate-400 font-sans text-sm font-bold hover:text-white hover:bg-white/[0.05] transition-all"
                            >
                                <XCircleIcon className="h-4 w-4" />
                                False Positive
                            </button>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-8">
                        
                        {/* Overview Card */}
                        <div className="rounded-3xl border border-white/[0.08] bg-white/[0.02] backdrop-blur-2xl p-8 shadow-[0_8px_32px_rgba(0,0,0,0.2)] relative overflow-hidden hud-fade-in">
                            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.15] to-transparent"></div>
                            
                            <h3 className="text-sm font-sans font-bold text-slate-200 uppercase tracking-widest mb-8 flex items-center gap-2">
                                <DocumentTextIcon className="h-5 w-5 text-exec-indigo" />
                                Incident Overview
                            </h3>
                            
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
                                <div className="bg-white/[0.02] p-4 rounded-2xl border border-white/[0.05] shadow-sm">
                                    <p className="text-[10px] font-sans font-bold uppercase tracking-widest text-slate-500 mb-2 flex items-center gap-1.5">
                                        <ServerIcon className="h-4 w-4" /> Agent
                                    </p>
                                    <div className="font-mono text-sm font-bold text-exec-indigo truncate">{alert.agent?.name || 'Unknown'}</div>
                                </div>
                                <div className="bg-white/[0.02] p-4 rounded-2xl border border-white/[0.05] shadow-sm">
                                    <p className="text-[10px] font-sans font-bold uppercase tracking-widest text-slate-500 mb-2 flex items-center gap-1.5">
                                        <GlobeAltIcon className="h-4 w-4" /> Source IP
                                    </p>
                                    <div className="font-mono text-sm font-bold text-exec-high truncate">{alert.src_ip || 'N/A'}</div>
                                </div>
                                <div className="bg-white/[0.02] p-4 rounded-2xl border border-white/[0.05] shadow-sm">
                                    <p className="text-[10px] font-sans font-bold uppercase tracking-widest text-slate-500 mb-2 flex items-center gap-1.5">
                                        <ChartBarIcon className="h-4 w-4" /> Total Events
                                    </p>
                                    <div className="font-mono text-xl font-bold text-white">{alert.event_count}</div>
                                </div>
                                <div className="bg-white/[0.02] p-4 rounded-2xl border border-white/[0.05] shadow-sm">
                                    <p className="text-[10px] font-sans font-bold uppercase tracking-widest text-slate-500 mb-2 flex items-center gap-1.5">
                                        <ClockIcon className="h-4 w-4" /> First Seen
                                    </p>
                                    <div className="text-sm font-mono font-medium text-slate-300">{new Date(alert.first_seen_at).toLocaleString()}</div>
                                </div>
                                <div className="bg-white/[0.02] p-4 rounded-2xl border border-white/[0.05] shadow-sm">
                                    <p className="text-[10px] font-sans font-bold uppercase tracking-widest text-slate-500 mb-2 flex items-center gap-1.5">
                                        <ClockIcon className="h-4 w-4" /> Last Seen
                                    </p>
                                    <div className="text-sm font-mono font-medium text-slate-300">{new Date(alert.last_seen_at).toLocaleString()}</div>
                                </div>
                                <div className="bg-white/[0.02] p-4 rounded-2xl border border-white/[0.05] shadow-sm">
                                    <p className="text-[10px] font-sans font-bold uppercase tracking-widest text-slate-500 mb-2 flex items-center gap-1.5">
                                        <ShieldExclamationIcon className="h-4 w-4" /> Current Status
                                    </p>
                                    <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-widest border ${
                                        status === 'open' ? 'bg-exec-critical/10 text-exec-critical border-exec-critical/30' :
                                        status === 'acknowledged' ? 'bg-exec-high/10 text-exec-high border-exec-high/30' :
                                        'bg-white/[0.05] text-slate-400 border-white/[0.1]'
                                    }`}>
                                        {status}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Evidence Log */}
                        <div className="rounded-3xl border border-white/[0.08] bg-[#050a16] shadow-[inset_0_0_40px_rgba(0,0,0,0.8)] relative overflow-hidden hud-fade-in hud-stagger-1 flex flex-col h-[500px]">
                            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.12] to-transparent"></div>
                            <div className="px-6 py-5 bg-white/[0.02] border-b border-white/[0.08] flex items-center justify-between z-10 shrink-0">
                                <h3 className="text-sm font-sans font-bold text-slate-200 uppercase tracking-widest flex items-center gap-2">
                                    <ChartBarIcon className="h-5 w-5 text-slate-400" />
                                    Evidence Log
                                </h3>
                            </div>
                            
                            <div className="flex-1 overflow-y-auto p-6 space-y-3 custom-scrollbar">
                                {evidence.length === 0 ? (
                                    <div className="flex items-center justify-center h-full text-slate-500 font-sans font-medium text-sm">No raw evidence lines preserved.</div>
                                ) : (
                                    evidence.map(ev => (
                                        <div key={ev.id} className="p-4 bg-white/[0.02] rounded-xl border border-white/[0.05] hover:border-white/[0.1] hover:bg-white/[0.03] transition-colors font-mono text-[13px] leading-relaxed group">
                                            <div className="text-slate-500 mb-2 flex items-center gap-3">
                                                <span className="text-xs group-hover:text-slate-400 transition-colors">{new Date(ev.occurred_at).toISOString().replace('T', ' ').substring(0, 19)}</span>
                                                <span className="px-2 py-0.5 rounded uppercase tracking-wider text-[10px] font-bold bg-exec-critical/10 text-exec-critical border border-exec-critical/30">{ev.event_type}</span>
                                            </div>
                                            <div className="text-slate-300 break-all group-hover:text-white transition-colors">{ev.raw || ev.message}</div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                    </div>
                    
                    <div className="space-y-8">
                        {/* Rule Details */}
                        <div className="rounded-3xl border border-white/[0.08] bg-white/[0.02] backdrop-blur-2xl p-8 shadow-[0_8px_32px_rgba(0,0,0,0.2)] relative overflow-hidden hud-fade-in hud-stagger-2">
                            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.15] to-transparent"></div>
                            
                            <h3 className="text-sm font-sans font-bold text-slate-200 uppercase tracking-widest mb-6 flex items-center gap-2">
                                <ShieldExclamationIcon className="h-5 w-5 text-exec-indigo" />
                                Rule Details
                            </h3>
                            
                            {rule_info ? (
                                <div>
                                    <div className="text-sm text-slate-300 font-sans font-medium mb-6 leading-relaxed">
                                        {rule_info.description}
                                    </div>
                                    <div className="pt-6 border-t border-white/[0.08]">
                                        <div className="text-xs text-exec-info uppercase tracking-widest font-sans font-bold flex items-center gap-2 mb-3">
                                            <CheckCircleIcon className="h-4 w-4" /> Recommended Actions
                                        </div>
                                        <div className="text-sm text-slate-400 font-sans font-medium leading-relaxed bg-white/[0.02] p-4 rounded-2xl border border-white/[0.05]">
                                            {rule_info.recommended_actions}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-slate-500 font-sans font-medium text-sm py-4">Rule definition not available.</div>
                            )}
                        </div>
                        
                        {/* AI Analysis */}
                        {alert.ai_explanation && (
                            <div className="rounded-3xl border border-[#8b5cf6]/30 bg-[#8b5cf6]/5 backdrop-blur-2xl p-8 shadow-[0_8px_32px_rgba(139,92,246,0.15)] relative overflow-hidden hud-fade-in hud-stagger-3">
                                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#8b5cf6]/50 to-transparent"></div>
                                <div className="absolute -top-24 -right-24 w-48 h-48 bg-[#8b5cf6]/20 rounded-full blur-3xl pointer-events-none"></div>
                                
                                <h3 className="text-sm font-sans font-bold text-[#a78bfa] uppercase tracking-widest mb-6 flex items-center gap-2 relative z-10">
                                    <SparklesIcon className="h-5 w-5 animate-pulse" />
                                    AI Security Analysis
                                </h3>
                                
                                <div className="text-sm text-slate-300 leading-relaxed font-sans font-medium relative z-10 prose prose-invert prose-p:text-slate-300 prose-a:text-[#a78bfa] max-w-none prose-sm">
                                    <div dangerouslySetInnerHTML={{ __html: alert.ai_explanation.replace(/\n/g, '<br />') }} />
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
