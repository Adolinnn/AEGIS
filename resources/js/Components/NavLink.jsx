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
                'inline-flex items-center border-b-2 px-1 pt-1 text-sm font-medium leading-5 transition duration-150 ease-in-out focus:outline-none ' +
                (active
                    ? 'border-red-500 text-gray-100 focus:border-red-500'
                    : 'border-transparent text-gray-400 hover:border-gray-700 hover:text-red-400 focus:border-gray-700 focus:text-red-400') +
                className
            }
        >
            {children}
        </Link>
    );
}
