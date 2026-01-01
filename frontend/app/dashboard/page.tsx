'use client';

import { useEffect, useState } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/context/AuthContext';
import { interviewApi, Interview } from '@/lib/api';
import Link from 'next/link';

export default function Dashboard() {
    const { user } = useAuth();
    const [interviews, setInterviews] = useState<Interview[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchInterviews = async () => {
            if (user) {
                const response = await interviewApi.list();
                if (response.data) {
                    setInterviews(response.data);
                }
                setLoading(false);
            }
        };

        fetchInterviews();
    }, [user]);

    return (
        <ProtectedRoute>
            <div className="min-h-screen bg-[#0a0a0a] p-4 sm:p-8">
                <div className="max-w-7xl mx-auto space-y-8">
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-zinc-400">
                                Dashboard
                            </h1>
                            <p className="text-zinc-400 mt-1">
                                Welcome back, {user?.first_name || user?.username}!
                            </p>
                        </div>
                        <Link
                            href="/interviews/create"
                            className="btn-primary"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            New Interview
                        </Link>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="dashboard-card border-l-4 border-l-indigo-500">
                            <h3 className="text-zinc-400 text-sm font-medium">Total Interviews</h3>
                            <p className="text-3xl font-bold mt-2">{interviews.length}</p>
                        </div>
                        <div className="dashboard-card border-l-4 border-l-emerald-500">
                            <h3 className="text-zinc-400 text-sm font-medium">Completed</h3>
                            <p className="text-3xl font-bold mt-2">
                                {interviews.filter(i => i.status === 'completed').length}
                            </p>
                        </div>
                        <div className="dashboard-card border-l-4 border-l-amber-500">
                            <h3 className="text-zinc-400 text-sm font-medium">Avg. Score</h3>
                            <p className="text-3xl font-bold mt-2">-</p>
                        </div>
                    </div>

                    {/* Recent Interviews */}
                    <div className="space-y-4">
                        <h2 className="text-xl font-bold">Recent Sessions</h2>

                        {loading ? (
                            <div className="flex justify-center py-12">
                                <div className="spinner h-8 w-8 text-indigo-500" />
                            </div>
                        ) : interviews.length === 0 ? (
                            <div className="glass-card p-12 text-center">
                                <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <svg className="w-8 h-8 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                    </svg>
                                </div>
                                <h3 className="text-lg font-medium mb-2">No interviews yet</h3>
                                <p className="text-zinc-400 mb-6 max-w-sm mx-auto">
                                    Start your first mock interview to practice your skills and get AI feedback.
                                </p>
                                <Link
                                    href="/interviews/create"
                                    className="btn-primary"
                                >
                                    Create Interview
                                </Link>
                            </div>
                        ) : (
                            <div className="grid gap-4">
                                {interviews.map((interview) => (
                                    <div key={interview.id} className="dashboard-card flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:border-indigo-500/50">
                                        <div>
                                            <div className="flex items-center gap-3 mb-1">
                                                <span className={`px-2 py-1 rounded-md text-xs font-medium capitalize
                          ${interview.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                                                        interview.status === 'in_progress' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' :
                                                            'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                                    }`}
                                                >
                                                    {interview.status.replace('_', ' ')}
                                                </span>
                                                <span className="text-zinc-500 text-sm">
                                                    {new Date(interview.created_at).toLocaleDateString()}
                                                </span>
                                            </div>
                                            <h3 className="font-semibold text-lg capitalize">
                                                {interview.interview_type} Interview
                                            </h3>
                                            <p className="text-zinc-400 text-sm truncate max-w-md">
                                                {interview.job_description ? 'Custom Job Description' : 'General Practice'}
                                            </p>
                                        </div>

                                        <div className="flex gap-2 w-full sm:w-auto">
                                            {interview.status === 'completed' ? (
                                                <Link
                                                    href={`/interviews/${interview.id}/report`}
                                                    className="btn-secondary text-sm py-2"
                                                >
                                                    View Report
                                                </Link>
                                            ) : (
                                                <Link
                                                    href={`/interviews/${interview.id}/start`}
                                                    className="btn-primary text-sm py-2"
                                                >
                                                    Continue
                                                </Link>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </ProtectedRoute>
    );
}
