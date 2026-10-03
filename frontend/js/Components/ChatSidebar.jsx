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

    useEffect(() => {
        const handleAiAction = (e) => {
            const { prompt } = e.detail;
            setOpen(true);
            setTimeout(() => send(null, prompt), 300);
        };
        window.addEventListener('ai-chat-action', handleAiAction);
        return () => window.removeEventListener('ai-chat-action', handleAiAction);
    });

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
                    className="fixed inset-0 z-40 bg-[#030408]/80 backdrop-blur-sm lg:hidden transition-opacity duration-300"
                    aria-hidden="true"
                />
            )}

            {/* Collapsed edge tab button */}
            {!open && (
                <button
                    onClick={() => setOpen(true)}
                    className="fixed right-0 top-1/2 z-40 flex -translate-y-1/2 items-center gap-2 rounded-l-xl border border-r-0 border-exec-indigo/40 bg-white/[0.02] px-3 py-4 text-exec-indigo shadow-[0_0_20px_rgba(99,102,241,0.2)] backdrop-blur-2xl transition-all duration-300 hover:bg-white/[0.05] hover:text-white hover:border-exec-indigo hover:pr-4 group"
                    aria-label="Open AI Assistant"
                >
                    <div className="relative">
                        <SparklesIcon className="h-5 w-5 text-exec-indigo group-hover:text-white transition-colors animate-pulse" />
                        <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-exec-info shadow-[0_0_8px_var(--tw-colors-exec-info)]"></span>
                    </div>
                    <span className="[writing-mode:vertical-rl] font-sans text-[11px] uppercase tracking-widest font-bold text-slate-300 group-hover:text-white transition-colors">
                        AI INTEL
                    </span>
                </button>
            )}

            {/* Docked full-height sidebar */}
            <div
                className={`fixed inset-y-0 right-0 z-50 flex w-[430px] max-w-[calc(100vw-1.5rem)] flex-col border-l border-white/[0.08] bg-[#050a16]/90 shadow-[-20px_0_50px_rgba(0,0,0,0.5)] backdrop-blur-3xl transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] will-change-transform ${
                    open ? 'translate-x-0' : 'translate-x-full'
                }`}
            >
                {/* Header */}
                <div className="flex items-center justify-between border-b border-white/[0.08] bg-white/[0.02] px-5 py-4 relative overflow-hidden">
                    <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-exec-indigo/50 to-transparent"></div>
                    <div className="flex items-center gap-3">
                        <div className="p-1.5 rounded-lg bg-exec-indigo/10 border border-exec-indigo/30 text-exec-indigo shadow-[0_0_15px_rgba(99,102,241,0.2)]">
                            <SparklesIcon className="h-4 w-4" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="font-sans text-[13px] font-bold uppercase tracking-wider text-slate-100">
                                    Aegis Intelligence
                                </h3>
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_#10b981] animate-pulse"></span>
                            </div>
                            {contextLabel ? (
                                <p className="font-mono text-[10px] text-exec-info flex items-center gap-1.5">
                                    <span className="opacity-70">◈ ACTIVE:</span> {contextLabel}
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
                                    className="rounded-lg p-2 text-slate-400 hover:bg-white/[0.05] hover:text-exec-info transition-colors border border-transparent hover:border-white/[0.05]"
                                    aria-label="Export chat as Markdown"
                                >
                                    <ArrowDownTrayIcon className="h-4 w-4" />
                                </button>
                                <button
                                    onClick={clearChat}
                                    title="Clear chat messages"
                                    className="rounded-lg p-2 text-slate-400 hover:bg-white/[0.05] hover:text-exec-critical transition-colors border border-transparent hover:border-white/[0.05]"
                                    aria-label="Clear chat"
                                >
                                    <TrashIcon className="h-4 w-4" />
                                </button>
                            </>
                        )}
                        <button
                            onClick={() => setOpen(false)}
                            className="rounded-lg p-2 text-slate-400 hover:bg-white/[0.05] hover:text-white transition-colors border border-transparent hover:border-white/[0.05]"
                            aria-label="Collapse sidebar"
                        >
                            <ChevronDoubleRightIcon className="h-4 w-4" />
                        </button>
                    </div>
                </div>

                {/* Message stream */}
                <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-5 font-sans text-xs scroll-smooth">
                    {messages.length === 0 && (
                        <div className="space-y-6 py-4 hud-fade-in">
                            <div className="p-4 rounded-2xl border border-white/[0.08] bg-white/[0.02] text-slate-400 text-xs leading-relaxed space-y-3 relative overflow-hidden group">
                                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.1] to-transparent group-hover:via-exec-indigo/50 transition-all"></div>
                                <div className="font-sans text-[11px] text-white font-bold tracking-widest uppercase flex items-center gap-2">
                                    <ShieldExclamationIcon className="h-4 w-4 text-exec-indigo" />
                                    SecOps AI Agent
                                </div>
                                <p className="text-sm">
                                    I analyze targets, explain discovered vulnerabilities, suggest remediation patches, and export markdown reports.
                                </p>
                            </div>

                            {/* Prompt suggestion pills */}
                            <div className="space-y-2.5 font-sans text-xs hud-stagger-1 hud-fade-in">
                                <div className="text-[10px] text-slate-500 uppercase tracking-widest font-bold px-1">Suggested Commands:</div>
                                <button
                                    onClick={() => send(null, "List my targets and their latest security status")}
                                    className="w-full text-left p-3 rounded-xl border border-white/[0.05] bg-white/[0.02] text-slate-300 hover:border-exec-info/30 hover:bg-exec-info/5 hover:text-white transition-all flex items-center gap-3 group"
                                >
                                    <CommandLineIcon className="h-4 w-4 text-exec-info opacity-70 group-hover:opacity-100 transition-opacity shrink-0" />
                                    <span className="font-medium">List my targets & statuses</span>
                                </button>
                                <button
                                    onClick={() => send(null, "What are the most critical unresolved vulnerabilities across my targets?")}
                                    className="w-full text-left p-3 rounded-xl border border-white/[0.05] bg-white/[0.02] text-slate-300 hover:border-exec-critical/30 hover:bg-exec-critical/5 hover:text-white transition-all flex items-center gap-3 group"
                                >
                                    <CommandLineIcon className="h-4 w-4 text-exec-critical opacity-70 group-hover:opacity-100 transition-opacity shrink-0" />
                                    <span className="font-medium">Analyze top critical vulnerabilities</span>
                                </button>
                            </div>
                        </div>
                    )}

                    {messages.map((m, i) => (
                        <div
                            key={i}
                            className={`group rounded-2xl p-4 leading-relaxed transition-all duration-300 animate-[hud-fade-in_0.3s_ease-out] ${
                                m.role === 'user'
                                    ? 'ml-8 bg-exec-indigo/10 border border-exec-indigo/20 text-white shadow-[0_4px_20px_rgba(99,102,241,0.05)]'
                                    : 'mr-2 bg-white/[0.03] border border-white/[0.08] text-slate-200 shadow-lg'
                            }`}
                        >
                            <div className="flex items-center justify-between mb-2 opacity-80 text-[10px] font-sans font-bold uppercase tracking-widest">
                                <span>
                                    {m.role === 'user' ? (
                                        <span className="text-white flex items-center gap-2">
                                            <span className="w-1.5 h-1.5 rounded-full bg-exec-indigo"></span>
                                            Operator
                                        </span>
                                    ) : (
                                        <span className="text-exec-info flex items-center gap-2">
                                            <span className="w-1.5 h-1.5 rounded-full bg-exec-info shadow-[0_0_8px_var(--tw-colors-exec-info)]"></span>
                                            Aegis Intel
                                        </span>
                                    )}
                                </span>

                                {m.role === 'assistant' && (
                                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => copyMessage(m.content, i)}
                                            title="Copy markdown text"
                                            className="flex items-center gap-1.5 px-2 py-1 rounded bg-black/50 border border-white/[0.1] hover:border-exec-info/50 hover:bg-exec-info/10 text-slate-400 hover:text-white transition-colors text-[9px]"
                                        >
                                            {copiedIndex === i ? (
                                                <>
                                                    <ClipboardDocumentCheckIcon className="h-3 w-3 text-emerald-400" />
                                                    <span className="text-emerald-400">Copied</span>
                                                </>
                                            ) : (
                                                <>
                                                    <ClipboardDocumentIcon className="h-3 w-3" />
                                                    <span>Copy</span>
                                                </>
                                            )}
                                        </button>
                                        <button
                                            onClick={() => downloadMarkdownFile(m.content, `aegis-intel-report-${Date.now()}.md`)}
                                            title="Download response as .md file"
                                            className="flex items-center gap-1.5 px-2 py-1 rounded bg-black/50 border border-white/[0.1] hover:border-exec-info/50 hover:bg-exec-info/10 text-slate-400 hover:text-white transition-colors text-[9px]"
                                        >
                                            <ArrowDownTrayIcon className="h-3 w-3 text-exec-info" />
                                            <span>Save</span>
                                        </button>
                                    </div>
                                )}
                            </div>

                            <div className="prose prose-invert prose-sm max-w-none">
                                {m.role === 'assistant' ? (
                                    <MarkdownRenderer content={m.content} />
                                ) : (
                                    <div className="font-sans text-sm whitespace-pre-wrap">{m.content}</div>
                                )}
                            </div>
                        </div>
                    ))}

                    {sending && (
                        <div className="mr-8 rounded-2xl bg-white/[0.02] border border-white/[0.05] p-4 font-sans text-[11px] font-bold tracking-wider uppercase text-exec-info flex items-center gap-3 animate-pulse">
                            <span className="w-1.5 h-1.5 rounded-full bg-exec-info shadow-[0_0_8px_var(--tw-colors-exec-info)]"></span>
                            Analyzing telemetry...
                        </div>
                    )}

                    {error && (
                        <div className="rounded-2xl border border-exec-critical/30 bg-exec-critical/10 p-4 font-mono text-xs text-exec-critical shadow-[0_0_20px_rgba(244,63,94,0.1)]">
                            <span className="font-bold">SYSTEM ERROR:</span> {error}
                        </div>
                    )}
                </div>

                {/* Input box */}
                <div className="p-4 bg-white/[0.01] border-t border-white/[0.08] backdrop-blur-xl">
                    <form onSubmit={send} className="relative flex items-center">
                        <input
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Initialize command..."
                            className="flex-1 rounded-xl border border-white/[0.1] bg-black/50 py-3 pl-4 pr-12 font-sans text-sm text-white placeholder-slate-500 focus:border-exec-indigo focus:outline-none focus:ring-1 focus:ring-exec-indigo transition-all shadow-inner"
                        />
                        <button
                            type="submit"
                            disabled={sending || !input.trim()}
                            className="absolute right-2 inline-flex h-8 w-8 items-center justify-center rounded-lg bg-exec-indigo text-white shadow-[0_0_15px_rgba(99,102,241,0.3)] transition-all hover:bg-exec-indigo/80 disabled:opacity-40 disabled:cursor-not-allowed hover:scale-105 active:scale-95"
                        >
                            <PaperAirplaneIcon className="h-4 w-4" />
                        </button>
                    </form>
                    <div className="mt-2 text-center text-[9px] font-mono uppercase tracking-widest text-slate-600">
                        Aegis AI operates under operator supervision
                    </div>
                </div>
            </div>
        </>
    );
}
