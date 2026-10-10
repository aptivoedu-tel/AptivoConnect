"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import { AuthService } from '@/lib/services/authService';
import {
    MapPin,
    CheckCircle,
    ChevronRight,
    Plus,
    ShieldAlert,
    LogOut,
    Globe,
    Target as TargetIcon,
    Award
} from 'lucide-react';
import { toast } from 'sonner';
import { useUI } from '@/lib/context/UIContext';

type TestSection = {
    id: number;
    name: string;
    logo_url?: string;
};

function TestSectionPortalContent() {
    const { isSidebarCollapsed } = useUI();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<any>(null);
    const [enrollments, setEnrollments] = useState<any[]>([]);
    const [allSections, setAllSections] = useState<TestSection[]>([]);
    const [search, setSearch] = useState('');
    const [showRegistration, setShowRegistration] = useState(false);

    useEffect(() => {
        const init = async () => {
            const u = AuthService.getCurrentUser() || await AuthService.syncSession();
            if (u) {
                setUser(u);
                await checkEnrollment(u.id);
            } else {
                router.push('/login');
            }
            setLoading(false);
        };
        init();
    }, []);

    const checkEnrollment = async (userId: string) => {
        try {
            const sectionRes = await fetch('/api/mongo/test-sections?active=true');
            const sectionData = await sectionRes.json();
            const activeSections = sectionData.sections || [];
            setAllSections(activeSections);

            const enrollRes = await fetch(`/api/mongo/profile/test-sections?student_id=${userId}`);
            const enrollData = await enrollRes.json();
            setEnrollments(enrollData.testSections || []);
        } catch (e) {
            console.error('Error checking enrollment:', e);
        }
    };

    const handleUnenroll = async (sectionId: number) => {
        if (!confirm('Are you sure you want to remove this Global Exam?')) return;
        try {
            const res = await fetch(`/api/mongo/profile/test-sections?student_id=${user.id}&test_section_id=${sectionId}`, {
                method: 'DELETE'
            });
            if (res.ok) {
                setEnrollments(prev => prev.filter(e => e.testSection.id !== sectionId));
                toast.success("Successfully removed");
            } else {
                throw new Error("Failed to remove");
            }
        } catch (e: any) {
            toast.error(e.message);
        }
    };

    const handleRegister = async (sectionId: number) => {
        if (!user) return;
        try {
            const res = await fetch('/api/mongo/profile/test-sections', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    student_id: user.id,
                    test_section_id: sectionId
                })
            });
            if (res.ok) {
                toast.success("Successfully joined Global Exam");
                await checkEnrollment(user.id);
                setShowRegistration(false);
            } else {
                throw new Error("Failed to join");
            }
        } catch (e: any) {
            toast.error(e.message);
        }
    };

    if (loading) return (
        <div className="min-h-screen bg-gray-50 flex font-sans">
            <Sidebar userRole="student" />
            <div className={`flex-1 flex flex-col transition-all duration-300 ${isSidebarCollapsed ? 'lg:ml-28' : 'lg:ml-80'}`}>
                <Header userName="" userEmail="" userAvatar="" />
                <main className={`${isSidebarCollapsed ? 'lg:ml-28' : 'lg:ml-80'} pt-28 lg:pt-24 p-4 lg:p-8 transition-all duration-300`}>
                    <div className="max-w-7xl mx-auto space-y-8 bg-white/60 backdrop-blur-sm p-4 lg:p-8 rounded-[2rem] lg:rounded-[3rem] border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.02)] animate-pulse">
                        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                            <div>
                                <div className="h-10 w-48 bg-slate-200 rounded-xl mb-2" />
                                <div className="h-4 w-36 bg-slate-100 rounded" />
                            </div>
                            <div className="w-40 h-12 bg-slate-200 rounded-2xl" />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="bg-white p-8 rounded-[3rem] border-2 border-slate-100 flex flex-col min-h-[250px]">
                                    <div className="flex justify-between items-start mb-10">
                                        <div className="w-20 h-20 bg-slate-100 rounded-3xl" />
                                        <div className="w-16 h-6 bg-slate-100 rounded-full" />
                                    </div>
                                    <div className="h-6 w-3/4 bg-slate-200 rounded mb-2" />
                                    <div className="h-4 w-1/2 bg-slate-100 rounded mb-8" />
                                    <div className="flex items-center justify-between mt-auto">
                                        <div className="h-4 w-24 bg-slate-200 rounded" />
                                        <div className="w-10 h-10 bg-slate-100 rounded-xl" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-50 flex font-sans">
            <Sidebar userRole="student" />
            <div className={`flex-1 flex flex-col transition-all duration-300 ${isSidebarCollapsed ? 'lg:ml-28' : 'lg:ml-80'}`}>
                <Header userName={user?.full_name} userEmail={user?.email} userAvatar={user?.avatar_url} />

                <main className="p-4 sm:p-6 lg:p-8 mt-24 lg:mt-20 overflow-x-hidden flex-1">
                    <div className="max-w-7xl mx-auto space-y-8">

                        {showRegistration ? (
                            <div className="max-w-2xl mx-auto py-12">
                                <h1 className="text-3xl lg:text-4xl font-black text-slate-900 mb-6 tracking-tight">Add a Global Exam</h1>
                                <div className="bg-white p-8 rounded-[2rem] shadow-xl border border-gray-100">
                                    <p className="text-slate-500 mb-8 font-medium">Search for your targeted line test or standardized exam to practice specifically for it.</p>
                                    <div className="relative mb-8">
                                        <input
                                            type="text"
                                            placeholder="Search Global Exam..."
                                            className="w-full p-5 pl-12 bg-gray-50 rounded-2xl outline-none focus:ring-2 focus:ring-teal-500 transition-all border border-gray-100 font-medium"
                                            onChange={(e) => setSearch(e.target.value)}
                                        />
                                        <TargetIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                                    </div>
                                    <div className="space-y-4">
                                        {allSections
                                            .filter(u => u.name.toLowerCase().includes(search.toLowerCase()))
                                            .filter(u => !enrollments.some(e => e.test_section_id === u.id))
                                            .map(u => (
                                                <div key={u.id} className="flex items-center justify-between p-5 border border-gray-100 rounded-2xl hover:bg-slate-50 transition-all group hover:border-teal-100">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center border border-gray-100 group-hover:border-teal-200 transition-all shadow-sm overflow-hidden p-2 shrink-0">
                                                            {u.logo_url ? (
                                                                <>
                                                                    <img 
                                                                        src={u.logo_url} 
                                                                        alt={u.name} 
                                                                        className="w-full h-full object-contain" 
                                                                        onError={(e) => {
                                                                            e.currentTarget.style.display = 'none';
                                                                            e.currentTarget.nextElementSibling?.classList.remove('hidden');
                                                                            e.currentTarget.nextElementSibling?.classList.add('flex');
                                                                        }}
                                                                    />
                                                                    <span className="hidden w-full h-full items-center justify-center font-black text-teal-600 uppercase">
                                                                        {u.name.substring(0, 2)}
                                                                    </span>
                                                                </>
                                                            ) : (
                                                                <span className="text-teal-600 font-black">{u.name.substring(0, 2).toUpperCase()}</span>
                                                            )}
                                                        </div>
                                                        <span className="font-bold text-slate-700">{u.name}</span>
                                                    </div>
                                                    <button
                                                        onClick={() => handleRegister(u.id)}
                                                        className="px-6 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-md active:scale-95"
                                                    >
                                                        Join
                                                    </button>
                                                </div>
                                            ))}
                                            {allSections.filter(u => u.name.toLowerCase().includes(search.toLowerCase()) && !enrollments.some(e => e.test_section_id === u.id)).length === 0 && (
                                                <div className="text-center text-slate-400 py-8">
                                                    No new Global Exams available.
                                                </div>
                                            )}
                                    </div>
                                    {enrollments.length > 0 && (
                                        <button
                                            onClick={() => setShowRegistration(false)}
                                            className="w-full mt-6 py-4 bg-slate-50 text-slate-600 rounded-xl font-bold uppercase tracking-widest text-xs hover:bg-slate-100 transition-colors"
                                        >
                                            Back to My Sections
                                        </button>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xl shadow-slate-200/40 relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                                    <div className="absolute -top-24 -right-24 w-64 h-64 bg-teal-50 rounded-full blur-3xl opacity-70 pointer-events-none" />
                                    <div className="flex items-center gap-5 relative z-10">
                                        <div className="w-14 h-14 sm:w-16 sm:h-16 bg-slate-50 border border-slate-200/80 rounded-2xl sm:rounded-3xl flex items-center justify-center text-teal-600 shadow-inner shrink-0">
                                            <Globe className="w-7 h-7 sm:w-8 sm:h-8" />
                                        </div>
                                        <div className="space-y-1">
                                            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-50 border border-teal-200/80 text-teal-800 text-[10px] font-black uppercase tracking-widest">
                                                <Award className="w-3.5 h-3.5 text-teal-600" />
                                                <span>Exam Hub</span>
                                            </div>
                                            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 tracking-tight">Global Exams</h1>
                                            <p className="text-slate-600 font-medium text-xs sm:text-sm">Standardized line tests, focused practice, and timed mock assessments.</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setShowRegistration(true)}
                                        className="relative z-10 inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-teal-600 hover:bg-teal-700 text-white rounded-2xl text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-teal-600/20 active:scale-95"
                                    >
                                        <Plus className="w-4 h-4" />
                                        Explore &amp; Join Exams
                                    </button>
                                </div>

                                <div className="flex items-center justify-between">
                                    <div>
                                        <h2 className="text-xl font-black text-slate-900 tracking-tight">My Enrolled Exams</h2>
                                        <p className="text-xs text-slate-500 font-medium">Continue your targeted preparation for standardized tests.</p>
                                    </div>
                                    <span className="text-xs font-black text-teal-800 bg-teal-50 border border-teal-200 px-3 py-1 rounded-full">
                                        {enrollments.length} Active {enrollments.length === 1 ? 'Exam' : 'Exams'}
                                    </span>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
                                    {enrollments.length > 0 ? (
                                        enrollments.map((en) => (
                                            <div
                                                key={en.id}
                                                onClick={() => router.push(`/test-sections/${en.test_section_id}`)}
                                                className="group bg-white p-7 rounded-3xl border border-slate-200/80 hover:border-teal-400 shadow-xl shadow-slate-200/30 hover:shadow-2xl hover:-translate-y-1 transition-all cursor-pointer flex flex-col justify-between gap-6 relative overflow-hidden"
                                            >
                                                <div className="flex justify-between items-start gap-4">
                                                    <div className="w-18 h-18 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-center justify-center text-3xl font-black shadow-inner p-3 overflow-hidden shrink-0 group-hover:scale-105 transition-transform">
                                                        {en.testSection.logo_url ? (
                                                            <>
                                                                <img 
                                                                    src={en.testSection.logo_url} 
                                                                    alt={en.testSection.name} 
                                                                    className="w-full h-full object-contain" 
                                                                    onError={(e) => {
                                                                        e.currentTarget.style.display = 'none';
                                                                        e.currentTarget.nextElementSibling?.classList.remove('hidden');
                                                                        e.currentTarget.nextElementSibling?.classList.add('flex');
                                                                    }}
                                                                />
                                                                <span className="hidden w-full h-full items-center justify-center font-black text-teal-600 uppercase text-3xl">
                                                                    {en.testSection.name.substring(0, 2)}
                                                                </span>
                                                            </>
                                                        ) : (
                                                            <span className="text-teal-600">{en.testSection.name.substring(0, 2).toUpperCase()}</span>
                                                        )}
                                                    </div>
                                                    <div className="bg-teal-50 text-teal-800 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-teal-200 flex items-center gap-1.5">
                                                        <CheckCircle className="w-3 h-3 text-teal-600" />
                                                        Active
                                                    </div>
                                                </div>

                                                <div className="space-y-1">
                                                    <h3 className="text-xl font-black text-slate-900 tracking-tight truncate group-hover:text-teal-700 transition-colors">{en.testSection.name}</h3>
                                                    <p className="text-slate-400 text-[11px] font-bold uppercase tracking-widest">Focused Practice Mode</p>
                                                </div>

                                                <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                                                    <span className="text-xs font-black text-teal-700 uppercase tracking-wider group-hover:translate-x-1 transition-transform inline-flex items-center gap-1.5">
                                                        Enter Section
                                                        <ChevronRight className="w-4 h-4" />
                                                    </span>

                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleUnenroll(en.test_section_id);
                                                        }}
                                                        className="p-3 bg-slate-50 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-2xl transition-all"
                                                        title="Remove"
                                                    >
                                                        <LogOut className="w-5 h-5" />
                                                    </button>
                                                </div>
                                            </div>
                                        ))
                                    ) : allSections.length === 0 ? (
                                        <div className="col-span-full py-24 bg-white rounded-[3rem] border-4 border-dashed border-slate-100 text-center flex flex-col items-center">
                                            <div className="w-64 h-64 mb-8 relative">
                                                <div className="absolute inset-0 bg-teal-100/50 rounded-full blur-3xl" />
                                                <img 
                                                    src="/coming_soon.png" 
                                                    alt="Coming Soon Illustration" 
                                                    className="w-full h-full object-contain relative z-10 drop-shadow-2xl animate-float mix-blend-multiply"
                                                    onError={(e) => {
                                                        e.currentTarget.style.display = 'none';
                                                        e.currentTarget.nextElementSibling?.classList.remove('hidden');
                                                    }}
                                                />
                                                <div className="hidden w-24 h-24 bg-teal-50 rounded-[2rem] items-center justify-center mx-auto relative z-10">
                                                    <Globe className="w-12 h-12 text-teal-300" />
                                                </div>
                                            </div>
                                            <h3 className="text-3xl font-black text-slate-900 mb-4">Coming Soon</h3>
                                            <p className="text-slate-500 max-w-sm mx-auto font-medium mb-10">Global exams are currently being prepared. Check back later!</p>
                                        </div>
                                    ) : (
                                        <div className="col-span-full py-24 bg-white rounded-[3rem] border-4 border-dashed border-slate-100 text-center">
                                            <div className="w-24 h-24 bg-teal-50 rounded-[2rem] flex items-center justify-center mx-auto mb-8">
                                                <ShieldAlert className="w-12 h-12 text-teal-300" />
                                            </div>
                                            <h3 className="text-3xl font-black text-slate-900 mb-4">No Global Exams Added</h3>
                                            <p className="text-slate-500 max-w-sm mx-auto font-medium mb-10">Add a standardized Global Exam to unlock targeted questions.</p>
                                            <button
                                                onClick={() => setShowRegistration(true)}
                                                className="px-10 py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-teal-600 transition-all shadow-2xl shadow-slate-200"
                                            >
                                                Add One Now
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </main>
            </div>
        </div>
    );
}

export default function TestSectionsPage() {
    return (
        <React.Suspense fallback={
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="w-10 h-10 border-4 border-teal-600 border-t-transparent rounded-full animate-spin" />
            </div>
        }>
            <TestSectionPortalContent />
        </React.Suspense>
    );
}
