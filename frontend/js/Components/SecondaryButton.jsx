export default function SecondaryButton({
    type = 'button',
    className = '',
    disabled,
    children,
    ...props
}) {
    return (
        <button
            {...props}
            type={type}
            className={
                `inline-flex items-center justify-center rounded-md border border-slate-700/80 bg-slate-900/80 px-4 py-2 font-mono text-xs font-semibold uppercase tracking-wider text-slate-300 shadow-sm backdrop-blur-sm transition-all duration-150 hover:bg-slate-800 hover:border-slate-600 hover:text-white active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-slate-500/40 focus:ring-offset-2 focus:ring-offset-[#070b14] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100 ${
                    disabled && 'opacity-40 pointer-events-none'
                } ` + className
            }
            disabled={disabled}
        >
            {children}
        </button>
    );
}
