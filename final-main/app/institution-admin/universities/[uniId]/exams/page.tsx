'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useUI } from '@/lib/context/UIContext';
import { AuthService } from '@/lib/services/authService';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import UniversityExamManager from '@/components/features/UniversityExamManager';

export default function InstitutionUniversityExamsPage() {
    const params = useParams();
    const router = useRouter();
    const { isSidebarCollapsed } = useUI();
    const [user, setUser] = useState<any>(null);
    const uniId = parseInt(params.uniId as string);

    useEffect(() => {
        const init = async () => {
            const currentUser = AuthService.getCurrentUser() || await AuthService.syncSession();
            if (currentUser) {
                if (currentUser.role !== 'institution_admin' && currentUser.role !== 'super_admin') {
                    router.push('/login');
                    return;
                }
                setUser(currentUser);
            } else {
                router.push('/login');
            }
        };
        init();
    }, [router]);

    if (!user) return null;

    return (
        <div className="min-h-screen bg-gray-50 flex font-sans">
            <Sidebar userRole="institution_admin" />
            <div className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ${isSidebarCollapsed ? 'lg:ml-28' : 'lg:ml-80'}`}>
                <Header userName={user?.full_name || 'Admin'} userEmail={user?.email} />
                <main className="flex-1 pt-28 lg:pt-24 pb-12 px-4 sm:px-8 flex flex-col min-h-0">
                    <UniversityExamManager
                        uniId={uniId}
                        userRole="institution_admin"
                        onBack={() => router.push('/institution-admin/universities')}
                    />
                </main>
            </div>
        </div>
    );
}
