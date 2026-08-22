import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';
import DeleteUserForm from './Partials/DeleteUserForm';
import UpdateApiKeyForm from './Partials/UpdateApiKeyForm';
import UpdatePasswordForm from './Partials/UpdatePasswordForm';
import UpdateProfileInformationForm from './Partials/UpdateProfileInformationForm';

export default function Edit({ mustVerifyEmail, status, hasLlmApiKey, llmProvider, userLlmProvider, userLlmBaseUrl, userLlmModel }) {
    return (
        <AuthenticatedLayout
            header={
                <h2 className="text-xl font-semibold leading-tight text-gray-100">
                    Profile
                </h2>
            }
        >
            <Head title="Profile" />

            <div className="py-12">
                <div className="mx-auto max-w-7xl space-y-6 sm:px-6 lg:px-8">
                    <div className="rounded-lg border border-gray-800 bg-gray-900 p-4 sm:p-8">
                        <UpdateProfileInformationForm
                            mustVerifyEmail={mustVerifyEmail}
                            status={status}
                            className="max-w-xl"
                        />
                    </div>

                    <div className="rounded-lg border border-gray-800 bg-gray-900 p-4 sm:p-8">
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

                    <div className="rounded-lg border border-gray-800 bg-gray-900 p-4 sm:p-8">
                        <UpdatePasswordForm className="max-w-xl" />
                    </div>

                    <div className="rounded-lg border border-gray-800 bg-gray-900 p-4 sm:p-8">
                        <DeleteUserForm className="max-w-xl" />
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
