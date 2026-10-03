import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';
import DeleteUserForm from './Partials/DeleteUserForm';
import UpdateApiKeyForm from './Partials/UpdateApiKeyForm';
import UpdatePasswordForm from './Partials/UpdatePasswordForm';
import UpdateProfileInformationForm from './Partials/UpdateProfileInformationForm';
import { UserIcon, KeyIcon, ShieldCheckIcon, TrashIcon, UserCircleIcon } from '@heroicons/react/24/outline';

export default function Edit({ mustVerifyEmail, status, hasLlmApiKey, llmProvider, userLlmProvider, userLlmBaseUrl, userLlmModel }) {
    return (
        <AuthenticatedLayout
            header={
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-3">
                            <span className="font-sans text-[10px] px-2.5 py-1 rounded-full bg-exec-indigo/10 text-exec-indigo border border-exec-indigo/30 font-bold uppercase tracking-wider flex items-center gap-2 shadow-[0_0_10px_rgba(99,102,241,0.2)]">
                                <UserCircleIcon className="h-3 w-3" />
                                Account Settings
                            </span>
                            <span className="text-slate-500 text-sm font-sans">/</span>
                            <span className="font-sans text-xs text-slate-400 font-medium">Profile</span>
                        </div>
                        <h2 className="text-3xl font-sans font-bold text-white tracking-tight mt-3 drop-shadow-md">
                            Profile Settings
                        </h2>
                    </div>
                </div>
            }
        >
            <Head title="Profile" />

            <div className="py-10">
                <div className="mx-auto max-w-[1400px] space-y-8 px-4 sm:px-6 lg:px-8">
                    
                    <div className="rounded-3xl border border-white/[0.08] bg-white/[0.02] backdrop-blur-2xl p-8 shadow-[0_8px_32px_rgba(0,0,0,0.2)] relative overflow-hidden hud-fade-in">
                        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.15] to-transparent"></div>
                        <h3 className="text-sm font-sans font-bold text-slate-200 uppercase tracking-widest mb-6 flex items-center gap-2">
                            <UserIcon className="h-5 w-5 text-exec-indigo" />
                            Profile Information
                        </h3>
                        <UpdateProfileInformationForm
                            mustVerifyEmail={mustVerifyEmail}
                            status={status}
                            className="max-w-xl"
                        />
                    </div>

                    <div className="rounded-3xl border border-white/[0.08] bg-white/[0.02] backdrop-blur-2xl p-8 shadow-[0_8px_32px_rgba(0,0,0,0.2)] relative overflow-hidden hud-fade-in hud-stagger-1">
                        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.15] to-transparent"></div>
                        <h3 className="text-sm font-sans font-bold text-slate-200 uppercase tracking-widest mb-6 flex items-center gap-2">
                            <KeyIcon className="h-5 w-5 text-exec-info" />
                            LLM API Configuration
                        </h3>
                        <UpdateApiKeyForm
                            hasLlmApiKey={hasLlmApiKey}
                            llmProvider={llmProvider}
                            userLlmProvider={userLlmProvider}
                            userLlmBaseUrl={userLlmBaseUrl}
                            userLlmModel={userLlmModel}
                            status={status}
                            className="max-w-xl"
                        />
                    </div>

                    <div className="rounded-3xl border border-white/[0.08] bg-white/[0.02] backdrop-blur-2xl p-8 shadow-[0_8px_32px_rgba(0,0,0,0.2)] relative overflow-hidden hud-fade-in hud-stagger-2">
                        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.15] to-transparent"></div>
                        <h3 className="text-sm font-sans font-bold text-slate-200 uppercase tracking-widest mb-6 flex items-center gap-2">
                            <ShieldCheckIcon className="h-5 w-5 text-exec-high" />
                            Update Password
                        </h3>
                        <UpdatePasswordForm className="max-w-xl" />
                    </div>

                    <div className="rounded-3xl border border-exec-critical/20 bg-exec-critical/5 backdrop-blur-2xl p-8 shadow-[0_8px_32px_rgba(244,63,94,0.1)] relative overflow-hidden hud-fade-in hud-stagger-3">
                        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-exec-critical/40 to-transparent"></div>
                        <h3 className="text-sm font-sans font-bold text-exec-critical uppercase tracking-widest mb-6 flex items-center gap-2">
                            <TrashIcon className="h-5 w-5" />
                            Danger Zone
                        </h3>
                        <DeleteUserForm className="max-w-xl" />
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
