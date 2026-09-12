import { Head } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import PrimaryButton from '@/Components/PrimaryButton';
import TelemetryTerminal from '@/Components/TelemetryTerminal';
import { useState } from 'react';
import { 
    MagnifyingGlassIcon, 
    CheckCircleIcon, 
    XCircleIcon, 
    ClockIcon,
    CommandLineIcon
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
                <div className="flex items-center justify-between">
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="font-mono text-[10px] uppercase tracking-widest px-2 py-0.5 rounded bg-cyan-950/60 text-cyan-400 border border-cyan-800/60 font-semibold">
                                LIVE RECON
                            </span>
                            <span className="font-mono text-xs text-slate-500">Synchronous HTTP/DNS Telemetry</span>
                        </div>
                        <h1 className="text-2xl font-mono font-bold text-white tracking-tight mt-1">
                            Quick Reconnaissance Terminal
                        </h1>
                    </div>
                </div>
            }
        >
            <Head title="Quick Recon" />

            <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
                
                {/* Input Card with Laser Beam Header */}
                <div className="laser-beam-header rounded-xl border border-white/[0.08] bg-[#0c1428]/90 p-6 backdrop-blur-md shadow-xl hud-fade-in">
                    <p className="mb-4 font-mono text-xs text-slate-400">
                        Dispatch instantaneous read-only reconnaissance (<span className="text-cyan-400">whois</span>, <span className="text-cyan-400">dig</span>, <span className="text-cyan-400">sslscan</span>, <span className="text-cyan-400">whatweb</span>) against any target host or URL.
                    </p>

                    <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
                        <div className="relative flex-1">
                            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none font-mono text-xs text-slate-500">
                                <span>target:</span>
                            </div>
                            <input
                                type="text"
                                value={target}
                                onChange={(e) => setTarget(e.target.value)}
                                placeholder="example.com or https://api.production.app"
                                className="w-full rounded-lg border border-slate-700/80 bg-[#070b14] pl-20 pr-4 py-2.5 font-mono text-sm text-slate-100 placeholder-slate-600 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 shadow-inner"
                            />
                        </div>
                        <PrimaryButton disabled={loading || !target.trim()} className="shrink-0 h-[42px]">
                            <MagnifyingGlassIcon className="mr-2 h-4 w-4" />
                            {loading ? 'Probing Target…' : 'Execute Recon'}
                        </PrimaryButton>
                    </form>

                    {/* Example targets */}
                    <div className="mt-3 flex items-center gap-2 font-mono text-[11px] text-slate-500">
                        <span>Quick try:</span>
                        <button 
                            type="button" 
                            onClick={() => setTarget('scanme.nmap.org')} 
                            className="text-cyan-400/80 hover:text-cyan-300 underline transition-colors"
                        >
                            scanme.nmap.org
                        </button>
                        <span>•</span>
                        <button 
                            type="button" 
                            onClick={() => setTarget('https://laravel.com')} 
                            className="text-cyan-400/80 hover:text-cyan-300 underline transition-colors"
                        >
                            https://laravel.com
                        </button>
                    </div>
                </div>

                {/* Error Banner */}
                {error && (
                    <div className="rounded-xl border border-rose-500/30 bg-rose-950/40 p-4 font-mono text-xs text-rose-300 shadow-lg hud-fade-in">
                        <span className="font-bold text-rose-400">[RECON_ERROR]</span> {error}
                    </div>
                )}

                {/* Loading State */}
                {loading && (
                    <div className="laser-beam-header rounded-xl border border-cyan-500/30 bg-cyan-950/20 p-8 text-center backdrop-blur-md shadow-lg space-y-3 hud-fade-in">
                        <div className="flex justify-center">
                            <ClockIcon className="h-8 w-8 text-cyan-400 animate-spin" />
                        </div>
                        <div className="font-mono text-sm text-cyan-300 font-semibold">
                            Dispatching Concurrent Reconnaissance Commands…
                        </div>
                        <div className="font-mono text-xs text-slate-400">
                            Invoking whois, dig DNS lookup, sslscan ciphers, and whatweb fingerprinting.
                        </div>
                    </div>
                )}

                {/* Results Tabs & Telemetry Terminal */}
                {results && (
                    <div className="space-y-2 hud-fade-in">
                        {/* Tab Switcher */}
                        <div className="flex flex-wrap items-center gap-1.5 border-b border-white/[0.08] pb-1">
                            {results.map((r, i) => (
                                <button
                                    key={r.tool}
                                    onClick={() => setActiveTab(i)}
                                    className={`flex items-center gap-2 px-4 py-2 font-mono text-xs font-semibold uppercase tracking-wider rounded-t-lg transition ${
                                        activeTab === i
                                            ? 'bg-[#070c18] text-cyan-300 border-t-2 border-x border-cyan-500/50 border-b-transparent shadow-lg'
                                            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/30'
                                    }`}
                                >
                                    {r.installed && !r.timed_out ? (
                                        <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_#10b981]"></span>
                                    ) : (
                                        <span className="w-2 h-2 rounded-full bg-rose-400 shadow-[0_0_6px_#f43f5e]"></span>
                                    )}
                                    {r.label}
                                </button>
                            ))}
                        </div>

                        {/* Telemetry Terminal */}
                        {activeResult && (
                            <TelemetryTerminal
                                title={`aegis-recon://${activeResult.tool}-telemetry`}
                                command={`aegis-recon --tool ${activeResult.tool} --target ${target}`}
                                output={activeResult.output || ''}
                                isRunning={false}
                                status={activeResult.installed ? (activeResult.timed_out ? 'timed_out' : 'completed') : 'not_installed'}
                                exitCode={activeResult.exit_code}
                            />
                        )}
                    </div>
                )}
            </div>
        </AuthenticatedLayout>
    );
}
