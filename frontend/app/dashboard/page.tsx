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
    FileText,
} from 'lucide-react';

function StatusBadge({ status }: { status: string }) {
    const map: Record<string, { label: string; bg: string; color: string }> = {
        completed: { label: 'Completed', bg: 'rgba(16,185,129,0.1)', color: '#10b981' },
        in_progress: { label: 'In Progress', bg: 'rgba(59,130,246,0.1)', color: '#60a5fa' },
        pending: { label: 'Pending', bg: 'rgba(255,255,255,0.06)', color: '#9ca3af' },
    };
    const s = map[status] ?? { label: status, bg: 'rgba(255,255,255,0.06)', color: '#9ca3af' };
    return (
        <span
            className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium capitalize"
            style={{ background: s.bg, color: s.color }}
        >
            {s.label}
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

    const stats = [
        { label: 'Total Sessions', value: interviews.length, icon: Video },
        { label: 'Completed', value: completed, icon: CheckCircle2 },
        { label: 'In Progress', value: inProgress, icon: Clock },
        { label: 'Avg Score', value: '—', icon: TrendingUp },
    ];

    return (
        <DashboardLayout>
            <div className="max-w-5xl mx-auto space-y-8">

                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <p className="text-sm" style={{ color: '#6b7280' }}>{greeting()}</p>
                        <h1
                            className="text-2xl font-semibold mt-0.5"
                            style={{ color: '#f9fafb', fontFamily: 'var(--font-space-grotesk)' }}
                        >
                            {user?.first_name || user?.username}
                        </h1>
                    </div>
                    <Link
                        href="/interviews/create"
                        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors w-fit"
                        style={{ background: '#10b981', color: '#fff' }}
                        onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = '#059669')}
                        onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = '#10b981')}
                    >
                        <Plus className="w-4 h-4" />
                        New Interview
                    </Link>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    {stats.map((stat) => (
                        <div
                            key={stat.label}
                            className="rounded-xl p-4"
                            style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)' }}
                        >
                            <stat.icon className="w-4 h-4 mb-3" style={{ color: '#6b7280' }} />
                            <div className="text-2xl font-semibold" style={{ color: '#f9fafb' }}>{stat.value}</div>
                            <div className="text-xs mt-0.5" style={{ color: '#6b7280' }}>{stat.label}</div>
                        </div>
                    ))}
                </div>

                {/* Quick Actions */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Link
                        href="/interviews/create"
                        className="group flex items-center gap-4 p-4 rounded-xl transition-all duration-150"
                        style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)' }}
                        onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.12)'}
                        onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.07)'}
                    >
                        <div
                            className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                            style={{ background: '#1a1a1a' }}
                        >
                            <Sparkles className="w-5 h-5" style={{ color: '#9ca3af' }} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium" style={{ color: '#e5e7eb' }}>Start New Interview</p>
                            <p className="text-xs mt-0.5" style={{ color: '#6b7280' }}>Practice with AI-powered questions</p>
                        </div>
                        <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" style={{ color: '#6b7280' }} />
                    </Link>

                    <Link
                        href="/resumes"
                        className="group flex items-center gap-4 p-4 rounded-xl transition-all duration-150"
                        style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)' }}
                        onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.12)'}
                        onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.07)'}
                    >
                        <div
                            className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                            style={{ background: '#1a1a1a' }}
                        >
                            <FileText className="w-5 h-5" style={{ color: '#9ca3af' }} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium" style={{ color: '#e5e7eb' }}>Build Your Resume</p>
                            <p className="text-xs mt-0.5" style={{ color: '#6b7280' }}>Create and export professional resumes</p>
                        </div>
                        <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" style={{ color: '#6b7280' }} />
                    </Link>
                </div>

                {/* Recent Sessions */}
                <div>
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="text-sm font-medium" style={{ color: '#9ca3af' }}>Recent Sessions</h2>
                        {interviews.length > 0 && (
                            <Link
                                href="/interviews"
                                className="text-xs flex items-center gap-1 transition-colors"
                                style={{ color: '#6b7280' }}
                                onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = '#d1d5db')}
                                onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = '#6b7280')}
                            >
                                View all <ArrowRight className="w-3 h-3" />
                            </Link>
                        )}
                    </div>

                    {loading ? (
                        <div className="flex items-center justify-center py-16">
                            <div className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'rgba(255,255,255,0.15)', borderTopColor: '#10b981' }} />
                        </div>
                    ) : interviews.length === 0 ? (
                        <div
                            className="rounded-xl p-10 text-center"
                            style={{ background: '#111', border: '1px dashed rgba(255,255,255,0.08)' }}
                        >
                            <div
                                className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3"
                                style={{ background: '#1a1a1a' }}
                            >
                                <Video className="w-6 h-6" style={{ color: '#4b5563' }} />
                            </div>
                            <p className="text-sm font-medium mb-1" style={{ color: '#e5e7eb' }}>No sessions yet</p>
                            <p className="text-xs mb-5" style={{ color: '#6b7280' }}>
                                Start your first AI interview to begin practicing.
                            </p>
                            <Link
                                href="/interviews/create"
                                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors"
                                style={{ background: '#10b981', color: '#fff' }}
                                onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = '#059669')}
                                onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = '#10b981')}
                            >
                                <Plus className="w-4 h-4" />
                                Create Interview
                            </Link>
                        </div>
                    ) : (
                        <div
                            className="rounded-xl overflow-hidden"
                            style={{ border: '1px solid rgba(255,255,255,0.07)' }}
                        >
                            {interviews.slice(0, 5).map((interview, idx) => (
                                <div
                                    key={interview.id}
                                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-4 py-3"
                                    style={{
                                        background: '#111',
                                        borderTop: idx > 0 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                                    }}
                                >
                                    <div className="flex items-center gap-3">
                                        <div
                                            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                                            style={{ background: '#1a1a1a' }}
                                        >
                                            <Video className="w-4 h-4" style={{ color: '#6b7280' }} />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <p className="text-sm font-medium capitalize" style={{ color: '#e5e7eb' }}>{interview.interview_type} Interview</p>
                                                <StatusBadge status={interview.status} />
                                            </div>
                                            <p className="text-xs mt-0.5" style={{ color: '#6b7280' }}>
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
                                                className="inline-flex items-center px-3 py-1.5 rounded-md text-xs font-medium transition-colors"
                                                style={{ background: 'rgba(255,255,255,0.05)', color: '#9ca3af', border: '1px solid rgba(255,255,255,0.08)' }}
                                                onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = '#e5e7eb')}
                                                onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = '#9ca3af')}
                                            >
                                                View Report
                                            </Link>
                                        ) : interview.status === 'in_progress' ? (
                                            <Link
                                                href={`/interview/${interview.id}`}
                                                className="inline-flex items-center px-3 py-1.5 rounded-md text-xs font-medium transition-colors"
                                                style={{ background: '#10b981', color: '#fff' }}
                                                onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = '#059669')}
                                                onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = '#10b981')}
                                            >
                                                Continue
                                            </Link>
                                        ) : (
                                            <Link
                                                href="/interviews"
                                                className="inline-flex items-center px-3 py-1.5 rounded-md text-xs font-medium transition-colors"
                                                style={{ background: 'rgba(255,255,255,0.05)', color: '#9ca3af', border: '1px solid rgba(255,255,255,0.08)' }}
                                                onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = '#e5e7eb')}
                                                onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = '#9ca3af')}
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
