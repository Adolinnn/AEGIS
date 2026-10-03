import { Head } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import PrimaryButton from '@/Components/PrimaryButton';
import TelemetryTerminal from '@/Components/TelemetryTerminal';
import { useState } from 'react';
import { 
    MagnifyingGlassIcon, 
    ClockIcon,
    GlobeAltIcon
} from '@heroicons/react/24/outline';

export default function QuickScanIndex() {
    const [target, setTarget] = useState('');
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState(null);
    const [activeTab, setActiveTab] = useState(0);
    const [error, setError] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!target.trim()) return;

        setLoading(true);
        setError(null);
        setResults(null);

        try {
            const response = await window.axios.post(route('quick-scan.run'), { target });
            setResults(response.data.results);
            setActiveTab(0);
        } catch (err) {
            setError(
                err.response?.data?.message || 'Reconnaissance scan failed. Verify target URL and connectivity.'
            );
        } finally {
            setLoading(false);
        }
    };

    const activeResult = results ? results[activeTab] : null;

    return (
        <AuthenticatedLayout
            header={
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-3">
                            <span className="font-sans text-[10px] px-2.5 py-1 rounded-full bg-exec-indigo/10 text-exec-indigo border border-exec-indigo/30 font-bold uppercase tracking-wider flex items-center gap-2 shadow-[0_0_10px_rgba(99,102,241,0.2)]">
                                <GlobeAltIcon className="h-3 w-3" />
                                Live Recon
                            </span>
                            <span className="text-slate-500 text-sm font-sans">/</span>
                            <span className="font-sans text-xs text-slate-400 font-medium">Synchronous HTTP/DNS Telemetry</span>
                        </div>
                        <h1 className="text-3xl font-sans font-bold text-white tracking-tight mt-3 drop-shadow-md">
                            Quick Reconnaissance Terminal
                        </h1>
                    </div>
                </div>
            }
        >
            <Head title="Quick Recon" />

            <div className="mx-auto max-w-[1400px] px-4 py-10 sm:px-6 lg:px-8 space-y-8">
                
                {/* Input Card */}
                <div className="rounded-3xl border border-white/[0.08] bg-white/[0.02] backdrop-blur-2xl p-8 shadow-[0_8px_32px_rgba(0,0,0,0.2)] relative overflow-hidden hud-fade-in">
                    <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.12] to-transparent"></div>
                    <p className="mb-6 font-sans text-sm text-slate-400 font-medium max-w-3xl leading-relaxed">
                        Dispatch instantaneous read-only reconnaissance (<span className="text-exec-indigo font-mono text-xs px-1.5 py-0.5 rounded bg-exec-indigo/10 border border-exec-indigo/30">whois</span>, <span className="text-exec-indigo font-mono text-xs px-1.5 py-0.5 rounded bg-exec-indigo/10 border border-exec-indigo/30">dig</span>, <span className="text-exec-indigo font-mono text-xs px-1.5 py-0.5 rounded bg-exec-indigo/10 border border-exec-indigo/30">sslscan</span>, <span className="text-exec-indigo font-mono text-xs px-1.5 py-0.5 rounded bg-exec-indigo/10 border border-exec-indigo/30">whatweb</span>) against any target host or URL.
                    </p>

                    <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-4">
                        <div className="relative flex-1">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none font-mono text-xs text-slate-500 font-bold">
                                <span>TARGET:</span>
                            </div>
                            <input
                                type="text"
                                value={target}
                                onChange={(e) => setTarget(e.target.value)}
                                placeholder="example.com or https://api.production.app"
                                className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] pl-20 pr-4 py-3.5 font-mono text-sm text-slate-100 placeholder-slate-500 focus:border-exec-indigo/50 focus:outline-none focus:ring-1 focus:ring-exec-indigo/50 transition-all shadow-inner backdrop-blur-md"
                            />
                        </div>
                        <button 
                            type="submit"
                            disabled={loading || !target.trim()} 
                            className="shrink-0 inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl bg-gradient-to-r from-exec-indigo to-[#8b5cf6] text-white font-sans text-sm font-bold hover:shadow-[0_0_20px_rgba(99,102,241,0.5)] active:scale-[0.98] transition-all relative overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <div className="absolute inset-0 bg-white/20 hover:opacity-0 transition-opacity rounded-xl pointer-events-none"></div>
                            <MagnifyingGlassIcon className="h-5 w-5" />
                            {loading ? 'Probing Target…' : 'Execute Recon'}
                        </button>
                    </form>

                    {/* Example targets */}
                    <div className="mt-5 flex items-center gap-3 font-sans text-xs text-slate-500 font-medium">
                        <span>Quick try:</span>
                        <button 
                            type="button" 
                            onClick={() => setTarget('scanme.nmap.org')} 
                            className="text-exec-indigo hover:text-white underline underline-offset-4 transition-colors"
                        >
                            scanme.nmap.org
                        </button>
                        <span>•</span>
                        <button 
                            type="button" 
                            onClick={() => setTarget('https://laravel.com')} 
                            className="text-exec-indigo hover:text-white underline underline-offset-4 transition-colors"
                        >
                            https://laravel.com
                        </button>
                    </div>
                </div>

                {/* Error Banner */}
                {error && (
                    <div className="rounded-2xl border border-exec-critical/30 bg-exec-critical/10 p-5 font-sans text-sm text-exec-critical shadow-[0_4px_20px_rgba(244,63,94,0.15)] hud-fade-in backdrop-blur-md flex items-center gap-3">
                        <span className="font-mono text-xs font-bold uppercase tracking-widest text-white px-2 py-1 bg-exec-critical rounded">Error</span>
                        <span>{error}</span>
                    </div>
                )}

                {/* Loading State */}
                {loading && (
                    <div className="rounded-3xl border border-exec-indigo/30 bg-exec-indigo/10 p-12 text-center backdrop-blur-2xl shadow-[0_8px_32px_rgba(99,102,241,0.15)] space-y-4 hud-fade-in relative overflow-hidden">
                        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-exec-indigo/50 to-transparent"></div>
                        <div className="flex justify-center">
                            <ClockIcon className="h-10 w-10 text-exec-indigo animate-spin" />
                        </div>
                        <div className="font-sans text-lg text-white font-bold">
                            Dispatching Concurrent Reconnaissance Commands…
                        </div>
                        <div className="font-sans text-sm text-slate-400 font-medium">
                            Invoking whois, dig DNS lookup, sslscan ciphers, and whatweb fingerprinting.
                        </div>
                    </div>
                )}

                {/* Results Tabs & Telemetry Terminal */}
                {results && (
                    <div className="space-y-4 hud-fade-in">
                        {/* Tab Switcher */}
                        <div className="flex flex-wrap items-center gap-2 border-b border-white/[0.08] pb-2">
                            {results.map((r, i) => (
                                <button
                                    key={r.tool}
                                    onClick={() => setActiveTab(i)}
                                    className={`flex items-center gap-2 px-5 py-2.5 font-sans text-xs font-bold uppercase tracking-widest rounded-xl transition-all ${
                                        activeTab === i
                                            ? 'bg-white/[0.05] text-white border border-white/[0.1] shadow-[0_0_15px_rgba(255,255,255,0.05)]'
                                            : 'text-slate-400 hover:text-white hover:bg-white/[0.03] border border-transparent'
                                    }`}
                                >
                                    {r.installed && !r.timed_out ? (
                                        <span className="w-2 h-2 rounded-full bg-exec-info shadow-[0_0_8px_#10b981]"></span>
                                    ) : (
                                        <span className="w-2 h-2 rounded-full bg-exec-critical shadow-[0_0_8px_#f43f5e]"></span>
                                    )}
                                    {r.label}
                                </button>
                            ))}
                        </div>

                        {/* Telemetry Terminal */}
                        {activeResult && (
                            <div className="rounded-2xl border border-white/[0.08] bg-black/40 backdrop-blur-xl overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
                                <TelemetryTerminal
                                    title={`aegis-recon://${activeResult.tool}-telemetry`}
                                    command={`aegis-recon --tool ${activeResult.tool} --target ${target}`}
                                    output={activeResult.output || ''}
                                    isRunning={false}
                                    status={activeResult.installed ? (activeResult.timed_out ? 'timed_out' : 'completed') : 'not_installed'}
                                    exitCode={activeResult.exit_code}
                                />
                            </div>
                        )}
                    </div>
                )}
            </div>
        </AuthenticatedLayout>
    );
}
