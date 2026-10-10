'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { AuthService } from '@/lib/services/authService';
import { SystemSettingsService } from '@/lib/services/systemSettingsService';

export default function MaintenanceGuard({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);

    useEffect(() => {
        const checkMaintenance = async () => {
            const bypassRoutes = [
                '/maintenance',
                '/login',
                '/register',
                '/forgot-password',
                '/reset-password',
                '/set-password',
                '/terms',
                '/privacy',
                '/contact',
                '/api/auth'
            ];
            if (pathname === '/') {
                setIsAuthorized(true);
                return;
            }
            if (bypassRoutes.some(route => pathname.startsWith(route))) {
                setIsAuthorized(true);
                return;
            }

            try {
                const user = AuthService.getCurrentUser() || await AuthService.syncSession();

                const data = await SystemSettingsService.getSettings({ ttlMs: 600000 });
                if (data.settings) {
                    const isMaintMode = !!data.settings.maintenance_mode;
                    const isSuperAdmin = user?.role === 'super_admin';

                    if (isMaintMode && !isSuperAdmin) {
                        // Regular users get sent to maintenance
                        setIsAuthorized(false);
                        if (pathname !== '/maintenance') {
                            router.replace('/maintenance');
                        }
                    } else {
                        // All good (Mode OFF or User is Super Admin)
                        setIsAuthorized(true);
                        if (!isMaintMode && pathname === '/maintenance') {
                            router.replace('/');
                        }
                    }
                } else {
                    setIsAuthorized(true);
                }
            } catch (error) {
                console.error('Maintenance check failed:', error);
                setIsAuthorized(true);
            }
        };

        checkMaintenance();
    }, [pathname, router]);

    // If we're authorized or on a bypass route, show content
    // Otherwise, show nothing (while redirecting) or a loader
    if (isAuthorized === null) return null; // Or a loading spinner
    if (isAuthorized === false && pathname !== '/maintenance') return null;

    return <>{children}</>;
}
