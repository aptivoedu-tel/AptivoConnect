'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import { AuthService } from '@/lib/services/authService';
import { useUI } from '@/lib/context/UIContext';
import HierarchyManager from '@/components/admin/HierarchyManager';
import { ChevronLeft } from 'lucide-react';

export default function IndependentHierarchyPage() {
    const params = useParams();
    const router = useRouter();
    const sectionId = parseInt(params.sectionId as string);
    const [user, setUser] = useState<any>(null);
    const [sectionName, setSectionName] = useState('');
    const { isSidebarCollapsed } = useUI();

    useEffect(() => {
        const u = AuthService.getCurrentUser();
        if (u) setUser(u);

        const fetchSection = async () => {
            try {
                const res = await fetch(`/api/mongo/test-sections?id=${sectionId}`);
                if (res.ok) {
                    const data = await res.json();
                    if (data.section) setSectionName(data.section.name);
                }
            } catch (e) { console.error(e); }
        };
        fetchSection();
    }, [sectionId]);

    return (
        <div className="min-h-screen bg-gray-50 flex font-sans">
            <Sidebar userRole="super_admin" />
            <div className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ${isSidebarCollapsed ? 'lg:ml-28' : 'lg:ml-80'}`}>
                <Header userName={user?.full_name || 'Super Admin'} userEmail={user?.email} />
                <main className="flex-1 pt-28 lg:pt-24 pb-12 px-4 sm:px-8 flex flex-col min-h-0">
                    <div className="mb-6">
                        <button 
                            onClick={() => router.back()}
                            className="flex items-center gap-2 text-slate-500 hover:text-teal-600 font-bold text-sm transition-colors mb-4"
                        >
                            <ChevronLeft className="w-4 h-4" /> Back to Global Exams
                        </button>
                        <HierarchyManager 
                            testSectionId={sectionId}
                            title={`${sectionName || 'Independent'} Hierarchy`}
                            subtitle={`Manage the private, independent hierarchy for ${sectionName}. These subjects are exclusive to this exam.`}
                        />
                    </div>
                </main>
            </div>
        </div>
    );
}
