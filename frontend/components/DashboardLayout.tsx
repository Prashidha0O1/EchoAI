'use client';

import DashboardSidebar from './DashboardSidebar';
import ProtectedRoute from './ProtectedRoute';
import EmailVerificationBanner from './EmailVerificationBanner';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    return (
        <ProtectedRoute>
            <div className="min-h-screen flex" style={{ background: '#060a07', color: '#f0fdf4' }}>
                <DashboardSidebar />
                <div className="flex-1 lg:ml-[60px] min-h-screen flex flex-col">
                    <EmailVerificationBanner />
                    <main className="flex-1 p-4 sm:p-6 lg:p-8 pt-16 lg:pt-8">
                        {children}
                    </main>
                </div>
            </div>
        </ProtectedRoute>
    );
}
