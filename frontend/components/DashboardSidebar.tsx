'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import {
    LayoutDashboard,
    FileText,
    Video,
    User,
    LogOut,
    Menu,
    X,
    Mic2,
    Plus,
    ScanSearch,
} from 'lucide-react';

const navItems = [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Resume Builder', href: '/resumes', icon: FileText },
    { label: 'ATS Checker', href: '/ats', icon: ScanSearch },
    { label: 'Interviews', href: '/interviews', icon: Video },
    { label: 'Profile', href: '/profile', icon: User },
];

export default function DashboardSidebar() {
    const pathname = usePathname();
    const { user, logout } = useAuth();
    const [mobileOpen, setMobileOpen] = useState(false);
    const [expanded, setExpanded] = useState(false);

    const isActive = (href: string) =>
        pathname === href || pathname.startsWith(href + '/');

    const initials = (user?.first_name?.[0] || user?.username?.[0] || 'U').toUpperCase();
    const displayName = user?.first_name
        ? `${user.first_name} ${user.last_name || ''}`.trim()
        : user?.username ?? 'User';

    /* ─────────────────────────────────────────
       Shared inner content (used by both mobile
       drawer and desktop hover sidebar)
    ───────────────────────────────────────── */
    const NavContent = ({ showLabels }: { showLabels: boolean }) => (
        <div className="flex flex-col h-full overflow-hidden">
            {/* Logo */}
            <div className={`flex items-center border-b border-white/10 shrink-0 ${showLabels ? 'gap-3 px-5 py-5' : 'justify-center px-0 py-5'}`}>
                <div className="w-9 h-9 shrink-0 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
                    <Mic2 className="w-5 h-5 text-white" />
                </div>
                {showLabels && (
                    <span className="text-xl font-bold bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent tracking-tight whitespace-nowrap">
                        EchoAI
                    </span>
                )}
            </div>

            {/* User Info */}
            <div className={`mx-2 mt-4 rounded-xl bg-white/5 border border-white/10 shrink-0 ${showLabels ? 'px-3 py-3' : 'px-1.5 py-3 flex justify-center'}`}>
                {showLabels ? (
                    <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm shrink-0">
                            {initials}
                        </div>
                        <div className="min-w-0">
                            <p className="text-sm font-semibold text-white truncate leading-tight">{displayName}</p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                                <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${user?.email_verified ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                                <p className="text-xs text-zinc-500 truncate">
                                    {user?.email_verified ? 'Verified' : 'Not verified'}
                                </p>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="relative">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm">
                            {initials}
                        </div>
                        <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-zinc-950 ${user?.email_verified ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                    </div>
                )}
            </div>

            {/* Nav items */}
            <nav className={`flex-1 pt-4 space-y-1 overflow-hidden ${showLabels ? 'px-2' : 'px-2'}`}>
                {navItems.map((item) => {
                    const Icon = item.icon;
                    const active = isActive(item.href);
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => setMobileOpen(false)}
                            title={!showLabels ? item.label : undefined}
                            className={`group flex items-center rounded-xl text-sm font-medium transition-all duration-150
                                ${showLabels ? 'gap-3 px-3 py-2.5' : 'justify-center px-0 py-2.5'}
                                ${active
                                    ? 'bg-gradient-to-r from-indigo-600/80 to-purple-600/60 text-white shadow-md shadow-indigo-500/20 border border-indigo-500/30'
                                    : 'text-zinc-400 hover:text-white hover:bg-white/5'
                                }`}
                        >
                            <Icon className={`w-5 h-5 shrink-0 transition-colors ${active ? 'text-indigo-200' : 'text-zinc-500 group-hover:text-zinc-300'}`} />
                            {showLabels && <span className="flex-1 whitespace-nowrap">{item.label}</span>}
                        </Link>
                    );
                })}
            </nav>

            {/* New Interview CTA */}
            <div className={`px-2 py-2 shrink-0 ${showLabels ? '' : ''}`}>
                <Link
                    href="/interviews/create"
                    onClick={() => setMobileOpen(false)}
                    title={!showLabels ? 'New Interview' : undefined}
                    className={`flex items-center gap-2 w-full py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-sm font-semibold hover:from-indigo-500 hover:to-purple-500 transition-all shadow-lg shadow-indigo-500/25 border border-indigo-500/30
                        ${showLabels ? 'justify-center px-3' : 'justify-center px-0'}`}
                >
                    <Plus className="w-4 h-4 shrink-0" />
                    {showLabels && <span className="whitespace-nowrap">New Interview</span>}
                </Link>
            </div>

            {/* Logout */}
            <div className={`px-2 pb-4 pt-2 border-t border-white/10 shrink-0`}>
                <button
                    onClick={logout}
                    title={!showLabels ? 'Logout' : undefined}
                    className={`flex items-center w-full rounded-xl text-sm font-medium text-zinc-400 hover:text-red-400 hover:bg-red-500/10 transition-all duration-150
                        ${showLabels ? 'gap-3 px-3 py-2.5' : 'justify-center px-0 py-2.5'}`}
                >
                    <LogOut className="w-5 h-5 shrink-0" />
                    {showLabels && <span className="whitespace-nowrap">Logout</span>}
                </button>
            </div>
        </div>
    );

    return (
        <>
            {/* ── Mobile toggle ─────────────────────────────── */}
            <button
                onClick={() => setMobileOpen(true)}
                className="fixed top-4 left-4 z-50 lg:hidden w-10 h-10 bg-zinc-900 border border-zinc-700 rounded-xl flex items-center justify-center text-zinc-400 hover:text-white transition-colors shadow-lg"
            >
                <Menu className="w-5 h-5" />
            </button>

            {/* ── Mobile overlay ────────────────────────────── */}
            {mobileOpen && (
                <div
                    className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
                    onClick={() => setMobileOpen(false)}
                />
            )}

            {/* ── Mobile drawer (full width, with labels) ───── */}
            <aside
                className={`fixed top-0 left-0 z-50 h-full w-64 bg-zinc-950 border-r border-white/10 transform transition-transform duration-300 ease-out lg:hidden
                    ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}
            >
                <button
                    onClick={() => setMobileOpen(false)}
                    className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors z-10"
                >
                    <X className="w-4 h-4" />
                </button>
                <NavContent showLabels={true} />
            </aside>

            {/* ── Desktop sidebar: icon-only, expands on hover ─ */}
            <aside
                onMouseEnter={() => setExpanded(true)}
                onMouseLeave={() => setExpanded(false)}
                className={`hidden lg:flex flex-col fixed top-0 left-0 h-full bg-zinc-950 border-r border-white/10 z-30 transition-all duration-200 ease-out overflow-hidden
                    ${expanded ? 'w-64 shadow-2xl shadow-black/40' : 'w-[60px]'}`}
            >
                <NavContent showLabels={expanded} />
            </aside>
        </>
    );
}
