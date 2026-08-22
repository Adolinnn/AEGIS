import { usePage } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';
import { ChatBubbleLeftRightIcon, ChevronDoubleRightIcon, PaperAirplaneIcon } from '@heroicons/react/24/outline';

/**
 * Global AI assistant — docked as a full-height sidebar on the right edge of
 * the screen (not a floating popup), available on every authenticated page.
 * Automatically picks up "what the user is looking at" (a target or a scan
 * run) from the current Inertia page props, so the assistant has context
 * without the user typing ids into the chat.
 */
export default function ChatSidebar() {
    const page = usePage();
    const [open, setOpen] = useState(false);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [sending, setSending] = useState(false);
    const [error, setError] = useState(null);
    const scrollRef = useRef(null);

    // Derive page context: Targets/Show exposes `target`, ScanRuns/Show exposes `run`.
    const pageContext = {
        target_id: page.props.target?.id ?? null,
        scan_run_id: page.props.run?.id ?? null,
    };
    const contextLabel = pageContext.scan_run_id
        ? `Scan run #${pageContext.scan_run_id}`
        : pageContext.target_id
        ? `Target #${pageContext.target_id}`
        : null;

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, open]);

    const send = async (e) => {
        e.preventDefault();
        const text = input.trim();
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
            setError(err.response?.data?.error || 'Failed to reach the assistant.');
        } finally {
            setSending(false);
        }
    };

    return (
        <>
            {/* Collapsed edge tab — click to dock the sidebar open */}
            {!open && (
                <button
                    onClick={() => setOpen(true)}
                    className="fixed right-0 top-1/2 z-40 flex -translate-y-1/2 items-center gap-1.5 rounded-l-lg border border-r-0 border-gray-800 bg-gray-900 px-2.5 py-4 text-red-400 shadow-lg transition hover:bg-gray-800"
                    aria-label="Open AI assistant"
                >
                    <ChatBubbleLeftRightIcon className="h-5 w-5" />
                </button>
            )}

            {/* Docked full-height sidebar */}
            <div
                className={`fixed inset-y-0 right-0 z-40 flex w-96 max-w-[calc(100vw-2rem)] flex-col border-l border-gray-800 bg-gray-950 shadow-2xl transition-transform duration-200 ${
                    open ? 'translate-x-0' : 'translate-x-full'
                }`}
            >
                <div className="flex items-center justify-between border-b border-gray-800 px-4 py-3">
                    <div>
                        <h3 className="font-mono text-sm uppercase tracking-wider text-gray-200">AI Assistant</h3>
                        {contextLabel && <p className="text-[11px] text-gray-500">Context: {contextLabel}</p>}
                    </div>
                    <button onClick={() => setOpen(false)} className="text-gray-500 hover:text-gray-300" aria-label="Collapse sidebar">
                        <ChevronDoubleRightIcon className="h-5 w-5" />
                    </button>
                </div>

                <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
                    {messages.length === 0 && (
                        <p className="text-sm text-gray-500">
                            Ask about a vulnerability, request a summary of a scan, or say "add target example.com".
                            {contextLabel && ` I can already see ${contextLabel}.`}
                        </p>
                    )}
                    {messages.map((m, i) => (
                        <div
                            key={i}
                            className={`rounded-lg px-3 py-2 text-sm leading-relaxed ${
                                m.role === 'user'
                                    ? 'ml-8 bg-red-900/30 text-gray-100'
                                    : 'mr-4 bg-gray-900 text-gray-200'
                            }`}
                        >
                            {m.content}
                        </div>
                    ))}
                    {sending && <div className="mr-4 rounded-lg bg-gray-900 px-3 py-2 text-sm text-gray-500">Thinking…</div>}
                    {error && <div className="rounded-lg border border-red-900/50 bg-red-950/30 px-3 py-2 text-sm text-red-400">{error}</div>}
                </div>

                <form onSubmit={send} className="flex items-center gap-2 border-t border-gray-800 p-3">
                    <input
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Ask the assistant…"
                        className="flex-1 rounded-md border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-gray-100 placeholder-gray-600 focus:border-red-500 focus:outline-none focus:ring-0"
                    />
                    <button
                        type="submit"
                        disabled={sending || !input.trim()}
                        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-red-700 text-white transition hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                        <PaperAirplaneIcon className="h-4 w-4" />
                    </button>
                </form>
            </div>
        </>
    );
}
