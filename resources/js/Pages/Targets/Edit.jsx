import { Head } from '@inertiajs/react';
import { usePage, router } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import PrimaryButton from '@/Components/PrimaryButton';
import DangerButton from '@/Components/DangerButton';
import SecondaryButton from '@/Components/SecondaryButton';
import TextInput from '@/Components/TextInput';
import InputLabel from '@/Components/InputLabel';
import InputError from '@/Components/InputError';
import Dropdown from '@/Components/Dropdown';
import Modal from '@/Components/Modal';
import NavLink from '@/Components/NavLink';
import { useState } from 'react';
import { ArrowLeftIcon, ShieldCheckIcon, ClockIcon, MagnifyingGlassIcon, PlayIcon, PauseIcon, TrashIcon, PencilIcon, XMarkIcon, CheckIcon, ArrowPathIcon, ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';
import { format } from 'date-fns';

export default function TargetEdit({ target, scanTypes, errors }) {
    const { auth } = usePage().props;
    const [formData, setFormData] = useState({
        domain_url: target.domain_url,
        display_name: target.display_name || '',
        is_active: target.is_active,
        uptime_check_interval_minutes: target.uptime_check_interval_minutes,
        scan_types: target.scan_config?.scan_types || scanTypes.map(t => t.value),
        custom_headers: target.scan_config?.custom_headers || {},
        follow_redirects: target.scan_config?.follow_redirects ?? true,
        timeout_seconds: target.scan_config?.timeout_seconds ?? 10,
    });
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        if (type === 'checkbox') {
            if (name === 'is_active') {
                setFormData(prev => ({ ...prev, [name]: checked }));
            } else if (checked) {
                setFormData(prev => ({
                    ...prev,
                    [name]: [...(prev[name] || []), value]
                }));
            } else {
                setFormData(prev => ({
                    ...prev,
                    [name]: (prev[name] || []).filter(v => v !== value)
                }));
            }
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        router.put(route('targets.update', target.id), formData, {
            onSuccess: () => router.visit(route('targets.index')),
            onFinish: () => setIsSubmitting(false),
        });
    };

    const handleDelete = () => {
        router.delete(route('targets.destroy', target.id), {
            onSuccess: () => router.visit(route('targets.index')),
        });
        setShowDeleteModal(false);
    };

    return (
        <AuthenticatedLayout
            header={
                <div className="flex items-center gap-4">
                    <SecondaryButton onClick={() => router.visit(route('targets.index'))}>
                        <ArrowLeftIcon className="h-5 w-5 mr-2" /> Back
                    </SecondaryButton>
                    <div>
                        <h2 className="text-xl font-semibold text-gray-100">Edit Target</h2>
                        <p className="text-sm text-gray-500">Update target configuration</p>
                    </div>
                </div>
            }
        >
            <Head title={`Edit ${target.display_name || target.domain_url}`} />

            <div className="py-6">
                <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8">
                    <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div>
                                <InputLabel htmlFor="domain_url">Target URL</InputLabel>
                                <TextInput
                                    id="domain_url"
                                    name="domain_url"
                                    type="url"
                                    value={formData.domain_url}
                                    onChange={handleChange}
                                    required
                                />
                                <InputError message={errors.domain_url} />
                            </div>

                            <div>
                                <InputLabel htmlFor="display_name">Display Name (optional)</InputLabel>
                                <TextInput
                                    id="display_name"
                                    name="display_name"
                                    type="text"
                                    value={formData.display_name}
                                    onChange={handleChange}
                                    placeholder="Production API"
                                />
                                <InputError message={errors.display_name} />
                            </div>

                            <div>
                                <InputLabel htmlFor="uptime_check_interval_minutes">Uptime Check Interval</InputLabel>
                                <select
                                    id="uptime_check_interval_minutes"
                                    name="uptime_check_interval_minutes"
                                    value={formData.uptime_check_interval_minutes}
                                    onChange={handleChange}
                                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-gray-100 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                                >
                                    <option value="1">Every minute (Pro+)</option>
                                    <option value="5">Every 5 minutes</option>
                                    <option value="10">Every 10 minutes</option>
                                    <option value="15">Every 15 minutes</option>
                                    <option value="30">Every 30 minutes</option>
                                    <option value="60">Every hour</option>
                                </select>
                            </div>

                            <div>
                                <label className="flex items-center gap-3 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        name="is_active"
                                        checked={formData.is_active}
                                        onChange={handleChange}
                                        className="h-4 w-4 rounded border-gray-700 bg-gray-900 text-red-500 focus:ring-red-500"
                                    />
                                    <span className="text-sm font-medium text-gray-300">Target is active (enable monitoring)</span>
                                </label>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">Scan Types</label>
                                <div className="grid grid-cols-2 gap-3">
                                    {scanTypes.map((type) => (
                                        <label key={type.value} className="flex items-center gap-2 cursor-pointer p-3 bg-gray-900 border border-gray-700 rounded-lg hover:border-red-500 transition-colors">
                                            <input
                                                type="checkbox"
                                                name="scan_types"
                                                value={type.value}
                                                checked={formData.scan_types.includes(type.value)}
                                                onChange={handleChange}
                                                className="h-4 w-4 rounded border-gray-700 bg-gray-900 text-red-500 focus:ring-red-500"
                                            />
                                            <div>
                                                <span className="font-mono text-sm font-medium text-gray-100 capitalize">{type.value.toUpperCase()}</span>
                                                <p className="text-xs text-gray-500">{type.label}</p>
                                            </div>
                                        </label>
                                    ))}
                                </div>
                                <InputError message={errors.scan_types} />
                            </div>

                            <div className="pt-4 border-t border-gray-700">
                                <div className="flex justify-between">
                                    <div className="flex gap-3">
                                        <DangerButton
                                            type="button"
                                            onClick={() => setShowDeleteModal(true)}
                                        >
                                            <TrashIcon className="h-5 w-5 mr-2" />
                                            Delete Target
                                        </DangerButton>
                                    </div>
                                    <div className="flex gap-3">
                                        <SecondaryButton
                                            type="button"
                                            onClick={() => router.visit(route('targets.index'))}
                                        >
                                            Cancel
                                        </SecondaryButton>
                                        <PrimaryButton type="submit" disabled={isSubmitting}>
                                            {isSubmitting ? 'Saving...' : 'Save Changes'}
                                        </PrimaryButton>
                                    </div>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            </div>

            {/* Delete Modal */}
            <Modal show={showDeleteModal} onClose={() => setShowDeleteModal(false)} title="Delete Target" size="sm">
                <p className="text-gray-400">Are you sure you want to delete <span className="font-mono text-red-400">{target.display_name || target.domain_url}</span>? This will remove all associated uptime logs and vulnerability data. This action cannot be undone.</p>
                <div className="mt-6 flex justify-end gap-3">
                    <SecondaryButton onClick={() => setShowDeleteModal(false)}>Cancel</SecondaryButton>
                    <DangerButton onClick={handleDelete}>Delete Target</DangerButton>
                </div>
            </Modal>
        </AuthenticatedLayout>
    );
}