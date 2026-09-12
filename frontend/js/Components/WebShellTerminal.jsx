import { useState, useRef, useEffect, useMemo } from 'react';
import { 
    CommandLineIcon, 
    ClipboardDocumentIcon, 
    CheckIcon, 
    ArrowDownTrayIcon,
    MagnifyingGlassIcon,
    ArrowsPointingOutIcon,
    ArrowsPointingInIcon,
    TrashIcon,
    PlayIcon,
    PauseIcon
} from '@heroicons/react/24/outline';

/**
 * High-tech interactive Web Terminal / Live Shell Console.
 * Features:
 * - Real-time syntax & security token highlighting (CVEs, IPs, ports, severity alerts)
 * - Auto-scrolling lock/unlock toggle
 * - Search / log filter in real-time
 * - Fullscreen toggle
 * - Copy / Download raw output
 * - Monospace font scaling (Small / Medium / Large)
 * - Blinking interactive prompt cursor
 */
export default function WebShellTerminal({
    title = 'aegis-live-webshell',
    command = '',
    output = '',
    isRunning = false,
    exitCode = null,
    timedOut = false,
    findingsCount = 0,
    className = '',
}) {
    const [autoScroll, setAutoScroll] = useState(true);
    const [fontSize, setFontSize] = useState('text-xs'); // 'text-[11px]', 'text-xs', 'text-sm'
    const [searchTerm, setSearchTerm] = useState('');
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [copied, setCopied] = useState(false);
    const [isCleared, setIsCleared] = useState(false);

    const termBodyRef = useRef(null);
    const containerRef = useRef(null);

    // Reset clear state if new output comes in
    useEffect(() => {
        if (output) {
            setIsCleared(false);
        }
    }, [output]);

    // Handle auto-scrolling
    useEffect(() => {
        if (autoScroll && isRunning && termBodyRef.current) {
            termBodyRef.current.scrollTop = termBodyRef.current.scrollHeight;
        }
    }, [output, autoScroll, isRunning]);

    const handleCopy = () => {
        if (!output) return;
        navigator.clipboard.writeText(output);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleDownload = () => {
        if (!output) return;
        const blob = new Blob([output], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-output.log`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const toggleFullscreen = () => {
        setIsFullscreen(!isFullscreen);
    };

    // Filter and syntax highlight terminal lines
    const renderedLines = useMemo(() => {
        if (isCleared) return [];
        if (!output) return [];

        const lines = output.split('\n');
        
        return lines.map((line, idx) => {
            // Apply search filter
            const matchesSearch = searchTerm ? line.toLowerCase().includes(searchTerm.toLowerCase()) : true;
            if (!matchesSearch) return null;

            // Security token & severity highlights
            let lineClass = 'text-slate-300';
            if (/(\[CRITICAL\]|\[FATAL\]|CRITICAL:|VULNERABLE|EXPLOIT|CVE-\d{4}-\d+)/i.test(line)) {
                lineClass = 'text-rose-400 font-bold bg-rose-950/30 px-1 rounded';
            } else if (/(\[HIGH\]|HIGH:|WARNING:|WARN:)/i.test(line)) {
                lineClass = 'text-orange-400 font-semibold';
            } else if (/(\[MEDIUM\]|MEDIUM:|\[ALERT\])/i.test(line)) {
                lineClass = 'text-amber-400';
            } else if (/(\[LOW\]|\[INFO\]|INFO:|\[\+\]|SUCCESS)/i.test(line)) {
                lineClass = 'text-emerald-400';
            } else if (/(\[\*\]|\[\?\]|PROBING|SCANNING|STARTING)/i.test(line)) {
                lineClass = 'text-cyan-400';
            } else if (/(\[\-\]|FAILED|ERROR|TIMEOUT)/i.test(line)) {
                lineClass = 'text-rose-300';
            }

            return (
                <div key={idx} className={`leading-relaxed font-mono ${lineClass} hover:bg-slate-800/40 px-1 rounded transition-colors`}>
                    <span className="text-slate-600 select-none text-[10px] w-8 inline-block opacity-60">
                        {(idx + 1).toString().padStart(3, '0')}
                    </span>
                    <span className="whitespace-pre-wrap break-all">{line}</span>
                </div>
            );
        });
    }, [output, searchTerm, isCleared]);

    return (
        <div 
            ref={containerRef}
            className={`flex flex-col rounded-xl border border-white/[0.12] bg-[#050811] shadow-2xl overflow-hidden transition-all duration-200 ${
                isFullscreen 
                    ? 'fixed inset-4 z-50 rounded-2xl shadow-[0_0_100px_rgba(0,0,0,0.95)]' 
                    : className
            }`}
        >
            {/* Terminal Window Header Bar */}
            <div className="flex flex-wrap items-center justify-between border-b border-white/[0.08] bg-[#090f1f] px-4 py-2.5 gap-2 select-none">
                
                {/* Left: Window Controls & Title */}
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5">
                        <span className="h-3 w-3 rounded-full bg-rose-500/80 border border-rose-600/40"></span>
                        <span className="h-3 w-3 rounded-full bg-amber-500/80 border border-amber-600/40"></span>
                        <span className="h-3 w-3 rounded-full bg-emerald-500/80 border border-emerald-600/40"></span>
                    </div>

                    <div className="flex items-center gap-2">
                        <CommandLineIcon className="h-4 w-4 text-cyan-400" />
                        <span className="font-mono text-xs font-bold text-slate-200 tracking-wide">
                            {title}
                        </span>
                    </div>

                    {isRunning ? (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-cyan-950/80 border border-cyan-500/50 text-[10px] font-mono text-cyan-300 animate-pulse shadow-[0_0_8px_rgba(6,182,212,0.3)]">
                            <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-ping"></span>
                            LIVE STREAM
                        </span>
                    ) : exitCode !== null ? (
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                            exitCode === 0 
                                ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800' 
                                : 'bg-rose-950/80 text-rose-400 border border-rose-800'
                        }`}>
                            EXIT {exitCode}
                        </span>
                    ) : null}

                    {timedOut && (
                        <span className="px-2 py-0.5 rounded bg-amber-950/80 text-amber-400 border border-amber-800 font-mono text-[10px] font-bold">
                            TIMEOUT
                        </span>
                    )}

                    {findingsCount > 0 && (
                        <span className="px-2 py-0.5 rounded bg-rose-950/60 text-rose-300 border border-rose-800 font-mono text-[10px] font-bold">
                            {findingsCount} finding(s)
                        </span>
                    )}
                </div>

                {/* Right: Terminal Action Toolbar */}
                <div className="flex items-center gap-2 flex-wrap">
                    
                    {/* In-Terminal Filter Input */}
                    <div className="relative">
                        <MagnifyingGlassIcon className="h-3 w-3 absolute left-2 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Grep pattern..."
                            className="w-28 sm:w-36 rounded-md border border-slate-700/60 bg-[#03060d] pl-6 pr-2 py-1 font-mono text-[11px] text-slate-200 placeholder-slate-600 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                        />
                        {searchTerm && (
                            <button
                                onClick={() => setSearchTerm('')}
                                className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 text-[10px] font-mono"
                            >
                                ✕
                            </button>
                        )}
                    </div>

                    {/* Font Size Toggle */}
                    <button
                        onClick={() => setFontSize(f => f === 'text-[11px]' ? 'text-xs' : f === 'text-xs' ? 'text-sm' : 'text-[11px]')}
                        className="px-2 py-1 rounded bg-slate-900 border border-slate-700/80 font-mono text-[10px] text-slate-300 hover:text-white hover:border-slate-500 transition"
                        title="Adjust terminal font size"
                    >
                        {fontSize === 'text-[11px]' ? 'AA-' : fontSize === 'text-xs' ? 'AA' : 'AA+'}
                    </button>

                    {/* Auto-scroll Toggle */}
                    <button
                        onClick={() => setAutoScroll(!autoScroll)}
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded border font-mono text-[10px] transition ${
                            autoScroll 
                                ? 'bg-cyan-950/60 border-cyan-500/40 text-cyan-300' 
                                : 'bg-slate-900 border-slate-700/80 text-slate-400 hover:text-slate-200'
                        }`}
                        title={autoScroll ? 'Auto-scroll is ON' : 'Auto-scroll is PAUSED'}
                    >
                        {autoScroll ? <PlayIcon className="h-2.5 w-2.5" /> : <PauseIcon className="h-2.5 w-2.5" />}
                        <span>Auto-scroll</span>
                    </button>

                    {/* Clear Screen */}
                    <button
                        onClick={() => setIsCleared(true)}
                        className="p-1 rounded bg-slate-900 border border-slate-700/80 text-slate-400 hover:text-slate-200 hover:border-slate-500 transition"
                        title="Clear terminal display"
                    >
                        <TrashIcon className="h-3.5 w-3.5" />
                    </button>

                    {/* Copy Output */}
                    <button
                        onClick={handleCopy}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-900 border border-slate-700/80 text-[10px] font-mono text-slate-300 hover:text-white hover:border-slate-500 transition"
                        title="Copy logs to clipboard"
                    >
                        {copied ? (
                            <>
                                <CheckIcon className="h-3 w-3 text-emerald-400" />
                                <span className="text-emerald-400">Copied</span>
                            </>
                        ) : (
                            <>
                                <ClipboardDocumentIcon className="h-3 w-3" />
                                <span>Copy</span>
                            </>
                        )}
                    </button>

                    {/* Download Log */}
                    <button
                        onClick={handleDownload}
                        className="p-1 rounded bg-slate-900 border border-slate-700/80 text-slate-400 hover:text-white hover:border-slate-500 transition"
                        title="Download raw log"
                    >
                        <ArrowDownTrayIcon className="h-3.5 w-3.5" />
                    </button>

                    {/* Fullscreen Toggle */}
                    <button
                        onClick={toggleFullscreen}
                        className="p-1 rounded bg-slate-900 border border-slate-700/80 text-slate-400 hover:text-white hover:border-slate-500 transition"
                        title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen Terminal'}
                    >
                        {isFullscreen ? (
                            <ArrowsPointingInIcon className="h-3.5 w-3.5 text-cyan-400" />
                        ) : (
                            <ArrowsPointingOutIcon className="h-3.5 w-3.5" />
                        )}
                    </button>
                </div>
            </div>

            {/* Command Line / Shell Banner */}
            {command && (
                <div className="flex items-center gap-2 border-b border-slate-900 bg-[#03060d] px-4 py-2 font-mono text-[11px] text-slate-400">
                    <span className="text-cyan-400 font-bold select-none">[operator@aegis-secops ~]$</span>
                    <span className="text-slate-200 break-all select-all">{command}</span>
                </div>
            )}

            {/* Terminal Main Output Canvas */}
            <div
                ref={termBodyRef}
                className={`flex-1 overflow-auto bg-[#020409] p-4 ${fontSize} select-text scrollbar-thin transition-all ${
                    isFullscreen ? 'max-h-full h-[calc(100vh-140px)]' : 'max-h-[36rem] min-h-[16rem]'
                }`}
            >
                {isCleared ? (
                    <div className="text-slate-600 font-mono text-xs italic py-4">
                        [Terminal cleared. New stream output will appear automatically.]
                    </div>
                ) : !output ? (
                    <div className="flex items-center gap-2 text-slate-500 font-mono text-xs py-8 justify-center">
                        {isRunning ? (
                            <>
                                <span className="h-2 w-2 rounded-full bg-cyan-400 animate-ping"></span>
                                <span>Awaiting live subprocess stream from runner…</span>
                            </>
                        ) : (
                            <span>(No terminal output captured)</span>
                        )}
                    </div>
                ) : (
                    <div className="space-y-0.5">
                        {renderedLines}
                        {isRunning && (
                            <div className="flex items-center gap-1 font-mono text-xs text-cyan-400 pt-1">
                                <span>[aegis-proc: streaming]</span>
                                <span className="h-3 w-1.5 bg-cyan-400 animate-pulse inline-block"></span>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Terminal Footer Telemetry */}
            <div className="flex items-center justify-between border-t border-white/[0.06] bg-[#070c18] px-4 py-1.5 font-mono text-[10px] text-slate-500 select-none">
                <div className="flex items-center gap-3">
                    <span>STATUS: {isRunning ? <strong className="text-cyan-400">RUNNING</strong> : <strong>IDLE</strong>}</span>
                    <span>•</span>
                    <span>BUFFER: {output ? (output.length / 1024).toFixed(1) : '0'} KB</span>
                    <span>•</span>
                    <span>LINES: {output ? output.split('\n').length : 0}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-400">
                    <span>UTF-8</span>
                    <span>•</span>
                    <span>TTY_STDOUT</span>
                </div>
            </div>
        </div>
    );
}
