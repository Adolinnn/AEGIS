import React, { useState, useEffect, useRef } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router } from '@inertiajs/react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend, PieChart, Pie, Cell } from 'recharts';
import axios from 'axios';
import { ShieldCheckIcon, ShieldExclamationIcon, ServerIcon, SignalIcon, ExclamationTriangleIcon, BugAntIcon, GlobeAltIcon, ChartBarIcon, ArrowPathIcon } from '@heroicons/react/24/outline';

const SEVERITY_COLORS = {
    critical: '#f43f5e', // exec-critical (rose)
    high: '#f59e0b',     // exec-high (amber)
    medium: '#6366f1',   // exec-medium (indigo alternative)
    low: '#10b981',      // exec-info (emerald)
    info: '#94a3b8'      // slate-400
};

export default function Overview({ auth, range, kpis, eventsOverTime, alertsBySeverity, topIps, recentAlerts, agentHealth }) {
    const [data, setData] = useState({ kpis, eventsOverTime, alertsBySeverity, topIps, recentAlerts, agentHealth });
    const pollInterval = useRef(null);

    const changeRange = (newRange) => {
        router.get(route('siem.overview'), { range: newRange }, { preserveState: true });
    };

    useEffect(() => {
        // Poll for updates every 10 seconds
        pollInterval.current = setInterval(async () => {
            if (document.hidden) return; // Don't poll when tab is hidden
            
            try {
                const response = await axios.get(route('siem.overview'), {
                    headers: { 'Accept': 'application/json' },
                    params: { range }
                });
                setData(response.data);
            } catch (e) {
                console.error("Polling error", e);
            }
        }, 10000);

        return () => clearInterval(pollInterval.current);
    }, [range]);

    return (
        <AuthenticatedLayout user={auth.user}>
            <Head title="SIEM Overview" />

            <div className="py-10 max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
                
                {/* Header & Controls */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <div className="flex items-center gap-3">
                            <span className="font-sans text-[10px] px-2.5 py-1 rounded-full bg-exec-indigo/10 text-exec-indigo border border-exec-indigo/30 font-bold uppercase tracking-wider flex items-center gap-2 shadow-[0_0_10px_rgba(99,102,241,0.2)]">
                                <ShieldCheckIcon className="h-3 w-3" />
                                SIEM Overview
                            </span>
                            <span className="text-slate-500 text-sm font-sans">/</span>
                            <span className="font-sans text-xs text-slate-400 font-medium">Security Information & Event Management</span>
                        </div>
                        <h2 className="text-3xl font-sans font-bold text-white tracking-tight mt-3 drop-shadow-md">
                            SIEM Operations Center
                        </h2>
                    </div>
                    
                    <div className="flex items-center gap-4">
                        <div className="bg-white/[0.02] border border-white/[0.1] rounded-xl p-1.5 flex backdrop-blur-md shadow-sm">
                            {['1h', '24h', '7d'].map(r => (
                                <button 
                                    key={r}
                                    onClick={() => changeRange(r)}
                                    className={`px-5 py-2 text-xs font-sans font-bold uppercase tracking-widest rounded-lg transition-all ${
                                        range === r 
                                            ? 'bg-exec-indigo/20 text-white shadow-[0_0_10px_rgba(99,102,241,0.3)]' 
                                            : 'text-slate-500 hover:text-slate-300 hover:bg-white/[0.05]'
                                    }`}
                                >
                                    {r}
                                </button>
                            ))}
                        </div>
                        <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl border border-exec-info/30 bg-exec-info/10">
                            <div className="w-2 h-2 rounded-full bg-exec-info animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                            <span className="text-xs font-sans font-bold text-exec-info uppercase tracking-widest">LIVE</span>
                        </div>
                    </div>
                </div>

                {/* KPI Row */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-5 hud-fade-in">
                    <div className="rounded-3xl border border-white/[0.08] bg-white/[0.02] backdrop-blur-2xl p-6 shadow-[0_8px_32px_rgba(0,0,0,0.2)] relative overflow-hidden group hover:border-white/[0.15] transition-colors">
                        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.15] to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <div className="text-xs font-sans font-bold text-slate-400 uppercase tracking-widest mb-2">Agents Online</div>
                        <div className="text-3xl font-sans font-bold text-white flex items-baseline gap-2 mt-2 drop-shadow-md">
                            {data.kpis.online_agents} <span className="text-sm font-medium text-slate-500">/ {data.kpis.total_agents}</span>
                        </div>
                    </div>
                    <div className="rounded-3xl border border-exec-indigo/20 bg-exec-indigo/5 backdrop-blur-2xl p-6 shadow-[0_8px_32px_rgba(99,102,241,0.1)] relative overflow-hidden group hover:border-exec-indigo/40 transition-colors">
                        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-exec-indigo/50 to-transparent"></div>
                        <div className="text-xs font-sans font-bold text-exec-indigo/80 uppercase tracking-widest mb-2">Events In Range</div>
                        <div className="text-3xl font-sans font-bold text-exec-indigo mt-2 drop-shadow-md">{data.kpis.total_events.toLocaleString()}</div>
                    </div>
                    <div className="rounded-3xl border border-exec-critical/20 bg-exec-critical/5 backdrop-blur-2xl p-6 shadow-[0_8px_32px_rgba(244,63,94,0.1)] relative overflow-hidden group hover:border-exec-critical/40 transition-colors">
                        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-exec-critical/50 to-transparent"></div>
                        <div className="text-xs font-sans font-bold text-exec-critical/80 uppercase tracking-widest mb-2">Critical Open</div>
                        <div className="text-3xl font-sans font-bold text-exec-critical mt-2 drop-shadow-md">{data.kpis.open_critical}</div>
                    </div>
                    <div className="rounded-3xl border border-exec-high/20 bg-exec-high/5 backdrop-blur-2xl p-6 shadow-[0_8px_32px_rgba(245,158,11,0.1)] relative overflow-hidden group hover:border-exec-high/40 transition-colors">
                        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-exec-high/50 to-transparent"></div>
                        <div className="text-xs font-sans font-bold text-exec-high/80 uppercase tracking-widest mb-2">High Open</div>
                        <div className="text-3xl font-sans font-bold text-exec-high mt-2 drop-shadow-md">{data.kpis.open_high}</div>
                    </div>
                    <div className="rounded-3xl border border-white/[0.08] bg-white/[0.02] backdrop-blur-2xl p-6 shadow-[0_8px_32px_rgba(0,0,0,0.2)] relative overflow-hidden group hover:border-white/[0.15] transition-colors">
                        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.15] to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <div className="text-xs font-sans font-bold text-slate-400 uppercase tracking-widest mb-2">Top Attacker</div>
                        <div className="text-lg font-mono font-bold text-exec-critical truncate mt-2 drop-shadow-md">{data.kpis.top_attacker || '—'}</div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 hud-fade-in hud-stagger-1">
                    {/* Events Over Time Chart */}
                    <div className="lg:col-span-2 rounded-3xl border border-white/[0.08] bg-white/[0.02] backdrop-blur-2xl p-8 shadow-[0_8px_32px_rgba(0,0,0,0.2)] relative overflow-hidden flex flex-col">
                        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.12] to-transparent"></div>
                        <h3 className="text-sm font-sans font-bold text-slate-200 uppercase tracking-widest mb-6 flex items-center gap-2">
                            <ChartBarIcon className="h-5 w-5 text-exec-indigo" />
                            Events Volume
                        </h3>
                        <div className="flex-1 min-h-[250px]">
                            {data.eventsOverTime.length === 0 ? (
                                <div className="h-full flex items-center justify-center text-slate-500 text-sm font-medium">No events in this time range</div>
                            ) : (
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={data.eventsOverTime}>
                                        <defs>
                                            <linearGradient id="colorAuth" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.5}/>
                                                <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                            </linearGradient>
                                            <linearGradient id="colorWeb" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.5}/>
                                                <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                                            </linearGradient>
                                        </defs>
                                        <XAxis dataKey="time" stroke="#475569" fontSize={11} tickMargin={12} axisLine={false} tickLine={false} />
                                        <YAxis stroke="#475569" fontSize={11} axisLine={false} tickLine={false} />
                                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff" strokeOpacity={0.05} vertical={false} />
                                        <Tooltip 
                                            contentStyle={{ backgroundColor: 'rgba(5, 7, 16, 0.9)', borderColor: 'rgba(255, 255, 255, 0.1)', color: '#f8fafc', borderRadius: '12px', backdropFilter: 'blur(8px)', padding: '12px' }} 
                                            itemStyle={{ fontSize: '13px', fontWeight: 'bold' }}
                                            labelStyle={{ color: '#94a3b8', fontSize: '11px', marginBottom: '8px' }}
                                        />
                                        
                                        <Area type="monotone" dataKey="ssh_auth_failed" stackId="1" stroke="#10b981" strokeWidth={2} fill="url(#colorAuth)" />
                                        <Area type="monotone" dataKey="web_access" stackId="1" stroke="#6366f1" strokeWidth={2} fill="url(#colorWeb)" />
                                        <Area type="monotone" dataKey="sudo_command" stackId="1" stroke="#f59e0b" strokeWidth={2} fill="#f59e0b" fillOpacity={0.2} />
                                    </AreaChart>
                                </ResponsiveContainer>
                            )}
                        </div>
                    </div>

                    {/* Alerts By Severity */}
                    <div className="rounded-3xl border border-white/[0.08] bg-white/[0.02] backdrop-blur-2xl p-8 shadow-[0_8px_32px_rgba(0,0,0,0.2)] relative overflow-hidden flex flex-col">
                        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.12] to-transparent"></div>
                        <h3 className="text-sm font-sans font-bold text-slate-200 uppercase tracking-widest mb-6 flex items-center gap-2">
                            <ShieldExclamationIcon className="h-5 w-5 text-exec-high" />
                            Alert Breakdown
                        </h3>
                        <div className="flex-1 min-h-[250px] relative">
                            {data.alertsBySeverity.length === 0 ? (
                                <div className="h-full flex items-center justify-center text-slate-500 text-sm font-medium">No alerts in this time range</div>
                            ) : (
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={data.alertsBySeverity}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={70}
                                            outerRadius={95}
                                            paddingAngle={8}
                                            dataKey="count"
                                            nameKey="severity"
                                            stroke="none"
                                        >
                                            {data.alertsBySeverity.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={SEVERITY_COLORS[entry.severity] || SEVERITY_COLORS.info} />
                                            ))}
                                        </Pie>
                                        <Tooltip 
                                            contentStyle={{ backgroundColor: 'rgba(5, 7, 16, 0.9)', borderColor: 'rgba(255, 255, 255, 0.1)', color: '#f8fafc', borderRadius: '12px', backdropFilter: 'blur(8px)', padding: '12px' }}
                                            itemStyle={{ color: '#e2e8f0', textTransform: 'uppercase', fontSize: '13px', fontWeight: 'bold' }}
                                            labelStyle={{ display: 'none' }}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                            )}
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 hud-fade-in hud-stagger-2">
                    {/* Top Attacking IPs */}
                    <div className="rounded-3xl border border-white/[0.08] bg-white/[0.02] backdrop-blur-2xl p-8 shadow-[0_8px_32px_rgba(0,0,0,0.2)] relative overflow-hidden flex flex-col">
                        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.12] to-transparent"></div>
                        <h3 className="text-sm font-sans font-bold text-slate-200 uppercase tracking-widest mb-6 flex items-center gap-2">
                            <GlobeAltIcon className="h-5 w-5 text-exec-critical" />
                            Top Attacking IPs
                        </h3>
                        <div className="overflow-x-auto flex-1">
                            {data.topIps.length === 0 ? (
                                <div className="py-12 text-center text-slate-500 text-sm font-medium">No threat activity detected.</div>
                            ) : (
                                <table className="w-full text-left text-sm text-slate-300">
                                    <thead className="text-[10px] uppercase text-slate-400 font-sans font-bold tracking-widest border-b border-white/[0.08]">
                                        <tr>
                                            <th className="px-4 py-3">Source IP</th>
                                            <th className="px-4 py-3 text-right">Alerts</th>
                                            <th className="px-4 py-3 text-right">Events</th>
                                            <th className="px-4 py-3 text-right">Last Seen</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/[0.04]">
                                        {data.topIps.map((ip, i) => (
                                            <tr key={i} className="hover:bg-white/[0.03] transition-colors cursor-pointer group" onClick={() => router.get(route('siem.events.index', { src_ip: ip.src_ip }))}>
                                                <td className="px-4 py-4 font-mono font-bold text-exec-indigo group-hover:text-white transition-colors">{ip.src_ip}</td>
                                                <td className="px-4 py-4 text-right font-bold text-exec-critical">{ip.alert_count}</td>
                                                <td className="px-4 py-4 text-right font-medium text-slate-400">{ip.event_count}</td>
                                                <td className="px-4 py-4 text-right text-xs font-mono text-slate-500">{new Date(ip.last_seen).toLocaleString()}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>

                    {/* Recent Alerts Feed */}
                    <div className="rounded-3xl border border-white/[0.08] bg-white/[0.02] backdrop-blur-2xl p-8 shadow-[0_8px_32px_rgba(0,0,0,0.2)] relative overflow-hidden flex flex-col">
                        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.12] to-transparent"></div>
                        <h3 className="text-sm font-sans font-bold text-slate-200 uppercase tracking-widest mb-6 flex items-center gap-2">
                            <SignalIcon className="h-5 w-5 text-exec-high animate-pulse" />
                            Live Threat Feed
                        </h3>
                        <div className="space-y-4 flex-1 overflow-y-auto pr-2 custom-scrollbar max-h-[350px]">
                            {data.recentAlerts.length === 0 ? (
                                <div className="h-full min-h-[200px] flex items-center justify-center text-slate-500 text-sm font-medium">All quiet. No recent alerts.</div>
                            ) : (
                                data.recentAlerts.map(alert => (
                                    <Link key={alert.id} href={route('siem.alerts.show', alert.id)} className="block p-5 rounded-2xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.05] hover:border-white/[0.1] transition-all group relative overflow-hidden shadow-sm">
                                        <div className="absolute left-0 top-0 bottom-0 w-1 opacity-80" style={{ backgroundColor: SEVERITY_COLORS[alert.severity] }}></div>
                                        <div className="flex justify-between items-start mb-2 pl-2">
                                            <div className="flex items-center gap-3">
                                                <span className="text-sm font-bold text-slate-100 group-hover:text-white transition-colors">{alert.title}</span>
                                            </div>
                                            <span className="text-[10px] text-slate-500 font-mono font-bold">{new Date(alert.last_seen_at).toLocaleTimeString()}</span>
                                        </div>
                                        <div className="flex flex-wrap gap-4 text-xs font-sans font-medium text-slate-500 pl-2">
                                            <span className="bg-black/20 px-2 py-1 rounded">Agent: <span className="text-slate-300 font-bold">{alert.agent?.name}</span></span>
                                            {alert.src_ip && <span className="bg-black/20 px-2 py-1 rounded">IP: <span className="text-exec-high font-mono font-bold">{alert.src_ip}</span></span>}
                                        </div>
                                    </Link>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                {/* Agent Health Strip */}
                <div className="rounded-3xl border border-white/[0.08] bg-white/[0.02] backdrop-blur-2xl p-8 shadow-[0_8px_32px_rgba(0,0,0,0.2)] relative overflow-hidden hud-fade-in hud-stagger-3">
                    <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.12] to-transparent"></div>
                    <h3 className="text-sm font-sans font-bold text-slate-200 uppercase tracking-widest mb-6 flex items-center gap-2">
                        <ServerIcon className="h-5 w-5 text-exec-info" />
                        Agent Telemetry Status
                    </h3>
                    {data.agentHealth.length === 0 ? (
                        <div className="py-8 text-center text-slate-500 text-sm font-medium">No agents enrolled yet. Install an agent to begin monitoring.</div>
                    ) : (
                        <div className="flex flex-wrap gap-4">
                            {data.agentHealth.map(agent => (
                                <Link key={agent.id} href={route('siem.agents.index')} className={`p-4 rounded-2xl border flex items-center gap-4 w-64 hover:-translate-y-1 transition-transform shadow-sm ${agent.status === 'active' ? 'bg-exec-info/10 border-exec-info/30 hover:shadow-[0_4px_15px_rgba(16,185,129,0.15)]' : 'bg-exec-critical/10 border-exec-critical/30 hover:shadow-[0_4px_15px_rgba(244,63,94,0.15)]'}`}>
                                    <div className="relative">
                                        <div className={`w-3.5 h-3.5 rounded-full ${agent.status === 'active' ? 'bg-exec-info shadow-[0_0_8px_rgba(16,185,129,0.8)]' : 'bg-exec-critical shadow-[0_0_8px_rgba(244,63,94,0.8)]'}`}></div>
                                        {agent.status === 'active' && <div className="absolute inset-0 rounded-full bg-exec-info animate-ping opacity-75"></div>}
                                    </div>
                                    <div className="flex-1 overflow-hidden">
                                        <div className="text-sm font-bold text-slate-100 truncate">{agent.name}</div>
                                        <div className="text-[10px] font-sans font-bold uppercase tracking-widest text-slate-500 mt-1">
                                            Risk Score: <span className={agent.risk_score > 0 ? 'text-exec-critical text-xs' : 'text-exec-info text-xs'}>{agent.risk_score}</span>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>

            </div>
        </AuthenticatedLayout>
    );
}
