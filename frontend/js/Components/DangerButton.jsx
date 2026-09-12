export default function DangerButton({
    className = '',
    disabled,
    children,
    ...props
}) {
    return (
        <button
            {...props}
            className={
                `inline-flex items-center justify-center rounded-md border border-rose-600/80 bg-gradient-to-r from-rose-950/80 to-red-900/80 px-4 py-2 font-mono text-xs font-semibold uppercase tracking-wider text-rose-200 shadow-[0_0_15px_-3px_rgba(225,29,72,0.3)] transition-all duration-150 hover:bg-rose-900 hover:border-rose-500 hover:text-white hover:shadow-[0_0_20px_-2px_rgba(225,29,72,0.5)] active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-rose-500/50 focus:ring-offset-2 focus:ring-offset-[#070b14] disabled:opacity-40 disabled:cursor-not-allowed ${
                    disabled && 'opacity-40 pointer-events-none'
                } ` + className
            }
            disabled={disabled}
        >
            {children}
        </button>
    );
}
