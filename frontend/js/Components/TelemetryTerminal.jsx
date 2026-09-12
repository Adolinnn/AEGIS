import { useState, useRef, useEffect, useMemo } from 'react';
import {
    ClipboardDocumentIcon,
    CheckIcon,
    MagnifyingGlassIcon,
    ArrowsPointingOutIcon,
    ArrowsPointingInIcon,
    ArrowPathIcon,
    CommandLineIcon
} from '@heroicons/react/24/outline';

/**
 * Highlights cybersecurity tokens (IPs, URLs, CVEs, ports, status tags)
 */
function HighlightedLine({ text }) {
    if (!text) return <span>&nbsp;</span>;

    // Fast check for common markers to avoid heavy regex on plain lines
    const hasSpecialTokens = /[\[\]:\/\d]/.test(text);
    if (!hasSpecialTokens) {
        return <span>{text}</span>;
    }

    // Split and highlight tokens
    const parts = text.split(/(\b(?:https?:\/\/[^\s]+|CVE-\d{4}-\d{4,}|\d{1,3}(?:\.\d{1,3}){3}|(?:\d{1,5}\/(?:tcp|udp))\b|\[\+\]|\[\!\]|\[\-\]|\[\*\]|\[CRITICAL\]|\[HIGH\]|\[MEDIUM\]|\[LOW\]|\[INFO\]|\[ERROR\]|\[WARNING\]))/gi);

    return (
        <span>
            {parts.map((part, idx) => {
                if (!part) return null;

                const upper = part.toUpperCase();

                if (upper === '[+]' || upper === '[INFO]') {
                    return <span key={idx} className="text-emerald-400 font-bold">{part}</span>;
                }
                if (upper === '[!]' || upper === '[WARN]' || upper === '[WARNING]' || upper === '[MEDIUM]') {
                    return <span key={idx} className="text-amber-400 font-bold">{part}</span>;
                }
                if (upper === '[-]' || upper === '[CRITICAL]' || upper === '[HIGH]' || upper === '[ERROR]') {
                    return <span key={idx} className="text-rose-400 font-bold shadow-[0_0_8px_rgba(244,63,94,0.3)]">{part}</span>;
                }
                if (upper === '[*]') {
                    return <span key={idx} className="text-cyan-400 font-bold">{part}</span>;
                }
                if (part.startsWith('http://') || part.startsWith('https://')) {
                    return <span key={idx} className="text-cyan-300 underline underline-offset-2 hover:text-cyan-200">{part}</span>;
                }
                if (/^CVE-\d{4}-\d{4,}$/i.test(part)) {
                    return <span key={idx} className="text-rose-300 font-bold bg-rose-950/60 px-1 py-0.5 rounded border border-rose-800/60 shadow-[0_0_6px_rgba(244,63,94,0.3)]">{part}</span>;
                }
                if (/^\d{1,3}(?:\.\d{1,3}){3}$/.test(part)) {
                    return <span key={idx} className="text-cyan-400">{part}</span>;
                }
                if (/^\d{1,5}\/(?:tcp|udp)$/i.test(part)) {
                    return <span key={idx} className="text-purple-300 font-semibold">{part}</span>;
                }

                return <span key={idx}>{part}</span>;
            })}
        </span>
    );
}

export default function TelemetryTerminal({
    title = 'aegis-telemetry://stream',
    command = '',
    output = '',
    isRunning = false,
    status = 'completed',
    exitCode = null,
    findingsCount = 0,
    maxHeight = 'max-h-[36rem]',
    extraActions = null,
}) {
    const [copied, setCopied] = useState(false);
    const [filterText, setFilterText] = useState('');
    const [showSearch, setShowSearch] = useState(false);
    const [fontSize, setFontSize] = useState('text-xs'); // text-[11px], text-xs, text-sm
    const [wrapLines, setWrapLines] = useState(true);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [autoScroll, setAutoScroll] = useState(true);

    const termBodyRef = useRef(null);
    const searchInputRef = useRef(null);

    // Split output into lines
    const lines = useMemo(() => {
        if (!output) return [];
        return output.split('\n');
    }, [output]);

    // Filtered lines if grep search active
    const filteredLines = useMemo(() => {
        if (!filterText.trim()) return lines;
        const query = filterText.toLowerCase();
        return lines.filter(l => l.toLowerCase().includes(query));
    }, [lines, filterText]);

    // Auto-scroll when new output arrives if active
    useEffect(() => {
        if (autoScroll && isRunning && termBodyRef.current) {
            termBodyRef.current.scrollTop = termBodyRef.current.scrollHeight;
        }
    }, [output, isRunning, autoScroll]);

    // Focus search on toggle
    useEffect(() => {
        if (showSearch && searchInputRef.current) {
            searchInputRef.current.focus();
        }
    }, [showSearch]);

    const handleCopy = () => {
        if (!output) return;
        navigator.clipboard.writeText(output);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const cycleFontSize = () => {
        if (fontSize === 'text-[11px]') setFontSize('text-xs');
        else if (fontSize === 'text-xs') setFontSize('text-sm');
        else setFontSize('text-[11px]');
    };

    return (
        <div className={`laser-beam-header rounded-xl border border-white/[0.08] bg-[#070c18] backdrop-blur-md shadow-2xl overflow-hidden flex flex-col transition-all duration-300 ${
            isFullscreen ? 'fixed inset-4 z-50 rounded-2xl max-h-none shadow-[0_0_50px_rgba(0,0,0,0.9)]' : ''
        }`}>
            {/* Terminal Window Header Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 bg-[#050811] border-b border-white/[0.08] select-none">
                
                {/* Traffic lights & Title */}
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded-full bg-rose-500/80 shadow-[0_0_6px_#f43f5e]"></span>
                        <span className="w-3 h-3 rounded-full bg-amber-500/80 shadow-[0_0_6px_#f59e0b]"></span>
                        <span className="w-3 h-3 rounded-full bg-emerald-500/80 shadow-[0_0_6px_#10b981]"></span>
                    </div>

                    <div className="flex items-center gap-2 font-mono text-xs">
                        <CommandLineIcon className="h-3.5 w-3.5 text-cyan-400" />
                        <span className="text-slate-300 font-semibold tracking-wide truncate max-w-[280px] sm:max-w-md">
                            {title}
                        </span>
                    </div>

                    {isRunning ? (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 font-mono text-[10px] font-bold shadow-[0_0_8px_rgba(6,182,212,0.3)] animate-pulse">
                            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
                            LIVE STREAM
                        </span>
                    ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400 font-mono text-[10px]">
                            {lines.length} lines
                        </span>
                    )}
                </div>

                {/* Control Action Buttons */}
                <div className="flex items-center gap-1.5">
                    {/* Filter Search Toggle */}
                    <button
                        onClick={() => setShowSearch(!showSearch)}
                        className={`p-1.5 rounded-lg border text-xs font-mono transition ${
                            showSearch || filterText
                                ? 'bg-cyan-950/60 border-cyan-500/50 text-cyan-300 shadow-[0_0_8px_rgba(6,182,212,0.2)]'
                                : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                        }`}
                        title="Search / Grep Log"
                    >
                        <MagnifyingGlassIcon className="h-3.5 w-3.5" />
                    </button>

                    {/* Font Size Toggle */}
                    <button
                        onClick={cycleFontSize}
                        className="px-2 py-1 rounded-lg border border-slate-800 bg-slate-900/80 text-slate-400 hover:text-white hover:border-slate-700 font-mono text-[10px] font-semibold transition"
                        title="Toggle Font Size"
                    >
                        {fontSize === 'text-[11px]' ? 'AA-' : fontSize === 'text-xs' ? 'AA' : 'AA+'}
                    </button>

                    {/* Wrap Toggle */}
                    <button
                        onClick={() => setWrapLines(!wrapLines)}
                        className={`px-2 py-1 rounded-lg border font-mono text-[10px] font-semibold transition ${
                            wrapLines
                                ? 'bg-slate-800/80 border-slate-700 text-slate-200'
                                : 'bg-slate-900/80 border-slate-800 text-slate-500 hover:text-slate-300'
                        }`}
                        title="Toggle Soft Wrap"
                    >
                        WRAP
                    </button>

                    {/* Copy Output Button */}
                    <button
                        onClick={handleCopy}
                        disabled={!output}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-800 bg-slate-900/80 text-slate-300 hover:text-white hover:border-slate-700 font-mono text-[11px] transition hover:scale-105 active:scale-95 disabled:opacity-40"
                    >
                        {copied ? (
                            <>
                                <CheckIcon className="h-3.5 w-3.5 text-emerald-400" />
                                <span className="text-emerald-400 font-semibold">Copied</span>
                            </>
                        ) : (
                            <>
                                <ClipboardDocumentIcon className="h-3.5 w-3.5 text-slate-400" />
                                <span>Copy</span>
                            </>
                        )}
                    </button>

                    {/* Fullscreen Expand */}
                    <button
                        onClick={() => setIsFullscreen(!isFullscreen)}
                        className="p-1.5 rounded-lg border border-slate-800 bg-slate-900/80 text-slate-400 hover:text-white hover:border-slate-700 font-mono transition hover:scale-105 active:scale-95"
                        title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
                    >
                        {isFullscreen ? (
                            <ArrowsPointingInIcon className="h-3.5 w-3.5" />
                        ) : (
                            <ArrowsPointingOutIcon className="h-3.5 w-3.5" />
                        )}
                    </button>

                    {extraActions}
                </div>
            </div>

            {/* In-Terminal Grep / Filter Bar */}
            {showSearch && (
                <div className="px-4 py-2 bg-[#04060d] border-b border-white/[0.06] flex items-center gap-2 hud-fade-in">
                    <MagnifyingGlassIcon className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
                    <input
                        ref={searchInputRef}
                        type="text"
                        value={filterText}
                        onChange={(e) => setFilterText(e.target.value)}
                        placeholder="Grep pattern (e.g. 443/tcp, CVE, error, vulnerable)…"
                        className="w-full bg-transparent border-0 p-0 font-mono text-xs text-slate-200 placeholder-slate-600 focus:ring-0 focus:outline-none"
                    />
                    {filterText && (
                        <button
                            onClick={() => setFilterText('')}
                            className="text-[10px] font-mono text-slate-500 hover:text-slate-300 px-1.5 py-0.5 rounded bg-slate-800"
                        >
                            CLEAR
                        </button>
                    )}
                </div>
            )}

            {/* Shell Command & Status Banner */}
            <div className="px-4 py-2 bg-[#03050a] border-b border-slate-900/90 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 font-mono text-[11px] text-slate-400">
                <div className="flex items-center gap-2 min-w-0">
                    <span className="text-emerald-400 font-bold select-none">[operator@aegis-secops ~]$</span>
                    <span className="text-slate-200 font-medium truncate">{command || 'tail -f telemetry.log'}</span>
                </div>

                <div className="flex items-center gap-3 text-[10px] text-slate-500 shrink-0">
                    <span>STATUS: <span className={isRunning ? 'text-cyan-400 font-bold' : 'text-slate-300'}>{status?.toUpperCase()}</span></span>
                    <span>•</span>
                    <span>EXIT: <span className={exitCode === 0 ? 'text-emerald-400 font-bold' : exitCode !== null ? 'text-rose-400 font-bold' : 'text-slate-500'}>{exitCode ?? 'N/A'}</span></span>
                    {findingsCount > 0 && (
                        <>
                            <span>•</span>
                            <span className="text-amber-400 font-bold shadow-sm">{findingsCount} FINDINGS</span>
                        </>
                    )}
                </div>
            </div>

            {/* Terminal Screen Body */}
            <div
                ref={termBodyRef}
                className={`p-4 bg-[#020307] font-mono ${fontSize} leading-relaxed overflow-auto flex-1 shadow-inner ${
                    isFullscreen ? 'h-full' : maxHeight
                }`}
                style={{
                    backgroundImage: 'radial-gradient(rgba(6, 182, 212, 0.03) 1px, transparent 1px)',
                    backgroundSize: '24px 24px',
                }}
            >
                {filteredLines.length === 0 ? (
                    <div className="py-12 text-center text-slate-600 font-mono text-xs">
                        {filterText ? `No lines matching pattern "${filterText}"` : isRunning ? 'Initializing telemetry stream…' : 'No telemetry output captured for this process.'}
                    </div>
                ) : (
                    <table className="w-full border-collapse">
                        <tbody>
                            {filteredLines.map((line, idx) => (
                                <tr key={idx} className="hover:bg-slate-800/30 transition-colors group">
                                    {/* Line Number Gutter */}
                                    <td className="w-10 pr-3 py-0.5 text-right font-mono text-[10px] text-slate-600 group-hover:text-slate-400 select-none border-r border-slate-900 align-top">
                                        {idx + 1}
                                    </td>
                                    {/* Line Code Content */}
                                    <td className={`pl-3 py-0.5 text-emerald-400/90 font-mono align-top ${
                                        wrapLines ? 'whitespace-pre-wrap break-words' : 'whitespace-pre overflow-x-auto'
                                    }`}>
                                        <HighlightedLine text={line} />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}

                {/* Blinking Live Stream Cursor */}
                {isRunning && (
                    <div className="mt-2 flex items-center gap-1 text-emerald-400 pl-13">
                        <span className="inline-block w-2 h-4 bg-emerald-400 animate-pulse shadow-[0_0_8px_#10b981]"></span>
                    </div>
                )}
            </div>
        </div>
    );
}
