import { usePage } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';
import { 
    ChatBubbleLeftRightIcon, 
    ChevronDoubleRightIcon, 
    PaperAirplaneIcon,
    SparklesIcon,
    ShieldExclamationIcon,
    CommandLineIcon,
    ArrowDownTrayIcon,
    ClipboardDocumentIcon,
    ClipboardDocumentCheckIcon,
    TrashIcon
} from '@heroicons/react/24/outline';
import MarkdownRenderer from '@/Components/MarkdownRenderer';

/**
 * Global AI security intelligence sidebar with high-tech Pentester/SecOps styling
 * and rich Markdown parsing & .md file export capabilities.
 */
export default function ChatSidebar({ open: controlledOpen, onToggle }) {
    const page = usePage();
    const [internalOpen, setInternalOpen] = useState(false);
    const isControlled = typeof controlledOpen === 'boolean';
    const open = isControlled ? controlledOpen : internalOpen;

    const setOpen = (val) => {
        const nextVal = typeof val === 'function' ? val(open) : val;
        if (onToggle) {
            onToggle(nextVal);
        }
        if (!isControlled) {
            setInternalOpen(nextVal);
        }
    };
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [sending, setSending] = useState(false);
    const [error, setError] = useState(null);
    const [copiedIndex, setCopiedIndex] = useState(null);
    const scrollRef = useRef(null);

    // Derive page context
    const pageContext = {
        target_id: page.props.target?.id ?? null,
        scan_run_id: page.props.run?.id ?? null,
    };
    const contextLabel = pageContext.scan_run_id
        ? `Scan Run #${pageContext.scan_run_id}`
        : pageContext.target_id
        ? `Target #${pageContext.target_id}`
        : null;

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, open]);

    const send = async (e, textOverride = null) => {
        if (e) e.preventDefault();
        const text = (textOverride || input).trim();
        if (!text || sending) return;

        const next = [...messages, { role: 'user', content: text }];
        setMessages(next);
        setInput('');
        setSending(true);
        setError(null);

        try {
            const res = await window.axios.post(route('chat.send'), {
                messages: next,
                context: pageContext,
            });
            const { reply, error: apiError } = res.data;
            if (apiError) {
                setError(apiError);
            } else {
                setMessages((m) => [...m, { role: 'assistant', content: reply }]);
            }
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to communicate with AI agent.');
        } finally {
            setSending(false);
        }
    };

    const downloadMarkdownFile = (content, filename) => {
        const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const copyMessage = (text, index) => {
        navigator.clipboard.writeText(text);
        setCopiedIndex(index);
        setTimeout(() => {
            setCopiedIndex(null);
        }, 2000);
    };

    const exportChatTranscript = () => {
        if (messages.length === 0) return;
        const dateStr = new Date().toLocaleString();
        let md = `# Aegis Intelligence — Security Operations Chat Export\n`;
        md += `**Date:** ${dateStr}\n`;
        if (contextLabel) {
            md += `**Active Context:** ${contextLabel}\n`;
        }
        md += `\n---\n\n`;

        messages.forEach((m) => {
            const author = m.role === 'user' ? 'Operator' : 'Aegis Intel Agent';
            md += `### [${author}]\n\n${m.content}\n\n---\n\n`;
        });

        const filename = `aegis-intel-chat-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.md`;
        downloadMarkdownFile(md, filename);
    };

    const clearChat = () => {
        if (confirm('Clear current intelligence session messages?')) {
            setMessages([]);
            setError(null);
        }
    };

    return (
        <>
            {/* Mobile / Tablet Backdrop Overlay */}
            {open && (
                <div
                    onClick={() => setOpen(false)}
                    className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden transition-opacity duration-300"
                    aria-hidden="true"
                />
            )}

            {/* Collapsed edge tab button */}
            {!open && (
                <button
                    onClick={() => setOpen(true)}
                    className="fixed right-0 top-1/2 z-40 flex -translate-y-1/2 items-center gap-2 rounded-l-xl border border-r-0 border-red-500/40 bg-[#090f1f]/95 px-3 py-4 text-red-400 shadow-[0_0_20px_rgba(244,63,94,0.3)] backdrop-blur-md transition-all duration-200 hover:bg-slate-900 hover:text-white hover:border-red-400 hover:pr-4"
                    aria-label="Open AI Assistant"
                >
                    <div className="relative">
                        <SparklesIcon className="h-5 w-5 text-red-400 animate-pulse" />
                        <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_6px_#06b6d4]"></span>
                    </div>
                    <span className="[writing-mode:vertical-rl] font-mono text-[11px] uppercase tracking-widest font-bold text-slate-300">
                        AI INTEL
                    </span>
                </button>
            )}

            {/* Docked full-height sidebar */}
            <div
                className={`fixed inset-y-0 right-0 z-50 flex w-[430px] max-w-[calc(100vw-1.5rem)] flex-col border-l border-white/[0.08] bg-[#070c18]/95 shadow-[0_0_50px_rgba(0,0,0,0.8)] backdrop-blur-2xl transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] will-change-transform ${
                    open ? 'translate-x-0' : 'translate-x-full'
                }`}
            >
                {/* Header */}
                <div className="flex items-center justify-between border-b border-white/[0.08] bg-[#0c1428]/80 px-4 py-3.5">
                    <div className="flex items-center gap-2.5">
                        <div className="p-1 rounded-md bg-red-600/20 border border-red-500/30 text-red-400">
                            <SparklesIcon className="h-4 w-4" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-slate-100">
                                    Aegis Intelligence
                                </h3>
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_#10b981]"></span>
                            </div>
                            {contextLabel ? (
                                <p className="font-mono text-[10px] text-cyan-400/90 flex items-center gap-1">
                                    <span>◈ ACTIVE:</span> {contextLabel}
                                </p>
                            ) : (
                                <p className="font-mono text-[10px] text-slate-500">◈ READY FOR COMMANDS</p>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-1">
                        {messages.length > 0 && (
                            <>
                                <button
                                    onClick={exportChatTranscript}
                                    title="Export full chat as .md file"
                                    className="rounded-md p-1.5 text-slate-400 hover:bg-slate-800 hover:text-cyan-300 transition"
                                    aria-label="Export chat as Markdown"
                                >
                                    <ArrowDownTrayIcon className="h-4 w-4" />
                                </button>
                                <button
                                    onClick={clearChat}
                                    title="Clear chat messages"
                                    className="rounded-md p-1.5 text-slate-400 hover:bg-slate-800 hover:text-rose-400 transition"
                                    aria-label="Clear chat"
                                >
                                    <TrashIcon className="h-4 w-4" />
                                </button>
                            </>
                        )}
                        <button
                            onClick={() => setOpen(false)}
                            className="rounded-md p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition"
                            aria-label="Collapse sidebar"
                        >
                            <ChevronDoubleRightIcon className="h-4 w-4" />
                        </button>
                    </div>
                </div>

                {/* Message stream */}
                <div ref={scrollRef} className="flex-1 space-y-3.5 overflow-y-auto p-4 font-sans text-xs">
                    {messages.length === 0 && (
                        <div className="space-y-4 py-4">
                            <div className="p-3.5 rounded-lg border border-slate-800 bg-[#0c1428]/60 text-slate-400 text-xs leading-relaxed space-y-2">
                                <div className="font-mono text-[11px] text-slate-300 font-semibold flex items-center gap-1.5">
                                    <ShieldExclamationIcon className="h-4 w-4 text-red-400" />
                                    SecOps AI Agent
                                </div>
                                <p>
                                    I analyze targets, explain discovered vulnerabilities, suggest remediation patches, and export markdown reports.
                                </p>
                            </div>

                            {/* Prompt suggestion pills */}
                            <div className="space-y-1.5 font-mono text-[11px]">
                                <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Suggested Prompts:</div>
                                <button
                                    onClick={() => send(null, "List my targets and their latest security status")}
                                    className="w-full text-left p-2 rounded-md border border-slate-800 bg-slate-900/60 text-slate-300 hover:border-slate-600 hover:bg-slate-800 transition flex items-center gap-2"
                                >
                                    <CommandLineIcon className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
                                    <span>List my targets & statuses</span>
                                </button>
                                <button
                                    onClick={() => send(null, "What are the most critical unresolved vulnerabilities across my targets?")}
                                    className="w-full text-left p-2 rounded-md border border-slate-800 bg-slate-900/60 text-slate-300 hover:border-slate-600 hover:bg-slate-800 transition flex items-center gap-2"
                                >
                                    <CommandLineIcon className="h-3.5 w-3.5 text-rose-400 shrink-0" />
                                    <span>Analyze top critical vulnerabilities</span>
                                </button>
                            </div>
                        </div>
                    )}

                    {messages.map((m, i) => (
                        <div
                            key={i}
                            className={`group rounded-lg p-3 leading-relaxed transition ${
                                m.role === 'user'
                                    ? 'ml-6 bg-gradient-to-r from-red-950/40 to-rose-950/60 border border-red-500/20 text-slate-100 shadow-md'
                                    : 'mr-1 bg-[#0a1022]/95 border border-white/[0.08] text-slate-200 shadow-lg'
                            }`}
                        >
                            <div className="flex items-center justify-between mb-1.5 opacity-75 text-[9px] font-mono uppercase tracking-wider">
                                <span className="font-bold">
                                    {m.role === 'user' ? (
                                        <span className="text-rose-400">◈ Operator</span>
                                    ) : (
                                        <span className="text-cyan-400 flex items-center gap-1.5">
                                            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_5px_#06b6d4]"></span>
                                            Aegis Intel
                                        </span>
                                    )}
                                </span>

                                {m.role === 'assistant' && (
                                    <div className="flex items-center gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => copyMessage(m.content, i)}
                                            title="Copy markdown text"
                                            className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-900/90 border border-white/[0.08] hover:border-cyan-500/50 text-slate-400 hover:text-cyan-300 transition text-[9px]"
                                        >
                                            {copiedIndex === i ? (
                                                <>
                                                    <ClipboardDocumentCheckIcon className="h-3 w-3 text-emerald-400" />
                                                    <span className="text-emerald-400">Copied</span>
                                                </>
                                            ) : (
                                                <>
                                                    <ClipboardDocumentIcon className="h-3 w-3" />
                                                    <span>Copy .md</span>
                                                </>
                                            )}
                                        </button>
                                        <button
                                            onClick={() => downloadMarkdownFile(m.content, `aegis-intel-report-${Date.now()}.md`)}
                                            title="Download response as .md file"
                                            className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-900/90 border border-white/[0.08] hover:border-cyan-500/50 text-slate-400 hover:text-cyan-300 transition text-[9px]"
                                        >
                                            <ArrowDownTrayIcon className="h-3 w-3 text-cyan-400" />
                                            <span>Save .md</span>
                                        </button>
                                    </div>
                                )}
                            </div>

                            <div>
                                {m.role === 'assistant' ? (
                                    <MarkdownRenderer content={m.content} />
                                ) : (
                                    <div className="font-sans text-xs whitespace-pre-wrap">{m.content}</div>
                                )}
                            </div>
                        </div>
                    ))}

                    {sending && (
                        <div className="mr-4 rounded-lg bg-[#0c1428] border border-slate-800 p-3 font-mono text-[11px] text-cyan-400 flex items-center gap-2 animate-pulse">
                            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
                            Analyzing security telemetry…
                        </div>
                    )}

                    {error && (
                        <div className="rounded-lg border border-red-500/40 bg-red-950/40 p-3 font-mono text-[11px] text-red-300">
                            [ERROR] {error}
                        </div>
                    )}
                </div>

                {/* Input box */}
                <form onSubmit={send} className="border-t border-white/[0.08] bg-[#0c1428]/90 p-3 flex items-center gap-2">
                    <input
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Type a command or security question…"
                        className="flex-1 rounded-md border border-slate-700/80 bg-[#070b14] px-3 py-2 font-mono text-xs text-slate-100 placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 shadow-inner"
                    />
                    <button
                        type="submit"
                        disabled={sending || !input.trim()}
                        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-[0_0_10px_rgba(244,63,94,0.4)] transition hover:from-red-500 hover:to-rose-500 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        <PaperAirplaneIcon className="h-3.5 w-3.5" />
                    </button>
                </form>
            </div>
        </>
    );
}

