"use client";

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import Footer from '@/components/shared/Footer';
import { AuthService } from '@/lib/services/authService';
import {
    BookOpen,
    CheckCircle,
    Clock,
    ChevronDown,
    ChevronRight,
    ChevronUp,
    ChevronLeft,
    Play,
    Info,
    BarChart,
    GraduationCap,
    LogOut,
    FileText,
    ShieldAlert,
    Clock3,
    Trophy,
    ArrowRight,
    CheckCircle2,
    XCircle,
    HelpCircle,
    Search,
    FlaskConical,
    Atom,
    Calculator,
    Languages,
    Target as TargetIcon
} from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useLoading } from '@/lib/context/LoadingContext';
import { useUI } from '@/lib/context/UIContext';

const MarkdownRenderer = dynamic(() => import('@/components/shared/MarkdownRenderer'), { ssr: false });

type ContentMap = {
    subject: { id: number; name: string };
    topics: {
        id: number;
        name: string;
        mcqCount?: number;
        content_markdown?: string;
        subtopics: { id: number; name: string; mcqCount?: number }[];
    }[];
};

type LearningModule = {
    id: number;
    name: string;
    type: string;
    parentTopicName: string;
    isSubtopic: boolean;
    topicId: number;
};

export default function UniversityDetailPage() {
    const { isSidebarCollapsed } = useUI();
    const router = useRouter();
    const params = useParams();
    const uniId = Number(params.uniId);
    const { setLoading: setGlobalLoading } = useLoading();

    const [localLoading, setLocalLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);
    const [user, setUser] = useState<any>(null);
    const [university, setUniversity] = useState<any>(null);
    const [enrollment, setEnrollment] = useState<any>(null);
    const [content, setContent] = useState<ContentMap[]>([]);
    const [expandedTopic, setExpandedTopic] = useState<number | null>(null);
    const [expandedSubject, setExpandedSubject] = useState<number | null>(null);
    const [activeTab, setActiveTab] = useState<'library' | 'insights' | 'exams' | 'pattern'>('library');
    const [stats, setStats] = useState<any>(null);
    const [exams, setExams] = useState<any[]>([]);
    const [progressMap, setProgressMap] = useState<Record<number, { isRead: boolean; isMastered: boolean }>>({});
    const [selectedSubjectId, setSelectedSubjectId] = useState<number | null>(null);
    const [moduleSearch, setModuleSearch] = useState('');
    const [contentLoading, setContentLoading] = useState(true);
    const [assignedTasks, setAssignedTasks] = useState<Record<string, { required_mcqs?: number, due_date?: string }>>({});

    useEffect(() => {
        if (isNaN(uniId)) {
            toast.error("Invalid university ID");
            router.push('/university');
            return;
        }

        const init = async () => {
            setLocalLoading(true);
            try {
                const u = AuthService.getCurrentUser() || await AuthService.syncSession();
                if (u) {
                    setUser(u);
                    await fetchData(u.id);
                } else {
                    router.push('/login');
                }
            } catch (error) {
                console.error("Initialization error:", error);
                toast.error("Failed to load university data.");
            } finally {
                setLocalLoading(false);
            }
        };

        init();
    }, [uniId]);


    async function fetchData(userId: string) {
        // 1. Fetch University Details from MongoDB
        const uniRes = await fetch(`/api/mongo/universities?id=${uniId}`);
        const uniData = await uniRes.json();
        const uni = uniData.universities?.find((u: any) => u.id === parseInt(String(uniId)));

        if (!uni) {
            setNotFound(true);
            toast.error("University not found.");
            router.push('/university');
            return;
        }
        setUniversity(uni);

        // 2. Check Enrollment from MongoDB
        const enrollRes = await fetch(`/api/mongo/profile/universities?student_id=${userId}`);
        const enrollData = await enrollRes.json();
        const enroll = (enrollData.universities || []).find(
            (e: any) => e.university_id === uniId || e.universities?.id === uniId
        );

        if (!enroll) {
            toast.error("You are not enrolled in this university or access is pending.");
            router.push('/university');
            return;
        }
        setEnrollment(enroll);

        // Get institutionId from the current user session (not from stale state)
        const currentUser = AuthService.getCurrentUser();
        const institutionId = currentUser?.institution_id || null;

        // 3. Load Content & Progress
        await Promise.all([
            loadContent(uniId, institutionId),
            loadStudentProgress(userId),
            loadUniversityStats(userId, uniId),
            loadExams(userId, uniId, institutionId),
            loadAssignedTasks(institutionId)
        ]);
    }

    async function loadAssignedTasks(institutionId?: number | null) {
        if (!institutionId) return;
        try {
            const res = await fetch(`/api/mongo/institutions/tasks?institution_id=${institutionId}&university_id=${uniId}`);
            const data = await res.json();
            const map: Record<string, { required_mcqs?: number, due_date?: string }> = {};
            data.tasks?.forEach((t: any) => {
                map[`${t.type}-${t.target_id}`] = { required_mcqs: t.required_mcqs, due_date: t.due_date };
            });
            setAssignedTasks(map);
        } catch (e) {
            console.error(e);
        }
    }

    async function loadContent(uniId: number, institutionId?: number | null) {
        setContentLoading(true);
        try {
            // Use our new content-access API which joins data
            const res = await fetch(`/api/mongo/universities/content-access?university_id=${uniId}&institution_id=${institutionId || 'null'}`);
            const data = await res.json();
            const access = data.mappings || [];

            // 2. Fetch MCQ counts (efficiently using counts_only=true)
            const mcqRes = await fetch(`/api/mongo/mcqs?counts_only=true`);
            const mcqData = await mcqRes.json();
            const counts = mcqData.counts || { subtopics: {}, topics: {}, universities: {} };

            const mcqSubtopicMap = counts.subtopics || {};
            const mcqTopicMap = counts.topics || {};

            const subjectMap = new Map<number, ContentMap>();
            access.forEach((row: any) => {
                if (!row.subject) return;
                if (!subjectMap.has(row.subject.id)) {
                    subjectMap.set(row.subject.id, { subject: row.subject, topics: [] });
                }
                const currentSubject = subjectMap.get(row.subject.id)!;

                if (row.topic) {
                    let topic = (currentSubject.topics as any[]).find((t: any) => t.id === row.topic.id);
                    if (!topic) {
                        const newTopic = {
                            ...row.topic,
                            subtopics: [],
                            mcqCount: mcqTopicMap[row.topic.id] || 0
                        };
                        currentSubject.topics.push(newTopic);
                        topic = newTopic;
                    }

                    if (row.subtopic && topic) {
                        if (!(topic.subtopics as any[]).find((st: any) => st.id === row.subtopic.id)) {
                            const subtopicWithCount = {
                                ...row.subtopic,
                                mcqCount: mcqSubtopicMap[row.subtopic.id] || 0
                            };
                            topic.subtopics.push(subtopicWithCount);
                        }
                    }
                }
            });
            setContent(Array.from(subjectMap.values()));
        } finally {
            setContentLoading(false);
        }
    }

    async function loadStudentProgress(userId: string) {
        // Fetch progress from MongoDB
        const res = await fetch(`/api/mongo/progress?student_id=${userId}`);
        const data = await res.json();

        // Fetch mastery from completed practice sessions with real attempts only
        const sessionRes = await fetch(`/api/mongo/practice?student_id=${userId}&limit=1000`);
        const sessionData = await sessionRes.json();
        const masterySessions = (sessionData.sessions || []).filter((p: any) => {
            const answeredQuestions = (p.total_questions || 0);
            const correctAnswers = (p.correct_answers || 0);
            return p.is_completed && answeredQuestions > 0 && correctAnswers > 0;
        });

        const map: Record<number, { isRead: boolean; isMastered: boolean }> = {};

        // Handle Subtopic Reading
        data.subtopic_progress?.forEach((r: any) => {
            if (!map[r.subtopic_id]) map[r.subtopic_id] = { isRead: false, isMastered: false };
            map[r.subtopic_id].isRead = r.is_completed;
        });

        // Handle Topic Reading
        data.topic_progress?.forEach((r: any) => {
            if (!map[r.topic_id]) map[r.topic_id] = { isRead: false, isMastered: false };
            map[r.topic_id].isRead = r.is_completed;
        });

        // Handle Practice Mastery
        masterySessions.forEach((p: any) => {
            const id = p.subtopic_id || p.topic_id;
            if (id) {
                if (!map[id]) map[id] = { isRead: false, isMastered: false };
                map[id].isMastered = true;
            }
        });

        setProgressMap(map);
    }
    // Refresh progress when practice session completes
    useEffect(() => {
        const handleProgressUpdate = () => {
            if (user?.id) {
                loadStudentProgress(user.id);
                loadUniversityStats(user.id, uniId);
            }
        };
        window.addEventListener('progressUpdated', handleProgressUpdate);
        return () => {
            window.removeEventListener('progressUpdated', handleProgressUpdate);
        };
    }, [user]);


    async function loadUniversityStats(userId: string, uniId: number) {
        const res = await fetch(`/api/mongo/analytics?student_id=${userId}&university_id=${uniId}`);
        const data = await res.json();

        setStats({
            totalSessions: data.analytics?.total_sessions || 0,
            avgScore: data.analytics?.avg_score || 0,
            totalTime: data.analytics?.total_study_minutes || 0,
            totalCorrect: data.analytics?.total_correct || 0,
            totalIncorrect: data.analytics?.total_incorrect || 0,
            totalSkipped: data.analytics?.total_skipped || 0,
            recentActivity: data.analytics?.recent_activity || []
        });
    }

    async function loadExams(userId: string, uniId: number, institutionId?: number | null) {
        // Only show: 
        //   - Public exams (institution_id = null) for all students
        //   - Institution-specific exams if the student belongs to that institution
        const params = new URLSearchParams({ university_id: String(uniId), active: 'true' });
        if (institutionId) {
            // Student has an institution: show public + their institution's exams
            params.set('institution_id', String(institutionId));
        } else {
            // No institution: only public exams
            params.set('institution_id', 'null');
        }
        const res = await fetch(`/api/mongo/exams?${params.toString()}`);
        const data = await res.json();
        setExams(data.exams || []);
    }

    function calculateCompletion() {
        if (content.length === 0) return 0;
        let total = 0; let completed = 0;
        content.forEach((subject: any) => {
            subject.topics.forEach((topic: any) => {
                if (topic.subtopics && topic.subtopics.length > 0) {
                    topic.subtopics.forEach((st: any) => {
                        total++;
                        if (progressMap[st.id]?.isMastered) completed++;
                    });
                } else {
                    total++;
                    if (progressMap[topic.id]?.isMastered) completed++;
                }
            });
        });
        return total > 0 ? Math.round((completed / total) * 100) : 0;
    }

    const calculateSubjectProgress = (subjectId: number) => {
        const subject = content.find((s: any) => s.subject.id === subjectId);
        if (!subject) return 0;
        let total = 0;
        let completed = 0;
        subject.topics.forEach((topic: any) => {
            if (topic.subtopics && topic.subtopics.length > 0) {
                topic.subtopics.forEach((st: any) => {
                    total++;
                    if (progressMap[st.id]?.isMastered) completed++;
                });
            } else {
                total++;
                if (progressMap[topic.id]?.isMastered) completed++;
            }
        });
        return total > 0 ? Math.round((completed / total) * 100) : 0;
    };

    const getSubjectIcon = (name: string) => {
        const lowercase = name.toLowerCase();
        if (lowercase.includes('chem')) return FlaskConical;
        if (lowercase.includes('phys')) return Atom;
        if (lowercase.includes('math')) return Calculator;
        if (lowercase.includes('eng')) return Languages;
        return BookOpen;
    };

    useEffect(() => {
        if (content.length > 0 && !selectedSubjectId) {
            setSelectedSubjectId(content[0].subject.id);
        }
    }, [content]);

    const activeSubject = content.find((s: any) => s.subject.id === selectedSubjectId);
    const flatModules: LearningModule[] = [];
    activeSubject?.topics.forEach((topic: any) => {
        if (topic.subtopics && topic.subtopics.length > 0) {
            topic.subtopics.forEach((st: any) => {
                flatModules.push({
                    id: st.id,
                    name: st.name,
                    type: 'Learning Module',
                    parentTopicName: topic.name,
                    isSubtopic: true,
                    topicId: topic.id
                });
            });
        } else {
            flatModules.push({
                id: topic.id,
                name: topic.name,
                type: 'Direct Knowledge',
                isSubtopic: false,
                parentTopicName: '',
                topicId: topic.id
            });
        }
    });

    const filteredModules = flatModules.filter((m: LearningModule) =>
        m.name.toLowerCase().includes(moduleSearch.toLowerCase()) ||
        (m.parentTopicName && m.parentTopicName.toLowerCase().includes(moduleSearch.toLowerCase()))
    );

    const handleUnenroll = async () => {
        if (!confirm('Are you sure you want to unenroll?')) return;
        try {
            const res = await fetch(`/api/mongo/profile/universities?student_id=${user.id}&university_id=${uniId}`, {
                method: 'DELETE'
            });

            if (res.ok) router.push('/university');
            else toast.error("Failed to unenroll.");
        } catch (e) {
            console.error(e);
            toast.error("An error occurred.");
        }
    };

    // --- Render Logic ---
    const renderLoading = () => (
        <div className="min-h-screen bg-slate-100/60 flex font-sans text-slate-800">
            <Sidebar userRole="student" />
            <div className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ${isSidebarCollapsed ? 'lg:ml-28' : 'lg:ml-80'}`}>
                <Header userName={user?.full_name} userEmail={user?.email} userAvatar={user?.avatar_url} />
                <main className="p-4 sm:p-6 lg:p-8 mt-24 lg:mt-20 overflow-x-hidden flex-1">
                    <div className="max-w-7xl mx-auto space-y-8 animate-pulse">
                        <div className="h-44 bg-white rounded-3xl border border-slate-200" />
                        <div className="h-16 bg-white rounded-2xl border border-slate-200 w-96" />
                        <div className="h-96 bg-white rounded-3xl border border-slate-200" />
                    </div>
                </main>
            </div>
        </div>
    );

    if (localLoading) return renderLoading();

    return (
        <div className="min-h-screen bg-slate-100/60 flex font-sans text-slate-800 selection:bg-teal-100 selection:text-teal-900">
            <Sidebar userRole="student" />
            <div className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ${isSidebarCollapsed ? 'lg:ml-28' : 'lg:ml-80'}`}>
                <Header userName={user?.full_name} userEmail={user?.email} userAvatar={user?.avatar_url} />

                <main className="p-4 sm:p-6 lg:p-8 mt-24 lg:mt-20 overflow-x-hidden flex-1 flex flex-col">
                    <div className="flex-1 max-w-7xl mx-auto w-full space-y-8">
                        {notFound ? (
                            <div className="py-20 text-center bg-white rounded-3xl border border-slate-200 shadow-xl p-8 space-y-4 max-w-xl mx-auto">
                                <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center mx-auto border border-rose-100">
                                    <Info className="w-8 h-8" />
                                </div>
                                <h2 className="text-2xl font-black text-slate-900 tracking-tight">University Not Found</h2>
                                <p className="text-xs text-slate-500 font-medium">The university track you are looking for does not exist or is currently unavailable.</p>
                                <Link href="/university" className="inline-flex items-center gap-2 px-6 py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-2xl text-xs font-black uppercase tracking-wider transition-all shadow-md">
                                    <ChevronLeft className="w-4 h-4" />
                                    <span>Return to Catalog</span>
                                </Link>
                            </div>
                        ) : (
                            <>
                                {/* ── 1. University Header & Hero Card ── */}
                                <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xl shadow-slate-200/30 relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                                    <div className="absolute -top-24 -right-24 w-64 h-64 bg-teal-50 rounded-full blur-3xl opacity-70 pointer-events-none" />

                                    <div className="flex flex-wrap items-start sm:items-center gap-4 sm:gap-5 relative z-10 flex-1 min-w-0">
                                        <Link
                                            href="/university"
                                            className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-400 hover:text-teal-700 hover:border-teal-300 transition-all shadow-xs shrink-0 self-start group cursor-pointer"
                                            title="Back to Universities"
                                        >
                                            <ChevronLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />
                                        </Link>

                                    <div className="flex items-center gap-4 sm:gap-5 w-full sm:w-auto min-w-0">
                                        <div className="w-16 h-16 sm:w-20 sm:h-20 bg-slate-50 rounded-2xl sm:rounded-3xl border border-slate-200/80 p-2.5 sm:p-3 shrink-0 flex items-center justify-center overflow-hidden shadow-inner">
                                            {university?.logo_url ? (
                                                <img src={university.logo_url} alt="Logo" className="w-full h-full object-contain" />
                                            ) : (
                                                <span className="text-2xl font-black text-teal-600">
                                                    {university?.name?.charAt(0)}
                                                </span>
                                            )}
                                        </div>

                                        <div className="min-w-0 flex-1 space-y-1">
                                            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-50 border border-teal-200 text-teal-800 text-[10px] font-black uppercase tracking-widest">
                                                <CheckCircle className="w-3.5 h-3.5 text-teal-600" />
                                                <span>Official University Portal</span>
                                            </div>
                                            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 tracking-tight break-words sm:truncate">
                                                {university?.name}
                                            </h1>
                                            <p className="text-slate-500 font-medium text-xs hidden sm:block">
                                                Curriculum syllabus, section-by-section past papers, and mock exams.
                                            </p>
                                        </div>
                                    </div>
                                    </div>

                                    {/* Action items */}
                                    <div className="flex items-center gap-3 relative z-10 w-full md:w-auto justify-end">
                                        {(!user?.institution_id) && (
                                            <button
                                                onClick={handleUnenroll}
                                                className="inline-flex items-center gap-2 px-4 py-2.5 bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border border-rose-100 shadow-xs cursor-pointer"
                                                title="Unenroll from this track"
                                            >
                                                <LogOut className="w-3.5 h-3.5" />
                                                <span>Unenroll</span>
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* ── 2. Tab Navigation Capsule ── */}
                                <div className="w-full">
                                    <div className="grid grid-cols-2 sm:inline-flex bg-white/90 backdrop-blur-xl p-1.5 rounded-2xl border border-slate-200/80 shadow-md shadow-slate-200/40 gap-1">
                                        {[
                                            { id: 'library', label: 'Curriculum & Library', icon: BookOpen },
                                            { id: 'exams', label: 'Mock Exam Arena', icon: FileText },
                                            { id: 'pattern', label: 'Official Test Pattern', icon: ShieldAlert },
                                            { id: 'insights', label: 'Diagnostic Insights', icon: BarChart }
                                        ].map((tab) => {
                                            const isActive = activeTab === tab.id;
                                            return (
                                                <button
                                                    key={tab.id}
                                                    onClick={() => setActiveTab(tab.id as any)}
                                                    className={`flex items-center justify-center gap-2 px-3 sm:px-6 py-2.5 sm:py-3 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-wider transition-all duration-200 cursor-pointer whitespace-nowrap ${isActive
                                                        ? 'bg-[#042f2e] text-white shadow-md'
                                                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                                                        }`}
                                                >
                                                    <tab.icon className={`w-3.5 h-3.5 ${isActive ? 'text-teal-400' : 'text-slate-400'}`} />
                                                    <span>{tab.label}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* ── 3. Tab: Examinations ── */}
                                {activeTab === 'exams' && (
                                    <div className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200/80 shadow-xl shadow-slate-200/30 space-y-8">
                                        <div className="flex items-center gap-4 pb-6 border-b border-slate-100">
                                            <div className="w-12 h-12 bg-teal-50 rounded-2xl flex items-center justify-center text-teal-600 border border-teal-200/80">
                                                <FileText className="w-6 h-6" />
                                            </div>
                                            <div>
                                                <h2 className="text-xl font-black text-slate-900 tracking-tight">Full-Length Entrance Mocks</h2>
                                                <p className="text-xs text-slate-500 font-medium">Timed mock exams replicating official university entrance conditions.</p>
                                            </div>
                                        </div>

                                        {exams.length > 0 ? (
                                            <div className="grid grid-cols-1 gap-4">
                                                {exams.map((exam) => (
                                                    <div
                                                        key={exam.id}
                                                        className="group p-6 bg-slate-50/70 hover:bg-white rounded-2xl border border-slate-200/80 hover:border-teal-300 hover:shadow-lg transition-all flex flex-col md:flex-row md:items-center justify-between gap-6"
                                                    >
                                                        <div className="space-y-2">
                                                            <div className="flex items-center gap-3">
                                                                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shadow-sm" />
                                                                <h3 className="font-black text-slate-900 text-base tracking-tight group-hover:text-teal-700 transition-colors">
                                                                    {exam.exam_name || exam.name}
                                                                </h3>
                                                                <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-200/70 text-slate-600 rounded-md uppercase">
                                                                    {exam.session_id || `#AX-${exam.id.toString().padStart(4, '0')}`}
                                                                </span>
                                                            </div>
                                                            <div className="flex flex-wrap items-center gap-y-1 gap-x-3 text-xs font-bold text-slate-500">
                                                                <span className="flex items-center gap-1.5">
                                                                    <Clock className="w-3.5 h-3.5 text-teal-600" />
                                                                    {exam.duration_minutes || exam.total_duration} Minutes
                                                                </span>
                                                                <span className="text-slate-300">•</span>
                                                                <span className="capitalize">
                                                                    {(exam.attempt_policy || (exam.allow_reattempt ? 'unrestricted' : 'single')).replace('_', ' ')} Policy
                                                                </span>
                                                                <span className="text-slate-300">•</span>
                                                                <span className="capitalize">
                                                                    {(exam.result_delivery || (exam.result_release_setting === 'instant' ? 'immediate' : 'deferred')).replace('_', ' ')} Delivery
                                                                </span>
                                                            </div>
                                                        </div>

                                                        <button
                                                            onClick={() => router.push(`/university/${uniId}/exam/${exam.id}`)}
                                                            className="shrink-0 px-6 py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-teal-600/20 active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                                                        >
                                                            <span>Start Exam</span>
                                                            <ArrowRight className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="py-16 text-center space-y-3">
                                                <div className="w-16 h-16 bg-teal-50 text-teal-600 rounded-2xl flex items-center justify-center mx-auto border border-teal-200">
                                                    <FileText className="w-8 h-8" />
                                                </div>
                                                <p className="font-black text-lg text-slate-900">Entrance Mocks In Preparation</p>
                                                <p className="text-xs text-slate-500 max-w-sm mx-auto">Official university mock papers are being compiled and verified by toppers.</p>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* ── 4. Tab: Curriculum Library ── */}
                                {activeTab === 'library' && (
                                    <div className="space-y-6">
                                        {/* Subject Filter Pills */}
                                        <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-3">
                                            {content.map((s) => {
                                                const Icon = getSubjectIcon(s.subject.name);
                                                const isSelected = selectedSubjectId === s.subject.id;
                                                const progress = calculateSubjectProgress(s.subject.id);
                                                return (
                                                    <button
                                                        key={s.subject.id}
                                                        onClick={() => setSelectedSubjectId(s.subject.id)}
                                                        className={`flex items-center gap-3 p-3.5 sm:px-5 sm:py-3.5 rounded-2xl border transition-all cursor-pointer ${isSelected
                                                            ? 'bg-teal-600 text-white border-teal-600 shadow-lg shadow-teal-600/20'
                                                            : 'bg-white text-slate-700 border-slate-200/80 hover:border-teal-300 hover:bg-slate-50'
                                                            }`}
                                                    >
                                                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${isSelected ? 'bg-white/20 text-white' : 'bg-teal-50 text-teal-600 border border-teal-200/80'}`}>
                                                            <Icon className="w-4 h-4" />
                                                        </div>
                                                        <div className="flex flex-col items-start min-w-0 text-left">
                                                            <span className="font-black text-xs tracking-tight truncate max-w-[120px] sm:max-w-none">{s.subject.name}</span>
                                                            <span className={`text-[10px] font-black uppercase tracking-wider ${isSelected ? 'text-teal-100' : 'text-slate-400'}`}>
                                                                {progress}% Mastered
                                                            </span>
                                                        </div>
                                                    </button>
                                                );
                                            })}
                                        </div>

                                        {/* Main Curriculum Content Area */}
                                        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xl shadow-slate-200/30 overflow-hidden">
                                            {/* Subject Title & Search Bar */}
                                            <div className="p-6 sm:p-8 border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                                <div className="space-y-1">
                                                    <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                                                        {activeSubject?.subject.name}
                                                    </h2>
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-32 h-2 bg-slate-100 rounded-full overflow-hidden">
                                                            <div
                                                                className="h-full bg-gradient-to-r from-teal-500 to-emerald-500 rounded-full transition-all duration-700"
                                                                style={{ width: `${calculateSubjectProgress(selectedSubjectId || 0)}%` }}
                                                            />
                                                        </div>
                                                        <span className="text-xs font-black text-teal-700">
                                                            {calculateSubjectProgress(selectedSubjectId || 0)}% Complete
                                                        </span>
                                                    </div>
                                                </div>

                                                <div className="relative w-full sm:w-72">
                                                    <input
                                                        type="text"
                                                        value={moduleSearch}
                                                        onChange={(e) => setModuleSearch(e.target.value)}
                                                        placeholder="Search topics or sections..."
                                                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 placeholder:text-slate-400 outline-none focus:bg-white focus:border-teal-500 transition-all"
                                                    />
                                                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                                </div>
                                            </div>

                                            {/* Topics List */}
                                            <div className="divide-y divide-slate-100">
                                                {activeSubject?.topics.map((topic, tIdx) => {
                                                    const hasSubtopics = topic.subtopics && topic.subtopics.length > 0;
                                                    const isExpanded = expandedTopic === topic.id;

                                                    const topicMatches = topic.name.toLowerCase().includes(moduleSearch.toLowerCase());
                                                    const subtopicMatches = topic.subtopics?.some(st => st.name.toLowerCase().includes(moduleSearch.toLowerCase()));
                                                    if (moduleSearch && !topicMatches && !subtopicMatches) return null;

                                                    return (
                                                        <div key={topic.id} className="flex flex-col">
                                                            <div
                                                                onClick={() => hasSubtopics && setExpandedTopic(isExpanded ? null : topic.id)}
                                                                className={`p-6 sm:p-7 hover:bg-slate-50/70 transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${hasSubtopics ? 'cursor-pointer' : ''}`}
                                                            >
                                                                <div className="flex items-center gap-4 flex-1 min-w-0">
                                                                    <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200/80 flex items-center justify-center text-teal-700 font-black text-xs shrink-0">
                                                                        {tIdx + 1}
                                                                    </div>
                                                                    <div className="space-y-0.5 min-w-0 flex-1">
                                                                        <h4 className="font-black text-slate-900 text-base tracking-tight truncate">
                                                                            {topic.name}
                                                                        </h4>
                                                                        <div className="flex items-center gap-2">
                                                                            {hasSubtopics ? (
                                                                                <span className="text-[11px] font-bold text-slate-400">
                                                                                    {topic.subtopics.length} Sections Inside
                                                                                </span>
                                                                            ) : (
                                                                                <span className="text-[11px] font-bold text-teal-600">
                                                                                    {topic.mcqCount || 0} Questions Available
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                {/* Control Actions */}
                                                                <div className="flex items-center gap-2 self-end md:self-center">
                                                                    {!hasSubtopics ? (
                                                                        <>
                                                                            <button
                                                                                onClick={(e) => { e.stopPropagation(); router.push(`/university/${uniId}/lesson/topic/${topic.id}`); }}
                                                                                className="px-4 py-2 bg-white text-slate-700 hover:text-teal-700 hover:bg-teal-50 rounded-xl text-xs font-black uppercase tracking-wider transition-all border border-slate-200 cursor-pointer flex items-center gap-1.5"
                                                                            >
                                                                                <BookOpen className="w-3.5 h-3.5" />
                                                                                <span>Theory</span>
                                                                            </button>
                                                                            {(topic.mcqCount || 0) > 0 && (
                                                                                <button
                                                                                    data-tour="practice-btn"
                                                                                    onClick={(e) => { e.stopPropagation(); router.push(`/university/${uniId}/practice/topic/${topic.id}`); }}
                                                                                    className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-teal-600/20 active:scale-95 flex items-center gap-1.5 cursor-pointer"
                                                                                >
                                                                                    <span>Practice</span>
                                                                                    <ArrowRight className="w-3.5 h-3.5" />
                                                                                </button>
                                                                            )}
                                                                        </>
                                                                    ) : (
                                                                        <div className="flex items-center gap-2 text-xs font-black text-teal-700 bg-teal-50 border border-teal-200/80 px-3 py-1.5 rounded-xl">
                                                                            <span>{isExpanded ? 'Collapse' : 'Explore'}</span>
                                                                            <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            {/* Subtopics Accordion Drawer */}
                                                            {hasSubtopics && isExpanded && (
                                                                <div className="bg-slate-50/60 border-t border-slate-100 divide-y divide-slate-100">
                                                                    {topic.subtopics.map((st, sIdx) => {
                                                                        const status = progressMap[st.id] || { isRead: false, isMastered: false };
                                                                        if (moduleSearch && !st.name.toLowerCase().includes(moduleSearch.toLowerCase()) && !topicMatches) return null;

                                                                        return (
                                                                            <div key={st.id} className="p-5 pl-12 sm:pl-16 hover:bg-white transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                                                                <div className="space-y-1 min-w-0 flex-1">
                                                                                    <div className="flex items-center gap-2">
                                                                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                                                                                            {tIdx + 1}.{sIdx + 1}
                                                                                        </span>
                                                                                        <h5 className="font-bold text-slate-800 text-sm tracking-tight truncate">
                                                                                            {st.name}
                                                                                        </h5>
                                                                                    </div>
                                                                                    <span className="text-[10px] font-bold text-teal-600">
                                                                                        {st.mcqCount || 0} Questions
                                                                                    </span>
                                                                                </div>

                                                                                <div className="flex items-center gap-2 self-end sm:self-center">
                                                                                    <button
                                                                                        onClick={() => router.push(`/university/${uniId}/lesson/${st.id}`)}
                                                                                        className="px-3.5 py-1.5 bg-white text-slate-700 hover:text-teal-700 hover:bg-teal-50 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all border border-slate-200 cursor-pointer flex items-center gap-1.5"
                                                                                    >
                                                                                        <BookOpen className="w-3 h-3" />
                                                                                        <span>Theory</span>
                                                                                    </button>
                                                                                    {(st.mcqCount || 0) > 0 && (
                                                                                        <button
                                                                                            data-tour="practice-btn"
                                                                                            onClick={() => router.push(`/university/${uniId}/practice/${st.id}`)}
                                                                                            className="px-4 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-[11px] font-black uppercase tracking-wider transition-all shadow-sm active:scale-95 flex items-center gap-1.5 cursor-pointer"
                                                                                        >
                                                                                            <span>Practice</span>
                                                                                            <ArrowRight className="w-3 h-3" />
                                                                                        </button>
                                                                                    )}
                                                                                </div>
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* ── 5. Tab: Test Pattern ── */}
                                {activeTab === 'pattern' && (
                                    <div className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200/80 shadow-xl shadow-slate-200/30 space-y-6">
                                        <div className="flex items-center gap-4 pb-6 border-b border-slate-100">
                                            <div className="w-12 h-12 bg-teal-50 rounded-2xl flex items-center justify-center text-teal-600 border border-teal-200/80">
                                                <ShieldAlert className="w-6 h-6" />
                                            </div>
                                            <div>
                                                <h2 className="text-xl font-black text-slate-900 tracking-tight">Official Test Pattern &amp; Weightage</h2>
                                                <p className="text-xs text-slate-500 font-medium">Entrance exam structure, time limits, and subject allocation.</p>
                                            </div>
                                        </div>

                                        {university?.test_pattern_markdown ? (
                                            <div className="prose prose-slate max-w-none">
                                                <MarkdownRenderer content={university.test_pattern_markdown} />
                                            </div>
                                        ) : (
                                            <div className="py-16 text-center space-y-3">
                                                <Info className="w-12 h-12 text-slate-300 mx-auto" />
                                                <p className="font-bold text-slate-700 text-sm">No Official Test Pattern Documented</p>
                                                <p className="text-xs text-slate-400">The syllabus pattern for this university will be published shortly.</p>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* ── 6. Tab: Diagnostic Insights ── */}
                                {activeTab === 'insights' && (
                                    <div className="space-y-6">
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                                            <div className="bg-white p-7 rounded-3xl border border-slate-200/80 shadow-xl shadow-slate-200/30 flex items-center gap-5">
                                                <div className="w-14 h-14 rounded-2xl bg-teal-50 text-teal-700 border border-teal-200/80 flex items-center justify-center shrink-0">
                                                    <Trophy className="w-7 h-7" />
                                                </div>
                                                <div>
                                                    <h3 className="text-3xl font-black text-slate-900">{stats?.avgScore || 0}%</h3>
                                                    <p className="text-[11px] font-black text-slate-400 uppercase tracking-wider">Average Mastery</p>
                                                </div>
                                            </div>

                                            <div className="bg-white p-7 rounded-3xl border border-slate-200/80 shadow-xl shadow-slate-200/30 flex items-center gap-5">
                                                <div className="w-14 h-14 rounded-2xl bg-teal-50 text-teal-700 border border-teal-200/80 flex items-center justify-center shrink-0">
                                                    <Clock3 className="w-7 h-7" />
                                                </div>
                                                <div>
                                                    <h3 className="text-3xl font-black text-slate-900">{stats?.totalTime || 0}m</h3>
                                                    <p className="text-[11px] font-black text-slate-400 uppercase tracking-wider">Time Invested</p>
                                                </div>
                                            </div>

                                            <div className="bg-white p-7 rounded-3xl border border-slate-200/80 shadow-xl shadow-slate-200/30 flex items-center gap-5">
                                                <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200/80 flex items-center justify-center shrink-0">
                                                    <GraduationCap className="w-7 h-7" />
                                                </div>
                                                <div>
                                                    <h3 className="text-3xl font-black text-slate-900">{stats?.totalSessions || 0}</h3>
                                                    <p className="text-[11px] font-black text-slate-400 uppercase tracking-wider">Practice Missions</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                    <Footer />
                </main>
            </div>
        </div>
    );
}
