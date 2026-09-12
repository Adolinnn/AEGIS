import React, { useMemo, useRef, useEffect } from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

const escapeHtml = (str) => {
    return (str || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
};

// Configure custom marked renderer
const renderer = new marked.Renderer();

renderer.link = ({ href, title, text }) => {
    const cleanHref = href || '#';
    const cleanTitle = title ? ` title="${title}"` : '';
    return `<a href="${cleanHref}" target="_blank" rel="noopener noreferrer"${cleanTitle}>${text}</a>`;
};

renderer.code = function({ text, lang }) {
    const language = lang || 'telemetry';
    const escaped = escapeHtml(text);
    return `
<div class="code-block-container my-3 rounded-lg border border-white/[0.08] bg-[#030712] overflow-hidden shadow-lg">
    <div class="flex items-center justify-between px-3 py-1.5 bg-[#080e1e] border-b border-white/[0.06] text-[10px] font-mono">
        <span class="text-cyan-400 font-semibold tracking-wider uppercase">${language}</span>
        <button type="button" class="copy-code-btn text-slate-400 hover:text-white transition px-1.5 py-0.5 rounded hover:bg-slate-850 flex items-center gap-1 font-mono text-[10px]">
            <span>Copy</span>
        </button>
    </div>
    <pre class="p-3 overflow-x-auto text-[11px] font-mono text-emerald-300 leading-relaxed scrollbar-thin"><code>${escaped}</code></pre>
</div>`;
};

marked.use({
    renderer,
    gfm: true,
    breaks: true,
});

/**
 * High-tech Pentester/SecOps Markdown Renderer for AI Intelligence output.
 */
export default function MarkdownRenderer({ content, className = '' }) {
    const containerRef = useRef(null);

    const sanitizedHtml = useMemo(() => {
        if (!content) return '';
        try {
            const raw = marked.parse(content);
            return DOMPurify.sanitize(raw, {
                ADD_ATTR: ['target', 'rel', 'class', 'type'],
                ADD_TAGS: ['button', 'span', 'pre', 'code'],
            });
        } catch (err) {
            console.error('Failed to parse markdown:', err);
            return escapeHtml(content);
        }
    }, [content]);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const handleCopy = (e) => {
            const btn = e.target.closest('.copy-code-btn');
            if (!btn) return;
            const codeEl = btn.closest('.code-block-container')?.querySelector('code');
            if (codeEl) {
                navigator.clipboard.writeText(codeEl.innerText || codeEl.textContent);
                const originalText = btn.innerHTML;
                btn.innerHTML = '<span class="text-emerald-400 font-semibold">✓ Copied</span>';
                setTimeout(() => {
                    btn.innerHTML = originalText;
                }, 2000);
            }
        };

        container.addEventListener('click', handleCopy);
        return () => container.removeEventListener('click', handleCopy);
    }, [sanitizedHtml]);

    return (
        <div
            ref={containerRef}
            className={`chat-markdown ${className}`}
            dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
        />
    );
}
