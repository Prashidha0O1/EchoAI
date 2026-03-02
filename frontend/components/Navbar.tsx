'use client';

import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { usePathname } from 'next/navigation';

export default function Navbar() {
    const { user, logout, isAuthenticated } = useAuth();
    const pathname = usePathname();

    const isAuthPage = pathname?.startsWith('/login') || pathname?.startsWith('/signup');


    return (
        <nav className="fixed top-0 left-0 right-0 z-50 border-b border-[#27272a] bg-[#0a0a0a]/80 backdrop-blur-md">
            <div className="max-w-6xl mx-auto px-6">
                <div className="flex items-center justify-between h-16">
                    <Link href="/" className="text-xl font-semibold text-white" style={{ fontFamily: 'var(--font-heading)' }}>
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
                                        className="text-sm font-medium text-[#91A3B0] hover:text-white transition-colors"
                                    >
                                        Log In
                                    </Link>
                                    <Link
                                        href="/signup"
                                        className="text-sm font-medium bg-white text-black px-5 py-2 rounded-lg hover:bg-white/90 transition-colors"
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
