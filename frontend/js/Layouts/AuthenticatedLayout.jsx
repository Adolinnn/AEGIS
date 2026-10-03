import ApplicationLogo from '@/Components/ApplicationLogo';
import ChatSidebar from '@/Components/ChatSidebar';
import Dropdown from '@/Components/Dropdown';
import NavLink from '@/Components/NavLink';
import ResponsiveNavLink from '@/Components/ResponsiveNavLink';
import { Link, usePage } from '@inertiajs/react';
import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { MagnifyingGlassIcon, BellIcon, Cog6ToothIcon } from '@heroicons/react/24/outline';

export default function AuthenticatedLayout({ header, children }) {
    const { auth } = usePage().props;
    const { user, trial_active, trial_days_remaining } = auth;
    const [showingNavigationDropdown, setShowingNavigationDropdown] = useState(false);
    const [chatOpen, setChatOpen] = useState(false);
    const [showTrialBanner, setShowTrialBanner] = useState(() => {
        return typeof window !== 'undefined' ? sessionStorage.getItem('hide_trial_banner') !== 'true' : true;
    });

    const dismissTrialBanner = () => {
        sessionStorage.setItem('hide_trial_banner', 'true');
        setShowTrialBanner(false);
    };

    const [criticalAlert, setCriticalAlert] = useState(null);
    const notifiedIds = useRef(new Set());

    useEffect(() => {
        const checkAlerts = async () => {
            try {
                const res = await axios.get(route('siem.alerts.critical-unread'));
                if (res.data.alerts && res.data.alerts.length > 0) {
                    const latest = res.data.alerts[0];
                    if (!notifiedIds.current.has(latest.id)) {
                        notifiedIds.current.add(latest.id);
                        setCriticalAlert(latest);
                        setTimeout(() => setCriticalAlert(null), 8000);
                    }
                }
            } catch (e) {}
        };
        checkAlerts();
        const interval = setInterval(checkAlerts, 10000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="min-h-screen text-slate-100 font-sans selection:bg-exec-indigo/50 selection:text-white relative bg-transparent overflow-x-hidden">
            {/* Global Critical Alert Toast */}
            <div className={`fixed bottom-6 right-6 z-50 transition-all duration-500 transform ${criticalAlert ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-10 opacity-0 scale-95 pointer-events-none'}`}>
                {criticalAlert && (
                    <div className="bg-[#0a0f1a]/90 backdrop-blur-xl border border-exec-critical/50 p-4 rounded-2xl shadow-[0_10px_40px_rgba(244,63,94,0.3)] flex items-start gap-4 max-w-sm">
                        <div className="bg-exec-critical/20 p-2 rounded-full border border-exec-critical/30 shrink-0">
                            <BellIcon className="w-6 h-6 text-exec-critical animate-pulse" />
                        </div>
                        <div className="flex-1">
                            <h4 className="text-exec-critical font-bold text-sm mb-1 uppercase tracking-wider">{criticalAlert.severity} Alert</h4>
                            <p className="text-white text-sm font-semibold mb-1 leading-tight">{criticalAlert.title}</p>
                            <p className="text-slate-400 text-xs font-mono mb-2">Agent: {criticalAlert.agent_id} | {criticalAlert.src_ip || 'Internal'}</p>
                            <Link href={route('siem.alerts.show', criticalAlert.id)} onClick={() => setCriticalAlert(null)} className="text-xs bg-white/[0.05] hover:bg-white/[0.1] px-3 py-1.5 rounded-lg border border-white/[0.1] text-white transition-colors inline-block font-medium">View Alert</Link>
                        </div>
                        <button onClick={() => setCriticalAlert(null)} className="text-slate-500 hover:text-white transition-colors mt-0.5"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg></button>
                    </div>
                )}
            </div>
            {/* Unified App Shell that shifts smoothly in tandem with ChatSidebar */}
            <div className={`min-h-screen flex flex-col transition-[margin-right] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] will-change-[margin-right] ${
                chatOpen ? 'lg:mr-[430px]' : 'mr-0'
            }`}>
                
                {/* Navigation Bar - Extreme Glassmorphism */}
                <nav className="sticky top-0 z-40 border-b border-white/[0.08] bg-white/[0.02] backdrop-blur-2xl shadow-[0_4px_30px_rgba(0,0,0,0.4)] w-full">
                    {/* Inner highlight line */}
                    <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.12] to-transparent"></div>
                    
                    <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8 w-full">
                        <div className="flex h-16 justify-between items-center gap-4">
                            
                            {/* Left: Brand & Nav */}
                            <div className="flex items-center gap-6 xl:gap-8 min-w-0 shrink">
                                {/* Brand */}
                                <Link href="/" className="flex items-center gap-3 group shrink-0">
                                    <div className="p-1.5 rounded-lg bg-exec-indigo/10 border border-exec-indigo/30 group-hover:bg-exec-indigo/20 group-hover:border-exec-indigo/50 transition-all duration-300 shadow-[0_0_15px_rgba(99,102,241,0.2)]">
                                        <ApplicationLogo className="block h-5 w-auto text-exec-indigo" />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="font-sans text-[13px] font-bold tracking-widest text-white uppercase group-hover:text-exec-indigo transition-colors">
                                            Aegis // Executive SOC
                                        </span>
                                    </div>
                                </Link>

                                {/* Main Navigation Links */}
                                <div className={`hidden md:-my-px md:flex ${chatOpen ? 'md:space-x-1 lg:space-x-2' : 'md:space-x-2 lg:space-x-4'} shrink-0 transition-all duration-300`}>
                                    <NavLink href={route('dashboard')} active={route().current('dashboard')}>Dashboard</NavLink>
                                    <NavLink href={route('quick-scan.index')} active={route().current('quick-scan.*')}>Probes</NavLink>
                                    <NavLink href={route('targets.index')} active={route().current('targets.*')}>Assets</NavLink>
                                    <NavLink href={route('vulnerabilities.index')} active={route().current('vulnerabilities.*')}>Threats</NavLink>
                                    
                                    {/* SIEM Dropdown */}
                                    <div className="relative flex items-center h-full">
                                        <Dropdown>
                                            <Dropdown.Trigger>
                                                <button className={`relative inline-flex items-center px-3.5 py-2 text-[10px] font-sans font-bold uppercase tracking-widest transition-all duration-300 focus:outline-none group ${
                                                    route().current('siem.*') 
                                                        ? 'text-white font-semibold' 
                                                        : 'text-slate-400 hover:text-white'
                                                }`}>
                                                    {route().current('siem.*') && (
                                                        <span className="relative flex h-1.5 w-1.5 mr-2">
                                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-exec-indigo opacity-75"></span>
                                                            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-exec-indigo shadow-[0_0_8px_#6366f1]"></span>
                                                        </span>
                                                    )}
                                                    <span>SIEM</span>
                                                    <svg className="ml-1 h-3 w-3" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                                        <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                                                    </svg>
                                                    {route().current('siem.*') ? (
                                                        <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-exec-indigo via-[#8b5cf6] to-exec-indigo shadow-[0_0_10px_#6366f1] animate-pulse"></span>
                                                    ) : (
                                                        <span className="absolute bottom-0 left-1/2 right-1/2 h-[1.5px] bg-white/0 group-hover:left-2 group-hover:right-2 group-hover:bg-white/30 transition-all duration-300 shadow-sm"></span>
                                                    )}
                                                </button>
                                            </Dropdown.Trigger>
                                            <Dropdown.Content align="left" width="48">
                                                <Dropdown.Link href={route('siem.overview')}>Overview</Dropdown.Link>
                                                <Dropdown.Link href={route('siem.alerts.index')}>Alerts</Dropdown.Link>
                                                <Dropdown.Link href={route('siem.events.index')}>Events</Dropdown.Link>
                                                <Dropdown.Link href={route('siem.rules.index')}>Rules</Dropdown.Link>
                                                <Dropdown.Link href={route('siem.agents.index')}>Agents</Dropdown.Link>
                                            </Dropdown.Content>
                                        </Dropdown>
                                    </div>
                                </div>
                            </div>

                            {/* Right: User Menu & Telemetry */}
                            <div className="hidden md:flex md:items-center md:gap-4 shrink-0">
                                
                                {/* Telemetry Ping */}
                                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.03] border border-white/[0.08] backdrop-blur-md">
                                    <span className="relative flex h-2 w-2">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
                                    </span>
                                    <span className="text-xs font-mono text-slate-300">Streaming • 24ms</span>
                                </div>

                                {/* Notification Bell */}
                                <button className="relative p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-white/[0.05] transition-colors">
                                    <BellIcon className="h-5 w-5" />
                                    <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-exec-critical border border-[#0f111a]"></span>
                                </button>
                                
                                {/* Settings */}
                                <button className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-white/[0.05] transition-colors">
                                    <Cog6ToothIcon className="h-5 w-5" />
                                </button>

                                {/* Profile Dropdown */}
                                <div className="relative ml-2">
                                    <Dropdown>
                                        <Dropdown.Trigger>
                                            <button className="flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] pl-2 pr-3 py-1 text-sm font-medium text-slate-300 hover:bg-white/[0.08] hover:border-exec-indigo/40 transition-all backdrop-blur-md">
                                                <div className="h-6 w-6 rounded-full bg-gradient-to-tr from-exec-indigo to-emerald-500 flex items-center justify-center text-[10px] text-white font-bold shadow-[0_0_10px_rgba(99,102,241,0.4)]">
                                                    {user.name.charAt(0)}
                                                </div>
                                                <div className="flex flex-col items-start leading-none">
                                                    <span className="font-sans text-xs font-semibold text-white truncate max-w-[80px]">{user.name}</span>
                                                    <span className="font-mono text-[9px] text-slate-400">Clearance L5</span>
                                                </div>
                                            </button>
                                        </Dropdown.Trigger>
                                        <Dropdown.Content align="right" width="48">
                                            <Dropdown.Link href={route('profile.edit')}>Profile & Keys</Dropdown.Link>
                                            <Dropdown.Link href={route('logout')} method="post" as="button">Log Out</Dropdown.Link>
                                        </Dropdown.Content>
                                    </Dropdown>
                                </div>
                            </div>
                            
                            {/* Mobile menu hamburger button */}
                            <div className="-me-2 flex items-center md:hidden">
                                <button
                                    onClick={() => setShowingNavigationDropdown((prev) => !prev)}
                                    className="inline-flex items-center justify-center rounded-md p-2 text-slate-400 hover:bg-white/[0.05] hover:text-white focus:outline-none"
                                >
                                    <svg className="h-6 w-6" stroke="currentColor" fill="none" viewBox="0 0 24 24">
                                        <path
                                            className={!showingNavigationDropdown ? 'inline-flex' : 'hidden'}
                                            strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                            d="M4 6h16M4 12h16M4 18h16"
                                        />
                                        <path
                                            className={showingNavigationDropdown ? 'inline-flex' : 'hidden'}
                                            strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                            d="M6 18L18 6M6 6l12 12"
                                        />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Responsive Navigation Menu (Mobile) */}
                    <div className={(showingNavigationDropdown ? 'block' : 'hidden') + ' md:hidden bg-exec-base/90 backdrop-blur-xl border-b border-white/[0.05]'}>
                        <div className="space-y-1 pb-3 pt-2">
                            <ResponsiveNavLink href={route('dashboard')} active={route().current('dashboard')}>Dashboard</ResponsiveNavLink>
                            <ResponsiveNavLink href={route('quick-scan.index')} active={route().current('quick-scan.*')}>Probes</ResponsiveNavLink>
                            <ResponsiveNavLink href={route('targets.index')} active={route().current('targets.*')}>Assets</ResponsiveNavLink>
                            <ResponsiveNavLink href={route('vulnerabilities.index')} active={route().current('vulnerabilities.*')}>Threats</ResponsiveNavLink>
                        </div>

                        <div className="border-t border-white/[0.05] pb-3 pt-4">
                            <div className="px-4 text-[10px] font-sans font-bold uppercase tracking-widest text-slate-500 mb-2">SIEM Operations</div>
                            <div className="space-y-1">
                                <ResponsiveNavLink href={route('siem.overview')} active={route().current('siem.overview')}>Overview</ResponsiveNavLink>
                                <ResponsiveNavLink href={route('siem.alerts.index')} active={route().current('siem.alerts.*')}>Alerts</ResponsiveNavLink>
                                <ResponsiveNavLink href={route('siem.events.index')} active={route().current('siem.events.*')}>Events</ResponsiveNavLink>
                                <ResponsiveNavLink href={route('siem.rules.index')} active={route().current('siem.rules.*')}>Rules</ResponsiveNavLink>
                                <ResponsiveNavLink href={route('siem.agents.index')} active={route().current('siem.agents.*')}>Agents</ResponsiveNavLink>
                            </div>
                        </div>

                        <div className="border-t border-white/[0.05] pb-3 pt-4 px-4">
                            <div className="text-sm font-semibold text-slate-200">{user.name}</div>
                            <div className="text-xs font-mono text-slate-500">{user.email}</div>
                            <div className="mt-3 space-y-1">
                                <ResponsiveNavLink href={route('profile.edit')}>Profile & API Keys</ResponsiveNavLink>
                                <ResponsiveNavLink method="post" href={route('logout')} as="button">Log Out</ResponsiveNavLink>
                            </div>
                        </div>
                    </div>
                </nav>

                {/* Page Header banner if present */}
                {header && (
                    <header className="border-b border-white/[0.05] bg-white/[0.01] backdrop-blur-xl relative z-10 hud-fade-in shadow-[0_4px_30px_rgba(0,0,0,0.1)]">
                        <div className="mx-auto max-w-[1400px] px-4 py-5 sm:px-6 lg:px-8">
                            {header}
                        </div>
                    </header>
                )}

                {/* Main Application Area */}
                <main className="relative z-10 hud-fade-in flex-1">
                    {children}
                </main>
            </div>

            {/* Embedded AI Intelligence Sidebar */}
            <ChatSidebar open={chatOpen} onToggle={setChatOpen} />
        </div>
    );
}
