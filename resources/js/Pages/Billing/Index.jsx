import { Head, router, usePage } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { CheckIcon, LockClosedIcon } from '@heroicons/react/24/outline';
import { useState } from 'react';

const accentByTier = {
    free: 'border-gray-800',
    individual: 'border-blue-500/40',
    team: 'border-purple-500/40',
    student: 'border-emerald-500/40',
};

const buttonByTier = {
    individual: 'bg-blue-600 hover:bg-blue-500 focus:ring-blue-500',
    team: 'bg-purple-600 hover:bg-purple-500 focus:ring-purple-500',
    student: 'bg-emerald-600 hover:bg-emerald-500 focus:ring-emerald-500',
};

function PlanCard({ plan, isCurrent, disabled, disabledReason, onSubscribe, processing }) {
    return (
        <div
            className={`flex flex-col rounded-lg border bg-gray-900/50 p-6 ${accentByTier[plan.value] ?? 'border-gray-800'} ${
                isCurrent ? 'ring-1 ring-red-500/40' : ''
            }`}
        >
            <div className="flex items-start justify-between">
                <div>
                    <h3 className="font-mono text-lg font-semibold text-gray-100">{plan.label}</h3>
                    <p className="mt-1 text-sm text-gray-500">{plan.tagline}</p>
                </div>
                {isCurrent && (
                    <span className="rounded border border-red-500/30 bg-red-900/30 px-2 py-1 text-xs font-medium text-red-400">
                        Current plan
                    </span>
                )}
            </div>

            <div className="mt-5">
                <span className="font-mono text-3xl font-bold text-gray-100">{plan.price}</span>
                {plan.price_note && <div className="mt-1 text-xs text-gray-500">{plan.price_note}</div>}
            </div>

            <ul className="mt-6 flex-1 space-y-2.5">
                {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-gray-300">
                        <CheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
                        <span>{f}</span>
                    </li>
                ))}
            </ul>

            <div className="mt-6">
                {isCurrent ? (
                    <button
                        disabled
                        className="w-full cursor-default rounded-md border border-gray-700 bg-gray-800/50 px-4 py-2.5 text-sm font-medium text-gray-500"
                    >
                        You're on this plan
                    </button>
                ) : (
                    <button
                        onClick={() => onSubscribe(plan.value)}
                        disabled={disabled || processing}
                        className={`flex w-full items-center justify-center gap-2 rounded-md px-4 py-2.5 text-sm font-medium text-white transition focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 disabled:cursor-not-allowed disabled:opacity-50 ${
                            buttonByTier[plan.value] ?? 'bg-gray-700 hover:bg-gray-600'
                        }`}
                    >
                        {disabled && <LockClosedIcon className="h-4 w-4" />}
                        {processing ? 'Switching…' : `Subscribe to ${plan.label}`}
                    </button>
                )}
                {disabled && disabledReason && (
                    <p className="mt-2 text-center text-xs text-yellow-500">{disabledReason}</p>
                )}
            </div>
        </div>
    );
}

export default function BillingIndex({ currentTier, plans, freePlan, hasEduEmail }) {
    const { errors } = usePage().props;
    const [processing, setProcessing] = useState(null);
    const [notice, setNotice] = useState(null);

    const subscribe = (tier) => {
        setProcessing(tier);
        setNotice(null);
        router.post(
            route('billing.subscribe'),
            { tier },
            {
                preserveScroll: true,
                onSuccess: () => setNotice({ type: 'success', text: `You're now on the ${tier} plan.` }),
                onError: () => setNotice(null),
                onFinish: () => setProcessing(null),
            }
        );
    };

    const cancel = () => {
        setProcessing('cancel');
        router.post(
            route('billing.cancel'),
            {},
            {
                preserveScroll: true,
                onSuccess: () => setNotice({ type: 'success', text: 'Moved back to the Free plan.' }),
                onFinish: () => setProcessing(null),
            }
        );
    };

    return (
        <AuthenticatedLayout header={<h2 className="text-xl font-semibold text-gray-100">Billing</h2>}>
            <Head title="Billing" />

            <div className="py-8">
                <div className="mx-auto max-w-6xl space-y-6 px-4 sm:px-6 lg:px-8">
                    <div className="rounded-lg border border-gray-800 bg-gray-900/50 p-5">
                        <p className="text-sm text-gray-400">
                            No payment info required — subscribing switches your account's plan and limits immediately.
                            {currentTier !== 'free' && (
                                <>
                                    {' '}
                                    Currently on <span className="text-gray-200">{currentTier}</span>.{' '}
                                    <button
                                        onClick={cancel}
                                        disabled={processing === 'cancel'}
                                        className="text-red-400 underline decoration-dotted hover:text-red-300 disabled:opacity-50"
                                    >
                                        Cancel and return to Free
                                    </button>
                                </>
                            )}
                        </p>
                        {errors?.tier && (
                            <p className="mt-2 text-sm text-yellow-400">{errors.tier}</p>
                        )}
                        {notice && (
                            <p className="mt-2 text-sm text-green-400">{notice.text}</p>
                        )}
                    </div>

                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                        {plans.map((plan) => (
                            <PlanCard
                                key={plan.value}
                                plan={plan}
                                isCurrent={currentTier === plan.value}
                                disabled={plan.value === 'student' && !hasEduEmail}
                                disabledReason={
                                    plan.value === 'student' && !hasEduEmail
                                        ? 'Requires a .edu email on your account'
                                        : null
                                }
                                processing={processing === plan.value}
                                onSubscribe={subscribe}
                            />
                        ))}
                    </div>

                    <div className="rounded-lg border border-gray-800 bg-gray-900/30 p-5">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                                <h4 className="font-mono text-sm uppercase tracking-wider text-gray-400">{freePlan.label} plan</h4>
                                <p className="mt-1 text-sm text-gray-500">{freePlan.tagline} — {freePlan.price}, always available.</p>
                            </div>
                            <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                                {freePlan.features.map((f) => (
                                    <li key={f}>· {f}</li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
