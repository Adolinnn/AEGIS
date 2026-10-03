import React, { useState, useEffect, useRef } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm, router, usePage } from '@inertiajs/react';
import Modal from '@/Components/Modal';
import PrimaryButton from '@/Components/PrimaryButton';
import DangerButton from '@/Components/DangerButton';
import SecondaryButton from '@/Components/SecondaryButton';
import TextInput from '@/Components/TextInput';
import InputLabel from '@/Components/InputLabel';
import InputError from '@/Components/InputError';
import Checkbox from '@/Components/Checkbox';
import { ServerIcon, CpuChipIcon, BoltIcon, ExclamationTriangleIcon, PlusIcon, DocumentDuplicateIcon, ArrowPathIcon, XMarkIcon, CheckCircleIcon, PlayIcon, StopIcon, ShieldCheckIcon } from '@heroicons/react/24/outline';

export default function AgentsIndex({ auth, agents, current_version, public_url }) {
    const { flash = {} } = usePage().props;
    const [isWizardOpen, setIsWizardOpen] = useState(false);
    const [wizardStep, setWizardStep] = useState(1);
    
    // Polling for agent status
    const [pollingAgent, setPollingAgent] = useState(null);
    const [agentConnected, setAgentConnected] = useState(false);
    const pollInterval = useRef(null);

    const { data, setData, post, processing, errors, reset } = useForm({
        name: '',
        os_type: 'linux',
        allow_self_signed: false,
        sources: [
            { id: 1, name: 'SSH/Auth Logs', source: 'auth', path: '/var/log/auth.log', enabled: true },
            { id: 2, name: 'Syslog', source: 'syslog', path: '/var/log/syslog', enabled: true },
            { id: 3, name: 'Web Access', source: 'web_access', path: '/var/log/nginx/access.log', enabled: true },
            { id: 4, name: 'File Integrity (FIM)', source: 'fim', path: '/var/www/html', enabled: false },
        ]
    });

    // Cleanup polling
    useEffect(() => {
        return () => {
            if (pollInterval.current) clearInterval(pollInterval.current);
        };
    }, []);

    // Check if new agent was created
    useEffect(() => {
        if (flash?.new_agent && flash?.install_token) {
            setWizardStep(2);
            setPollingAgent(flash.new_agent);
            startPolling(flash.new_agent.uuid);
        } else if (flash?.rotated_agent && flash?.install_token) {
            // For rotated agents, show the modal again with step 2
            setWizardStep(2);
            setPollingAgent(flash.rotated_agent);
            setIsWizardOpen(true);
            startPolling(flash.rotated_agent.uuid);
        }
    }, [flash]);

    const startPolling = (uuid) => {
        setAgentConnected(false);
        if (pollInterval.current) clearInterval(pollInterval.current);
        
        pollInterval.current = setInterval(() => {
            router.reload({
                only: ['agents'],
                onSuccess: (page) => {
                    const agent = page.props.agents.find(a => a.uuid === uuid);
                    if (agent && agent.status === 'active') {
                        setAgentConnected(true);
                        clearInterval(pollInterval.current);
                    }
                }
            });
        }, 5000);
    };

    const submitWizard = (e) => {
        e.preventDefault();
        const activeSources = data.sources.filter(s => s.enabled);
        post(route('siem.agents.store'), {
            data: { ...data, sources: activeSources },
            preserveScroll: true,
            onSuccess: () => {}
        });
    };

    const handleRotate = (id) => {
        if (confirm('Are you sure? The existing agent will immediately stop working until you run the new installer.')) {
            router.post(route('siem.agents.rotate', id));
        }
    };

    const handleRevoke = (id) => {
        if (confirm('Revoke this agent? It will no longer be able to ingest logs.')) {
            router.post(route('siem.agents.revoke', id));
        }
    };

    const handleDelete = (id) => {
        if (confirm('Delete this agent? All its events will be deleted.')) {
            router.delete(route('siem.agents.destroy', id));
        }
    };

    const closeModal = () => {
        setIsWizardOpen(false);
        if (pollInterval.current) clearInterval(pollInterval.current);
        setTimeout(() => {
            setWizardStep(1);
            reset();
            setPollingAgent(null);
            setAgentConnected(false);
        }, 300);
    };

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        // We could use a toast here ideally, but for now fallback is fine
    };

    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

    return (
        <AuthenticatedLayout user={auth.user}>
            <Head title="SIEM Agents" />

            <div className="py-10 max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
                
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <div className="flex items-center gap-3">
                            <span className="font-sans text-[10px] px-2.5 py-1 rounded-full bg-exec-indigo/10 text-exec-indigo border border-exec-indigo/30 font-bold uppercase tracking-wider flex items-center gap-2 shadow-[0_0_10px_rgba(99,102,241,0.2)]">
                                <CpuChipIcon className="h-3 w-3" />
                                Agent Fleet
                            </span>
                            <span className="text-slate-500 text-sm font-sans">/</span>
                            <span className="font-sans text-xs text-slate-400 font-medium">Security Information & Event Management</span>
                        </div>
                        <h2 className="text-3xl font-sans font-bold text-white tracking-tight mt-3 drop-shadow-md">
                            SIEM Agents
                        </h2>
                    </div>
                    <button 
                        onClick={() => setIsWizardOpen(true)}
                        className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-exec-indigo to-[#8b5cf6] text-white font-sans text-sm font-bold hover:shadow-[0_0_20px_rgba(99,102,241,0.5)] active:scale-[0.98] transition-all relative overflow-hidden"
                    >
                        <div className="absolute inset-0 bg-white/20 hover:opacity-0 transition-opacity rounded-xl pointer-events-none"></div>
                        <PlusIcon className="h-5 w-5" />
                        Deploy Agent
                    </button>
                </div>

                {isLocalhost && (
                    <div className="rounded-2xl border border-exec-high/30 bg-exec-high/10 backdrop-blur-2xl p-4 shadow-[0_4px_20px_rgba(245,158,11,0.1)] flex items-start gap-3 hud-fade-in">
                        <ExclamationTriangleIcon className="h-5 w-5 text-exec-high shrink-0 mt-0.5" />
                        <div>
                            <strong className="block text-exec-high font-sans font-bold mb-1">Localhost Environment Detected</strong>
                            <p className="text-sm font-sans font-medium text-slate-300">
                                Agents installed on external machines cannot resolve or reach <code className="bg-black/30 px-1.5 py-0.5 rounded text-exec-high border border-exec-high/20 font-mono text-xs mx-1">localhost</code>. 
                                If you plan to monitor remote servers, ensure <code className="bg-black/30 px-1.5 py-0.5 rounded text-exec-high border border-exec-high/20 font-mono text-xs mx-1">SIEM_PUBLIC_URL</code> is set to your server's public IP or domain in your environment configuration.
                            </p>
                        </div>
                    </div>
                )}

                {agents.length === 0 ? (
                    <div className="rounded-3xl border border-white/[0.08] bg-white/[0.02] backdrop-blur-2xl p-16 shadow-[0_8px_32px_rgba(0,0,0,0.2)] text-center relative overflow-hidden hud-fade-in">
                        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.12] to-transparent"></div>
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-exec-indigo/10 rounded-full blur-3xl pointer-events-none"></div>
                        
                        <div className="relative z-10 flex flex-col items-center">
                            <div className="w-20 h-20 rounded-2xl bg-white/[0.02] border border-white/[0.05] shadow-[0_0_30px_rgba(99,102,241,0.15)] flex items-center justify-center mb-6">
                                <CpuChipIcon className="h-10 w-10 text-exec-indigo" />
                            </div>
                            <h3 className="text-2xl font-sans font-bold text-white mb-3 tracking-tight">No Agents Deployed</h3>
                            <p className="text-slate-400 font-sans font-medium mb-8 max-w-md leading-relaxed text-sm">
                                Deploy your first SIEM agent to begin streaming real-time security events, authentication logs, and system metrics from your infrastructure into Aegis.
                            </p>
                            <button 
                                onClick={() => setIsWizardOpen(true)}
                                className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-white/[0.05] border border-white/[0.1] text-white font-sans text-sm font-bold hover:bg-white/[0.1] transition-all"
                            >
                                <PlusIcon className="h-5 w-5" />
                                Deploy First Agent
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 hud-fade-in hud-stagger-1">
                        {agents.map(agent => (
                            <div key={agent.id} className="rounded-3xl border border-white/[0.08] bg-white/[0.02] backdrop-blur-2xl p-6 shadow-[0_8px_32px_rgba(0,0,0,0.2)] relative overflow-hidden group hover:border-white/[0.15] transition-all duration-300 flex flex-col">
                                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.15] to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                
                                <div className="flex justify-between items-start mb-6">
                                    <div className="flex-1 pr-4">
                                        <h3 className="text-xl font-sans font-bold text-white flex items-center gap-2 truncate">
                                            <ServerIcon className="h-5 w-5 text-slate-400" />
                                            {agent.name}
                                        </h3>
                                        <div className="flex items-center gap-3 mt-2">
                                            <p className="text-xs text-slate-500 font-mono font-bold uppercase tracking-wider truncate">{agent.uuid}</p>
                                            {agent.agent_version && current_version && agent.agent_version !== current_version && (
                                                <span className="shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest bg-exec-high/10 text-exec-high border border-exec-high/30" title="Update Available">
                                                    Update
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center bg-white/[0.02] px-3 py-1.5 rounded-full border border-white/[0.08] shadow-sm shrink-0">
                                        <div className={`w-2 h-2 rounded-full mr-2 ${agent.status === 'active' ? 'bg-exec-info shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-pulse' : agent.status === 'revoked' ? 'bg-exec-critical shadow-[0_0_8px_rgba(244,63,94,0.8)]' : 'bg-slate-500'}`}></div>
                                        <span className={`text-[10px] font-mono font-bold tracking-widest uppercase ${agent.status === 'active' ? 'text-exec-info' : agent.status === 'revoked' ? 'text-exec-critical' : 'text-slate-400'}`}>{agent.status}</span>
                                    </div>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-4 text-sm mb-8 flex-1">
                                    <div className="bg-white/[0.02] p-4 rounded-2xl border border-white/[0.05] shadow-sm">
                                        <p className="text-[10px] font-sans font-bold uppercase tracking-widest text-slate-500 mb-1 flex items-center gap-1.5">
                                            <BoltIcon className="h-3.5 w-3.5" />
                                            IP Address
                                        </p>
                                        <p className="text-slate-200 font-mono text-xs font-bold mt-2">{agent.ip_address || '—'}</p>
                                    </div>
                                    <div className="bg-white/[0.02] p-4 rounded-2xl border border-white/[0.05] shadow-sm">
                                        <p className="text-[10px] font-sans font-bold uppercase tracking-widest text-slate-500 mb-1 flex items-center gap-1.5">
                                            <ShieldCheckIcon className="h-3.5 w-3.5" />
                                            Version
                                        </p>
                                        <p className="text-slate-200 font-mono text-xs font-bold mt-2">v{agent.agent_version || 'Unknown'}</p>
                                    </div>
                                    <div className="col-span-2 bg-white/[0.02] p-4 rounded-2xl border border-white/[0.05] shadow-sm">
                                        <p className="text-[10px] font-sans font-bold uppercase tracking-widest text-slate-500 mb-1 flex items-center gap-1.5">
                                            <ArrowPathIcon className="h-3.5 w-3.5" />
                                            Last Seen
                                        </p>
                                        <p className="text-slate-200 font-mono text-xs font-bold mt-2">
                                            {agent.last_seen_at ? new Date(agent.last_seen_at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : 'Never connected'}
                                        </p>
                                    </div>
                                </div>
                                
                                <div className="flex gap-3 pt-5 border-t border-white/[0.08]">
                                    <button onClick={() => handleRotate(agent.id)} className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-white/[0.1] bg-white/[0.02] text-xs font-sans font-bold text-slate-300 hover:bg-white/[0.05] hover:text-white transition-colors">
                                        <ArrowPathIcon className="h-4 w-4" /> Rotate
                                    </button>
                                    {agent.status !== 'revoked' && (
                                        <button onClick={() => handleRevoke(agent.id)} className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-exec-high/30 bg-exec-high/10 text-xs font-sans font-bold text-exec-high hover:bg-exec-high/20 transition-colors">
                                            <StopIcon className="h-4 w-4" /> Revoke
                                        </button>
                                    )}
                                    <button onClick={() => handleDelete(agent.id)} className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-exec-critical/30 bg-exec-critical/10 text-xs font-sans font-bold text-exec-critical hover:bg-exec-critical/20 transition-colors">
                                        <XMarkIcon className="h-4 w-4" /> Delete
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                <Modal show={isWizardOpen} onClose={closeModal} maxWidth="2xl">
                    <div className="bg-[#050a16] border border-white/[0.1] shadow-2xl rounded-2xl overflow-hidden relative">
                        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.2] to-transparent"></div>
                        <div className="px-6 py-5 bg-white/[0.02] border-b border-white/[0.08] flex justify-between items-center">
                            <h2 className="text-lg font-sans font-bold text-white flex items-center gap-3">
                                <span className="relative flex h-3 w-3">
                                    <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${wizardStep === 1 ? 'bg-exec-indigo' : 'bg-exec-info'}`}></span>
                                    <span className={`relative inline-flex rounded-full h-3 w-3 ${wizardStep === 1 ? 'bg-exec-indigo' : 'bg-exec-info'}`}></span>
                                </span>
                                {wizardStep === 1 ? 'Deploy New Agent' : `Install Agent: ${pollingAgent?.name}`}
                            </h2>
                            <button onClick={closeModal} className="text-slate-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/[0.05]">
                                <XMarkIcon className="h-5 w-5" />
                            </button>
                        </div>
                        
                        <div className="p-8">
                            {wizardStep === 1 ? (
                                <form onSubmit={submitWizard}>
                                    <div className="mb-8">
                                        <label htmlFor="name" className="block text-[10px] text-slate-400 mb-2 uppercase tracking-widest font-sans font-bold">Agent Name</label>
                                        <TextInput
                                            id="name"
                                            className="block w-full bg-white/[0.02] border-white/[0.1] text-white focus:border-exec-indigo focus:ring-exec-indigo transition-colors rounded-xl h-11"
                                            value={data.name}
                                            onChange={(e) => setData('name', e.target.value)}
                                            required
                                            placeholder="e.g. prod-web-server-01"
                                            autoFocus
                                        />
                                        <InputError message={errors.name} className="mt-2 text-exec-critical text-sm" />
                                    </div>

                                    <div className="mb-8">
                                        <label className="block text-[10px] text-slate-400 mb-2 uppercase tracking-widest font-sans font-bold">Log Sources</label>
                                        <div className="space-y-3 bg-white/[0.02] p-4 rounded-2xl border border-white/[0.05]">
                                            {data.sources.map((source, index) => (
                                                <div key={source.id} className={`flex items-center gap-4 p-4 rounded-xl border transition-all duration-200 ${source.enabled ? 'bg-white/[0.05] border-white/[0.15]' : 'bg-transparent border-transparent hover:bg-white/[0.02]'}`}>
                                                    <input
                                                        type="checkbox"
                                                        checked={source.enabled}
                                                        onChange={(e) => {
                                                            const newSources = [...data.sources];
                                                            newSources[index].enabled = e.target.checked;
                                                            setData('sources', newSources);
                                                        }}
                                                        className="bg-black/50 border-white/[0.2] text-exec-indigo rounded focus:ring-exec-indigo h-5 w-5 cursor-pointer"
                                                    />
                                                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
                                                        <div className={`text-sm font-sans font-bold ${source.enabled ? 'text-white' : 'text-slate-500'}`}>{source.name}</div>
                                                        <TextInput
                                                            className={`col-span-1 sm:col-span-2 h-10 text-sm font-mono transition-colors ${source.enabled ? 'bg-black/30 border-white/[0.1] text-white focus:border-exec-indigo focus:ring-exec-indigo' : 'bg-transparent border-white/[0.05] text-slate-600 cursor-not-allowed'}`}
                                                            value={source.path}
                                                            onChange={(e) => {
                                                                const newSources = [...data.sources];
                                                                newSources[index].path = e.target.value;
                                                                setData('sources', newSources);
                                                            }}
                                                            disabled={!source.enabled}
                                                        />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="mb-10 flex items-start bg-white/[0.02] p-5 rounded-2xl border border-white/[0.05]">
                                        <div className="flex items-center h-5 mt-0.5">
                                            <input
                                                type="checkbox"
                                                id="allow_self_signed"
                                                checked={data.allow_self_signed}
                                                onChange={(e) => setData('allow_self_signed', e.target.checked)}
                                                className="bg-black/50 border-white/[0.2] text-exec-indigo rounded focus:ring-exec-indigo h-5 w-5 cursor-pointer"
                                            />
                                        </div>
                                        <div className="ml-4 text-sm">
                                            <label htmlFor="allow_self_signed" className="font-sans font-bold text-slate-200 block cursor-pointer">
                                                Allow self-signed HTTPS certificates
                                            </label>
                                            <p className="text-slate-500 font-medium mt-1">Disables TLS verification for the agent connection. Use only if Aegis is behind a self-signed cert.</p>
                                        </div>
                                    </div>

                                    <div className="flex justify-end gap-3 pt-6 border-t border-white/[0.08]">
                                        <button onClick={closeModal} type="button" className="px-6 py-2.5 rounded-xl text-sm font-sans font-bold text-slate-400 hover:text-white hover:bg-white/[0.05] transition-colors">
                                            Cancel
                                        </button>
                                        <button disabled={processing} type="submit" className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-exec-indigo to-[#8b5cf6] text-white font-sans text-sm font-bold hover:shadow-[0_0_20px_rgba(99,102,241,0.5)] active:scale-[0.98] transition-all relative overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed">
                                            <div className="absolute inset-0 bg-white/20 hover:opacity-0 transition-opacity rounded-xl pointer-events-none"></div>
                                            Generate Installer
                                        </button>
                                    </div>
                                </form>
                            ) : (
                                <div className="animate-[hud-fade-in_0.4s_ease-out]">
                                    <p className="text-sm font-sans font-medium text-slate-400 mb-6">Execute the following command on your target server to download and install the agent.</p>
                                    
                                    <div className="relative mb-8 group">
                                        <div className="absolute inset-0 bg-exec-indigo/10 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                                        <div className="relative bg-[#0a0f1a] border border-white/[0.1] rounded-2xl overflow-hidden shadow-inner">
                                            <div className="flex items-center px-5 py-3 bg-white/[0.02] border-b border-white/[0.08]">
                                                <div className="flex gap-2 mr-4">
                                                    <div className="w-3 h-3 rounded-full bg-rose-500"></div>
                                                    <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                                                    <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                                                </div>
                                                <div className="text-[10px] text-slate-500 font-mono font-bold tracking-widest uppercase">root@{pollingAgent?.name || 'server'}</div>
                                            </div>
                                            <div className="p-6 flex items-start justify-between gap-6">
                                                <code className="text-[13px] font-mono text-emerald-400 break-all flex-1 leading-relaxed selection:bg-emerald-900 selection:text-emerald-100 mt-1">
                                                    <span className="text-slate-600 select-none mr-2">$</span>
                                                    curl -fsSL {public_url || window.location.origin}/siem/install/{flash.install_token} | sudo bash
                                                </code>
                                                <button 
                                                    onClick={() => copyToClipboard(`curl -fsSL ${public_url || window.location.origin}/siem/install/${flash.install_token} | sudo bash`)}
                                                    className="p-3 bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 rounded-xl border border-white/[0.1] shadow-sm shrink-0 transition-all hover:text-white group/btn"
                                                    title="Copy to clipboard"
                                                >
                                                    <DocumentDuplicateIcon className="w-5 h-5 group-hover/btn:scale-110 transition-transform" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex justify-center mb-8">
                                        <a 
                                            href={`/siem/install/${flash.install_token}`}
                                            target="_blank"
                                            download="install-aegis-agent.sh"
                                            className="text-xs font-sans font-bold text-slate-500 hover:text-exec-indigo transition-colors"
                                        >
                                            Or download the script manually
                                        </a>
                                    </div>

                                    <div className="relative overflow-hidden border border-white/[0.05] rounded-2xl p-10 bg-white/[0.02] text-center shadow-inner">
                                        {agentConnected ? (
                                            <div className="relative z-10 animate-[hud-fade-in_0.5s_ease-out]">
                                                <div className="w-20 h-20 mx-auto bg-exec-info/10 rounded-full flex items-center justify-center mb-6 border border-exec-info/30 shadow-[0_0_30px_rgba(16,185,129,0.2)]">
                                                    <CheckCircleIcon className="w-10 h-10 text-exec-info" />
                                                </div>
                                                <h3 className="text-xl font-sans font-bold text-exec-info mb-3">Agent Connected Successfully!</h3>
                                                <p className="text-slate-400 font-sans font-medium text-sm max-w-sm mx-auto leading-relaxed">First heartbeat verified. The agent is now actively shipping logs to your SIEM.</p>
                                                <button onClick={closeModal} className="mt-8 px-8 py-3 rounded-xl bg-white/[0.05] border border-white/[0.1] text-white font-sans text-sm font-bold hover:bg-white/[0.1] transition-all">
                                                    Return to Dashboard
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="relative z-10">
                                                <div className="relative w-24 h-24 mx-auto mb-8">
                                                    <div className="absolute inset-0 border-2 border-exec-indigo/20 rounded-full animate-[ping_2s_cubic-bezier(0,0,0.2,1)_infinite]"></div>
                                                    <div className="absolute inset-2 border-2 border-exec-indigo/40 rounded-full animate-[ping_2s_cubic-bezier(0,0,0.2,1)_infinite_0.5s]"></div>
                                                    <div className="absolute inset-4 bg-exec-indigo/10 border border-exec-indigo/50 rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(99,102,241,0.5)]">
                                                        <ArrowPathIcon className="w-8 h-8 text-exec-indigo animate-spin" />
                                                    </div>
                                                </div>
                                                <h3 className="text-lg font-sans font-bold text-white tracking-wide mb-3">Waiting for connection...</h3>
                                                <p className="text-slate-400 font-sans font-medium text-sm max-w-sm mx-auto leading-relaxed">
                                                    Keep this window open. The agent will appear online here as soon as it securely handshakes and sends its first heartbeat.
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </Modal>
            </div>
        </AuthenticatedLayout>
    );
}
