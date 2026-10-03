import GuestLayout from '@/Layouts/GuestLayout';
import { Head, Link, useForm } from '@inertiajs/react';
import { EnvelopeIcon, ArrowRightOnRectangleIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

export default function VerifyEmail({ status }) {
    const { post, processing } = useForm({});

    const submit = (e) => {
        e.preventDefault();
        post(route('verification.send'));
    };

    return (
        <GuestLayout>
            <Head title="Email Verification" />

            <div className="mb-8 flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-2xl bg-exec-indigo/10 border border-exec-indigo/30 flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(99,102,241,0.2)]">
                    <EnvelopeIcon className="w-8 h-8 text-exec-indigo" />
                </div>
                <h2 className="text-xl font-sans font-bold text-white tracking-tight mb-3">Verify Your Email</h2>
                <p className="text-sm font-sans font-medium text-slate-400 leading-relaxed">
                    Thanks for signing up! Before getting started, could you verify
                    your email address by clicking on the link we just emailed to
                    you? If you didn't receive the email, we will gladly send you
                    another.
                </p>
            </div>

            {status === 'verification-link-sent' && (
                <div className="mb-8 text-sm font-sans font-bold text-exec-info bg-exec-info/10 border border-exec-info/30 p-4 rounded-xl flex items-start gap-3">
                    <CheckCircleIcon className="w-5 h-5 shrink-0 mt-0.5" />
                    <p>A new verification link has been sent to the email address you provided during registration.</p>
                </div>
            )}

            <form onSubmit={submit}>
                <div className="flex flex-col gap-4">
                    <button 
                        type="submit" 
                        disabled={processing}
                        className="w-full flex justify-center items-center gap-2 px-6 py-3.5 rounded-xl bg-gradient-to-r from-exec-indigo to-[#8b5cf6] text-white font-sans text-sm font-bold hover:shadow-[0_0_20px_rgba(99,102,241,0.5)] active:scale-[0.98] transition-all relative overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <div className="absolute inset-0 bg-white/20 hover:opacity-0 transition-opacity rounded-xl pointer-events-none"></div>
                        {processing ? 'Sending...' : 'Resend Verification Email'}
                    </button>

                    <Link
                        href={route('logout')}
                        method="post"
                        as="button"
                        className="w-full flex justify-center items-center gap-2 px-6 py-3.5 rounded-xl bg-white/[0.05] border border-white/[0.1] text-slate-400 font-sans text-sm font-bold hover:bg-white/[0.1] hover:text-white transition-all"
                    >
                        <ArrowRightOnRectangleIcon className="w-4 h-4" />
                        Log Out
                    </Link>
                </div>
            </form>
        </GuestLayout>
    );
}
