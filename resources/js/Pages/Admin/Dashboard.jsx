import { Head, useForm } from '@inertiajs/react';

function StatCard({ label, value, accent = false }) {
    return (
        <div className={`p-4 rounded-lg border ${accent ? 'border-red-700/50 bg-red-950/20' : 'border-gray-800 bg-gray-950'}`}>
            <div className="text-xs font-mono uppercase tracking-widest text-gray-500">{label}</div>
            <div className={`mt-1 text-2xl font-mono ${accent ? 'text-red-500' : 'text-gray-100'}`}>{value}</div>
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
        <div className="min-h-screen bg-black text-gray-300 font-mono">
            <Head title="Admin Dashboard" />

            <header className="border-b border-gray-900 px-6 py-4 flex items-center justify-between">
                <div>
                    <div className="text-red-600 text-xs tracking-[0.3em] uppercase">Aegis / Admin</div>
                    <div className="text-gray-500 text-xs mt-0.5">Signed in as {admin.email}</div>
                </div>
                <button
                    onClick={logout}
                    disabled={processing}
                    className="text-xs uppercase tracking-widest text-gray-500 hover:text-red-500 transition"
                >
                    Log out
                </button>
            </header>

            <main className="p-6 space-y-8">
                <section className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <StatCard label="Users" value={stats.total_users} />
                    <StatCard label="Targets" value={stats.total_targets} />
                    <StatCard label="Active Targets" value={stats.active_targets} />
                    <StatCard label="Vulnerabilities" value={stats.total_vulnerabilities} />
                    <StatCard label="Unresolved" value={stats.unresolved_vulnerabilities} accent />
                </section>

                <section>
                    <h2 className="text-xs uppercase tracking-widest text-gray-500 mb-3">Recent Users</h2>
                    <div className="border border-gray-800 rounded-lg overflow-hidden">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-950 text-gray-500 text-xs uppercase">
                                <tr>
                                    <th className="text-left px-4 py-2">Name</th>
                                    <th className="text-left px-4 py-2">Email</th>
                                    <th className="text-left px-4 py-2">Tier</th>
                                    <th className="text-left px-4 py-2">Joined</th>
                                </tr>
                            </thead>
                            <tbody>
                                {recentUsers.map((u) => (
                                    <tr key={u.id} className="border-t border-gray-900">
                                        <td className="px-4 py-2">{u.name}</td>
                                        <td className="px-4 py-2 text-gray-500">{u.email}</td>
                                        <td className="px-4 py-2 text-gray-500">{u.subscription_tier}</td>
                                        <td className="px-4 py-2 text-gray-600">{u.created_at}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>

                <section>
                    <h2 className="text-xs uppercase tracking-widest text-gray-500 mb-3">Recent Targets</h2>
                    <div className="border border-gray-800 rounded-lg overflow-hidden">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-950 text-gray-500 text-xs uppercase">
                                <tr>
                                    <th className="text-left px-4 py-2">Domain</th>
                                    <th className="text-left px-4 py-2">Owner</th>
                                    <th className="text-left px-4 py-2">Active</th>
                                    <th className="text-left px-4 py-2">Last Scanned</th>
                                </tr>
                            </thead>
                            <tbody>
                                {recentTargets.map((t) => (
                                    <tr key={t.id} className="border-t border-gray-900">
                                        <td className="px-4 py-2">{t.display_name || t.domain_url}</td>
                                        <td className="px-4 py-2 text-gray-500">{t.user?.email}</td>
                                        <td className="px-4 py-2">
                                            <span className={t.is_active ? 'text-green-500' : 'text-gray-600'}>
                                                {t.is_active ? 'Yes' : 'No'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-2 text-gray-600">{t.last_scanned_at || '—'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>

                <section>
                    <h2 className="text-xs uppercase tracking-widest text-gray-500 mb-3">Recent Vulnerabilities</h2>
                    <div className="border border-gray-800 rounded-lg overflow-hidden">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-950 text-gray-500 text-xs uppercase">
                                <tr>
                                    <th className="text-left px-4 py-2">Type</th>
                                    <th className="text-left px-4 py-2">Severity</th>
                                    <th className="text-left px-4 py-2">Target</th>
                                    <th className="text-left px-4 py-2">Resolved</th>
                                </tr>
                            </thead>
                            <tbody>
                                {recentVulnerabilities.map((v) => (
                                    <tr key={v.id} className="border-t border-gray-900">
                                        <td className="px-4 py-2">{v.vulnerability_type}</td>
                                        <td className="px-4 py-2 text-red-500">{v.severity}</td>
                                        <td className="px-4 py-2 text-gray-500">{v.target?.domain_url}</td>
                                        <td className="px-4 py-2">
                                            <span className={v.is_resolved ? 'text-green-500' : 'text-gray-600'}>
                                                {v.is_resolved ? 'Yes' : 'No'}
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
    );
}