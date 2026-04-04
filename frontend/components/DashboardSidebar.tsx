'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Image from 'next/image';
import {
    LayoutDashboard,
    FileText,
    Video,
    User,
    LogOut,
    Menu,
    X,
    Plus,
    ScanSearch,
    Trophy,
} from 'lucide-react';

const navItems = [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Resume Builder', href: '/resumes', icon: FileText },
    { label: 'ATS Checker', href: '/ats', icon: ScanSearch },
    { label: 'Interviews', href: '/interviews', icon: Video },
    { label: 'Leaderboard', href: '/leaderboard', icon: Trophy },
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

    const NavContent = ({ showLabels }: { showLabels: boolean }) => (
        <div className="flex flex-col h-full overflow-hidden">
            {/* Logo */}
            <div
                className={`flex items-center shrink-0 ${showLabels ? 'px-4 py-4' : 'justify-center px-0 py-4'}`}
                style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
            >
                {showLabels ? (
                    <Image
                        src="/EchoAI Logo.png"
                        alt="EchoAI"
                        width={110}
                        height={36}
                        className="object-contain"
                        priority
                    />
                ) : (
                    <Image
                        src="/echoai small.png"
                        alt="EchoAI"
                        width={36}
                        height={36}
                        className="object-contain"
                        priority
                    />
                )}
            </div>

            {/* User Info */}
            <div className={`mx-2 mt-4 shrink-0 ${showLabels ? 'px-3 py-3' : 'px-1.5 py-3 flex justify-center'}`}>
                {showLabels ? (
                    <div className="flex items-center gap-2.5">
                        <div
                            className="w-8 h-8 rounded-full flex items-center justify-center font-semibold text-xs shrink-0"
                            style={{ background: '#1f2937', color: '#9ca3af', border: '1px solid rgba(255,255,255,0.08)' }}
                        >
                            {initials}
                        </div>
                        <div className="min-w-0">
                            <p className="text-sm font-medium truncate leading-tight" style={{ color: '#e5e7eb' }}>{displayName}</p>
                            <p className="text-xs truncate" style={{ color: '#6b7280' }}>
                                {user?.email_verified ? 'Verified' : 'Unverified'}
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="relative">
                        <div
                            className="w-8 h-8 rounded-full flex items-center justify-center font-semibold text-xs"
                            style={{ background: '#1f2937', color: '#9ca3af', border: '1px solid rgba(255,255,255,0.08)' }}
                        >
                            {initials}
                        </div>
                        <div
                            className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full ${user?.email_verified ? 'bg-emerald-500' : 'bg-amber-500'}`}
                            style={{ border: '2px solid #0d0d0d' }}
                        />
                    </div>
                )}
            </div>

            {/* Nav */}
            <nav className="flex-1 pt-3 space-y-0.5 overflow-hidden px-2">
                {navItems.map((item) => {
                    const Icon = item.icon;
                    const active = isActive(item.href);
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => setMobileOpen(false)}
                            title={!showLabels ? item.label : undefined}
                            className={`flex items-center rounded-lg text-sm font-medium transition-all duration-150
                                ${showLabels ? 'gap-3 px-3 py-2' : 'justify-center px-0 py-2'}`}
                            style={active
                                ? { background: 'rgba(255,255,255,0.07)', color: '#f9fafb' }
                                : { color: '#6b7280' }
                            }
                            onMouseEnter={e => {
                                if (!active) {
                                    (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)';
                                    (e.currentTarget as HTMLElement).style.color = '#d1d5db';
                                }
                            }}
                            onMouseLeave={e => {
                                if (!active) {
                                    (e.currentTarget as HTMLElement).style.background = 'transparent';
                                    (e.currentTarget as HTMLElement).style.color = '#6b7280';
                                }
                            }}
                        >
                            <Icon className="w-4 h-4 shrink-0" />
                            {showLabels && <span className="flex-1 whitespace-nowrap">{item.label}</span>}
                            {active && showLabels && (
                                <div className="w-1 h-1 rounded-full shrink-0" style={{ background: '#10b981' }} />
                            )}
                        </Link>
                    );
                })}
            </nav>

            {/* New Interview CTA */}
            <div className="px-2 py-2 shrink-0">
                <Link
                    href="/interviews/create"
                    onClick={() => setMobileOpen(false)}
                    title={!showLabels ? 'New Interview' : undefined}
                    className={`flex items-center gap-2 w-full py-2 rounded-lg text-sm font-medium transition-all duration-150
                        ${showLabels ? 'justify-start px-3' : 'justify-center px-0'}`}
                    style={{ background: '#10b981', color: '#fff' }}
                    onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = '#059669')}
                    onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = '#10b981')}
                >
                    <Plus className="w-4 h-4 shrink-0" />
                    {showLabels && <span className="whitespace-nowrap">New Interview</span>}
                </Link>
            </div>

            {/* Logout */}
            <div className="px-2 pb-4 pt-1 shrink-0" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <button
                    onClick={logout}
                    title={!showLabels ? 'Logout' : undefined}
                    className={`flex items-center w-full rounded-lg text-sm font-medium transition-all duration-150
                        ${showLabels ? 'gap-3 px-3 py-2' : 'justify-center px-0 py-2'}`}
                    style={{ color: '#6b7280' }}
                    onMouseEnter={e => {
                        (e.currentTarget as HTMLElement).style.color = '#f87171';
                        (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.06)';
                    }}
                    onMouseLeave={e => {
                        (e.currentTarget as HTMLElement).style.color = '#6b7280';
                        (e.currentTarget as HTMLElement).style.background = 'transparent';
                    }}
                >
                    <LogOut className="w-4 h-4 shrink-0" />
                    {showLabels && <span className="whitespace-nowrap">Logout</span>}
                </button>
            </div>
        </div>
    );

    return (
        <>
            {/* Mobile toggle */}
            <button
                onClick={() => setMobileOpen(true)}
                className="fixed top-4 left-4 z-50 lg:hidden w-9 h-9 rounded-lg flex items-center justify-center transition-colors"
                style={{ background: '#111', border: '1px solid rgba(255,255,255,0.08)', color: '#9ca3af' }}
            >
                <Menu className="w-4 h-4" />
            </button>

            {/* Mobile overlay */}
            {mobileOpen && (
                <div
                    className="fixed inset-0 z-40 backdrop-blur-sm lg:hidden"
                    style={{ background: 'rgba(0,0,0,0.5)' }}
                    onClick={() => setMobileOpen(false)}
                />
            )}

            {/* Mobile drawer */}
            <aside
                className={`fixed top-0 left-0 z-50 h-full w-60 transform transition-transform duration-300 ease-out lg:hidden
                    ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}
                style={{ background: '#0d0d0d', borderRight: '1px solid rgba(255,255,255,0.06)' }}
            >
                <button
                    onClick={() => setMobileOpen(false)}
                    className="absolute top-4 right-4 w-7 h-7 flex items-center justify-center rounded-md transition-colors z-10"
                    style={{ color: '#6b7280' }}
                    onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = '#f9fafb')}
                    onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = '#6b7280')}
                >
                    <X className="w-4 h-4" />
                </button>
                <NavContent showLabels={true} />
            </aside>

            {/* Desktop sidebar */}
            <aside
                onMouseEnter={() => setExpanded(true)}
                onMouseLeave={() => setExpanded(false)}
                className={`hidden lg:flex flex-col fixed top-0 left-0 h-full z-30 transition-all duration-200 ease-out overflow-hidden
                    ${expanded ? 'w-56' : 'w-[52px]'}`}
                style={{
                    background: '#0d0d0d',
                    borderRight: '1px solid rgba(255,255,255,0.06)',
                }}
            >
                <NavContent showLabels={expanded} />
            </aside>
        </>
    );
}
