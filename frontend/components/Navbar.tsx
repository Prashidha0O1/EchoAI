'use client';

import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { usePathname } from 'next/navigation';

export default function Navbar() {
    const { user, logout, isAuthenticated } = useAuth();
    const pathname = usePathname();

    const isAuthPage = pathname?.startsWith('/login') || pathname?.startsWith('/signup');


    return (
        <nav className="fixed top-0 left-0 right-0 z-50 border-b backdrop-blur-md" style={{ borderColor: 'rgba(16,185,129,0.1)', background: 'rgba(6,10,7,0.85)' }}>
            <div className="max-w-6xl mx-auto px-6">
                <div className="flex items-center justify-between h-16">
                    <Link href="/" className="flex items-center gap-2 text-xl font-semibold" style={{ fontFamily: 'var(--font-space-grotesk)', color: '#f0fdf4' }}>
                        <span className="w-2 h-2 rounded-full inline-block" style={{ background: '#10b981' }} />
                        EchoAI
                    </Link>

                    <div className="flex items-center gap-4">
                        {isAuthenticated ? (
                            <>
                                <Link
                                    href="/dashboard"
                                    className={`text-sm font-medium transition-colors ${pathname === '/dashboard' ? 'text-white' : 'text-[#91A3B0] hover:text-white'
                                        }`}
                                >
                                    Dashboard
                                </Link>
                                <div className="h-4 w-px bg-white/10" />
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center border border-white/5">
                                        {user?.profile?.profile_picture ? (
                                            <img src={user.profile.profile_picture} alt="Profile" className="w-full h-full rounded-full object-cover" />
                                        ) : (
                                            <span className="text-xs font-medium text-zinc-400">
                                                {user?.first_name?.[0] || user?.email?.[0]?.toUpperCase()}
                                            </span>
                                        )}
                                    </div>
                                    <button
                                        onClick={logout}
                                        className="text-sm text-red-400 hover:text-red-300 transition-colors"
                                    >
                                        Logout
                                    </button>
                                </div>
                            </>
                        ) : (
                            !isAuthPage && (
                                <div className="flex items-center gap-4">
                                    <Link
                                        href="/login"
                                        className="text-sm font-medium transition-colors"
                                        style={{ color: '#6b7280' }}
                                        onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = '#f0fdf4')}
                                        onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = '#6b7280')}
                                    >
                                        Log in
                                    </Link>
                                    <Link
                                        href="/signup"
                                        className="text-sm font-semibold px-5 py-2 rounded-lg transition-all duration-200"
                                        style={{ background: '#10b981', color: '#022c22' }}
                                        onMouseEnter={e => {
                                            const el = e.currentTarget as HTMLElement;
                                            el.style.background = '#34d399';
                                            el.style.boxShadow = '0 0 20px rgba(16,185,129,0.3)';
                                        }}
                                        onMouseLeave={e => {
                                            const el = e.currentTarget as HTMLElement;
                                            el.style.background = '#10b981';
                                            el.style.boxShadow = 'none';
                                        }}
                                    >
                                        Sign up
                                    </Link>
                                </div>
                            )
                        )}
                    </div>
                </div>
            </div>
        </nav>
    );
}
