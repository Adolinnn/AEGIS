import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';
import { Head, useForm } from '@inertiajs/react';

export default function AdminLogin({ status }) {
    const { data, setData, post, processing, errors, reset } = useForm({
        email: '',
        password: '',
    });

    const submit = (e) => {
        e.preventDefault();

        post(route('admin.login'), {
            onFinish: () => reset('password'),
        });
    };

    return (
        <div className="min-h-screen flex flex-col justify-center items-center bg-black text-gray-300 px-4">
            <Head title="Admin Login" />

            <div className="mb-6 flex flex-col items-center">
                <div className="text-red-600 font-mono text-xs tracking-[0.3em] uppercase mb-1">
                    Aegis
                </div>
                <div className="text-gray-500 font-mono text-xs tracking-widest uppercase">
                    Restricted Access
                </div>
            </div>

            <div className="w-full sm:max-w-sm px-6 py-6 bg-gray-950 border border-red-900/40 shadow-[0_0_25px_rgba(185,28,28,0.15)] rounded-lg">
                {status && (
                    <div className="mb-4 text-sm font-mono text-green-500">
                        {status}
                    </div>
                )}

                <form onSubmit={submit} className="font-mono">
                    <div>
                        <InputLabel
                            htmlFor="email"
                            value="Admin Email"
                            className="text-gray-400"
                        />

                        <TextInput
                            id="email"
                            type="email"
                            name="email"
                            value={data.email}
                            className="mt-1 block w-full bg-black border-gray-800 text-gray-200 focus:border-red-600 focus:ring-red-600"
                            autoComplete="username"
                            isFocused={true}
                            onChange={(e) => setData('email', e.target.value)}
                        />

                        <InputError message={errors.email} className="mt-2" />
                    </div>

                    <div className="mt-4">
                        <InputLabel
                            htmlFor="password"
                            value="Password"
                            className="text-gray-400"
                        />

                        <TextInput
                            id="password"
                            type="password"
                            name="password"
                            value={data.password}
                            className="mt-1 block w-full bg-black border-gray-800 text-gray-200 focus:border-red-600 focus:ring-red-600"
                            autoComplete="current-password"
                            onChange={(e) => setData('password', e.target.value)}
                        />

                        <InputError message={errors.password} className="mt-2" />
                    </div>

                    <button
                        type="submit"
                        disabled={processing}
                        className="mt-6 w-full inline-flex justify-center items-center px-4 py-2 bg-red-700 border border-red-600 rounded-md font-mono text-xs uppercase tracking-widest text-white hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-black disabled:opacity-50 transition"
                    >
                        {processing ? 'Verifying…' : 'Authenticate'}
                    </button>
                </form>
            </div>

            <p className="mt-6 text-xs font-mono text-gray-700">
                This is not the regular sign-in page.
            </p>
        </div>
    );
}