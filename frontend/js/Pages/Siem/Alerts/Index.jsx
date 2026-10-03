import React, { useState, useEffect, useRef } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router } from '@inertiajs/react';
import axios from 'axios';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import { ShieldExclamationIcon, FunnelIcon, ServerIcon, GlobeAltIcon } from '@heroicons/react/24/outline';

export default function AlertsIndex({ auth, alerts, filters, agents }) {
    const [statusFilter, setStatusFilter] = useState(filters.status || 'open');
    const [severityFilter, setSeverityFilter] = useState(filters.severity || '');
    
    const applyFilters = () => {
        router.get(route('siem.alerts.index'), {
            status: statusFilter,
            severity: severityFilter,
        }, { preserveState: true });
    };

    const getSeverityColor = (sev) => {
        switch (sev) {
            case 'critical': return 'text-exec-critical bg-exec-critical/10 border-exec-critical/40 shadow-[0_0_10px_rgba(244,63,94,0.15)]';
            case 'high': return 'text-exec-high bg-exec-high/10 border-exec-high/40 shadow-[0_0_10px_rgba(245,158,11,0.15)]';
            case 'medium': return 'text-exec-medium bg-exec-medium/10 border-exec-medium/40 shadow-[0_0_10px_rgba(99,102,241,0.15)]';
            case 'low': return 'text-exec-info bg-exec-info/10 border-exec-info/40 shadow-[0_0_10px_rgba(16,185,129,0.15)]';
            case 'info': return 'text-slate-400 bg-white/[0.05] border-white/[0.1]';
            default: return 'text-slate-400 bg-white/[0.05] border-white/[0.1]';
        }
    };

    return (
        <AuthenticatedLayout user={auth.user}>
            <Head title="SIEM Alerts" />

            <div className="py-10 max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
                
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <div className="flex items-center gap-3">
                            <span className="font-sans text-[10px] px-2.5 py-1 rounded-full bg-exec-critical/10 text-exec-critical border border-exec-critical/30 font-bold uppercase tracking-wider flex items-center gap-2 shadow-[0_0_10px_rgba(244,63,94,0.2)]">
                                <ShieldExclamationIcon className="h-3 w-3" />
                                Threat Intelligence
                            </span>
                            <span className="text-slate-500 text-sm font-sans">/</span>
                            <span className="font-sans text-xs text-slate-400 font-medium">Security Information & Event Management</span>
                        </div>
                        <h2 className="text-3xl font-sans font-bold text-white tracking-tight mt-3 drop-shadow-md">
                            Security Alerts
                        </h2>
                    </div>
                </div>

                <div className="rounded-3xl border border-white/[0.08] bg-white/[0.02] backdrop-blur-2xl p-6 shadow-[0_8px_32px_rgba(0,0,0,0.2)] flex flex-wrap gap-5 items-end relative overflow-hidden hud-fade-in">
                    <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.12] to-transparent"></div>
                    <div className="flex items-center gap-2 text-slate-400 font-sans text-sm font-bold uppercase tracking-widest mr-2">
                        <FunnelIcon className="h-5 w-5 text-exec-indigo" />
                        Filters
                    </div>
                    <div className="w-48">
                        <label className="block text-[10px] text-slate-400 mb-2 uppercase tracking-widest font-sans font-bold">Status</label>
                        <select 
                            className="w-full bg-white/[0.03] border-white/[0.1] text-sm h-11 rounded-xl text-white focus:ring-exec-indigo focus:border-exec-indigo transition-colors"
                            value={statusFilter}
                            onChange={e => setStatusFilter(e.target.value)}
                        >
                            <option value="" className="bg-[#0f111a]">All</option>
                            <option value="open" className="bg-[#0f111a]">Open</option>
                            <option value="acknowledged" className="bg-[#0f111a]">Acknowledged</option>
                            <option value="resolved" className="bg-[#0f111a]">Resolved</option>
                            <option value="false_positive" className="bg-[#0f111a]">False Positive</option>
                        </select>
                    </div>
                    <div className="w-48">
                        <label className="block text-[10px] text-slate-400 mb-2 uppercase tracking-widest font-sans font-bold">Severity</label>
                        <select 
                            className="w-full bg-white/[0.03] border-white/[0.1] text-sm h-11 rounded-xl text-white focus:ring-exec-indigo focus:border-exec-indigo transition-colors"
                            value={severityFilter}
                            onChange={e => setSeverityFilter(e.target.value)}
                        >
                            <option value="" className="bg-[#0f111a]">All</option>
                            <option value="critical" className="bg-[#0f111a]">Critical</option>
                            <option value="high" className="bg-[#0f111a]">High</option>
                            <option value="medium" className="bg-[#0f111a]">Medium</option>
                            <option value="low" className="bg-[#0f111a]">Low</option>
                            <option value="info" className="bg-[#0f111a]">Info</option>
                        </select>
                    </div>
                    <button 
                        onClick={applyFilters} 
                        className="h-11 px-8 rounded-xl bg-gradient-to-r from-exec-indigo to-[#8b5cf6] text-white font-sans text-sm font-bold hover:shadow-[0_0_20px_rgba(99,102,241,0.5)] active:scale-[0.98] transition-all relative overflow-hidden"
                    >
                        <div className="absolute inset-0 bg-white/20 hover:opacity-0 transition-opacity rounded-xl pointer-events-none"></div>
                        Apply Filters
                    </button>
                </div>

                <div className="rounded-3xl border border-white/[0.08] bg-white/[0.02] backdrop-blur-2xl shadow-[0_8px_32px_rgba(0,0,0,0.2)] overflow-hidden relative hud-fade-in hud-stagger-1">
                    <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.12] to-transparent"></div>
                    
                    {alerts.data.length === 0 ? (
                        <div className="p-16 text-center text-slate-500 flex flex-col items-center">
                            <div className="p-4 rounded-full bg-white/[0.02] border border-white/[0.05] mb-4">
                                <ShieldExclamationIcon className="h-10 w-10 text-slate-400" />
                            </div>
                            <h3 className="text-lg font-sans font-bold text-slate-300">No alerts found</h3>
                            <p className="text-sm font-medium mt-2 max-w-sm">You're all clear based on the current filters.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full text-left text-sm text-slate-300">
                                <thead className="bg-white/[0.01] text-xs uppercase text-slate-400 font-sans font-bold tracking-wider border-b border-white/[0.08]">
                                    <tr>
                                        <th className="px-6 py-4">Severity</th>
                                        <th className="px-6 py-4">Title</th>
                                        <th className="px-6 py-4">Agent</th>
                                        <th className="px-6 py-4">Source IP</th>
                                        <th className="px-6 py-4 text-center">Events</th>
                                        <th className="px-6 py-4">Last Seen</th>
                                        <th className="px-6 py-4">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/[0.04]">
                                    {alerts.data.map(alert => (
                                        <tr key={alert.id} className="hover:bg-white/[0.03] hover:pl-2 transition-all group cursor-pointer" onClick={() => router.get(route('siem.alerts.show', alert.id))}>
                                            <td className="px-6 py-5 whitespace-nowrap">
                                                <span className={`px-2.5 py-1 rounded-full font-mono text-[10px] font-bold uppercase tracking-widest border ${getSeverityColor(alert.severity)}`}>
                                                    {alert.severity}
                                                </span>
                                            </td>
                                            <td className="px-6 py-5 font-sans font-bold text-slate-200 group-hover:text-white transition-colors">
                                                {alert.title}
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="flex items-center gap-2">
                                                    <ServerIcon className="h-4 w-4 text-slate-500" />
                                                    <span className="font-sans font-bold text-exec-indigo group-hover:text-white transition-colors">{alert.agent?.name}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="flex items-center gap-2">
                                                    <GlobeAltIcon className="h-4 w-4 text-slate-500" />
                                                    <span className="font-mono text-xs font-bold text-slate-300">{alert.src_ip || 'N/A'}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5 text-center">
                                                <span className="inline-flex items-center justify-center px-3 py-1 rounded-full bg-white/[0.05] border border-white/[0.1] font-mono text-xs font-bold text-slate-300">
                                                    {alert.event_count}
                                                </span>
                                            </td>
                                            <td className="px-6 py-5 font-mono text-xs text-slate-400 whitespace-nowrap">
                                                {new Date(alert.last_seen_at).toLocaleString()}
                                            </td>
                                            <td className="px-6 py-5 whitespace-nowrap">
                                                <span className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-widest border ${
                                                    alert.status === 'open' ? 'bg-exec-critical/10 text-exec-critical border-exec-critical/30' :
                                                    alert.status === 'acknowledged' ? 'bg-exec-high/10 text-exec-high border-exec-high/30' :
                                                    'bg-white/[0.05] text-slate-400 border-white/[0.1]'
                                                }`}>
                                                    {alert.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {alerts.links && alerts.data.length > 0 && (
                    <div className="flex justify-center gap-2 mt-6">
                        {alerts.links.map((link, i) => (
                            <button
                                key={i}
                                onClick={() => link.url && router.get(link.url, {}, { preserveState: true, preserveScroll: true })}
                                disabled={!link.url}
                                dangerouslySetInnerHTML={{ __html: link.label }}
                                className={`px-4 py-2 text-sm font-sans font-bold rounded-xl border transition-all ${
                                    link.active 
                                        ? 'bg-exec-indigo/20 text-white border-exec-indigo/50 shadow-[0_0_15px_rgba(99,102,241,0.2)]' 
                                        : 'bg-white/[0.02] text-slate-400 border-white/[0.1] hover:bg-white/[0.05] hover:text-white'
                                } ${!link.url && 'opacity-50 cursor-not-allowed border-transparent'}`}
                            />
                        ))}
                    </div>
                )}
            </div>
        </AuthenticatedLayout>
    );
}
