'use client';

import { useEffect, useState, useMemo } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { leaderboardApi, LeaderboardEntry } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

type SortTab = 'last_score' | 'avg_score' | 'most_active';

function getInitials(entry: LeaderboardEntry): string {
    if (entry.first_name) return entry.first_name[0].toUpperCase();
    return entry.username[0].toUpperCase();
}

function getDisplayName(entry: LeaderboardEntry): string {
    if (entry.first_name) {
        return entry.last_name ? `${entry.first_name} ${entry.last_name}` : entry.first_name;
    }
    return entry.username;
}

const AVATAR_COLORS = [
    '#065f46', '#1e40af', '#7c2d12', '#4c1d95',
    '#0c4a6e', '#713f12', '#1f2937', '#134e4a',
];

function avatarColor(userId: number): string {
    return AVATAR_COLORS[userId % AVATAR_COLORS.length];
}

function RankBadge({ rank }: { rank: number }) {
    if (rank === 1) return <span className="text-xl">🥇</span>;
    if (rank === 2) return <span className="text-xl">🥈</span>;
    if (rank === 3) return <span className="text-xl">🥉</span>;
    return (
        <span
            className="inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-semibold"
            style={{ background: 'rgba(255,255,255,0.06)', color: '#9ca3af' }}
        >
            {rank}
        </span>
    );
}

function ScoreBar({ score, max = 100 }: { score: number | null; max?: number }) {
    if (score === null) return <span style={{ color: '#4b5563' }}>—</span>;
    const pct = Math.min(100, (score / max) * 100);
    const color = score >= 75 ? '#10b981' : score >= 50 ? '#f59e0b' : '#ef4444';
    return (
        <div className="flex items-center gap-2">
            <div className="w-16 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
            </div>
            <span className="text-sm font-medium tabular-nums" style={{ color }}>{score.toFixed(1)}</span>
        </div>
    );
}

export default function LeaderboardPage() {
    const { user } = useAuth();
    const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [tab, setTab] = useState<SortTab>('last_score');

    useEffect(() => {
        leaderboardApi.get().then(res => {
            if (res.data) setEntries(res.data);
            else setError(res.error ?? 'Failed to load leaderboard');
            setLoading(false);
        });
    }, []);

    const sorted = useMemo(() => {
        const copy = [...entries];
        if (tab === 'avg_score') {
            copy.sort((a, b) => (b.avg_score ?? -1) - (a.avg_score ?? -1));
        } else if (tab === 'most_active') {
            copy.sort((a, b) => b.total_interviews - a.total_interviews);
        }
        // last_score order comes from server
        return copy;
    }, [entries, tab]);

    const tabs: { key: SortTab; label: string }[] = [
        { key: 'last_score', label: 'Last Score' },
        { key: 'avg_score', label: 'Average Score' },
        { key: 'most_active', label: 'Most Active' },
    ];

    return (
        <DashboardLayout>
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="mb-6">
                    <h1 className="text-2xl font-bold" style={{ color: '#f0fdf4' }}>Leaderboard</h1>
                    <p className="text-sm mt-1" style={{ color: '#6b7280' }}>
                        See how you stack up against other users
                    </p>
                </div>

                {/* Tabs */}
                <div
                    className="flex gap-1 mb-6 p-1 rounded-lg w-fit"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
                >
                    {tabs.map(t => (
                        <button
                            key={t.key}
                            onClick={() => setTab(t.key)}
                            className="px-4 py-1.5 rounded-md text-sm font-medium transition-all duration-150"
                            style={tab === t.key
                                ? { background: '#10b981', color: '#fff' }
                                : { color: '#6b7280' }
                            }
                        >
                            {t.label}
                        </button>
                    ))}
                </div>

                {/* Table */}
                <div
                    className="rounded-xl overflow-hidden"
                    style={{ background: '#0c1510', border: '1px solid rgba(16,185,129,0.12)' }}
                >
                    {loading ? (
                        <div className="flex items-center justify-center py-20">
                            <div className="w-6 h-6 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
                        </div>
                    ) : error ? (
                        <div className="flex items-center justify-center py-20">
                            <p className="text-sm" style={{ color: '#ef4444' }}>{error}</p>
                        </div>
                    ) : sorted.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-2">
                            <p className="text-sm" style={{ color: '#6b7280' }}>No entries yet. Complete an interview to appear here.</p>
                        </div>
                    ) : (
                        <table className="w-full">
                            <thead>
                                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider w-16" style={{ color: '#4b5563' }}>Rank</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: '#4b5563' }}>Player</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: '#4b5563' }}>Last Score</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: '#4b5563' }}>Avg Score</th>
                                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider" style={{ color: '#4b5563' }}>Sessions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sorted.map((entry, idx) => {
                                    const rank = tab === 'last_score' ? entry.rank : idx + 1;
                                    const isCurrentUser = entry.user_id === user?.id;
                                    return (
                                        <tr
                                            key={entry.user_id}
                                            style={{
                                                borderBottom: '1px solid rgba(255,255,255,0.04)',
                                                background: isCurrentUser ? 'rgba(16,185,129,0.08)' : 'transparent',
                                                borderLeft: isCurrentUser ? '3px solid #10b981' : '3px solid transparent',
                                            }}
                                        >
                                            <td className="px-4 py-3">
                                                <RankBadge rank={rank} />
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-3">
                                                    <div
                                                        className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                                                        style={{ background: avatarColor(entry.user_id), color: '#f0fdf4' }}
                                                    >
                                                        {getInitials(entry)}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-medium" style={{ color: isCurrentUser ? '#10b981' : '#f0fdf4' }}>
                                                            {getDisplayName(entry)}
                                                            {isCurrentUser && (
                                                                <span className="ml-2 text-xs font-normal px-1.5 py-0.5 rounded" style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981' }}>
                                                                    You
                                                                </span>
                                                            )}
                                                        </p>
                                                        <p className="text-xs" style={{ color: '#4b5563' }}>@{entry.username}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <ScoreBar score={entry.last_score} />
                                            </td>
                                            <td className="px-4 py-3">
                                                <ScoreBar score={entry.avg_score} />
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <span
                                                    className="inline-flex items-center justify-center min-w-[2rem] px-2 py-0.5 rounded text-xs font-semibold tabular-nums"
                                                    style={{ background: 'rgba(255,255,255,0.06)', color: '#9ca3af' }}
                                                >
                                                    {entry.total_interviews}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>

                {!loading && !error && sorted.length > 0 && (
                    <p className="text-xs mt-3 text-center" style={{ color: '#374151' }}>
                        Showing top {sorted.length} users · Rankings update after each completed interview
                    </p>
                )}
            </div>
        </DashboardLayout>
    );
}
