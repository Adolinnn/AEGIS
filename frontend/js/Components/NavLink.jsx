import { Link } from '@inertiajs/react';

export default function NavLink({
    active = false,
    className = '',
    children,
    ...props
}) {
    return (
        <Link
            {...props}
            className={
                'relative inline-flex items-center px-3.5 py-2 text-xs font-mono font-medium uppercase tracking-wider transition-all duration-300 focus:outline-none group ' +
                (active
                    ? 'text-white bg-slate-800/40 rounded-t-md font-semibold'
                    : 'text-slate-400 hover:text-cyan-300 hover:bg-slate-800/20 rounded-md') +
                ' ' + className
            }
        >
            {/* Active Indicator Beacon Dot */}
            {active && (
                <span className="relative flex h-1.5 w-1.5 mr-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-rose-500 shadow-[0_0_8px_#f43f5e]"></span>
                </span>
            )}
            
            <span>{children}</span>

            {/* Elegant Active Bottom Glowing Line */}
            {active ? (
                <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-cyan-400 via-rose-500 to-cyan-400 shadow-[0_0_10px_#f43f5e] animate-pulse"></span>
            ) : (
                <span className="absolute bottom-0 left-1/2 right-1/2 h-[1.5px] bg-cyan-400/0 group-hover:left-2 group-hover:right-2 group-hover:bg-cyan-400/60 transition-all duration-300 shadow-[0_0_6px_#06b6d4]"></span>
            )}
        </Link>
    );
}
