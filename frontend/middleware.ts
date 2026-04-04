import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PROTECTED_ROUTES = [
    '/dashboard',
    '/interviews',
    '/interview',
    '/ats',
    '/resumes',
    '/profile',
    '/leaderboard',
];

const ADMIN_ROUTES = ['/admin'];

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    const token = request.cookies.get('echo_auth_token')?.value;
    const isAdmin = request.cookies.get('echo_is_admin')?.value === '1';

    const isProtected = PROTECTED_ROUTES.some(
        (r) => pathname === r || pathname.startsWith(r + '/')
    );
    const isAdminRoute = ADMIN_ROUTES.some(
        (r) => pathname === r || pathname.startsWith(r + '/')
    );

    // Redirect unauthenticated users to login
    if ((isProtected || isAdminRoute) && !token) {
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('from', pathname);
        return NextResponse.redirect(loginUrl);
    }

    // Redirect non-admin users away from admin routes
    if (isAdminRoute && token && !isAdmin) {
        return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp)).*)',
    ],
};
