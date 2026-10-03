import { Head, useForm } from '@inertiajs/react';
import { UsersIcon, GlobeAltIcon, ShieldCheckIcon, ExclamationTriangleIcon, SignalIcon, ArrowRightOnRectangleIcon } from '@heroicons/react/24/outline';

function StatCard({ label, value, icon, accent = false }) {
    return (
        <div className={`rounded-3xl border backdrop-blur-2xl p-6 relative overflow-hidden transition-all duration-300 group ${
            accent 
                ? 'border-exec-critical/30 bg-exec-critical/10 shadow-[0_8px_32px_rgba(244,63,94,0.15)] hover:border-exec-critical/50' 
                : 'border-white/[0.08] bg-white/[0.02] shadow-[0_8px_32px_rgba(0,0,0,0.2)] hover:border-white/[0.15]'
        }`}>
            <div className={`absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity ${
                accent ? 'via-exec-critical/50' : 'via-white/[0.15]'
            }`}></div>
            
            <div className="flex items-center justify-between mb-4">
                <div className={`text-[10px] font-sans font-bold uppercase tracking-widest ${accent ? 'text-exec-critical' : 'text-slate-500'}`}>
                    {label}
                </div>
                <div className={`p-2 rounded-xl ${accent ? 'bg-exec-critical/20' : 'bg-white/[0.05]'}`}>
                    {icon}
                </div>
            </div>
            <div className={`text-3xl font-sans font-bold tracking-tight ${accent ? 'text-white' : 'text-white'}`}>
                {value}
            </div>
        </div>
    );
}

export default function AdminDashboard({ admin, stats, recentUsers, recentTargets, recentVulnerabilities }) {
    const { post, processing } = useForm();

    const logout = (e) => {
        e.preventDefault();
        post(route('admin.logout'));
    };

    return (
        <div className="min-h-screen bg-[#030408] text-gray-300 font-sans selection:bg-exec-indigo/30 selection:text-white relative">
            <Head title="Admin Dashboard" />

            {/* Global background effects */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-exec-indigo/10 via-[#030408] to-[#030408]"></div>
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-exec-indigo/20 rounded-full blur-[128px]"></div>
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-exec-info/10 rounded-full blur-[128px]"></div>
            </div>

            <div className="relative z-10 flex flex-col min-h-screen">
                <header className="border-b border-white/[0.08] bg-white/[0.02] backdrop-blur-xl px-6 py-4 flex items-center justify-between sticky top-0 z-50">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-exec-critical/10 border border-exec-critical/30 flex items-center justify-center shadow-[0_0_15px_rgba(244,63,94,0.2)]">
                            <ShieldCheckIcon className="w-6 h-6 text-exec-critical" />
                        </div>
                        <div>
                            <div className="text-exec-critical text-[10px] font-sans font-bold tracking-[0.2em] uppercase">Aegis / Admin</div>
                            <div className="text-slate-400 text-xs font-medium mt-0.5">Signed in as <span className="text-white">{admin.email}</span></div>
                        </div>
                    </div>
                    <button
                        onClick={logout}
                        disabled={processing}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-sans font-bold text-slate-400 hover:text-white hover:bg-white/[0.05] border border-transparent hover:border-white/[0.1] transition-all disabled:opacity-50"
                    >
                        <ArrowRightOnRectangleIcon className="w-4 h-4" />
                        Log out
                    </button>
                </header>

                <main className="flex-1 p-6 lg:p-10 space-y-10 max-w-[1600px] mx-auto w-full">
                    
                    <div className="flex items-center gap-3 hud-fade-in">
                        <span className="relative flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-exec-info opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-exec-info"></span>
                        </span>
                        <h1 className="text-2xl font-sans font-bold text-white tracking-tight drop-shadow-md">
                            Platform Overview
                        </h1>
                    </div>

                    <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6 hud-fade-in hud-stagger-1">
                        <StatCard 
                            label="Total Users" 
                            value={stats.total_users} 
                            icon={<UsersIcon className="w-5 h-5 text-slate-400" />} 
                        />
                        <StatCard 
                            label="Total Targets" 
                            value={stats.total_targets} 
                            icon={<GlobeAltIcon className="w-5 h-5 text-slate-400" />} 
                        />
                        <StatCard 
                            label="Active Targets" 
                            value={stats.active_targets} 
                            icon={<SignalIcon className="w-5 h-5 text-exec-info" />} 
                        />
                        <StatCard 
                            label="Total Vulnerabilities" 
                            value={stats.total_vulnerabilities} 
                            icon={<ExclamationTriangleIcon className="w-5 h-5 text-exec-high" />} 
                        />
                        <StatCard 
                            label="Unresolved Issues" 
                            value={stats.unresolved_vulnerabilities} 
                            icon={<ShieldCheckIcon className="w-5 h-5 text-exec-critical" />} 
                            accent 
                        />
                    </section>

                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 hud-fade-in hud-stagger-2">
                        {/* Users Table */}
                        <section className="rounded-3xl border border-white/[0.08] bg-white/[0.02] backdrop-blur-2xl overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.2)] relative flex flex-col">
                            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.15] to-transparent"></div>
                            <div className="px-6 py-5 border-b border-white/[0.08] bg-white/[0.02] flex items-center gap-3">
                                <UsersIcon className="w-5 h-5 text-exec-indigo" />
                                <h2 className="text-sm font-sans font-bold uppercase tracking-widest text-slate-200">Recent Users</h2>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm font-sans text-left">
                                    <thead className="bg-[#050a16]/50 text-[10px] font-bold uppercase tracking-widest text-slate-500 border-b border-white/[0.08]">
                                        <tr>
                                            <th className="px-6 py-4 font-bold">Name</th>
                                            <th className="px-6 py-4 font-bold">Email</th>
                                            <th className="px-6 py-4 font-bold">Tier</th>
                                            <th className="px-6 py-4 font-bold">Joined</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/[0.05]">
                                        {recentUsers.map((u) => (
                                            <tr key={u.id} className="hover:bg-white/[0.02] transition-colors group">
                                                <td className="px-6 py-4 font-bold text-slate-200 group-hover:text-white transition-colors">{u.name}</td>
                                                <td className="px-6 py-4 font-medium text-slate-400">{u.email}</td>
                                                <td className="px-6 py-4">
                                                    <span className={`inline-flex px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border ${
                                                        u.subscription_tier === 'free' ? 'bg-white/[0.05] text-slate-400 border-white/[0.1]' :
                                                        u.subscription_tier === 'pro' ? 'bg-exec-indigo/10 text-exec-indigo border-exec-indigo/30' :
                                                        'bg-exec-high/10 text-exec-high border-exec-high/30'
                                                    }`}>
                                                        {u.subscription_tier}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 font-mono text-xs text-slate-500">{new Date(u.created_at).toLocaleDateString()}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </section>

                        {/* Targets Table */}
                        <section className="rounded-3xl border border-white/[0.08] bg-white/[0.02] backdrop-blur-2xl overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.2)] relative flex flex-col">
                            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.15] to-transparent"></div>
                            <div className="px-6 py-5 border-b border-white/[0.08] bg-white/[0.02] flex items-center gap-3">
                                <GlobeAltIcon className="w-5 h-5 text-exec-info" />
                                <h2 className="text-sm font-sans font-bold uppercase tracking-widest text-slate-200">Recent Targets</h2>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm font-sans text-left">
                                    <thead className="bg-[#050a16]/50 text-[10px] font-bold uppercase tracking-widest text-slate-500 border-b border-white/[0.08]">
                                        <tr>
                                            <th className="px-6 py-4 font-bold">Domain</th>
                                            <th className="px-6 py-4 font-bold">Owner</th>
                                            <th className="px-6 py-4 font-bold">Status</th>
                                            <th className="px-6 py-4 font-bold">Last Scanned</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/[0.05]">
                                        {recentTargets.map((t) => (
                                            <tr key={t.id} className="hover:bg-white/[0.02] transition-colors group">
                                                <td className="px-6 py-4 font-mono text-xs font-bold text-exec-info group-hover:text-emerald-400 transition-colors">{t.display_name || t.domain_url}</td>
                                                <td className="px-6 py-4 font-medium text-slate-400">{t.user?.email}</td>
                                                <td className="px-6 py-4">
                                                    <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest border ${
                                                        t.is_active ? 'bg-exec-info/10 text-exec-info border-exec-info/30' : 'bg-white/[0.05] text-slate-500 border-white/[0.1]'
                                                    }`}>
                                                        {t.is_active ? 'Active' : 'Inactive'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 font-mono text-xs text-slate-500">{t.last_scanned_at ? new Date(t.last_scanned_at).toLocaleDateString() : '—'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </section>
                    </div>

                    {/* Vulnerabilities Table */}
                    <section className="rounded-3xl border border-white/[0.08] bg-white/[0.02] backdrop-blur-2xl overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.2)] relative hud-fade-in hud-stagger-3">
                        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.15] to-transparent"></div>
                        <div className="px-6 py-5 border-b border-white/[0.08] bg-white/[0.02] flex items-center gap-3">
                            <ExclamationTriangleIcon className="w-5 h-5 text-exec-high" />
                            <h2 className="text-sm font-sans font-bold uppercase tracking-widest text-slate-200">Recent Findings</h2>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm font-sans text-left">
                                <thead className="bg-[#050a16]/50 text-[10px] font-bold uppercase tracking-widest text-slate-500 border-b border-white/[0.08]">
                                    <tr>
                                        <th className="px-6 py-4 font-bold w-1/3">Type</th>
                                        <th className="px-6 py-4 font-bold">Severity</th>
                                        <th className="px-6 py-4 font-bold">Target</th>
                                        <th className="px-6 py-4 font-bold">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/[0.05]">
                                    {recentVulnerabilities.map((v) => (
                                        <tr key={v.id} className="hover:bg-white/[0.02] transition-colors group">
                                            <td className="px-6 py-4 font-bold text-slate-200 group-hover:text-white transition-colors truncate max-w-md">{v.title || v.category || v.vulnerability_type}</td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest border ${
                                                    v.severity === 'critical' ? 'bg-exec-critical/10 text-exec-critical border-exec-critical/30' :
                                                    v.severity === 'high' ? 'bg-exec-high/10 text-exec-high border-exec-high/30' :
                                                    v.severity === 'medium' ? 'bg-exec-medium/10 text-exec-medium border-exec-medium/30' :
                                                    'bg-exec-info/10 text-exec-info border-exec-info/30'
                                                }`}>
                                                    {v.severity}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 font-mono text-xs text-slate-400 truncate max-w-xs">{v.target?.domain_url}</td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest border ${
                                                    v.is_resolved ? 'bg-exec-info/10 text-exec-info border-exec-info/30' : 'bg-exec-critical/10 text-exec-critical border-exec-critical/30'
                                                }`}>
                                                    {v.is_resolved ? 'Resolved' : 'Open'}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </section>
                </main>
            </div>
        </div>
    );
}