"use client";

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import Footer from '@/components/shared/Footer';
import { AuthService } from '@/lib/services/authService';
import {
    BookOpen,
    MapPin,
    CheckCircle,
    Clock,
    ChevronLeft,
    ChevronRight,
    Plus,
    ShieldAlert,
    LogOut,
    Search,
    GraduationCap,
    Sparkles,
    ArrowRight,
    Award,
    Building2,
    Compass
} from 'lucide-react';
import { toast } from 'sonner';
import { useUI } from '@/lib/context/UIContext';
import Link from 'next/link';

type University = {
    id: number;
    name: string;
    logo_url?: string;
};

function UniversityPortalContent() {
    const { isSidebarCollapsed } = useUI();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<any>(null);
    const [enrollments, setEnrollments] = useState<any[]>([]);
    const [loadingEnrollments, setLoadingEnrollments] = useState(false);
    const [allUnis, setAllUnis] = useState<University[]>([]);
    const [search, setSearch] = useState('');
    const [showRegistration, setShowRegistration] = useState(false);

    // URL Sync - Redirect if ID is present (backward compatibility)
    const searchParams = useSearchParams();

    useEffect(() => {
        const idParam = searchParams.get('id');
        if (idParam) {
            router.replace(`/university/${idParam}`);
        }
    }, [searchParams]);

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
        setLoadingEnrollments(true);
        try {
            // 1. Fetch all public universities
            const uniRes = await fetch('/api/mongo/universities');
            const uniData = await uniRes.json();
            const publicUnis = (uniData.universities || []).filter((u: any) => u.is_active && u.is_public);
            setAllUnis(publicUnis);

            // 2. Fetch student enrollments
            const enrollRes = await fetch(`/api/mongo/profile/universities?student_id=${userId}`);
            const enrollData = await enrollRes.json();
            let finalEnrollments = enrollData.universities || [];

            // 3. Handle Institution Access Rules if any
            const currentUser = AuthService.getCurrentUser();
            if (currentUser?.institution_id) {
                const rulesRes = await fetch(`/api/mongo/institutions/university-access?institution_id=${currentUser.institution_id}`);
                const rulesData = await rulesRes.json();
                const rules = rulesData.rules || [];

                const lockedUniIds = rules.filter((r: any) => r.is_locked).map((r: any) => r.university_id);
                const unlockedUniIds = rules.filter((r: any) => !r.is_locked).map((r: any) => r.university_id);

                // Remove locked enrollments
                const toRemoveEntries = finalEnrollments.filter((e: any) => lockedUniIds.includes(e.universities.id));
                if (toRemoveEntries.length > 0) {
                    for (const entry of toRemoveEntries) {
                        await fetch(`/api/mongo/profile/universities?student_id=${userId}&university_id=${entry.universities.id}`, {
                            method: 'DELETE'
                        });
                    }
                    finalEnrollments = finalEnrollments.filter((e: any) => !lockedUniIds.includes(e.universities.id));
                }

                // Add missing unlocked enrollments
                for (const assignedUniId of unlockedUniIds) {
                    const alreadyEnrolled = finalEnrollments.some((e: any) => e.universities.id === assignedUniId);
                    if (!alreadyEnrolled) {
                        const addRes = await fetch('/api/mongo/profile/universities', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                student_id: userId,
                                university_id: assignedUniId,
                                institution_id: currentUser.institution_id,
                                status: 'approved'
                            })
                        });
                        if (addRes.ok) {
                            const refetchRes = await fetch(`/api/mongo/profile/universities?student_id=${userId}`);
                            const refetchData = await refetchRes.json();
                            finalEnrollments = refetchData.universities || [];
                        }
                    }
                }
                setAllUnis(prev => prev.filter(u => !lockedUniIds.includes(u.id)));
            }

            const normalizedEnrollments = finalEnrollments.map((en: any) => ({
                ...en,
                university: en.universities
            }));

            setEnrollments(normalizedEnrollments);
        } catch (e) {
            console.error('Error checking enrollment:', e);
        } finally {
            setLoadingEnrollments(false);
        }
    };

    const handleUnenroll = async (uniId: number) => {
        if (!confirm('Are you sure you want to unenroll from this university?')) return;
        try {
            const res = await fetch(`/api/mongo/profile/universities?student_id=${user.id}&university_id=${uniId}`, {
                method: 'DELETE'
            });
            if (res.ok) {
                setEnrollments(prev => prev.filter(e => e.university.id !== uniId));
                toast.success("Successfully unenrolled");
            } else {
                throw new Error("Failed to unenroll");
            }
        } catch (e: any) {
            toast.error(e.message);
        }
    };

    const handleRegister = async (uniId: number) => {
        if (!user) return;
        try {
            const res = await fetch('/api/mongo/profile/universities', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    student_id: user.id,
                    university_id: uniId,
                    status: 'approved'
                })
            });
            if (res.ok) {
                toast.success("Successfully enrolled in university track");
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
        <div className="min-h-screen bg-slate-100/60 flex font-sans">
            <Sidebar userRole="student" />
            <div className="flex-1 flex flex-col">
                <Header userName="" userEmail="" userAvatar="" />
                <main className={`${isSidebarCollapsed ? 'lg:ml-28' : 'lg:ml-80'} pt-28 lg:pt-24 p-4 lg:p-8 transition-all duration-300`}>
                    <div className="max-w-7xl mx-auto space-y-8 animate-pulse">
                        <div className="h-44 bg-white rounded-3xl border border-slate-200" />
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="h-64 bg-white rounded-3xl border border-slate-200" />
                            ))}
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );

    const availableToJoin = allUnis
        .filter(u => u.name.toLowerCase().includes(search.toLowerCase()))
        .filter(u => !enrollments.some(e => (e.university_id || e.university?.id) === u.id));

    return (
        <div className="min-h-screen bg-slate-100/60 flex font-sans selection:bg-teal-100 selection:text-teal-900">
            <Sidebar userRole="student" />
            <div className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ${isSidebarCollapsed ? 'lg:ml-28' : 'lg:ml-80'}`}>
                <Header userName={user?.full_name} userEmail={user?.email} userAvatar={user?.avatar_url} />

                <main className="p-4 sm:p-6 lg:p-8 mt-24 lg:mt-20 overflow-x-hidden flex-1">
                    <div className="max-w-7xl mx-auto space-y-8">

                        {/* ── 1. Hero Header Banner ── */}
                        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xl shadow-slate-200/40 relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                            <div className="absolute -top-24 -right-24 w-64 h-64 bg-teal-50 rounded-full blur-3xl opacity-70 pointer-events-none" />
                            
                            <div className="flex items-center gap-5 relative z-10">
                                <div className="w-14 h-14 sm:w-16 sm:h-16 bg-slate-50 border border-slate-200/80 rounded-2xl sm:rounded-3xl flex items-center justify-center text-teal-600 shadow-inner shrink-0">
                                    <GraduationCap className="w-8 h-8" />
                                </div>
                                <div className="space-y-1">
                                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-50 border border-teal-200/80 text-teal-800 text-[10px] font-black uppercase tracking-widest">
                                        <Award className="w-3.5 h-3.5 text-teal-600" />
                                        <span>Admission Hub</span>
                                    </div>
                                    <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 tracking-tight">
                                        University Portals
                                    </h1>
                                    <p className="text-slate-600 font-medium text-xs sm:text-sm">
                                        Curated curricula, past-paper question banks, and timed mock tests aligned with major entrance exams.
                                    </p>
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex items-center gap-3 relative z-10 w-full sm:w-auto">
                                {(!user?.institution_id) && (
                                    <button
                                        data-tour="join-institutions"
                                        onClick={() => setShowRegistration(!showRegistration)}
                                        className={`inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl font-black text-xs uppercase tracking-wider transition-all shadow-md active:scale-95 cursor-pointer ${
                                            showRegistration 
                                                ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200' 
                                                : 'bg-teal-600 hover:bg-teal-700 text-white shadow-teal-600/20'
                                        }`}
                                    >
                                        {showRegistration ? (
                                            <>
                                                <ChevronLeft className="w-4 h-4" />
                                                <span>My Enrolled Tracks</span>
                                            </>
                                        ) : (
                                            <>
                                                <Plus className="w-4 h-4" />
                                                <span>Explore &amp; Join Tracks</span>
                                            </>
                                        )}
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* ── 2. View: Explore & Join Universities (Registration / Search mode) ── */}
                        {showRegistration ? (
                            <div className="space-y-6">
                                <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xl shadow-slate-200/30 space-y-6">
                                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                                        <div>
                                            <h2 className="text-xl font-black text-slate-900 tracking-tight">Available University Portals</h2>
                                            <p className="text-xs text-slate-500 font-medium">Select an institution track to enroll in its complete syllabus and exam papers.</p>
                                        </div>
                                        <div className="relative w-full sm:w-72">
                                            <input
                                                type="text"
                                                placeholder="Search universities..."
                                                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 placeholder:text-slate-400 outline-none focus:bg-white focus:border-teal-500 transition-all"
                                                value={search}
                                                onChange={(e) => setSearch(e.target.value)}
                                            />
                                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                        </div>
                                    </div>

                                    {availableToJoin.length > 0 ? (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                            {availableToJoin.map((u) => (
                                                <div
                                                    key={u.id}
                                                    className="bg-slate-50/70 hover:bg-white rounded-3xl p-6 border border-slate-200/80 hover:border-teal-300 hover:shadow-xl transition-all flex flex-col justify-between gap-5 group"
                                                >
                                                    <div className="flex items-start gap-4">
                                                        <div className="w-16 h-16 rounded-2xl bg-white border border-slate-200 p-2 flex items-center justify-center overflow-hidden shrink-0 shadow-xs">
                                                            {u.logo_url ? (
                                                                <img src={u.logo_url} alt={u.name} className="w-full h-full object-contain" />
                                                            ) : (
                                                                <span className="text-xl font-black text-teal-600">{u.name.charAt(0)}</span>
                                                            )}
                                                        </div>
                                                        <div className="space-y-1 min-w-0">
                                                            <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-teal-50 border border-teal-200 text-teal-800 text-[9px] font-black uppercase tracking-widest">
                                                                <CheckCircle className="w-3 h-3 text-teal-600" />
                                                                <span>Verified Portal</span>
                                                            </div>
                                                            <h3 className="font-black text-slate-900 text-base tracking-tight truncate group-hover:text-teal-700 transition-colors">
                                                                {u.name}
                                                            </h3>
                                                        </div>
                                                    </div>

                                                    <button
                                                        data-tour="join-uni-btn"
                                                        onClick={() => handleRegister(u.id)}
                                                        className="w-full py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-teal-600/20 active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                                                    >
                                                        <span>Enroll in Track</span>
                                                        <ArrowRight className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="py-16 text-center space-y-3">
                                            <Compass className="w-12 h-12 text-slate-300 mx-auto" />
                                            <p className="text-sm font-bold text-slate-600">No additional universities found</p>
                                            <p className="text-xs text-slate-400">You are already enrolled in all matching tracks or no matches found for "{search}".</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            /* ── 3. View: My Enrolled University Portals ── */
                            <div className="space-y-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h2 className="text-xl font-black text-slate-900 tracking-tight">My Enrolled Tracks</h2>
                                        <p className="text-xs text-slate-500 font-medium">Continue your structured preparation for your target institutions.</p>
                                    </div>
                                    <span className="text-xs font-black text-teal-800 bg-teal-50 border border-teal-200 px-3 py-1 rounded-full">
                                        {enrollments.length} Active {enrollments.length === 1 ? 'Track' : 'Tracks'}
                                    </span>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
                                    {enrollments.length > 0 ? (
                                        enrollments.map((en, enIdx) => (
                                            <div
                                                key={en.id || en.university?.id}
                                                {...(enIdx === 0 ? { 'data-tour': 'university-card' } : {})}
                                                onClick={() => router.push(`/university/${en.university_id || en.university?.id}`)}
                                                className="group bg-white p-7 rounded-3xl border border-slate-200/80 hover:border-teal-400 shadow-xl shadow-slate-200/30 hover:shadow-2xl hover:-translate-y-1 transition-all cursor-pointer flex flex-col justify-between gap-6 relative overflow-hidden"
                                            >
                                                {/* Top header */}
                                                <div className="flex items-start justify-between gap-4">
                                                    <div className="w-18 h-18 bg-slate-50 rounded-2xl border border-slate-200/80 p-3 flex items-center justify-center text-3xl font-black shadow-inner overflow-hidden shrink-0 group-hover:scale-105 transition-transform">
                                                        {en.university?.logo_url ? (
                                                            <img src={en.university.logo_url} alt={en.university.name} className="w-full h-full object-contain" />
                                                        ) : (
                                                            <span className="text-teal-600">{en.university?.name?.charAt(0)}</span>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <div className="bg-teal-50 text-teal-800 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-teal-200 flex items-center gap-1.5">
                                                            <CheckCircle className="w-3 h-3 text-teal-600" />
                                                            <span>Active</span>
                                                        </div>
                                                        {(!user?.institution_id) && (
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleUnenroll(en.university_id || en.university?.id);
                                                                }}
                                                                className="p-1.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                                                                title="Unenroll"
                                                            >
                                                                <LogOut className="w-4 h-4" />
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Title & Info */}
                                                <div className="space-y-1">
                                                    <h3 className="text-xl font-black text-slate-900 tracking-tight truncate group-hover:text-teal-700 transition-colors">
                                                        {en.university?.name}
                                                    </h3>
                                                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                                                        Complete Entrance Syllabus &amp; Mocks
                                                    </p>
                                                </div>

                                                {/* Bottom Action */}
                                                <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                                                    <span className="text-xs font-black text-teal-700 uppercase tracking-wider group-hover:translate-x-1 transition-transform inline-flex items-center gap-1.5">
                                                        <span>Enter Campus</span>
                                                        <ChevronRight className="w-4 h-4 font-black" />
                                                    </span>
                                                    <span className="text-[10px] font-bold text-slate-400">
                                                        {en.enrollment_date ? new Date(en.enrollment_date).toLocaleDateString() : 'Enrolled'}
                                                    </span>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="col-span-full py-20 bg-white rounded-3xl border-2 border-dashed border-slate-200 text-center p-8 space-y-4 shadow-sm">
                                            <div className="w-16 h-16 bg-teal-50 rounded-2xl flex items-center justify-center mx-auto text-teal-600 border border-teal-200">
                                                <ShieldAlert className="w-8 h-8" />
                                            </div>
                                            <div className="space-y-1 max-w-md mx-auto">
                                                <h3 className="text-2xl font-black text-slate-900 tracking-tight">No Target Tracks Enrolled</h3>
                                                <p className="text-xs text-slate-500 font-medium">Enroll in your target university to access past-paper mock tests and topic practice.</p>
                                            </div>
                                            <button
                                                onClick={() => setShowRegistration(true)}
                                                className="px-8 py-3.5 bg-teal-600 hover:bg-teal-700 text-white rounded-2xl text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-teal-600/20 active:scale-95 cursor-pointer"
                                            >
                                                Explore &amp; Enroll Now
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        <Footer />
                    </div>
                </main>
            </div>
        </div>
    );
}

export default function UniversityPortalPage() {
    return (
        <React.Suspense fallback={
            <div className="min-h-screen bg-slate-100/60 flex items-center justify-center">
                <div className="w-10 h-10 border-4 border-teal-600 border-t-transparent rounded-full animate-spin" />
            </div>
        }>
            <UniversityPortalContent />
        </React.Suspense>
    );
}
