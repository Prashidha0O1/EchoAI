'use client';

import { useEffect, useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { adminApi, AdminStats, AdminUser, AdminChartPoint } from '@/lib/api';
import {
    LayoutDashboard,
    Users,
    BarChart3,
    LogOut,
    Shield,
    Video,
    CheckCircle2,
    TrendingUp,
    Search,
    ChevronRight,
    Activity,
    UserCheck,
    UserX,
    Award,
    Clock,
    RefreshCw,
} from 'lucide-react';

// SSR-safe recharts
const AreaChart = dynamic(() => import('recharts').then(m => m.AreaChart), { ssr: false });
const Area = dynamic(() => import('recharts').then(m => m.Area), { ssr: false });
const BarChart = dynamic(() => import('recharts').then(m => m.BarChart), { ssr: false });
const Bar = dynamic(() => import('recharts').then(m => m.Bar), { ssr: false });
const XAxis = dynamic(() => import('recharts').then(m => m.XAxis), { ssr: false });
const YAxis = dynamic(() => import('recharts').then(m => m.YAxis), { ssr: false });
const Tooltip = dynamic(() => import('recharts').then(m => m.Tooltip), { ssr: false });
const ResponsiveContainer = dynamic(() => import('recharts').then(m => m.ResponsiveContainer), { ssr: false });
const Cell = dynamic(() => import('recharts').then(m => m.Cell), { ssr: false });

type Section = 'overview' | 'users' | 'analytics';

const CHART_TOOLTIP = {
    contentStyle: { background: '#13131f', border: '1px solid rgba(99,102,241,0.25)', borderRadius: 8, color: '#e2e8f0', fontSize: 12 },
    itemStyle: { color: '#a5b4fc' },
    labelStyle: { color: '#64748b' },
    cursor: { fill: 'rgba(99,102,241,0.06)' },
};

const TYPE_COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#06b6d4', '#f59e0b'];

function getInitials(u: AdminUser) {
    if (u.first_name) return u.first_name[0].toUpperCase();
    return u.username[0].toUpperCase();
}

function getDisplayName(u: AdminUser) {
    if (u.first_name) return `${u.first_name} ${u.last_name ?? ''}`.trim();
    return u.username;
}

// ── Sidebar ─────────────────────────────────────────────────────────────────

function Sidebar({
    section,
    setSection,
    onLogout,
    adminEmail,
}: {
    section: Section;
    setSection: (s: Section) => void;
    onLogout: () => void;
    adminEmail: string;
}) {
    const nav = [
        { key: 'overview' as Section, label: 'Overview', icon: LayoutDashboard },
        { key: 'users' as Section, label: 'User Management', icon: Users },
        { key: 'analytics' as Section, label: 'Analytics', icon: BarChart3 },
    ];
    return (
        <aside
            className="w-56 shrink-0 flex flex-col min-h-screen"
            style={{ background: '#0d0d18', borderRight: '1px solid rgba(99,102,241,0.12)' }}
        >
            {/* Logo */}
            <div className="px-5 py-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <div className="flex items-center gap-2.5 mb-1">
                    <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center"
                        style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}
                    >
                        <Shield className="w-3.5 h-3.5 text-white" />
                    </div>
                    <span className="font-bold text-sm tracking-tight" style={{ color: '#e2e8f0' }}>EchoAI</span>
                </div>
                <span
                    className="text-xs font-semibold px-2 py-0.5 rounded"
                    style={{ background: 'rgba(99,102,241,0.15)', color: '#818cf8' }}
                >
                    Admin Console
                </span>
            </div>

            {/* Nav */}
            <nav className="flex-1 px-3 py-4 space-y-0.5">
                {nav.map(({ key, label, icon: Icon }) => (
                    <button
                        key={key}
                        onClick={() => setSection(key)}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150 text-left"
                        style={section === key
                            ? { background: 'rgba(99,102,241,0.15)', color: '#a5b4fc', fontWeight: 600 }
                            : { color: '#475569' }
                        }
                    >
                        <Icon className="w-4 h-4 shrink-0" />
                        {label}
                        {section === key && <ChevronRight className="w-3 h-3 ml-auto" style={{ color: '#6366f1' }} />}
                    </button>
                ))}
            </nav>

            {/* Footer */}
            <div className="px-3 pb-4 space-y-2" style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '12px' }}>
                <div className="px-3 py-2 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)' }}>
                    <p className="text-xs font-medium truncate" style={{ color: '#94a3b8' }}>{adminEmail}</p>
                    <p className="text-xs mt-0.5" style={{ color: '#6366f1' }}>Administrator</p>
                </div>
                <button
                    onClick={onLogout}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors"
                    style={{ color: '#475569' }}
                    onMouseEnter={e => (e.currentTarget.style.color = '#f87171')}
                    onMouseLeave={e => (e.currentTarget.style.color = '#475569')}
                >
                    <LogOut className="w-4 h-4" />
                    Sign out
                </button>
            </div>
        </aside>
    );
}

// ── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, icon: Icon, color, bg }: {
    label: string; value: string | number; sub?: string;
    icon: React.ElementType; color: string; bg: string;
}) {
    return (
        <div
            className="rounded-xl p-5"
            style={{ background: '#0d0d18', border: '1px solid rgba(255,255,255,0.06)' }}
        >
            <div className="flex items-start justify-between mb-3">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: bg }}>
                    <Icon className="w-4 h-4" style={{ color }} />
                </div>
                <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: bg, color }}>Live</span>
            </div>
            <p className="text-2xl font-bold tabular-nums" style={{ color: '#e2e8f0' }}>{value}</p>
            <p className="text-xs mt-0.5" style={{ color: '#475569' }}>{label}</p>
            {sub && <p className="text-xs mt-1.5 font-medium" style={{ color }}>{sub}</p>}
        </div>
    );
}

// ── Overview Section ─────────────────────────────────────────────────────────

function OverviewSection({ stats, perDay, byType, users }: {
    stats: AdminStats | null;
    perDay: AdminChartPoint[];
    byType: AdminChartPoint[];
    users: AdminUser[];
}) {
    const verifiedCount = users.filter(u => u.email_verified).length;
    const verifiedPct = users.length > 0 ? Math.round((verifiedCount / users.length) * 100) : 0;
    const completionRate = stats && stats.total_interviews > 0
        ? Math.round((stats.total_completed / stats.total_interviews) * 100)
        : 0;

    return (
        <div className="space-y-6">
            {/* Stat grid */}
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
                <StatCard
                    label="Total Users"
                    value={stats?.total_users ?? 0}
                    sub={`${verifiedPct}% verified`}
                    icon={Users}
                    color="#6366f1"
                    bg="rgba(99,102,241,0.12)"
                />
                <StatCard
                    label="Total Interviews"
                    value={stats?.total_interviews ?? 0}
                    sub={`${completionRate}% completion rate`}
                    icon={Video}
                    color="#8b5cf6"
                    bg="rgba(139,92,246,0.12)"
                />
                <StatCard
                    label="Completed Sessions"
                    value={stats?.total_completed ?? 0}
                    icon={CheckCircle2}
                    color="#06b6d4"
                    bg="rgba(6,182,212,0.12)"
                />
                <StatCard
                    label="Platform Avg Score"
                    value={stats?.platform_avg_score != null ? `${stats.platform_avg_score.toFixed(1)}/100` : '—'}
                    icon={TrendingUp}
                    color="#f59e0b"
                    bg="rgba(245,158,11,0.12)"
                />
            </div>

            {/* Charts row */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                {/* Activity area chart — takes 2 cols */}
                <div
                    className="xl:col-span-2 rounded-xl p-5"
                    style={{ background: '#0d0d18', border: '1px solid rgba(255,255,255,0.06)' }}
                >
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h3 className="text-sm font-semibold" style={{ color: '#e2e8f0' }}>Interview Activity</h3>
                            <p className="text-xs mt-0.5" style={{ color: '#475569' }}>Completed sessions over last 7 days</p>
                        </div>
                        <Activity className="w-4 h-4" style={{ color: '#475569' }} />
                    </div>
                    <ResponsiveContainer width="100%" height={180}>
                        <AreaChart data={perDay} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                            <defs>
                                <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <XAxis dataKey="label" tick={{ fill: '#334155', fontSize: 11 }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fill: '#334155', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                            <Tooltip {...CHART_TOOLTIP} />
                            <Area type="monotone" dataKey="count" stroke="#6366f1" strokeWidth={2} fill="url(#areaGrad)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>

                {/* By type bar chart */}
                <div
                    className="rounded-xl p-5"
                    style={{ background: '#0d0d18', border: '1px solid rgba(255,255,255,0.06)' }}
                >
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h3 className="text-sm font-semibold" style={{ color: '#e2e8f0' }}>By Type</h3>
                            <p className="text-xs mt-0.5" style={{ color: '#475569' }}>Interview type breakdown</p>
                        </div>
                    </div>
                    <ResponsiveContainer width="100%" height={180}>
                        <BarChart data={byType} margin={{ top: 4, right: 0, left: -20, bottom: 0 }}>
                            <XAxis dataKey="label" tick={{ fill: '#334155', fontSize: 10 }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fill: '#334155', fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
                            <Tooltip {...CHART_TOOLTIP} />
                            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                                {byType.map((_, i) => (
                                    <Cell key={i} fill={TYPE_COLORS[i % TYPE_COLORS.length]} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Top 5 most active users */}
            <div
                className="rounded-xl overflow-hidden"
                style={{ background: '#0d0d18', border: '1px solid rgba(255,255,255,0.06)' }}
            >
                <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <h3 className="text-sm font-semibold" style={{ color: '#e2e8f0' }}>Top Practicing Users</h3>
                    <Award className="w-4 h-4" style={{ color: '#f59e0b' }} />
                </div>
                <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
                    {users.slice(0, 5).map((u, i) => (
                        <div key={u.id} className="flex items-center gap-4 px-5 py-3">
                            <span className="text-xs font-bold w-4 text-center tabular-nums" style={{ color: i < 3 ? '#f59e0b' : '#334155' }}>
                                {i + 1}
                            </span>
                            <div
                                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                                style={{ background: `${TYPE_COLORS[i % TYPE_COLORS.length]}25`, color: TYPE_COLORS[i % TYPE_COLORS.length] }}
                            >
                                {getInitials(u)}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate" style={{ color: '#cbd5e1' }}>{getDisplayName(u)}</p>
                                <p className="text-xs truncate" style={{ color: '#334155' }}>{u.email}</p>
                            </div>
                            <div className="text-right shrink-0">
                                <p className="text-sm font-bold tabular-nums" style={{ color: '#6366f1' }}>{u.interview_count}</p>
                                <p className="text-xs" style={{ color: '#334155' }}>sessions</p>
                            </div>
                            <div className="text-right shrink-0 w-14">
                                <p className="text-sm font-semibold tabular-nums" style={{ color: '#e2e8f0' }}>
                                    {u.avg_score != null ? u.avg_score.toFixed(1) : '—'}
                                </p>
                                <p className="text-xs" style={{ color: '#334155' }}>avg</p>
                            </div>
                        </div>
                    ))}
                    {users.length === 0 && (
                        <p className="px-5 py-8 text-center text-sm" style={{ color: '#334155' }}>No data yet</p>
                    )}
                </div>
            </div>
        </div>
    );
}

// ── User Management Section ──────────────────────────────────────────────────

function UsersSection({ users }: { users: AdminUser[] }) {
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState<'all' | 'verified' | 'unverified'>('all');

    const filtered = useMemo(() => {
        const q = search.toLowerCase();
        return users.filter(u => {
            const matchSearch = !q || u.email.toLowerCase().includes(q) ||
                u.username.toLowerCase().includes(q) ||
                (u.first_name ?? '').toLowerCase().includes(q);
            const matchFilter =
                filter === 'all' ? true :
                filter === 'verified' ? u.email_verified :
                !u.email_verified;
            return matchSearch && matchFilter;
        });
    }, [users, search, filter]);

    return (
        <div className="space-y-4">
            {/* Toolbar */}
            <div className="flex items-center gap-3">
                <div
                    className="flex items-center gap-2 flex-1 max-w-xs px-3 py-2 rounded-lg"
                    style={{ background: '#13131f', border: '1px solid rgba(255,255,255,0.08)' }}
                >
                    <Search className="w-3.5 h-3.5 shrink-0" style={{ color: '#475569' }} />
                    <input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Search users…"
                        className="bg-transparent text-sm outline-none flex-1"
                        style={{ color: '#e2e8f0' }}
                    />
                </div>
                <div className="flex gap-1 p-1 rounded-lg" style={{ background: '#13131f', border: '1px solid rgba(255,255,255,0.06)' }}>
                    {(['all', 'verified', 'unverified'] as const).map(f => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className="px-3 py-1 rounded text-xs font-medium capitalize transition-all"
                            style={filter === f
                                ? { background: 'rgba(99,102,241,0.2)', color: '#a5b4fc' }
                                : { color: '#475569' }
                            }
                        >
                            {f}
                        </button>
                    ))}
                </div>
                <span className="text-xs ml-auto" style={{ color: '#334155' }}>
                    {filtered.length} of {users.length} users
                </span>
            </div>

            {/* Table */}
            <div
                className="rounded-xl overflow-hidden"
                style={{ background: '#0d0d18', border: '1px solid rgba(255,255,255,0.06)' }}
            >
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: '#0a0a15' }}>
                                {['User', 'Email', 'Joined', 'Sessions', 'Avg Score', 'Last Score', 'Status'].map(h => (
                                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider whitespace-nowrap" style={{ color: '#334155' }}>
                                        {h}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map(u => (
                                <tr key={u.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}
                                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(99,102,241,0.04)')}
                                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                                >
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-2.5">
                                            <div
                                                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                                                style={{ background: 'rgba(99,102,241,0.15)', color: '#818cf8' }}
                                            >
                                                {getInitials(u)}
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium whitespace-nowrap" style={{ color: '#cbd5e1' }}>
                                                    {getDisplayName(u)}
                                                    {u.is_admin && (
                                                        <span className="ml-1.5 text-xs px-1.5 py-0.5 rounded font-medium" style={{ background: 'rgba(139,92,246,0.15)', color: '#a78bfa' }}>
                                                            Admin
                                                        </span>
                                                    )}
                                                </p>
                                                <p className="text-xs" style={{ color: '#334155' }}>@{u.username}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-sm" style={{ color: '#475569' }}>{u.email}</td>
                                    <td className="px-4 py-3 text-sm whitespace-nowrap" style={{ color: '#475569' }}>
                                        {new Date(u.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })}
                                    </td>
                                    <td className="px-4 py-3 text-sm font-semibold tabular-nums text-center" style={{ color: '#6366f1' }}>
                                        {u.interview_count}
                                    </td>
                                    <td className="px-4 py-3 text-sm tabular-nums text-center" style={{ color: '#e2e8f0' }}>
                                        {u.avg_score != null ? u.avg_score.toFixed(1) : '—'}
                                    </td>
                                    <td className="px-4 py-3 text-sm tabular-nums text-center" style={{ color: '#e2e8f0' }}>
                                        {u.last_score != null ? u.last_score.toFixed(1) : '—'}
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-1.5">
                                            {u.email_verified
                                                ? <><UserCheck className="w-3 h-3" style={{ color: '#4ade80' }} /><span className="text-xs font-medium" style={{ color: '#4ade80' }}>Verified</span></>
                                                : <><UserX className="w-3 h-3" style={{ color: '#f97316' }} /><span className="text-xs font-medium" style={{ color: '#f97316' }}>Pending</span></>
                                            }
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {filtered.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="px-4 py-12 text-center text-sm" style={{ color: '#334155' }}>
                                        {search ? 'No users match your search' : 'No users yet'}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

// ── Analytics Section ────────────────────────────────────────────────────────

function AnalyticsSection({ users, stats, byType }: {
    users: AdminUser[];
    stats: AdminStats | null;
    byType: AdminChartPoint[];
}) {
    const scoreDistribution = useMemo(() => {
        const buckets = [
            { label: '0–20', min: 0, max: 20, count: 0 },
            { label: '21–40', min: 21, max: 40, count: 0 },
            { label: '41–60', min: 41, max: 60, count: 0 },
            { label: '61–80', min: 61, max: 80, count: 0 },
            { label: '81–100', min: 81, max: 100, count: 0 },
        ];
        users.forEach(u => {
            if (u.avg_score != null) {
                const b = buckets.find(b => u.avg_score! >= b.min && u.avg_score! <= b.max);
                if (b) b.count++;
            }
        });
        return buckets;
    }, [users]);

    const verifiedCount = users.filter(u => u.email_verified).length;
    const withInterviews = users.filter(u => u.interview_count > 0).length;
    const completionRate = stats && stats.total_interviews > 0
        ? ((stats.total_completed / stats.total_interviews) * 100).toFixed(1)
        : '0';

    const metricCards = [
        { label: 'Email Verified', value: verifiedCount, total: users.length, color: '#4ade80', icon: UserCheck },
        { label: 'Active Users', value: withInterviews, total: users.length, color: '#6366f1', icon: Activity },
        { label: 'Completion Rate', value: `${completionRate}%`, total: null, color: '#f59e0b', icon: CheckCircle2 },
        { label: 'Avg Score', value: stats?.platform_avg_score != null ? stats.platform_avg_score.toFixed(1) : '—', total: null, color: '#8b5cf6', icon: TrendingUp },
    ];

    return (
        <div className="space-y-6">
            {/* KPI cards */}
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
                {metricCards.map(({ label, value, total, color, icon: Icon }) => (
                    <div
                        key={label}
                        className="rounded-xl p-4"
                        style={{ background: '#0d0d18', border: '1px solid rgba(255,255,255,0.06)' }}
                    >
                        <div className="flex items-center justify-between mb-3">
                            <p className="text-xs font-medium" style={{ color: '#475569' }}>{label}</p>
                            <Icon className="w-3.5 h-3.5" style={{ color }} />
                        </div>
                        <p className="text-xl font-bold tabular-nums" style={{ color: '#e2e8f0' }}>{value}</p>
                        {total !== null && (
                            <>
                                <div className="mt-2 h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                                    <div
                                        className="h-full rounded-full transition-all"
                                        style={{ width: `${total > 0 ? ((value as number) / total) * 100 : 0}%`, background: color }}
                                    />
                                </div>
                                <p className="text-xs mt-1" style={{ color: '#334155' }}>
                                    of {total} total
                                </p>
                            </>
                        )}
                    </div>
                ))}
            </div>

            {/* Two charts side by side */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                {/* Score distribution */}
                <div
                    className="rounded-xl p-5"
                    style={{ background: '#0d0d18', border: '1px solid rgba(255,255,255,0.06)' }}
                >
                    <h3 className="text-sm font-semibold mb-1" style={{ color: '#e2e8f0' }}>Score Distribution</h3>
                    <p className="text-xs mb-4" style={{ color: '#475569' }}>Users grouped by average score</p>
                    <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={scoreDistribution} margin={{ top: 4, right: 0, left: -20, bottom: 0 }}>
                            <XAxis dataKey="label" tick={{ fill: '#334155', fontSize: 11 }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fill: '#334155', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                            <Tooltip {...CHART_TOOLTIP} />
                            <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Interview type breakdown */}
                <div
                    className="rounded-xl p-5"
                    style={{ background: '#0d0d18', border: '1px solid rgba(255,255,255,0.06)' }}
                >
                    <h3 className="text-sm font-semibold mb-1" style={{ color: '#e2e8f0' }}>Interview Types</h3>
                    <p className="text-xs mb-4" style={{ color: '#475569' }}>All-time breakdown by interview type</p>
                    <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={byType} layout="vertical" margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                            <XAxis type="number" tick={{ fill: '#334155', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                            <YAxis type="category" dataKey="label" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} width={70} />
                            <Tooltip {...CHART_TOOLTIP} />
                            <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                                {byType.map((_, i) => <Cell key={i} fill={TYPE_COLORS[i % TYPE_COLORS.length]} />)}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Recent signups */}
            <div
                className="rounded-xl overflow-hidden"
                style={{ background: '#0d0d18', border: '1px solid rgba(255,255,255,0.06)' }}
            >
                <div className="px-5 py-3.5 flex items-center gap-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <Clock className="w-3.5 h-3.5" style={{ color: '#475569' }} />
                    <h3 className="text-sm font-semibold" style={{ color: '#e2e8f0' }}>Recent Registrations</h3>
                </div>
                <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
                    {[...users]
                        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                        .slice(0, 8)
                        .map(u => (
                            <div key={u.id} className="flex items-center gap-4 px-5 py-3">
                                <div
                                    className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                                    style={{ background: 'rgba(99,102,241,0.12)', color: '#818cf8' }}
                                >
                                    {getInitials(u)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate" style={{ color: '#cbd5e1' }}>{getDisplayName(u)}</p>
                                    <p className="text-xs truncate" style={{ color: '#334155' }}>{u.email}</p>
                                </div>
                                <p className="text-xs shrink-0" style={{ color: '#475569' }}>
                                    {new Date(u.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                </p>
                                <span
                                    className="text-xs px-2 py-0.5 rounded-full font-medium shrink-0"
                                    style={u.email_verified
                                        ? { background: 'rgba(74,222,128,0.1)', color: '#4ade80' }
                                        : { background: 'rgba(249,115,22,0.1)', color: '#f97316' }
                                    }
                                >
                                    {u.email_verified ? 'Verified' : 'Pending'}
                                </span>
                            </div>
                        ))}
                    {users.length === 0 && (
                        <p className="px-5 py-8 text-center text-sm" style={{ color: '#334155' }}>No users yet</p>
                    )}
                </div>
            </div>
        </div>
    );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function AdminPage() {
    const router = useRouter();
    const { user, isLoading, logout } = useAuth();

    const [section, setSection] = useState<Section>('overview');
    const [stats, setStats] = useState<AdminStats | null>(null);
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [perDay, setPerDay] = useState<AdminChartPoint[]>([]);
    const [byType, setByType] = useState<AdminChartPoint[]>([]);
    const [dataLoading, setDataLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!isLoading) {
            if (!user) { router.push('/login'); return; }
            if (!user.is_admin) { router.push('/dashboard'); return; }
        }
    }, [user, isLoading, router]);

    const loadData = (showSpinner = false) => {
        if (!user?.is_admin) return;
        if (showSpinner) setRefreshing(true);
        Promise.all([
            adminApi.getStats(),
            adminApi.getUsers(),
            adminApi.getInterviewsPerDay(),
            adminApi.getInterviewsByType(),
        ]).then(([s, u, pd, bt]) => {
            if (s.data) setStats(s.data);
            if (u.data) setUsers(u.data);
            if (pd.data) setPerDay(pd.data);
            if (bt.data) setByType(bt.data);
            if (s.error) setError('Some data failed to load.');
            setDataLoading(false);
            setRefreshing(false);
        });
    };

    useEffect(() => { loadData(); }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

    if (isLoading || (!user?.is_admin && !isLoading)) {
        return (
            <div className="min-h-screen flex items-center justify-center" style={{ background: '#080811' }}>
                <div className="w-6 h-6 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
            </div>
        );
    }

    const SECTION_TITLE: Record<Section, string> = {
        overview: 'Overview',
        users: 'User Management',
        analytics: 'Analytics',
    };

    return (
        <div className="min-h-screen flex" style={{ background: '#080811', color: '#e2e8f0' }}>
            <Sidebar
                section={section}
                setSection={setSection}
                onLogout={logout}
                adminEmail={user?.email ?? ''}
            />

            {/* Main content */}
            <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
                {/* Top bar */}
                <header
                    className="flex items-center justify-between px-6 py-3.5 shrink-0"
                    style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: '#0a0a15' }}
                >
                    <div>
                        <div className="flex items-center gap-2 text-xs" style={{ color: '#334155' }}>
                            <span>Admin</span>
                            <ChevronRight className="w-3 h-3" />
                            <span style={{ color: '#a5b4fc' }}>{SECTION_TITLE[section]}</span>
                        </div>
                        <h1 className="text-base font-semibold mt-0.5" style={{ color: '#e2e8f0' }}>
                            {SECTION_TITLE[section]}
                        </h1>
                    </div>
                    <div className="flex items-center gap-3">
                        {error && <span className="text-xs px-2.5 py-1 rounded-lg" style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171' }}>{error}</span>}
                        <button
                            onClick={() => loadData(true)}
                            disabled={refreshing}
                            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-colors"
                            style={{ background: 'rgba(99,102,241,0.1)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.2)' }}
                        >
                            <RefreshCw className={`w-3 h-3 ${refreshing ? 'animate-spin' : ''}`} />
                            Refresh
                        </button>
                        <div
                            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs"
                            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', color: '#475569' }}
                        >
                            <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#4ade80' }} />
                            Live
                        </div>
                    </div>
                </header>

                {/* Body */}
                <main className="flex-1 p-6 overflow-y-auto">
                    {dataLoading ? (
                        <div className="flex flex-col items-center justify-center py-32 gap-3">
                            <div className="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
                            <p className="text-sm" style={{ color: '#334155' }}>Loading analytics…</p>
                        </div>
                    ) : (
                        <>
                            {section === 'overview' && (
                                <OverviewSection stats={stats} perDay={perDay} byType={byType} users={users} />
                            )}
                            {section === 'users' && (
                                <UsersSection users={users} />
                            )}
                            {section === 'analytics' && (
                                <AnalyticsSection users={users} stats={stats} byType={byType} />
                            )}
                        </>
                    )}
                </main>
            </div>
        </div>
    );
}
