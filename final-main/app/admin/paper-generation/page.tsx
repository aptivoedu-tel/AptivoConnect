'use client';

import { useEffect, useState } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import { AuthService } from '@/lib/services/authService';
import { useUI } from '@/lib/context/UIContext';
import PaperGenerator from '@/components/admin/PaperGenerator';

export default function PaperGenerationPage() {
    const [user, setUser] = useState<any>(null);
    const { isSidebarCollapsed } = useUI();

    useEffect(() => {
        setUser(AuthService.getCurrentUser());
    }, []);

    return (
        <div className="min-h-screen bg-gray-50 flex font-sans">
            <Sidebar userRole="super_admin" />
            <div className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ${isSidebarCollapsed ? 'lg:ml-28' : 'lg:ml-80'}`}>
                <Header userName={user?.full_name || 'Super Admin'} userEmail={user?.email} />
                <main className="flex-1 pt-28 lg:pt-24 pb-12 px-4 sm:px-8">
                    <PaperGenerator />
                </main>
            </div>
        </div>
    );
}