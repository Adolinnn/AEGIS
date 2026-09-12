import ApplicationLogo from '@/Components/ApplicationLogo';
import ChatSidebar from '@/Components/ChatSidebar';
import Dropdown from '@/Components/Dropdown';
import NavLink from '@/Components/NavLink';
import ResponsiveNavLink from '@/Components/ResponsiveNavLink';
import { Link, usePage } from '@inertiajs/react';
import { useState, useEffect } from 'react';

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

    return (
        <div className="min-h-screen text-slate-100 font-sans selection:bg-red-500 selection:text-white relative bg-transparent overflow-x-hidden">

            {/* Unified App Shell that shifts smoothly in tandem with ChatSidebar */}
            <div className={`min-h-screen flex flex-col transition-[margin-right] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] will-change-[margin-right] ${
                chatOpen ? 'lg:mr-[430px]' : 'mr-0'
            }`}>

                {trial_active && showTrialBanner && (
                    <div className="bg-[#050a16] border-b border-[#1e293b] flex items-center justify-center relative z-50 py-1.5 px-4 shadow-[0_4px_15px_rgba(0,0,0,0.5)]">
                        <div className="text-xs font-mono text-slate-300 tracking-wide text-center">
                            <span className="text-amber-500 font-semibold mr-1.5">◆</span>
                            You have <span className="text-white font-bold">{trial_days_remaining} {trial_days_remaining === 1 ? 'day' : 'days'}</span> left in your trial. 
                            <Link href={route('billing.index')} className="text-cyan-400 hover:text-cyan-300 underline underline-offset-2 ml-2 transition-colors">
                                View Billing & Plans →
                            </Link>
                        </div>
                        <button onClick={dismissTrialBanner} className="absolute right-4 top-1/2 -translate-y-1/2 p-1 text-slate-500 hover:text-white transition-colors" title="Dismiss">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                        </button>
                    </div>
                )}

                {/* Navigation Bar with Telemetry Line */}
                <nav className="sticky top-0 z-40 border-b border-white/[0.08] bg-[#070b14]/90 backdrop-blur-xl shadow-[0_4px_25px_rgba(0,0,0,0.6)] navbar-telemetry-line w-full">
                    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 w-full">
                        <div className="flex h-16 justify-between items-center gap-4">
                            <div className="flex items-center gap-4 lg:gap-6 min-w-0 shrink">
                                {/* Brand / Logo */}
                                <Link href="/" className="flex items-center gap-2.5 group shrink-0">
                                    <div className="p-1.5 rounded-lg bg-gradient-to-br from-red-600/20 to-transparent border border-red-500/30 group-hover:border-red-500/60 group-hover:scale-105 transition-all duration-300 shadow-[0_0_12px_rgba(244,63,94,0.2)]">
                                        <ApplicationLogo className="block h-6 w-auto" />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="font-mono text-base font-bold tracking-widest text-white uppercase group-hover:text-red-400 transition-colors">
                                            Aegis
                                        </span>
                                        <span className="font-mono text-[9px] text-slate-500 uppercase tracking-widest -mt-1">
                                            SecOps Core
                                        </span>
                                    </div>
                                </Link>

                                {/* System Status Beacon */}
                                <div className={`hidden ${chatOpen ? '2xl:flex' : 'xl:flex'} items-center gap-2 px-2.5 py-1 rounded-full bg-slate-900/80 border border-slate-800 text-[10px] font-mono text-slate-400 transition-all duration-300 hover:border-emerald-500/40 shrink-0`}>
                                    <span className="relative flex h-2 w-2">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                    </span>
                                    <span className="text-emerald-400 font-semibold tracking-wider">ONLINE</span>
                                </div>

                                {/* Main Navigation Links */}
                                <div className={`hidden sm:-my-px sm:flex ${chatOpen ? 'sm:space-x-0.5 lg:space-x-1' : 'sm:space-x-1 lg:space-x-2'} shrink-0 transition-all duration-300`}>
                                    <NavLink
                                        href={route('dashboard')}
                                        active={route().current('dashboard')}
                                    >
                                        Dashboard
                                    </NavLink>
                                    <NavLink
                                        href={route('quick-scan.index')}
                                        active={route().current('quick-scan.*')}
                                    >
                                        Quick Recon
                                    </NavLink>
                                    <NavLink
                                        href={route('targets.index')}
                                        active={route().current('targets.*')}
                                    >
                                        Targets
                                    </NavLink>
                                    <NavLink
                                        href={route('scan-runs.index')}
                                        active={route().current('scan-runs.*')}
                                    >
                                        Scan Runs
                                    </NavLink>
                                    <NavLink
                                        href={route('vulnerabilities.index')}
                                        active={route().current('vulnerabilities.*')}
                                    >
                                        Findings
                                    </NavLink>
                                    <NavLink
                                        href={route('billing.index')}
                                        active={route().current('billing.*')}
                                    >
                                        Billing
                                    </NavLink>
                                </div>
                            </div>

                            {/* Right: User Menu */}
                            <div className="hidden sm:flex sm:items-center sm:gap-3 shrink-0">
                                {user.is_admin && (
                                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider bg-purple-950/80 text-purple-300 border border-purple-800/80 shadow-[0_0_8px_rgba(168,85,247,0.3)]">
                                        Admin
                                    </span>
                                )}

                                <div className="relative">
                                    <Dropdown>
                                        <Dropdown.Trigger>
                                            <button
                                                type="button"
                                                className="inline-flex items-center gap-2 rounded-lg border border-slate-700/80 bg-slate-900/90 px-3 py-1.5 font-mono text-xs font-medium text-slate-300 transition duration-200 ease-in-out hover:border-cyan-500/60 hover:text-white hover:shadow-[0_0_10px_rgba(6,182,212,0.2)] focus:outline-none"
                                            >
                                                <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_6px_#06b6d4]"></span>
                                                <span className={`font-sans font-semibold truncate ${chatOpen ? 'max-w-[85px] sm:max-w-[100px]' : 'max-w-[120px]'} transition-all`}>{user.name}</span>
                                                <svg
                                                    className="h-3.5 w-3.5 text-slate-400"
                                                    xmlns="http://www.w3.org/2000/svg"
                                                    viewBox="0 0 20 20"
                                                    fill="currentColor"
                                                >
                                                    <path
                                                        fillRule="evenodd"
                                                        d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                                                        clipRule="evenodd"
                                                    />
                                                </svg>
                                            </button>
                                        </Dropdown.Trigger>

                                        <Dropdown.Content>
                                            <div className="px-4 py-2 border-b border-slate-800 text-[11px] font-mono text-slate-400">
                                                <div className="text-slate-200 font-semibold truncate">{user.name}</div>
                                                <div className="text-slate-500 truncate text-[10px]">{user.email}</div>
                                            </div>
                                            <Dropdown.Link href={route('profile.edit')}>
                                                ⚙️ Profile & Keys
                                            </Dropdown.Link>
                                            <Dropdown.Link
                                                href={route('logout')}
                                                method="post"
                                                as="button"
                                                className="text-rose-400 hover:text-rose-300"
                                            >
                                                ⏻ Log Out
                                            </Dropdown.Link>
                                        </Dropdown.Content>
                                    </Dropdown>
                                </div>
                            </div>

                            {/* Mobile menu hamburger button */}
                            <div className="-me-2 flex items-center sm:hidden">
                                <button
                                    onClick={() => setShowingNavigationDropdown((prev) => !prev)}
                                    className="inline-flex items-center justify-center rounded-md p-2 text-slate-400 transition hover:bg-slate-800 hover:text-white focus:outline-none"
                                >
                                    <svg className="h-6 w-6" stroke="currentColor" fill="none" viewBox="0 0 24 24">
                                        <path
                                            className={!showingNavigationDropdown ? 'inline-flex' : 'hidden'}
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth="2"
                                            d="M4 6h16M4 12h16M4 18h16"
                                        />
                                        <path
                                            className={showingNavigationDropdown ? 'inline-flex' : 'hidden'}
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth="2"
                                            d="M6 18L18 6M6 6l12 12"
                                        />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Responsive Navigation Menu (Mobile) */}
                    <div className={(showingNavigationDropdown ? 'block' : 'hidden') + ' sm:hidden bg-[#0a1020] border-b border-slate-800'}>
                        <div className="space-y-1 pb-3 pt-2">
                            <ResponsiveNavLink href={route('dashboard')} active={route().current('dashboard')}>
                                Dashboard
                            </ResponsiveNavLink>
                            <ResponsiveNavLink href={route('quick-scan.index')} active={route().current('quick-scan.*')}>
                                Quick Recon
                            </ResponsiveNavLink>
                            <ResponsiveNavLink href={route('targets.index')} active={route().current('targets.*')}>
                                Targets
                            </ResponsiveNavLink>
                            <ResponsiveNavLink href={route('scan-runs.index')} active={route().current('scan-runs.*')}>
                                Scan Runs
                            </ResponsiveNavLink>
                            <ResponsiveNavLink href={route('vulnerabilities.index')} active={route().current('vulnerabilities.*')}>
                                Findings
                            </ResponsiveNavLink>
                            <ResponsiveNavLink href={route('billing.index')} active={route().current('billing.*')}>
                                Billing
                            </ResponsiveNavLink>
                        </div>

                        <div className="border-t border-slate-800 pb-3 pt-4 px-4">
                            <div className="text-sm font-semibold text-slate-200">{user.name}</div>
                            <div className="text-xs font-mono text-slate-500">{user.email}</div>
                            <div className="mt-3 space-y-1">
                                <ResponsiveNavLink href={route('profile.edit')}>
                                    Profile & API Keys
                                </ResponsiveNavLink>
                                <ResponsiveNavLink method="post" href={route('logout')} as="button">
                                    Log Out
                                </ResponsiveNavLink>
                            </div>
                        </div>
                    </div>
                </nav>

                {/* Page Header banner if present */}
                {header && (
                    <header className="border-b border-white/[0.06] bg-[#090e1b]/60 backdrop-blur-md relative z-10 hud-fade-in">
                        <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
                            {header}
                        </div>
                    </header>
                )}

                {/* Main Application Area with HUD Entrance Animation */}
                <main className="relative z-10 hud-fade-in flex-1">
                    {children}
                </main>
            </div>

            {/* Embedded AI Intelligence Sidebar */}
            <ChatSidebar open={chatOpen} onToggle={setChatOpen} />
        </div>
    );
}
