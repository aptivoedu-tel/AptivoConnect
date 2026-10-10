'use client';

import type { ReactNode } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import Footer from '@/components/shared/Footer';
import { useUI } from '@/lib/context/UIContext';

export default function ConnectShell({ children, userName, userAvatar }: { children: ReactNode; userName: string; userAvatar?: string }) {
    const { isSidebarCollapsed } = useUI();
    return (
        <div className="flex min-h-screen bg-slate-100/60">
            <Sidebar userRole="student" />
            <div className={`flex min-w-0 flex-1 flex-col transition-all duration-300 ${isSidebarCollapsed ? 'lg:ml-28' : 'lg:ml-80'}`}>
                <Header userName={userName} userAvatar={userAvatar} />
                <main className="flex-1 px-4 pb-28 pt-24 sm:px-8 lg:pb-8">{children}</main>
                <Footer />
            </div>
        </div>
    );
}
