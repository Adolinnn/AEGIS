export default function PrimaryButton({ className = '', disabled, children, ...props }) {
    return (
        <button
            {...props}
            className={
                `btn-cyber-tactical inline-flex items-center justify-center px-4 py-2 border border-red-500/50 rounded-lg font-mono text-xs font-semibold text-white uppercase tracking-wider active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-red-500/40 focus:ring-offset-2 focus:ring-offset-[#070b14] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:pointer-events-none ${className}`
            }
            disabled={disabled}
        >
            {children}
        </button>
    );
}