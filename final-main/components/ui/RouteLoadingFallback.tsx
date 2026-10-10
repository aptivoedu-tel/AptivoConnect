'use client';

import { usePathname } from 'next/navigation';
import Loader from '@/components/ui/Loader';
import StudentPageSkeleton from '@/components/ui/StudentPageSkeleton';

const studentRoutePrefixes = [
    '/dashboard',
    '/university',
    '/test-sections',
    '/practice',
    '/progress',
    '/notifications',
    '/calendar',
    '/leaderboard',
    '/profile',
];

/**
 * The root loading boundary can run before a route-specific boundary. Preserve
 * the portal shell for student destinations instead of briefly replacing it
 * with a full-screen spinner.
 */
export default function RouteLoadingFallback() {
    const pathname = usePathname();
    const isStudentRoute = studentRoutePrefixes.some((route) => pathname === route || pathname.startsWith(`${route}/`));

    if (isStudentRoute) return <StudentPageSkeleton isSidebarCollapsed={false} />;

    return (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-white">
            <Loader size="lg" text="Loading Aptivo Portal..." />
        </div>
    );
}
