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
            className={`flex w-full items-start border-l-4 py-2 pe-4 ps-3 ${
                active
                    ? 'border-red-500 bg-red-950/30 text-red-400 focus:border-red-500 focus:bg-red-950/40 focus:text-red-300'
                    : 'border-transparent text-gray-400 hover:border-gray-700 hover:bg-gray-800 hover:text-red-400 focus:border-gray-700 focus:bg-gray-800 focus:text-red-400'
            } text-base font-medium transition duration-150 ease-in-out focus:outline-none ${className}`}
        >
            {children}
        </Link>
    );
}
