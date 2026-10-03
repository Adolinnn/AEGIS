import { Head, router, usePage } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { CheckIcon, LockClosedIcon, CreditCardIcon, SparklesIcon, BuildingOfficeIcon, AcademicCapIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { useState } from 'react';

const accentByTier = {
    free: 'border-white/[0.1] bg-white/[0.02]',
    individual: 'border-exec-info/30 bg-exec-info/5',
    team: 'border-exec-indigo/30 bg-exec-indigo/5',
    student: 'border-exec-high/30 bg-exec-high/5',
};

const iconByTier = {
    free: <CheckIcon className="h-6 w-6 text-slate-400" />,
    individual: <SparklesIcon className="h-6 w-6 text-exec-info" />,
    team: <BuildingOfficeIcon className="h-6 w-6 text-exec-indigo" />,
    student: <AcademicCapIcon className="h-6 w-6 text-exec-high" />,
};

const buttonByTier = {
    individual: 'bg-exec-info/10 text-exec-info border-exec-info/30 hover:bg-exec-info/20 hover:shadow-[0_0_15px_rgba(16,185,129,0.2)]',
    team: 'bg-gradient-to-r from-exec-indigo to-[#8b5cf6] text-white border-transparent hover:shadow-[0_0_20px_rgba(99,102,241,0.4)]',
    student: 'bg-exec-high/10 text-exec-high border-exec-high/30 hover:bg-exec-high/20 hover:shadow-[0_0_15px_rgba(245,158,11,0.2)]',
};

function PlanCard({ plan, isCurrent, disabled, disabledReason, onSubscribe, processing }) {
    return (
        <div
            className={`flex flex-col rounded-3xl border backdrop-blur-xl p-8 relative overflow-hidden transition-all duration-300 group ${accentByTier[plan.value] ?? 'border-white/[0.1] bg-white/[0.02]'} ${
                isCurrent ? 'shadow-[0_0_30px_rgba(255,255,255,0.05)] scale-[1.02]' : 'hover:scale-[1.02] hover:shadow-xl'
            }`}
        >
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.15] to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            
            <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-white/[0.05] border border-white/[0.1]">
                        {iconByTier[plan.value]}
                    </div>
                    <div>
                        <h3 className="font-sans text-xl font-bold text-white">{plan.label}</h3>
                        <p className="mt-1 text-sm font-sans font-medium text-slate-400">{plan.tagline}</p>
                    </div>
                </div>
            </div>

            {isCurrent && (
                <div className="absolute top-5 right-5">
                    <span className="rounded-full border border-exec-info/30 bg-exec-info/10 px-3 py-1.5 text-[10px] font-mono font-bold uppercase tracking-widest text-exec-info flex items-center gap-1.5 shadow-[0_0_10px_rgba(16,185,129,0.2)]">
                        <span className="w-1.5 h-1.5 rounded-full bg-exec-info animate-pulse"></span>
                        Active
                    </span>
                </div>
            )}

            <div className="mt-8 pb-8 border-b border-white/[0.08]">
                <div className="flex items-end gap-2">
                    <span className="font-sans text-4xl font-bold text-white tracking-tight">{plan.price}</span>
                    {plan.price !== 'Free' && <span className="text-sm font-sans font-medium text-slate-400 mb-1">/mo</span>}
                </div>
                {plan.price_note && <div className="mt-2 text-xs font-mono text-slate-500 uppercase tracking-wider">{plan.price_note}</div>}
            </div>

            <ul className="mt-8 flex-1 space-y-4">
                {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-3 text-sm font-sans font-medium text-slate-300">
                        <div className="mt-0.5 rounded-full bg-exec-info/10 p-0.5 border border-exec-info/20 shrink-0">
                            <CheckIcon className="h-3 w-3 text-exec-info" />
                        </div>
                        <span>{f}</span>
                    </li>
                ))}
            </ul>

            <div className="mt-10">
                {isCurrent ? (
                    <button
                        disabled
                        className="w-full cursor-default rounded-xl border border-white/[0.1] bg-white/[0.02] px-6 py-3.5 text-sm font-sans font-bold text-slate-500 transition-all"
                    >
                        Current Plan
                    </button>
                ) : (
                    <button
                        onClick={() => onSubscribe(plan.value)}
                        disabled={disabled || processing}
                        className={`relative w-full rounded-xl border px-6 py-3.5 text-sm font-sans font-bold transition-all disabled:cursor-not-allowed disabled:opacity-50 overflow-hidden ${
                            buttonByTier[plan.value] ?? 'bg-white/[0.05] text-slate-300 border-white/[0.1] hover:bg-white/[0.1] hover:text-white'
                        }`}
                    >
                        <div className="absolute inset-0 bg-white/10 opacity-0 hover:opacity-100 transition-opacity pointer-events-none"></div>
                        <div className="flex items-center justify-center gap-2 relative z-10">
                            {disabled && <LockClosedIcon className="h-4 w-4" />}
                            {processing && <ArrowPathIcon className="h-4 w-4 animate-spin" />}
                            {processing ? 'Processing...' : disabled ? 'Locked' : `Upgrade to ${plan.label}`}
                        </div>
                    </button>
                )}
                {disabled && disabledReason && (
                    <p className="mt-3 text-center text-xs font-sans font-medium text-exec-high">{disabledReason}</p>
                )}
            </div>
        </div>
    );
}

export default function BillingIndex({ currentTier, plans, freePlan, hasEduEmail }) {
    const { errors, auth } = usePage().props;
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
        <AuthenticatedLayout 
            header={
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-3">
                            <span className="font-sans text-[10px] px-2.5 py-1 rounded-full bg-exec-indigo/10 text-exec-indigo border border-exec-indigo/30 font-bold uppercase tracking-wider flex items-center gap-2 shadow-[0_0_10px_rgba(99,102,241,0.2)]">
                                <CreditCardIcon className="h-3 w-3" />
                                Account Settings
                            </span>
                            <span className="text-slate-500 text-sm font-sans">/</span>
                            <span className="font-sans text-xs text-slate-400 font-medium">Subscription</span>
                        </div>
                        <h2 className="text-3xl font-sans font-bold text-white tracking-tight mt-3 drop-shadow-md">
                            Billing & Plans
                        </h2>
                    </div>
                </div>
            }
        >
            <Head title="Billing" />

            <div className="py-10">
                <div className="mx-auto max-w-[1400px] space-y-8 px-4 sm:px-6 lg:px-8">
                    
                    <div className="rounded-3xl border border-white/[0.08] bg-white/[0.02] backdrop-blur-2xl p-6 shadow-[0_8px_32px_rgba(0,0,0,0.2)] relative overflow-hidden hud-fade-in flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.12] to-transparent"></div>
                        <div className="flex-1">
                            <h3 className="text-lg font-sans font-bold text-white mb-2">Current Plan Status</h3>
                            <p className="text-sm font-sans font-medium text-slate-400 leading-relaxed max-w-2xl">
                                No payment info required — subscribing switches your account's plan and limits immediately.
                                {currentTier !== 'free' && (
                                    <>
                                        {' '}
                                        {auth.trial_active ? (
                                            <>
                                                Currently on a <span className="text-white font-bold">30-day trial</span> of the <span className="text-white font-bold capitalize">{currentTier}</span> plan ({auth.trial_days_remaining} {auth.trial_days_remaining === 1 ? 'day' : 'days'} left).{' '}
                                            </>
                                        ) : (
                                            <>
                                                Currently on <span className="text-white font-bold capitalize">{currentTier}</span>.{' '}
                                            </>
                                        )}
                                    </>
                                )}
                            </p>
                        </div>
                        
                        {currentTier !== 'free' && (
                            <button
                                onClick={cancel}
                                disabled={processing === 'cancel'}
                                className="shrink-0 px-6 py-2.5 rounded-xl border border-exec-critical/30 bg-exec-critical/10 text-sm font-sans font-bold text-exec-critical hover:bg-exec-critical/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                {processing === 'cancel' ? <ArrowPathIcon className="h-4 w-4 animate-spin" /> : null}
                                Cancel to Free Plan
                            </button>
                        )}
                    </div>
                    
                    {errors?.tier && (
                        <div className="rounded-xl border border-exec-high/30 bg-exec-high/10 p-4 text-sm font-sans font-bold text-exec-high animate-[hud-fade-in_0.3s_ease-out]">
                            {errors.tier}
                        </div>
                    )}
                    {notice && (
                        <div className="rounded-xl border border-exec-info/30 bg-exec-info/10 p-4 text-sm font-sans font-bold text-exec-info animate-[hud-fade-in_0.3s_ease-out]">
                            {notice.text}
                        </div>
                    )}

                    <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3 hud-fade-in hud-stagger-1">
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

                    <div className="rounded-3xl border border-white/[0.08] bg-white/[0.01] backdrop-blur-xl p-8 relative overflow-hidden hud-fade-in hud-stagger-2">
                        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent"></div>
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                            <div>
                                <h4 className="font-sans text-sm font-bold uppercase tracking-widest text-slate-300 flex items-center gap-2 mb-2">
                                    <CheckIcon className="h-4 w-4 text-slate-500" />
                                    {freePlan.label} Plan
                                </h4>
                                <p className="text-sm font-sans font-medium text-slate-500">{freePlan.tagline} — {freePlan.price}, always available.</p>
                            </div>
                            <ul className="flex flex-wrap gap-4 text-xs font-sans font-medium text-slate-400 bg-white/[0.02] p-4 rounded-2xl border border-white/[0.05]">
                                {freePlan.features.map((f) => (
                                    <li key={f} className="flex items-center gap-1.5 bg-black/20 px-3 py-1.5 rounded-lg border border-white/[0.05]">
                                        <div className="w-1 h-1 rounded-full bg-slate-500"></div>
                                        {f}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
