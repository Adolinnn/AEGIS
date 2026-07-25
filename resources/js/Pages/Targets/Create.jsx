import { Head } from '@inertiajs/react';
import { usePage, router } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import TextInput from '@/Components/TextInput';
import InputLabel from '@/Components/InputLabel';
import InputError from '@/Components/InputError';
import Modal from '@/Components/Modal';
import { useState } from 'react';
import { ArrowLeftIcon, PlayIcon, ShieldCheckIcon, ClockIcon, MagnifyingGlassIcon, XMarkIcon, CheckIcon, ArrowPathIcon, TrashIcon, PencilIcon, ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';
import { format } from 'date-fns';

export default function TargetCreate({ scanTypes }) {
    const { errors } = usePage().props;
    const [formData, setFormData] = useState({
        domain_url: '',
        display_name: '',
        uptime_check_interval_minutes: 5,
        scan_types: scanTypes.map(t => t.value),
        custom_headers: {},
        follow_redirects: true,
        timeout_seconds: 10,
    });

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        if (type === 'checkbox') {
            if (checked) {
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
        router.post(route('targets.store'), formData, {
            onSuccess: () => router.visit(route('targets.index')),
        });
    };

    return (
        <AuthenticatedLayout
            header={
                <div className="flex items-center gap-4">
                    <SecondaryButton onClick={() => router.visit(route('targets.index'))}>
                        <ArrowLeftIcon className="h-5 w-5 mr-2" /> Back
                    </SecondaryButton>
                    <div>
                        <h2 className="text-xl font-semibold text-gray-100">Add Target</h2>
                        <p className="text-sm text-gray-500">Configure a new monitoring target</p>
                    </div>
                </div>
            }
        >
            <Head title="Add Target" />

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
                                    placeholder="https://example.com"
                                    required
                                    autoFocus
                                />
                                <InputError message={errors.domain_url} />
                                <p className="mt-1 text-sm text-gray-500">
                                    Enter the full URL including protocol (http:// or https://)
                                </p>
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
                                <div className="flex justify-end gap-3">
                                    <SecondaryButton
                                        type="button"
                                        onClick={() => router.visit(route('targets.index'))}
                                    >
                                        Cancel
                                    </SecondaryButton>
                                    <PrimaryButton type="submit">
                                        Add Target
                                    </PrimaryButton>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}