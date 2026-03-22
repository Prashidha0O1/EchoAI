'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { interviewApi } from '@/lib/api';
import DashboardLayout from '@/components/DashboardLayout';
import {
    Plus,
    Clock,
    CheckCircle2,
    PlayCircle,
    Trash2,
    Video,
    AlertCircle,
    Mic,
    Loader2,
} from 'lucide-react';

interface Interview {
    id: number;
    interview_type: string;
    status: string;
    created_at: string;
    started_at: string | null;
    completed_at: string | null;
    scheduled_at?: string | null;
}

function StatusBadge({ status }: { status: string }) {
    const map: Record<string, { label: string; bg: string; color: string }> = {
        completed: { label: 'Completed', bg: 'rgba(16,185,129,0.1)', color: '#10b981' },
        in_progress: { label: 'In Progress', bg: 'rgba(96,165,250,0.1)', color: '#93c5fd' },
        pending: { label: 'Pending', bg: 'rgba(255,255,255,0.06)', color: '#9ca3af' },
    };
    const s = map[status] ?? { label: status, bg: 'rgba(255,255,255,0.06)', color: '#9ca3af' };
    return (
        <span
            className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium"
            style={{ background: s.bg, color: s.color }}
        >
            {s.label}
        </span>
    );
}

export default function InterviewsPage() {
    const router = useRouter();
    const { user, isLoading: authLoading } = useAuth();
    const [interviews, setInterviews] = useState<Interview[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [startingId, setStartingId] = useState<number | null>(null);

    useEffect(() => {
        if (!authLoading && user) loadInterviews();
    }, [authLoading, user]);

    const loadInterviews = async () => {
        setIsLoading(true);
        const response = await interviewApi.list();
        if (response.data) setInterviews(response.data);
        else setError(response.error || 'Failed to load interviews');
        setIsLoading(false);
    };

    const handleStartInterview = async (id: number) => {
        setStartingId(id);
        const response = await interviewApi.start(id);
        if (response.data) {
            router.push(`/interview/${id}`);
        } else {
            setError(response.error || 'Failed to start interview');
            setStartingId(null);
        }
    };

    const handleDeleteInterview = async (id: number) => {
        if (!window.confirm('Delete this interview? This cannot be undone.')) return;
        const response = await interviewApi.delete(id);
        if (response.error) setError(response.error);
        else setInterviews(prev => prev.filter(i => i.id !== id));
    };

    const formatDate = (d: string) =>
        new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

    return (
        <DashboardLayout>
            <div className="max-w-4xl mx-auto space-y-6">

                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1
                            className="text-xl font-semibold"
                            style={{ color: '#f9fafb', fontFamily: 'var(--font-space-grotesk)' }}
                        >
                            My Interviews
                        </h1>
                        <p className="text-sm mt-0.5" style={{ color: '#6b7280' }}>
                            Start, continue, or review your practice sessions
                        </p>
                    </div>
                    <button
                        onClick={() => router.push('/interviews/create')}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150"
                        style={{ background: '#10b981', color: '#fff' }}
                        onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = '#059669')}
                        onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = '#10b981')}
                    >
                        <Plus className="w-4 h-4" />
                        New Interview
                    </button>
                </div>

                {/* Error */}
                {error && (
                    <div
                        className="flex items-center gap-2.5 rounded-lg p-3 text-sm"
                        style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', color: '#fca5a5' }}
                    >
                        <AlertCircle className="w-4 h-4 shrink-0" style={{ color: '#f87171' }} />
                        {error}
                    </div>
                )}

                {/* Content */}
                {isLoading ? (
                    <div className="flex items-center justify-center py-20 gap-2">
                        <Loader2 className="w-5 h-5 animate-spin" style={{ color: '#6b7280' }} />
                        <p className="text-sm" style={{ color: '#6b7280' }}>Loading…</p>
                    </div>
                ) : interviews.length === 0 ? (
                    <div
                        className="rounded-xl p-14 text-center"
                        style={{ background: '#111', border: '1px dashed rgba(255,255,255,0.08)' }}
                    >
                        <div
                            className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3"
                            style={{ background: '#1a1a1a' }}
                        >
                            <Video className="w-6 h-6" style={{ color: '#4b5563' }} />
                        </div>
                        <p className="text-sm font-medium mb-1" style={{ color: '#e5e7eb' }}>No interviews yet</p>
                        <p className="text-xs mb-5 max-w-xs mx-auto" style={{ color: '#6b7280' }}>
                            Create your first AI-powered mock interview to practice and receive feedback.
                        </p>
                        <button
                            onClick={() => router.push('/interviews/create')}
                            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors"
                            style={{ background: '#10b981', color: '#fff' }}
                            onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = '#059669')}
                            onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = '#10b981')}
                        >
                            <Plus className="w-4 h-4" />
                            Create Interview
                        </button>
                    </div>
                ) : (
                    <div
                        className="rounded-xl overflow-hidden"
                        style={{ border: '1px solid rgba(255,255,255,0.07)' }}
                    >
                        {interviews.map((interview, idx) => (
                            <div
                                key={interview.id}
                                className="flex flex-col sm:flex-row sm:items-center gap-4 px-4 py-3.5"
                                style={{
                                    background: '#111',
                                    borderTop: idx > 0 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                                }}
                            >
                                {/* Icon */}
                                <div
                                    className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                                    style={{ background: '#1a1a1a' }}
                                >
                                    <Mic className="w-4 h-4" style={{ color: '#6b7280' }} />
                                </div>

                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex flex-wrap items-center gap-2 mb-0.5">
                                        <span className="text-sm font-medium capitalize" style={{ color: '#e5e7eb' }}>
                                            {interview.interview_type} Interview
                                        </span>
                                        <span className="text-xs" style={{ color: '#4b5563' }}>#{interview.id}</span>
                                        <StatusBadge status={interview.status} />
                                    </div>
                                    <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs" style={{ color: '#6b7280' }}>
                                        <span className="flex items-center gap-1">
                                            <Clock className="w-3 h-3" />
                                            {formatDate(interview.created_at)}
                                        </span>
                                        {interview.started_at && (
                                            <span className="flex items-center gap-1">
                                                <PlayCircle className="w-3 h-3" />
                                                Started {formatDate(interview.started_at)}
                                            </span>
                                        )}
                                        {interview.completed_at && (
                                            <span className="flex items-center gap-1">
                                                <CheckCircle2 className="w-3 h-3" />
                                                Done {formatDate(interview.completed_at)}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex items-center gap-2 shrink-0">
                                    {interview.status === 'pending' && (
                                        <button
                                            onClick={() => handleStartInterview(interview.id)}
                                            disabled={startingId === interview.id}
                                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors"
                                            style={{ background: '#10b981', color: '#fff' }}
                                            onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = '#059669')}
                                            onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = '#10b981')}
                                        >
                                            {startingId === interview.id ? (
                                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                            ) : (
                                                <PlayCircle className="w-3.5 h-3.5" />
                                            )}
                                            Start
                                        </button>
                                    )}
                                    {interview.status === 'in_progress' && (
                                        <button
                                            onClick={() => router.push(`/interview/${interview.id}`)}
                                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors"
                                            style={{ background: '#10b981', color: '#fff' }}
                                            onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = '#059669')}
                                            onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = '#10b981')}
                                        >
                                            <Mic className="w-3.5 h-3.5" />
                                            Continue
                                        </button>
                                    )}
                                    {interview.status === 'completed' && (
                                        <button
                                            onClick={() => router.push(`/interview/${interview.id}`)}
                                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors"
                                            style={{ background: 'rgba(255,255,255,0.05)', color: '#9ca3af', border: '1px solid rgba(255,255,255,0.08)' }}
                                            onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = '#e5e7eb')}
                                            onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = '#9ca3af')}
                                        >
                                            View
                                        </button>
                                    )}
                                    <button
                                        onClick={() => handleDeleteInterview(interview.id)}
                                        className="p-1.5 rounded-md transition-colors"
                                        style={{ color: '#4b5563' }}
                                        onMouseEnter={e => {
                                            (e.currentTarget as HTMLElement).style.color = '#f87171';
                                            (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.06)';
                                        }}
                                        onMouseLeave={e => {
                                            (e.currentTarget as HTMLElement).style.color = '#4b5563';
                                            (e.currentTarget as HTMLElement).style.background = 'transparent';
                                        }}
                                        title="Delete"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}
