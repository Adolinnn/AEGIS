import { Link } from '@inertiajs/react';

export default function ResponsiveNavLink({
    active = false,
    className = '',
    children,
    ...props
}) {
    return (
        <Link
            {...props}
            className={
                `flex w-full items-center ps-3 pe-4 py-2 border-l-4 font-mono text-xs uppercase tracking-wider font-medium transition duration-150 ease-in-out focus:outline-none ${
                    active
                        ? 'border-red-500 bg-red-950/30 text-red-200'
                        : 'border-transparent text-slate-400 hover:border-slate-700 hover:bg-slate-900/60 hover:text-slate-200'
                } ${className}`
            }
        >
            {children}
        </Link>
    );
}
