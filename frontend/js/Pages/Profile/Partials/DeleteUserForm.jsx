import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import Modal from '@/Components/Modal';
import TextInput from '@/Components/TextInput';
import { useForm } from '@inertiajs/react';
import { useRef, useState } from 'react';
import { ExclamationTriangleIcon, TrashIcon } from '@heroicons/react/24/outline';

export default function DeleteUserForm({ className = '' }) {
    const [confirmingUserDeletion, setConfirmingUserDeletion] = useState(false);
    const passwordInput = useRef();

    const {
        data,
        setData,
        delete: destroy,
        processing,
        reset,
        errors,
        clearErrors,
    } = useForm({
        password: '',
    });

    const confirmUserDeletion = () => {
        setConfirmingUserDeletion(true);
    };

    const deleteUser = (e) => {
        e.preventDefault();

        destroy(route('profile.destroy'), {
            preserveScroll: true,
            onSuccess: () => closeModal(),
            onError: () => passwordInput.current.focus(),
            onFinish: () => reset(),
        });
    };

    const closeModal = () => {
        setConfirmingUserDeletion(false);
        clearErrors();
        reset();
    };

    return (
        <section className={`space-y-6 ${className}`}>
            <header className="mb-6">
                <p className="mt-1 text-sm font-sans font-medium text-exec-critical/80 leading-relaxed">
                    Once your account is deleted, all of its resources and data
                    will be permanently deleted. Before deleting your account,
                    please download any data or information that you wish to
                    retain.
                </p>
            </header>

            <button 
                onClick={confirmUserDeletion}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl border border-exec-critical/30 bg-exec-critical/10 text-exec-critical font-sans text-sm font-bold hover:bg-exec-critical hover:text-white transition-all hover:shadow-[0_0_15px_rgba(244,63,94,0.4)]"
            >
                <TrashIcon className="w-4 h-4" />
                Delete Account
            </button>

            <Modal show={confirmingUserDeletion} onClose={closeModal}>
                <form onSubmit={deleteUser} className="p-8 bg-[#050a16] border border-exec-critical/30 rounded-2xl relative overflow-hidden">
                    <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-exec-critical/50 to-transparent"></div>
                    <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                        <ExclamationTriangleIcon className="w-32 h-32 text-exec-critical" />
                    </div>

                    <h2 className="text-xl font-sans font-bold text-white tracking-tight flex items-center gap-3 relative z-10">
                        <ExclamationTriangleIcon className="w-6 h-6 text-exec-critical" />
                        Confirm Account Deletion
                    </h2>

                    <p className="mt-3 text-sm font-sans font-medium text-slate-400 relative z-10">
                        This action is irreversible. All of your resources and
                        data will be permanently deleted. Please enter your
                        password to confirm.
                    </p>

                    <div className="mt-8 relative z-10">
                        <InputLabel
                            htmlFor="password"
                            value="Password"
                            className="sr-only"
                        />

                        <TextInput
                            id="password"
                            type="password"
                            name="password"
                            ref={passwordInput}
                            value={data.password}
                            onChange={(e) =>
                                setData('password', e.target.value)
                            }
                            className="mt-1 block w-full bg-black/50 border-exec-critical/30 text-white focus:border-exec-critical focus:ring-exec-critical rounded-xl h-12 px-4 transition-colors placeholder:text-slate-600"
                            isFocused
                            placeholder="Enter password to confirm"
                        />

                        <InputError
                            message={errors.password}
                            className="mt-2 text-exec-critical"
                        />
                    </div>

                    <div className="mt-8 flex justify-end gap-3 relative z-10">
                        <button 
                            type="button" 
                            onClick={closeModal}
                            className="px-6 py-2.5 rounded-xl bg-white/[0.05] border border-white/[0.1] text-slate-300 font-sans text-sm font-bold hover:bg-white/[0.1] transition-all"
                        >
                            Cancel
                        </button>

                        <button 
                            type="submit" 
                            disabled={processing}
                            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-exec-critical text-white font-sans text-sm font-bold hover:bg-exec-critical/90 transition-all shadow-[0_0_15px_rgba(244,63,94,0.3)] disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <TrashIcon className="w-4 h-4" />
                            Confirm Deletion
                        </button>
                    </div>
                </form>
            </Modal>
        </section>
    );
}
