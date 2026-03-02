'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import Input from '@/components/Input';
import Button from '@/components/Button';

export default function SignupPage() {
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: '',
        firstName: '',
        lastName: '',
    });
    const [cvFile, setCvFile] = useState<File | null>(null);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { register } = useAuth();

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setCvFile(e.target.files[0]);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const result = await register(
                formData.username,
                formData.email,
                formData.password,
                formData.firstName,
                formData.lastName,
                cvFile || undefined
            );

            // Navigation is handled inside AuthContext.register.
            // Only show an error here if something went wrong.
            if (!result.success && result.error) {
                // "Account created! Please log in." is a soft success — don't show as error
                if (!result.error.toLowerCase().includes('please log in')) {
                    setError(result.error);
                }
            }
        } catch (err) {
            setError('An unexpected error occurred');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 py-12">
            {/* Background decoration */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
                <div className="absolute top-0 right-1/4 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl" />
                <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl" />
            </div>

            <div className="glass-card w-full max-w-2xl p-8 animate-in fade-in zoom-in duration-500">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold mb-2">Create Account</h1>
                    <p className="text-zinc-400">Join EchoAI to master your interview skills</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {error && (
                        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center">
                            {error}
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input
                            label="Username"
                            name="username"
                            placeholder="johndoe"
                            value={formData.username}
                            onChange={handleChange}
                            required
                        />
                        <Input
                            label="Email"
                            name="email"
                            type="email"
                            placeholder="john@example.com"
                            value={formData.email}
                            onChange={handleChange}
                            required
                        />
                        <Input
                            label="First Name"
                            name="firstName"
                            placeholder="John"
                            value={formData.firstName}
                            onChange={handleChange}
                        />
                        <Input
                            label="Last Name"
                            name="lastName"
                            placeholder="Doe"
                            value={formData.lastName}
                            onChange={handleChange}
                        />
                    </div>

                    <Input
                        label="Password"
                        name="password"
                        type="password"
                        placeholder="Min. 8 characters"
                        value={formData.password}
                        onChange={handleChange}
                        required
                    />

                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-zinc-300 ml-1">
                            Upload CV (Optional)
                        </label>
                        <div className={`file-upload ${cvFile ? 'active' : ''}`}>
                            <input
                                type="file"
                                id="cv-upload"
                                className="hidden"
                                accept=".pdf,.docx,.doc,.txt"
                                onChange={handleFileChange}
                            />
                            <label htmlFor="cv-upload" className="cursor-pointer block w-full h-full">
                                {cvFile ? (
                                    <div className="flex items-center justify-center gap-2 text-indigo-400">
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        <span className="font-medium truncate max-w-[200px]">{cvFile.name}</span>
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                setCvFile(null);
                                            }}
                                            className="ml-2 text-zinc-500 hover:text-red-400"
                                        >
                                            ×
                                        </button>
                                    </div>
                                ) : (
                                    <div className="text-zinc-400">
                                        <div className="mb-2">
                                            <svg className="mx-auto h-8 w-8 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                            </svg>
                                        </div>
                                        <span className="text-indigo-400 font-medium">Click to upload</span> or drag and drop
                                        <p className="text-xs text-zinc-500 mt-1">PDF, DOCX, TXT up to 5MB</p>
                                    </div>
                                )}
                            </label>
                        </div>
                        <p className="text-xs text-zinc-500 ml-1">
                            We use your CV to generate personalized interview questions.
                        </p>
                    </div>

                    <Button
                        type="submit"
                        fullWidth
                        isLoading={loading}
                    >
                        Create Account
                    </Button>

                    <div className="text-center text-sm text-zinc-400">
                        Already have an account?{' '}
                        <Link href="/login" className="text-indigo-400 hover:text-indigo-300 font-medium">
                            Sign in
                        </Link>
                    </div>
                </form>
            </div>
        </div>
    );
}
