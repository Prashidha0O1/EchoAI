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
  const map: Record<string, { label: string; class: string }> = {
    completed: { label: 'Completed', class: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
    in_progress: { label: 'In Progress', class: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30' },
    pending: { label: 'Pending', class: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
  };
  const s = map[status] ?? { label: status, class: 'bg-zinc-500/15 text-zinc-400 border-zinc-500/30' };
  return <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium border ${s.class}`}>{s.label}</span>;
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

  const typeColors: Record<string, string> = {
    technical: 'from-indigo-500/20 to-blue-500/10 border-indigo-500/30 text-indigo-400',
    behavioral: 'from-purple-500/20 to-violet-500/10 border-purple-500/30 text-purple-400',
    hr: 'from-rose-500/20 to-pink-500/10 border-rose-500/30 text-rose-400',
    mixed: 'from-amber-500/20 to-orange-500/10 border-amber-500/30 text-amber-400',
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">My Interviews</h1>
            <p className="text-zinc-500 text-sm mt-1">Start, continue, or review your practice sessions</p>
          </div>
          <button
            onClick={() => router.push('/interviews/create')}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-sm font-semibold rounded-xl shadow-lg shadow-indigo-500/20 border border-indigo-500/30 transition-all"
          >
            <Plus className="w-4 h-4" />
            New Interview
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        {/* Content */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-10 h-10 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
            <p className="text-zinc-500 text-sm">Loading interviews...</p>
          </div>
        ) : interviews.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-zinc-700 bg-zinc-900/30 p-16 text-center">
            <div className="w-16 h-16 rounded-2xl bg-zinc-800 flex items-center justify-center mx-auto mb-4">
              <Video className="w-8 h-8 text-zinc-600" />
            </div>
            <h3 className="text-lg font-semibold text-zinc-300 mb-2">No interviews yet</h3>
            <p className="text-zinc-500 text-sm max-w-xs mx-auto mb-6">
              Create your first AI-powered mock interview to practice and receive feedback.
            </p>
            <button
              onClick={() => router.push('/interviews/create')}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-xl transition-colors"
            >
              <Plus className="w-4 h-4" />
              Create Interview
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {interviews.map((interview) => {
              const tc = typeColors[interview.interview_type] ?? typeColors.mixed;
              return (
                <div
                  key={interview.id}
                  className="group rounded-2xl bg-zinc-900/60 border border-zinc-800 hover:border-zinc-700 p-5 transition-all"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    {/* Icon */}
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${tc} border flex items-center justify-center shrink-0`}>
                      <Mic className="w-5 h-5" />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="font-semibold text-zinc-100 capitalize">
                          {interview.interview_type} Interview
                        </span>
                        <span className="text-zinc-600 text-xs">#{interview.id}</span>
                        <StatusBadge status={interview.status} />
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-500">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Created {formatDate(interview.created_at)}
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
                            Completed {formatDate(interview.completed_at)}
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
                          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition-colors disabled:opacity-60"
                        >
                          {startingId === interview.id ? (
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <PlayCircle className="w-4 h-4" />
                          )}
                          Start
                        </button>
                      )}
                      {interview.status === 'in_progress' && (
                        <button
                          onClick={() => router.push(`/interview/${interview.id}`)}
                          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition-colors"
                        >
                          <Mic className="w-4 h-4" />
                          Continue
                        </button>
                      )}
                      {interview.status === 'completed' && (
                        <button
                          onClick={() => router.push(`/interview/${interview.id}`)}
                          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 text-sm font-medium transition-colors"
                        >
                          View
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteInterview(interview.id)}
                        className="p-2 rounded-xl text-zinc-600 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
