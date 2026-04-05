'use client';

import { usePathname } from 'next/navigation';
import Navbar from '@/components/Navbar';

// Routes that use the sidebar — Navbar should be hidden on these
const SIDEBAR_ROUTES = ['/dashboard', '/interviews', '/interview', '/ats', '/resumes', '/profile', '/leaderboard', '/admin'];
const AUTH_ROUTES = ['/login', '/signup', '/admin/login'];

export default function ClientLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname() ?? '';
    const isSidebarRoute = SIDEBAR_ROUTES.some(r => pathname === r || pathname.startsWith(r + '/'));
    const isAuthRoute = AUTH_ROUTES.some(r => pathname === r || pathname.startsWith(r + '/'));
    const hideNavbar = isSidebarRoute || isAuthRoute;

    return (
        <>
            {!hideNavbar && <Navbar />}
            <div className={hideNavbar ? 'min-h-screen' : 'pt-16 min-h-screen'}>
                {children}
            </div>
        </>
    );
}
