'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { interviewApi, Interview } from '@/lib/api';
import DashboardLayout from '@/components/DashboardLayout';
import Link from 'next/link';
import {
    Video,
    CheckCircle2,
    Clock,
    TrendingUp,
    ArrowRight,
    Plus,
    Sparkles,
    Calendar,
} from 'lucide-react';

function StatusBadge({ status }: { status: string }) {
    const map: Record<string, { label: string; className: string }> = {
        completed: { label: 'Completed', className: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
        in_progress: { label: 'In Progress', className: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30' },
        pending: { label: 'Pending', className: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
    };
    const { label, className } = map[status] ?? { label: status, className: 'bg-zinc-500/15 text-zinc-400 border-zinc-500/30' };
    return (
        <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium border capitalize ${className}`}>
            {label}
        </span>
    );
}

export default function Dashboard() {
    const { user } = useAuth();
    const [interviews, setInterviews] = useState<Interview[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchInterviews = async () => {
            if (user) {
                const response = await interviewApi.list();
                if (response.data) setInterviews(response.data);
                setLoading(false);
            }
        };
        fetchInterviews();
    }, [user]);

    const completed = interviews.filter(i => i.status === 'completed').length;
    const inProgress = interviews.filter(i => i.status === 'in_progress').length;
    const greeting = () => {
        const h = new Date().getHours();
        if (h < 12) return 'Good morning';
        if (h < 17) return 'Good afternoon';
        return 'Good evening';
    };

    return (
        <DashboardLayout>
            <div className="max-w-6xl mx-auto space-y-8">

                {/* Welcome Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <p className="text-zinc-500 text-sm font-medium">{greeting()},</p>
                        <h1 className="text-2xl sm:text-3xl font-bold mt-0.5 bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">
                            {user?.first_name || user?.username} 👋
                        </h1>
                        <p className="text-zinc-500 text-sm mt-1">Here's an overview of your interview journey.</p>
                    </div>
                    <Link
                        href="/interviews/create"
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-sm font-semibold rounded-xl shadow-lg shadow-indigo-500/25 border border-indigo-500/30 transition-all duration-200 w-fit"
                    >
                        <Plus className="w-4 h-4" />
                        New Interview
                    </Link>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                        {
                            label: 'Total Sessions',
                            value: interviews.length,
                            icon: Video,
                            color: 'indigo',
                            gradient: 'from-indigo-600/20 to-purple-600/10',
                            border: 'border-indigo-500/20',
                            iconBg: 'bg-indigo-500/20',
                            iconColor: 'text-indigo-400',
                        },
                        {
                            label: 'Completed',
                            value: completed,
                            icon: CheckCircle2,
                            color: 'emerald',
                            gradient: 'from-emerald-600/20 to-teal-600/10',
                            border: 'border-emerald-500/20',
                            iconBg: 'bg-emerald-500/20',
                            iconColor: 'text-emerald-400',
                        },
                        {
                            label: 'In Progress',
                            value: inProgress,
                            icon: Clock,
                            color: 'amber',
                            gradient: 'from-amber-600/20 to-orange-600/10',
                            border: 'border-amber-500/20',
                            iconBg: 'bg-amber-500/20',
                            iconColor: 'text-amber-400',
                        },
                        {
                            label: 'Avg Score',
                            value: '—',
                            icon: TrendingUp,
                            color: 'rose',
                            gradient: 'from-rose-600/20 to-pink-600/10',
                            border: 'border-rose-500/20',
                            iconBg: 'bg-rose-500/20',
                            iconColor: 'text-rose-400',
                        },
                    ].map((stat) => (
                        <div
                            key={stat.label}
                            className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${stat.gradient} border ${stat.border} p-5`}
                        >
                            <div className={`w-10 h-10 rounded-xl ${stat.iconBg} flex items-center justify-center mb-4`}>
                                <stat.icon className={`w-5 h-5 ${stat.iconColor}`} />
                            </div>
                            <div className="text-2xl font-bold text-white">{stat.value}</div>
                            <div className="text-xs text-zinc-400 mt-1 font-medium">{stat.label}</div>
                        </div>
                    ))}
                </div>

                {/* Quick Actions */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Link
                        href="/interviews/create"
                        className="group flex items-center gap-4 p-5 rounded-2xl bg-gradient-to-r from-indigo-600/10 to-purple-600/10 border border-indigo-500/20 hover:border-indigo-500/40 hover:from-indigo-600/20 hover:to-purple-600/20 transition-all duration-200"
                    >
                        <div className="w-12 h-12 rounded-xl bg-indigo-500/20 flex items-center justify-center shrink-0">
                            <Sparkles className="w-6 h-6 text-indigo-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="font-semibold text-white">Start New Interview</p>
                            <p className="text-sm text-zinc-500 mt-0.5">Practice with AI-powered questions</p>
                        </div>
                        <ArrowRight className="w-5 h-5 text-zinc-500 group-hover:text-indigo-400 group-hover:translate-x-1 transition-all" />
                    </Link>

                    <Link
                        href="/resumes"
                        className="group flex items-center gap-4 p-5 rounded-2xl bg-gradient-to-r from-emerald-600/10 to-teal-600/10 border border-emerald-500/20 hover:border-emerald-500/40 hover:from-emerald-600/20 hover:to-teal-600/20 transition-all duration-200"
                    >
                        <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center shrink-0">
                            <Calendar className="w-6 h-6 text-emerald-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="font-semibold text-white">Build Your Resume</p>
                            <p className="text-sm text-zinc-500 mt-0.5">Create and export professional resumes</p>
                        </div>
                        <ArrowRight className="w-5 h-5 text-zinc-500 group-hover:text-emerald-400 group-hover:translate-x-1 transition-all" />
                    </Link>
                </div>

                {/* Recent Interviews */}
                <div>
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-bold text-white">Recent Sessions</h2>
                        {interviews.length > 0 && (
                            <Link href="/interviews" className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-1">
                                View all <ArrowRight className="w-3.5 h-3.5" />
                            </Link>
                        )}
                    </div>

                    {loading ? (
                        <div className="flex items-center justify-center py-16">
                            <div className="flex flex-col items-center gap-3">
                                <div className="w-10 h-10 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
                                <p className="text-zinc-500 text-sm">Loading sessions...</p>
                            </div>
                        </div>
                    ) : interviews.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-zinc-700 bg-zinc-900/30 p-12 text-center">
                            <div className="w-16 h-16 rounded-2xl bg-zinc-800 flex items-center justify-center mx-auto mb-4">
                                <Video className="w-8 h-8 text-zinc-600" />
                            </div>
                            <h3 className="text-lg font-semibold text-zinc-300 mb-2">No sessions yet</h3>
                            <p className="text-zinc-500 text-sm mb-6 max-w-xs mx-auto">
                                Create your first AI interview session to start practicing and get feedback.
                            </p>
                            <Link
                                href="/interviews/create"
                                className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-xl transition-colors"
                            >
                                <Plus className="w-4 h-4" />
                                Create Interview
                            </Link>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {interviews.slice(0, 5).map((interview) => (
                                <div
                                    key={interview.id}
                                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 hover:border-zinc-700 transition-colors"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shrink-0">
                                            <Video className="w-5 h-5 text-indigo-400" />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <p className="font-semibold text-zinc-100 capitalize">{interview.interview_type} Interview</p>
                                                <StatusBadge status={interview.status} />
                                            </div>
                                            <p className="text-xs text-zinc-500 mt-1">
                                                {new Date(interview.created_at).toLocaleDateString('en-US', {
                                                    month: 'short', day: 'numeric', year: 'numeric'
                                                })}
                                                {interview.job_description ? ' · Custom JD' : ' · General'}
                                            </p>
                                        </div>
                                    </div>
                                    <div>
                                        {interview.status === 'completed' ? (
                                            <Link
                                                href={`/interviews/${interview.id}/report`}
                                                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 transition-colors"
                                            >
                                                View Report
                                            </Link>
                                        ) : interview.status === 'in_progress' ? (
                                            <Link
                                                href={`/interview/${interview.id}`}
                                                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
                                            >
                                                Continue
                                            </Link>
                                        ) : (
                                            <Link
                                                href={`/interviews`}
                                                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 transition-colors"
                                            >
                                                Start
                                            </Link>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </DashboardLayout>
    );
}
