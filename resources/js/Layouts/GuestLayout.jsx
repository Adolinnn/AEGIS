import ApplicationLogo from '@/Components/ApplicationLogo';
import { Link } from '@inertiajs/react';

export default function GuestLayout({ children }) {
    return (
        <div className="min-h-screen flex flex-col sm:justify-center items-center pt-6 sm:pt-0 bg-gray-950 text-gray-300">
            <div>
                <a href="/">
                    {/* You can replace this with a custom CODE_RED logo later */}
                    <div className="w-20 h-20 fill-current text-red-600">
                        <svg viewBox="0 0 316 316" xmlns="http://www.w3.org/2000/svg">
                            <path d="M305.8 81.1l-43-24.8c-1.5-.9-3.4-.9-4.9 0L158.4 114 58.9 56.6c-1.5-.9-3.4-.9-4.9 0L11 81.4c-1.5.9-1.5 2.4 0 3.3l145 83.7c1.5.9 3.4.9 4.9 0l145-84c1.4-.8 1.4-2.3-.1-3.3z" fill="currentColor"/>
                        </svg>
                    </div>
                </a>
            </div>

            <div className="w-full sm:max-w-md mt-6 px-6 py-4 bg-gray-900 border border-gray-800 shadow-2xl overflow-hidden sm:rounded-lg">
                {children}
            </div>
        </div>
    );
}
