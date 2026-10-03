import React, { useState, useEffect, useRef } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router } from '@inertiajs/react';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import TextInput from '@/Components/TextInput';
import axios from 'axios';
import { CommandLineIcon, FunnelIcon, SignalIcon } from '@heroicons/react/24/outline';

export default function EventsIndex({ auth, events: initialEvents, filters, agents }) {
    const [events, setEvents] = useState(initialEvents.data);
    const [isLiveTail, setIsLiveTail] = useState(false);
    const [searchTerm, setSearchTerm] = useState(filters.search || '');
    const [agentFilter, setAgentFilter] = useState(filters.agent_id || '');
    const [typeFilter, setTypeFilter] = useState(filters.event_type || '');
    const tailInterval = useRef(null);

    // Sync events when props change (from search/filter)
    useEffect(() => {
        setEvents(initialEvents.data);
    }, [initialEvents]);

    // Apply filters
    const applyFilters = () => {
        setIsLiveTail(false); // Stop live tail when manually searching
        router.get(route('siem.events.index'), {
            search: searchTerm,
            agent_id: agentFilter,
            event_type: typeFilter,
        }, { preserveState: true });
    };

    const explainLog = (ev) => {
        const prompt = `Analyze this SIEM event log. Identify the action, the risk level, and what it implies. Provide 2-3 specific remediation steps if it is a threat.\n\nLog:\n${ev.raw || JSON.stringify(ev.fields)}`;
        window.dispatchEvent(new CustomEvent('ai-chat-action', { detail: { prompt } }));
    };

    const toggleLiveTail = () => {
        setIsLiveTail(!isLiveTail);
    };

    useEffect(() => {
        if (isLiveTail) {
            tailInterval.current = setInterval(async () => {
                const lastEvent = events.length > 0 ? events[0] : null;
                const lastId = lastEvent ? lastEvent.id : 0;
                
                try {
                    const response = await axios.get(route('siem.events.index'), {
                        headers: { 'Accept': 'application/json' },
                        params: { 
                            last_id: lastId,
                            search: searchTerm,
                            agent_id: agentFilter,
                            event_type: typeFilter,
                        }
                    });
                    
                    if (response.data.events && response.data.events.length > 0) {
                        setEvents(prev => [...response.data.events.reverse(), ...prev].slice(0, 500)); // keep last 500
                    }
                } catch (e) {
                    console.error("Live tail error", e);
                }
            }, 3000);
        } else {
            if (tailInterval.current) clearInterval(tailInterval.current);
        }

        return () => {
            if (tailInterval.current) clearInterval(tailInterval.current);
        };
    }, [isLiveTail, events, searchTerm, agentFilter, typeFilter]);

    return (
        <AuthenticatedLayout user={auth.user}>
            <Head title="Log Explorer" />

            <div className="py-10 max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 flex flex-col h-[calc(100vh-100px)]">
                
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 shrink-0">
                    <div>
                        <div className="flex items-center gap-3">
                            <span className="font-sans text-[10px] px-2.5 py-1 rounded-full bg-exec-indigo/10 text-exec-indigo border border-exec-indigo/30 font-bold uppercase tracking-wider flex items-center gap-2 shadow-[0_0_10px_rgba(99,102,241,0.2)]">
                                <CommandLineIcon className="h-3 w-3" />
                                Threat Telemetry
                            </span>
                            <span className="text-slate-500 text-sm font-sans">/</span>
                            <span className="font-sans text-xs text-slate-400 font-medium">Security Information & Event Management</span>
                        </div>
                        <h2 className="text-3xl font-sans font-bold text-white tracking-tight mt-3 drop-shadow-md">
                            Log Explorer
                        </h2>
                    </div>
                    <div className="flex items-center gap-4">
                        <button 
                            onClick={toggleLiveTail}
                            className={`flex items-center gap-2.5 px-6 py-2.5 rounded-xl font-sans text-sm font-bold tracking-wide transition-all relative overflow-hidden group ${
                                isLiveTail 
                                    ? 'bg-exec-info/10 text-exec-info border border-exec-info/30 shadow-[0_0_20px_rgba(16,185,129,0.15)] hover:bg-exec-info/20' 
                                    : 'bg-white/[0.05] text-slate-300 border border-white/[0.1] hover:bg-white/[0.1] hover:text-white'
                            }`}
                        >
                            <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                            <SignalIcon className={`h-4 w-4 ${isLiveTail ? 'animate-pulse text-exec-info' : 'text-slate-400'}`} />
                            Live Tail {isLiveTail ? 'ON' : 'OFF'}
                            {isLiveTail && (
                                <span className="absolute top-0 right-0 w-2 h-2 mr-2 mt-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-exec-info opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-exec-info"></span>
                                </span>
                            )}
                        </button>
                    </div>
                </div>

                <div className="rounded-t-3xl border border-white/[0.08] border-b-0 bg-white/[0.02] backdrop-blur-2xl p-5 shadow-[0_8px_32px_rgba(0,0,0,0.2)] flex flex-wrap gap-5 items-end relative shrink-0 hud-fade-in">
                    <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.12] to-transparent"></div>
                    <div className="flex items-center gap-2 text-slate-400 font-sans text-sm font-bold uppercase tracking-widest mr-2">
                        <FunnelIcon className="h-5 w-5 text-exec-indigo" />
                        Filters
                    </div>
                    <div className="flex-1 min-w-[200px]">
                        <label className="block text-[10px] text-slate-400 mb-2 uppercase tracking-widest font-sans font-bold">Search Text</label>
                        <TextInput 
                            className="w-full bg-white/[0.03] border-white/[0.1] text-sm h-11 rounded-xl text-white focus:ring-exec-indigo focus:border-exec-indigo transition-colors placeholder:text-slate-600" 
                            placeholder="e.g. invalid user, 192.168.1.5"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && applyFilters()}
                        />
                    </div>
                    <div className="w-48">
                        <label className="block text-[10px] text-slate-400 mb-2 uppercase tracking-widest font-sans font-bold">Agent</label>
                        <select 
                            className="w-full bg-white/[0.03] border-white/[0.1] text-sm h-11 rounded-xl text-white focus:ring-exec-indigo focus:border-exec-indigo transition-colors"
                            value={agentFilter}
                            onChange={e => setAgentFilter(e.target.value)}
                        >
                            <option value="" className="bg-[#0f111a]">All Agents</option>
                            {agents.map(a => <option key={a.id} value={a.id} className="bg-[#0f111a]">{a.name}</option>)}
                        </select>
                    </div>
                    <div className="w-48">
                        <label className="block text-[10px] text-slate-400 mb-2 uppercase tracking-widest font-sans font-bold">Event Type</label>
                        <TextInput 
                            className="w-full bg-white/[0.03] border-white/[0.1] text-sm h-11 rounded-xl text-white focus:ring-exec-indigo focus:border-exec-indigo transition-colors placeholder:text-slate-600" 
                            placeholder="e.g. ssh_auth_failed"
                            value={typeFilter}
                            onChange={e => setTypeFilter(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && applyFilters()}
                        />
                    </div>
                    <button 
                        onClick={applyFilters} 
                        className="h-11 px-8 rounded-xl bg-gradient-to-r from-exec-indigo to-[#8b5cf6] text-white font-sans text-sm font-bold hover:shadow-[0_0_20px_rgba(99,102,241,0.5)] active:scale-[0.98] transition-all relative overflow-hidden"
                    >
                        <div className="absolute inset-0 bg-white/20 hover:opacity-0 transition-opacity rounded-xl pointer-events-none"></div>
                        Search
                    </button>
                </div>

                <div className="flex-1 bg-[#050a16] border border-white/[0.08] rounded-b-3xl overflow-hidden flex flex-col shadow-[inset_0_0_40px_rgba(0,0,0,0.8)] relative hud-fade-in hud-stagger-1">
                    {/* Log Terminal Header */}
                    <div className="bg-white/[0.02] border-b border-white/[0.08] px-6 py-3 flex items-center font-sans text-[10px] font-bold uppercase tracking-widest text-slate-400 shrink-0 shadow-md z-10">
                        <div className="w-48">TIMESTAMP</div>
                        <div className="w-32">AGENT</div>
                        <div className="w-48">TYPE</div>
                        <div className="flex-1">MESSAGE / RAW</div>
                    </div>
                    
                    {/* Log List */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-1.5 custom-scrollbar font-mono text-[13px] leading-relaxed">
                        {events.length === 0 ? (
                            <div className="text-slate-500 flex h-full items-center justify-center font-sans font-medium">
                                No events found matching these filters.
                            </div>
                        ) : (
                            events.map((ev, i) => (
                                <div key={ev.id} className="flex items-start gap-6 hover:bg-white/[0.03] px-2 py-1.5 rounded-lg transition-colors group">
                                    <div className="w-44 text-slate-500 shrink-0 whitespace-nowrap pt-0.5 group-hover:text-slate-400 transition-colors">
                                        {new Date(ev.occurred_at).toISOString().replace('T', ' ').substring(0, 19)}
                                    </div>
                                    <div className="w-28 text-exec-indigo/80 font-bold shrink-0 truncate pt-0.5 group-hover:text-exec-indigo transition-colors" title={ev.agent?.name || ev.agent_id}>
                                        {ev.agent?.name || ev.agent_id}
                                    </div>
                                    <div className="w-44 shrink-0 truncate pt-0.5">
                                        <span className={`px-2 py-0.5 rounded uppercase tracking-wider text-[10px] font-bold border ${
                                            ev.event_type === 'unknown' ? 'bg-white/[0.05] text-slate-400 border-white/[0.1]' : 
                                            ev.event_type.includes('fail') ? 'bg-exec-critical/10 text-exec-critical border-exec-critical/30' : 
                                            'bg-exec-info/10 text-exec-info border-exec-info/30'
                                        }`}>
                                            {ev.event_type}
                                        </span>
                                    </div>
                                    <div className="flex-1 text-slate-300 break-all relative group/explain">
                                        <div className="group-hover:text-white transition-colors">{ev.message || ev.raw}</div>
                                        {ev.fields && Object.keys(ev.fields).length > 0 && (
                                            <div className="mt-2 flex flex-wrap gap-2">
                                                {Object.entries(ev.fields).map(([k,v]) => (
                                                    <span key={k} className="text-[11px] bg-[#0a0f1c] text-slate-300 px-2.5 py-1 rounded-md border border-white/[0.08] shadow-sm">
                                                        <span className="text-slate-500 font-bold mr-1.5">{k}:</span>
                                                        <span className={k === 'src_ip' ? 'text-exec-high font-bold' : ''}>{v}</span>
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                        
                                        {/* AI Explain Output */}
                                    </div>
                                    <div className="shrink-0 pl-2">
                                        <button 
                                            onClick={() => explainLog(ev)}
                                            className="p-1.5 rounded-md transition-all bg-white/[0.03] text-slate-500 hover:bg-exec-indigo/20 hover:text-exec-indigo border border-white/[0.05] hover:border-exec-indigo/30 opacity-0 group-hover:opacity-100"
                                            title="Analyze with AI"
                                        >
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" /></svg>
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
                
                {/* Pagination (only visible when not live tailing) */}
                {!isLiveTail && initialEvents.links && (
                    <div className="flex justify-center gap-2 mt-6 shrink-0 hud-fade-in hud-stagger-2">
                        {initialEvents.links.map((link, i) => (
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
