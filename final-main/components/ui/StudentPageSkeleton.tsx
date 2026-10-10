'use client';

import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';

interface StudentPageSkeletonProps {
    isSidebarCollapsed: boolean;
}

/** Keeps Aptivo's real header and mobile dock mounted while client data loads. */
export default function StudentPageSkeleton({ isSidebarCollapsed }: StudentPageSkeletonProps) {
    return (
        <div className="min-h-screen bg-slate-50 font-sans">
            <Sidebar userRole="student" />
            <div className={`flex min-h-screen flex-col transition-all duration-300 ${isSidebarCollapsed ? 'lg:ml-28' : 'lg:ml-80'}`}>
                <Header userName="Student" userEmail="" userAvatar="" />
                <main className="mt-24 flex-1 p-3 sm:p-6 lg:mt-20 lg:p-8">
                    <div className="mx-auto max-w-7xl animate-pulse space-y-5 sm:space-y-7">
                        <div className="space-y-2">
                            <div className="h-7 w-44 rounded-lg bg-slate-200 sm:h-9 sm:w-60" />
                            <div className="h-3 w-64 max-w-full rounded bg-slate-100 sm:h-4 sm:w-96" />
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 sm:gap-5">
                            {[0, 1, 2, 3].map((item) => (
                                <div key={item} className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6">
                                    <div className="h-11 w-11 rounded-2xl bg-teal-50" />
                                    <div className="mt-6 h-5 w-2/3 rounded bg-slate-200" />
                                    <div className="mt-3 h-3 w-full rounded bg-slate-100" />
                                </div>
                            ))}
                        </div>
                        <div className="h-52 rounded-3xl border border-slate-200 bg-white sm:h-72" />
                    </div>
                </main>
            </div>
        </div>
    );
}
