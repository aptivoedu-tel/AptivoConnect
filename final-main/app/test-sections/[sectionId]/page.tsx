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
    Search,
    FlaskConical,
    Atom,
    Calculator,
    Languages,
    Target as TargetIcon,
    Activity
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

export default function TestSectionDetailPage() {
    const { isSidebarCollapsed } = useUI();
    const router = useRouter();
    const params = useParams();
    const sectionId = Number(params.sectionId);
    const { setLoading: setGlobalLoading } = useLoading();

    const [localLoading, setLocalLoading] = useState(true);
    const [user, setUser] = useState<any>(null);
    const [testSection, setTestSection] = useState<any>(null);
    const [content, setContent] = useState<ContentMap[]>([]);
    const [expandedTopic, setExpandedTopic] = useState<number | null>(null);
    const [activeTab, setActiveTab] = useState<'library' | 'insights' | 'exams' | 'pattern'>('library');
    const [stats, setStats] = useState<any>(null);
    const [exams, setExams] = useState<any[]>([]);
    const [progressMap, setProgressMap] = useState<Record<number, { isRead: boolean; isMastered: boolean }>>({});
    const [selectedSubjectId, setSelectedSubjectId] = useState<number | null>(null);
    const [moduleSearch, setModuleSearch] = useState('');
    const [contentLoading, setContentLoading] = useState(true);
    const [assignedTasks, setAssignedTasks] = useState<Record<string, { required_mcqs?: number, due_date?: string }>>({});

    useEffect(() => {
        if (isNaN(sectionId)) {
            toast.error("Invalid global exam ID");
            router.push('/test-sections');
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
                toast.error("Failed to load data.");
            } finally {
                setLocalLoading(false);
            }
        };

        init();
    }, [sectionId]);

    async function fetchData(userId: string) {
        try {
            // 1. Fetch Global Exam Details
            const res = await fetch(`/api/mongo/test-sections?id=${sectionId}`);
            if (res.ok) {
                const data = await res.json();
                const section = data.sections?.[0];

                if (!section) {
                    toast.error("Global Exam not found.");
                    router.push('/test-sections');
                    return;
                }
                setTestSection(section);
            }

            // 2. Load Content & Progress
            const institutionId = AuthService.getCurrentUser()?.institution_id || null;
            await Promise.all([
                loadContent(sectionId, userId),
                loadStudentProgress(userId),
                loadStats(userId),
                loadExams(sectionId),
                loadAssignedTasks(institutionId)
            ]);
        } catch (error) {
            console.error("Fetch data error:", error);
        }
    }

    // Refresh progress when practice session completes
    useEffect(() => {
        const handleProgressUpdate = () => {
            if (user?.id) {
                loadStudentProgress(user.id);
                loadStats(user.id);
            }
        };
        window.addEventListener('progressUpdated', handleProgressUpdate);
        return () => {
            window.removeEventListener('progressUpdated', handleProgressUpdate);
        };
    }, [user]);

    async function loadAssignedTasks(institutionId?: number | null) {
        if (!institutionId) return;
        try {
            const res = await fetch(`/api/mongo/institutions/tasks?institution_id=${institutionId}&test_section_id=${sectionId}`);
            if (res.ok) {
                const data = await res.json();
                const map: Record<string, { required_mcqs?: number, due_date?: string }> = {};
                data.tasks?.forEach((t: any) => {
                    map[`${t.type}-${t.target_id}`] = { required_mcqs: t.required_mcqs, due_date: t.due_date };
                });
                setAssignedTasks(map);
            }
        } catch (e) {
            console.error(e);
        }
    }

    async function loadContent(sectionId: number, userId: string) {
        setContentLoading(true);
        try {
            // Use the correct content-access API (mirrors university page logic)
            const res = await fetch(`/api/mongo/test-sections/content-access?test_section_id=${sectionId}`);
            if (!res.ok) {
                console.error('Content access API failed:', res.status);
                return;
            }
            const data = await res.json();
            const access = data.mappings || [];

            // Fetch MCQ counts scoped to this section
            const mcqRes = await fetch(`/api/mongo/mcqs?counts_only=true&test_section_id=${sectionId}`);
            const mcqData = await mcqRes.json();
            const counts = mcqData.counts || { subtopics: {}, topics: {}, universities: {} };
            const mcqSubtopicMap = counts.subtopics || {};
            const mcqTopicMap = counts.topics || {};

            // Build subject → topics → subtopics hierarchy
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
                            topic.subtopics.push({
                                ...row.subtopic,
                                mcqCount: mcqSubtopicMap[row.subtopic.id] || 0
                            });
                        }
                    }
                }
            });

            setContent(Array.from(subjectMap.values()));
        } catch (error) {
            console.error("Load content error:", error);
        } finally {
            setContentLoading(false);
        }
    }

    async function loadStudentProgress(userId: string) {
        const res = await fetch(`/api/mongo/progress?student_id=${userId}`);
        if (res.ok) {
            const data = await res.json();
            const sessionRes = await fetch(`/api/mongo/practice?student_id=${userId}&limit=1000`);
            if (sessionRes.ok) {
                const sessionData = await sessionRes.json();
                const masterySessions = (sessionData.sessions || []).filter((p: any) => {
                    const answeredQuestions = (p.total_questions || 0);
                    const correctAnswers = (p.correct_answers || 0);
                    return p.is_completed && answeredQuestions > 0 && correctAnswers > 0;
                });

                const map: Record<number, { isRead: boolean; isMastered: boolean }> = {};
                data.subtopic_progress?.forEach((r: any) => {
                    if (!map[r.subtopic_id]) map[r.subtopic_id] = { isRead: false, isMastered: false };
                    map[r.subtopic_id].isRead = r.is_completed;
                });
                data.topic_progress?.forEach((r: any) => {
                    if (!map[r.topic_id]) map[r.topic_id] = { isRead: false, isMastered: false };
                    map[r.topic_id].isRead = r.is_completed;
                });
                masterySessions.forEach((p: any) => {
                    const id = p.subtopic_id || p.topic_id;
                    if (id) {
                        if (!map[id]) map[id] = { isRead: false, isMastered: false };
                        map[id].isMastered = true;
                    }
                });
                setProgressMap(map);
            }
        }
    }

    async function loadStats(userId: string) {
        const res = await fetch(`/api/mongo/analytics?student_id=${userId}&test_section_id=${sectionId}`);
        if (res.ok) {
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
    }

    async function loadExams(sectionId: number) {
        const institutionId = AuthService.getCurrentUser()?.institution_id;
        const params = new URLSearchParams({ 
            test_section_id: String(sectionId), 
            active: 'true' 
        });
        
        if (institutionId) {
            params.set('institution_id', String(institutionId));
        } else {
            params.set('institution_id', 'null');
        }

        const res = await fetch(`/api/mongo/exams?${params.toString()}`);
        if (res.ok) {
            const data = await res.json();
            setExams(data.exams || []);
        }
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
        if (lowercase.includes('bio')) return TargetIcon;
        return BookOpen;
    };

    useEffect(() => {
        if (content.length > 0 && !selectedSubjectId) {
            setSelectedSubjectId(content[0].subject.id);
        }
    }, [content]);

    const activeSubject = content.find((s: any) => s.subject.id === selectedSubjectId);

    const handleUnenroll = async () => {
        if (!confirm('Are you sure you want to unenroll?')) return;
        try {
            // Implementation depends on API, for now placeholders
            toast.info("Unenrollment logic needs specific API endpoint.");
        } catch (e) {
            console.error(e);
        }
    };

    // --- Render Logic ---
    const renderLoading = () => (
        <div className="min-h-screen bg-slate-50 flex font-sans text-slate-800">
            <Sidebar userRole="student" />
            <div className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ${isSidebarCollapsed ? 'lg:ml-28' : 'lg:ml-80'}`}>
                <Header userName={user?.full_name} userEmail={user?.email} userAvatar={user?.avatar_url} />
                <main className="p-4 sm:p-6 lg:p-8 mt-28 lg:mt-24 overflow-x-hidden">
                    <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8">
                        <div className="animate-pulse space-y-8">
                            <div className="flex items-center gap-6 pb-6 border-b border-slate-100">
                                <div className="w-20 h-20 bg-slate-100 rounded-2xl" />
                                <div className="space-y-3">
                                    <div className="h-4 w-24 bg-slate-100 rounded" />
                                    <div className="h-10 w-64 bg-slate-100 rounded-xl" />
                                </div>
                            </div>
                            <div className="flex gap-4">
                                {[1, 2, 3, 4].map(i => <div key={i} className="h-12 w-32 bg-slate-100 rounded-xl" />)}
                            </div>
                            <div className="h-[400px] w-full bg-slate-50/50 rounded-[2.5rem] border border-dashed border-slate-100" />
                        </div>
                    </div>
                    <Footer />
                </main>
            </div>
        </div>
    );

    if (localLoading || !testSection || !user) return renderLoading();

    const completionPercent = calculateCompletion();

    return (
        <div className="min-h-screen bg-slate-50 flex font-sans text-slate-800">
            <Sidebar userRole="student" />
            <div className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ${isSidebarCollapsed ? 'lg:ml-28' : 'lg:ml-80'}`}>
                <Header userName={user?.full_name} userEmail={user?.email} userAvatar={user?.avatar_url} />

                <main className="p-4 sm:p-6 lg:p-8 mt-28 lg:mt-24 overflow-x-hidden">
                    <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8">
                        <div className="max-w-5xl mx-auto space-y-8 animate-fade-in">
                            <div className="bg-white rounded-3xl p-5 sm:p-8 border border-slate-200/80 shadow-xl shadow-slate-200/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                                <div className="flex flex-wrap items-start sm:items-center gap-3 sm:gap-6 w-full min-w-0">
                                    <Link
                                        href="/test-sections"
                                        className="w-10 h-10 sm:w-12 sm:h-12 border border-slate-200 rounded-xl sm:rounded-2xl flex items-center justify-center text-slate-400 hover:text-teal-600 hover:border-teal-600 transition-all shadow-sm bg-slate-50 shrink-0 self-start group"
                                    >
                                        <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6 group-hover:-translate-x-1 transition-transform" />
                                    </Link>
                                    <div className="flex items-center gap-3 sm:gap-6 w-full sm:w-auto flex-1 min-w-0">
                                        <div className="w-14 h-14 sm:w-20 sm:h-20 bg-white rounded-2xl shadow-xl shadow-teal-100/50 border border-slate-100 p-2 sm:p-3 shrink-0 flex items-center justify-center overflow-hidden">
                                            {testSection.logo_url ? (
                                                <img src={testSection.logo_url} alt="Logo" className="w-full h-full object-contain" />
                                            ) : (
                                                <span className="text-xl sm:text-2xl font-black text-teal-600">
                                                    {testSection.name?.substring(0, 1)}
                                                </span>
                                            )}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex flex-col">
                                                <span className="text-[9px] font-black text-teal-600 uppercase tracking-[0.2em] mb-0.5">Active Section</span>
                                                <h1 className="text-xl sm:text-3xl lg:text-4xl font-black text-slate-900 tracking-tight leading-tight break-words sm:truncate">
                                                    {testSection.name}
                                                </h1>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 w-full md:w-auto">
                                    <button
                                        onClick={handleUnenroll}
                                        className="w-full md:w-auto flex items-center justify-center px-4 py-2 sm:py-2.5 bg-rose-50 text-rose-600 rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-widest hover:bg-rose-600 hover:text-white transition-all border border-rose-100 shadow-sm"
                                    >
                                        <LogOut className="w-3.5 h-3.5 mr-2" />
                                        Unenroll
                                    </button>
                                </div>
                            </div>

                            <div className="w-full">
                                <div className="grid grid-cols-2 sm:inline-flex bg-slate-100/80 p-1 rounded-2xl border border-slate-200/50 gap-1">
                                        {[
                                            { id: 'library', label: 'Curriculum & Library', icon: BookOpen },
                                            { id: 'exams', label: 'Mock Exam Arena', icon: FileText },
                                            { id: 'pattern', label: 'Official Test Pattern', icon: ShieldAlert },
                                            { id: 'insights', label: 'Diagnostic Insights', icon: BarChart }
                                        ].map((tab) => (
                                            <button
                                                key={tab.id}
                                                onClick={() => setActiveTab(tab.id as any)}
                                                className={`flex items-center justify-center gap-2 px-2 sm:px-6 py-2.5 sm:py-3 rounded-xl text-[8px] sm:text-[10px] font-black tracking-wider sm:tracking-widest uppercase transition-all duration-300 ${activeTab === tab.id
                                                    ? 'bg-[#042f2e] text-white shadow-xl shadow-teal-200 translate-y-[-1px]'
                                                    : 'text-slate-500 hover:text-teal-900 hover:bg-white/50'
                                                    }`}
                                            >
                                                <tab.icon className={`w-3 h-3 sm:w-3.5 sm:h-3.5 ${activeTab === tab.id ? 'text-teal-400' : 'text-slate-400'}`} />
                                                {tab.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                            {activeTab === 'exams' ? (
                                <div className="max-w-[900px] mx-auto w-full animate-fade-in space-y-8">
                                    <div className="bg-white p-6 sm:p-10 rounded-3xl border border-slate-200/80 shadow-xl shadow-slate-200/30">
                                        <div className="flex items-center gap-4 mb-10 pb-6 border-b border-slate-50">
                                            <div className="w-12 h-12 bg-teal-50 rounded-xl flex items-center justify-center">
                                                <FileText className="w-6 h-6 text-teal-600" />
                                            </div>
                                            <div>
                                                <h2 className="text-xl font-black text-slate-800 tracking-tight">Official Assessments</h2>
                                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Standard academic assessments</p>
                                            </div>
                                        </div>

                                        {exams.length > 0 ? (
                                            <div className="grid grid-cols-1 gap-4">
                                                {exams.map((exam) => (
                                                    <div key={exam.id} className="group p-6 bg-slate-50/70 hover:bg-white rounded-2xl border border-slate-200/80 hover:border-teal-300 hover:shadow-lg transition-all flex flex-col md:flex-row md:items-center justify-between gap-6 text-left">
                                                        <div className="space-y-1">
                                                            <div className="flex items-center gap-3">
                                                                <div className="flex items-center gap-2">
                                                                    <div className="w-2 h-2 rounded-full bg-teal-500 animate-pulse shadow-[0_0_8px_rgba(20,184,166,0.5)]" />
                                                                    <h3 className="font-bold text-slate-900 group-hover:text-teal-600 transition-colors tracking-tight">{exam.name}</h3>
                                                                </div>
                                                                <span className="text-[10px] font-medium py-0.5 px-2 bg-slate-100 text-slate-500 rounded uppercase tracking-tighter tabular-nums">
                                                                    ID: {`#AX-${exam.id.toString().padStart(4, '0')}`}
                                                                </span>
                                                            </div>
                                                            <div className="flex flex-wrap items-center gap-y-1 gap-x-3 text-[11px] font-bold text-slate-400">
                                                                <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> {exam.total_duration} Minutes</span>
                                                                <span className="text-slate-200">•</span>
                                                                <span className="flex items-center gap-1.5 capitalize">{(exam.exam_type || 'standard').replace('_', ' ')} Category</span>
                                                            </div>
                                                        </div>
                                                        <button
                                                            onClick={() => router.push(`/test-sections/${sectionId}/exam/${exam.id}`)}
                                                            className="shrink-0 px-6 py-3 bg-teal-600 text-white rounded-xl text-xs font-black uppercase tracking-wider hover:bg-teal-700 active:scale-95 transition-all shadow-md shadow-teal-600/20"
                                                        >
                                                            Start Exam
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="py-20 text-center space-y-4 flex flex-col items-center">
                                                <div className="w-64 h-64 mb-4 relative">
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
                                                    <div className="hidden w-16 h-16 bg-teal-50 rounded-full items-center justify-center mx-auto relative z-10">
                                                        <FileText className="w-8 h-8 text-teal-200" />
                                                    </div>
                                                </div>
                                                <div>
                                                    <p className="font-black text-2xl text-slate-900">Coming Soon</p>
                                                    <p className="text-sm font-medium text-slate-400 mt-2">Global tests and examinations are being prepared.</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ) : activeTab === 'library' ? (
                                <div className="flex flex-col gap-8 min-h-[600px] animate-fade-in">
                                    {/* Subjects Selection */}
                                    <div className="w-full">
                                        <div className="flex flex-col md:flex-row items-center gap-2 sm:gap-4 p-3 bg-white rounded-3xl border border-slate-200/80 shadow-xl shadow-slate-200/30">
                                            <div className="px-6 py-3 border-r border-slate-100 hidden md:block">
                                                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] whitespace-nowrap">Core Subjects</h3>
                                            </div>
                                            <div className="w-full md:w-auto grid grid-cols-2 lg:flex items-center gap-2 px-1">
                                                {content.map((s) => {
                                                    const Icon = getSubjectIcon(s.subject.name);
                                                    const isSelected = selectedSubjectId === s.subject.id;
                                                    const progress = calculateSubjectProgress(s.subject.id);
                                                    return (
                                                        <button
                                                            key={s.subject.id}
                                                            onClick={() => setSelectedSubjectId(s.subject.id)}
                                                            className={`flex items-center gap-2 sm:gap-3 px-3 sm:px-6 py-3 rounded-xl sm:rounded-2xl transition-all duration-300 group ${isSelected
                                                                ? 'bg-teal-600 text-white shadow-lg shadow-teal-900/10 scale-[1.02]'
                                                                : 'hover:bg-slate-50 text-slate-600 border border-transparent hover:border-slate-100'
                                                                }`}
                                                        >
                                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${isSelected ? 'bg-white/20' : 'bg-slate-100'}`}>
                                                                <Icon className={`w-4 h-4 ${isSelected ? 'text-white' : 'text-teal-600'}`} />
                                                            </div>
                                                            <div className="flex flex-col items-start min-w-0">
                                                                <span className="font-bold text-[11px] sm:text-sm tracking-tight truncate w-full">{s.subject.name}</span>
                                                                <div className="flex items-center gap-1">
                                                                    {contentLoading ? (
                                                                        <span className={`text-[8px] font-black px-1 rounded animate-pulse ${isSelected ? 'bg-white/20 text-transparent' : 'bg-slate-100 text-transparent'}`}>
                                                                            —
                                                                        </span>
                                                                    ) : (
                                                                        <span className={`text-[8px] font-black px-1 rounded ${isSelected ? 'bg-white/20 text-white' : 'bg-teal-50 text-teal-600'}`}>
                                                                            {progress}%
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Main Content Area */}
                                    <div className="w-full bg-white rounded-3xl border border-slate-200/80 overflow-hidden flex flex-col shadow-xl shadow-slate-200/30">
                                        <div className="p-6 sm:p-8 lg:p-10 border-b border-slate-50 space-y-6">
                                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 sm:gap-6">
                                                <div className="space-y-1 sm:space-y-2">
                                                    <h2 className="text-xl sm:text-3xl font-black text-slate-900 tracking-tight">
                                                        {activeSubject?.subject.name}
                                                    </h2>
                                                    <div className="flex items-center gap-4">
                                                        {contentLoading ? (
                                                            <div className="flex items-center gap-4 animate-pulse">
                                                                <div className="h-1.5 w-32 bg-slate-200 rounded-full" />
                                                                <div className="h-3 w-24 bg-slate-200 rounded-full" />
                                                            </div>
                                                        ) : (
                                                            <>
                                                                <div className="flex-1 h-1.5 w-32 bg-slate-100 rounded-full overflow-hidden">
                                                                    <div
                                                                        className="h-full bg-teal-500 transition-all duration-1000"
                                                                        style={{ width: `${calculateSubjectProgress(selectedSubjectId || 0)}%` }}
                                                                    />
                                                                </div>
                                                                <span className="text-xs font-black text-teal-600 uppercase tracking-widest tabular-nums">
                                                                    {calculateSubjectProgress(selectedSubjectId || 0)}% Complete
                                                                </span>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="relative group w-full md:max-w-xs">
                                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-teal-600 transition-colors" />
                                                    <input
                                                        value={moduleSearch}
                                                        onChange={(e) => setModuleSearch(e.target.value)}
                                                        placeholder="Search modules..."
                                                        className="w-full pl-12 pr-6 py-3.5 sm:py-4 bg-slate-50/50 border border-slate-100 rounded-2xl sm:rounded-[1.5rem] text-sm font-bold text-slate-900 outline-none focus:ring-4 focus:ring-teal-500/5 focus:bg-white transition-all placeholder:text-slate-300"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex-1 overflow-auto">
                                            {activeSubject ? (
                                                <div className="min-w-full">
                                                    <div className="hidden md:grid grid-cols-12 gap-4 px-10 py-5 border-b border-slate-50 bg-slate-50/30 sticky top-0 z-10 backdrop-blur-sm">
                                                        <div className="col-span-3 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Status</div>
                                                        <div className="col-span-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Module Details</div>
                                                        <div className="col-span-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Control</div>
                                                    </div>
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
                                                                        className={`grid grid-cols-1 md:grid-cols-12 gap-4 items-center px-8 lg:px-10 py-6 hover:bg-slate-50/50 transition-all group ${hasSubtopics ? 'cursor-pointer' : ''}`}
                                                                    >
                                                                        <div className="col-span-3 flex items-center gap-2">
                                                                            {!hasSubtopics ? (
                                                                                (() => {
                                                                                    const status = progressMap[topic.id] || { isRead: false, isMastered: false };
                                                                                    return status.isMastered ? (
                                                                                        <div className="flex items-center gap-2 text-teal-600 bg-teal-50 px-3 py-1.5 rounded-xl border border-teal-100/50">
                                                                                            <CheckCircle className="w-3.5 h-3.5" />
                                                                                            <span className="text-[10px] font-black uppercase tracking-widest">Mastered</span>
                                                                                        </div>
                                                                                    ) : status.isRead ? (
                                                                                        <div className="flex items-center gap-2 text-amber-500 bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-100/50">
                                                                                            <Clock className="w-3.5 h-3.5" />
                                                                                            <span className="text-[10px] font-black uppercase tracking-widest">Reading</span>
                                                                                        </div>
                                                                                    ) : (
                                                                                        <div className="flex items-center gap-2 text-slate-400 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100">
                                                                                            <Clock className="w-3.5 h-3.5" />
                                                                                            <span className="text-[10px] font-black uppercase tracking-widest">Pending</span>
                                                                                        </div>
                                                                                    );
                                                                                })()
                                                                            ) : (
                                                                                <div className="flex items-center gap-2 text-teal-600 bg-teal-50 px-3 py-1.5 rounded-xl border border-teal-100/50">
                                                                                    <BookOpen className="w-3.5 h-3.5" />
                                                                                    <span className="text-[10px] font-black uppercase tracking-widest">Module</span>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                        <div className="col-span-5 flex items-center gap-6">
                                                                            <span className="hidden md:block text-xs font-black text-slate-200 w-6 tabular-nums">{tIdx + 1}</span>
                                                                            <div className="flex items-center gap-3">
                                                                                <div>
                                                                                    <p className={`font-bold text-slate-900 transition-colors leading-tight ${hasSubtopics ? 'group-hover:text-teal-700' : 'group-hover:text-teal-600'}`}>{topic.name}</p>
                                                                                    {hasSubtopics && (
                                                                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{topic.subtopics.length} Sections inside</p>
                                                                                    )}
                                                                                    {assignedTasks[`topic-${topic.id}`] && (
                                                                                        <div className="mt-1 flex flex-wrap items-center gap-2">
                                                                                            <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-teal-600 text-white rounded text-[8px] font-black uppercase tracking-widest shadow-sm">
                                                                                                <TargetIcon className="w-2.5 h-2.5" />
                                                                                                Required Task
                                                                                            </div>
                                                                                            {assignedTasks[`topic-${topic.id}`].required_mcqs && (
                                                                                                <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-500 text-white rounded text-[8px] font-black uppercase tracking-widest shadow-sm">
                                                                                                    <CheckCircle className="w-2.5 h-2.5" />
                                                                                                    {assignedTasks[`topic-${topic.id}`].required_mcqs} MCQs
                                                                                                </div>
                                                                                            )}
                                                                                            {assignedTasks[`topic-${topic.id}`].due_date && (
                                                                                                <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-rose-500 text-white rounded text-[8px] font-black uppercase tracking-widest shadow-sm">
                                                                                                    <Clock className="w-2.5 h-2.5" />
                                                                                                    Due {new Date(assignedTasks[`topic-${topic.id}`].due_date!).toLocaleDateString()}
                                                                                                </div>
                                                                                            )}
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                                {hasSubtopics && (
                                                                                    <div className={`transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
                                                                                        <ChevronDown className="w-4 h-4 text-slate-400" />
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                        <div className="col-span-4 flex items-center justify-end gap-3">
                                                                            {!hasSubtopics ? (
                                                                                <>
                                                                                    <button
                                                                                        onClick={(e) => { e.stopPropagation(); router.push(`/test-sections/${sectionId}/lesson/topic/${topic.id}`); }}
                                                                                        className="flex items-center gap-2.5 px-5 py-2.5 bg-white text-slate-600 hover:text-teal-600 hover:bg-teal-50 rounded-xl transition-all border border-slate-100 hover:border-teal-100 group/read"
                                                                                    >
                                                                                        <BookOpen className="w-4 h-4 text-slate-400 group-hover/read:text-teal-600 transition-colors" />
                                                                                        <span className="text-[10px] font-black uppercase tracking-widest">Read</span>
                                                                                    </button>
                                                                                    {(topic.mcqCount || 0) > 0 && (
                                                                                        <button
                                                                                            onClick={(e) => { e.stopPropagation(); router.push(`/test-sections/${sectionId}/practice/topic/${topic.id}`); }}
                                                                                            className="px-6 py-2.5 bg-teal-600 text-white rounded-xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-teal-700 active:scale-95 transition-all shadow-lg shadow-teal-900/10 flex items-center gap-2.5"
                                                                                        >
                                                                                            Practice <ArrowRight className="w-3.5 h-3.5" />
                                                                                        </button>
                                                                                    )}
                                                                                </>
                                                                            ) : (
                                                                                <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest px-4">{isExpanded ? 'Collapse' : 'Expand'}</span>
                                                                            )}
                                                                        </div>
                                                                    </div>

                                                                    {hasSubtopics && isExpanded && (
                                                                        <div className="bg-slate-50/30 border-y border-slate-50 animate-slide-down">
                                                                            {topic.subtopics.map((st, sIdx) => {
                                                                                const status = progressMap[st.id] || { isRead: false, isMastered: false };
                                                                                if (moduleSearch && !st.name.toLowerCase().includes(moduleSearch.toLowerCase()) && !topicMatches) return null;

                                                                                return (
                                                                                    <div key={st.id} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center px-12 lg:px-14 py-5 hover:bg-white transition-all group/sub">
                                                                                        <div className="col-span-3 flex items-center gap-2">
                                                                                            {status.isMastered ? (
                                                                                                <div className="flex items-center gap-2 text-teal-600 bg-white px-3 py-1.5 rounded-xl border border-teal-100/50 shadow-sm">
                                                                                                    <CheckCircle className="w-3.5 h-3.5" />
                                                                                                    <span className="text-[10px] font-black uppercase tracking-widest">Mastered</span>
                                                                                                </div>
                                                                                            ) : status.isRead ? (
                                                                                                <div className="flex items-center gap-2 text-amber-500 bg-white px-3 py-1.5 rounded-xl border border-amber-100/50 shadow-sm">
                                                                                                    <Clock className="w-3.5 h-3.5" />
                                                                                                    <span className="text-[10px] font-black uppercase tracking-widest">Reading</span>
                                                                                                </div>
                                                                                            ) : (
                                                                                                <div className="flex items-center gap-2 text-slate-400 bg-white px-3 py-1.5 rounded-xl border border-slate-100 shadow-sm">
                                                                                                    <Clock className="w-3.5 h-3.5" />
                                                                                                    <span className="text-[10px] font-black uppercase tracking-widest">Pending</span>
                                                                                                </div>
                                                                                            )}
                                                                                        </div>
                                                                                        <div className="col-span-5 flex items-center gap-4">
                                                                                            <div className="w-1 h-8 bg-slate-100 rounded-full" />
                                                                                            <div>
                                                                                                <p className="font-bold text-slate-700 group-hover/sub:text-teal-600 transition-colors leading-tight">{st.name}</p>
                                                                                                <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.2em] mt-1">Section {tIdx + 1}.{sIdx + 1}</p>
                                                                                                {assignedTasks[`subtopic-${st.id}`] && (
                                                                                                    <div className="mt-1 flex flex-wrap items-center gap-2">
                                                                                                        <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-teal-600 text-white rounded text-[8px] font-black uppercase tracking-widest shadow-sm">
                                                                                                            <TargetIcon className="w-2.5 h-2.5" />
                                                                                                            Required Task
                                                                                                        </div>
                                                                                                        {assignedTasks[`subtopic-${st.id}`].required_mcqs && (
                                                                                                            <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-500 text-white rounded text-[8px] font-black uppercase tracking-widest shadow-sm">
                                                                                                                <CheckCircle className="w-2.5 h-2.5" />
                                                                                                                {assignedTasks[`subtopic-${st.id}`].required_mcqs} MCQs
                                                                                                            </div>
                                                                                                        )}
                                                                                                        {assignedTasks[`subtopic-${st.id}`].due_date && (
                                                                                                            <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-rose-500 text-white rounded text-[8px] font-black uppercase tracking-widest shadow-sm">
                                                                                                                <Clock className="w-2.5 h-2.5" />
                                                                                                                Due {new Date(assignedTasks[`subtopic-${st.id}`].due_date!).toLocaleDateString()}
                                                                                                            </div>
                                                                                                        )}
                                                                                                    </div>
                                                                                                )}
                                                                                            </div>
                                                                                        </div>
                                                                                        <div className="col-span-4 flex items-center justify-end gap-3">
                                                                                            <button
                                                                                                onClick={() => router.push(`/test-sections/${sectionId}/lesson/${st.id}`)}
                                                                                                className="flex items-center gap-2.5 px-4 py-2 bg-white text-slate-600 hover:text-teal-600 hover:bg-teal-50 rounded-xl transition-all border border-slate-100 hover:border-teal-100 group/read"
                                                                                             >
                                                                                                <BookOpen className="w-3.5 h-3.5 text-slate-400 group-hover/read:text-teal-600 transition-colors" />
                                                                                                <span className="text-[10px] font-black uppercase tracking-widest">Read</span>
                                                                                            </button>
                                                                                            {(st.mcqCount || 0) > 0 && (
                                                                                                <button
                                                                                                    onClick={() => router.push(`/test-sections/${sectionId}/practice/${st.id}`)}
                                                                                                    className="px-5 py-2 bg-teal-600 text-white rounded-xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-teal-700 active:scale-95 transition-all shadow-md flex items-center gap-2"
                                                                                                >
                                                                                                    Practice <ArrowRight className="w-3 h-3" />
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
                                            ) : (
                                                <div className="py-20 text-center">
                                                    <BookOpen className="w-16 h-16 text-slate-100 mx-auto mb-4" />
                                                    <p className="font-bold text-slate-900 italic">Curriculum content is being updated...</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ) : activeTab === 'pattern' ? (
                                <div className="bg-white rounded-3xl p-6 sm:p-8 md:p-12 border border-slate-200/80 shadow-xl shadow-slate-200/30 relative overflow-hidden text-left">
                                    <div className="absolute top-0 right-0 w-64 h-64 bg-teal-50 rounded-full -translate-y-1/2 translate-x-1/2 opacity-50" />
                                    <div className="relative z-10 prose prose-slate max-w-none">
                                        <div className="flex items-center gap-4 mb-10 pb-6 border-b border-slate-50">
                                            <div className="w-12 h-12 bg-teal-50 rounded-xl flex items-center justify-center">
                                                <ShieldAlert className="w-6 h-6 text-teal-600" />
                                            </div>
                                            <div>
                                                <h2 className="text-xl font-black text-slate-800 tracking-tight">Test Section Pattern</h2>
                                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Official examination structure</p>
                                            </div>
                                        </div>
                                        {testSection.test_pattern_markdown ? (
                                            <MarkdownRenderer content={testSection.test_pattern_markdown} />
                                        ) : (
                                            <div className="text-center py-20 bg-slate-50/50 rounded-3xl border border-dashed border-slate-200">
                                                <TargetIcon className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                                                <p className="text-slate-500 font-medium italic uppercase tracking-widest text-[10px]">No official test pattern documented yet.</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ) : activeTab === 'insights' ? (
                                <div className="space-y-8 animate-fade-in text-left">
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-xl shadow-slate-200/30 flex flex-col items-center text-center group hover:border-teal-300 transition-all">
                                            <div className="w-16 h-16 bg-teal-50 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                                <Trophy className="w-8 h-8 text-teal-600" />
                                            </div>
                                            <h3 className="text-3xl font-black text-slate-900 mb-1">{stats?.avgScore || 0}%</h3>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Average Mastery</p>
                                        </div>
                                        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-xl shadow-slate-200/30 flex flex-col items-center text-center group hover:border-teal-300 transition-all">
                                            <div className="w-16 h-16 bg-teal-50 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                                <Clock3 className="w-8 h-8 text-teal-600" />
                                            </div>
                                            <h3 className="text-3xl font-black text-slate-900 mb-1">{stats?.totalTime || 0}m</h3>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Time Invested</p>
                                        </div>
                                        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-xl shadow-slate-200/30 flex flex-col items-center text-center group hover:border-amber-200 transition-all">
                                            <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                                <GraduationCap className="w-8 h-8 text-amber-600" />
                                            </div>
                                            <h3 className="text-3xl font-black text-slate-900 mb-1">{stats?.totalSessions || 0}</h3>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Sessions</p>
                                        </div>
                                    </div>
                                    
                                    <div className="bg-white p-6 sm:p-8 lg:p-12 rounded-3xl border border-slate-200/80 shadow-xl shadow-slate-200/30">
                                        <div className="flex items-center gap-4 mb-10 pb-6 border-b border-slate-50">
                                            <div className="w-12 h-12 bg-teal-50 rounded-xl flex items-center justify-center">
                                                <Activity className="w-6 h-6 text-teal-600" />
                                            </div>
                                            <div>
                                                <h2 className="text-xl font-black text-slate-800 tracking-tight">Recent Activity</h2>
                                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Your latest learning progress</p>
                                            </div>
                                        </div>

                                        {stats?.recentActivity && stats.recentActivity.length > 0 ? (
                                            <div className="space-y-4">
                                                {stats.recentActivity.map((activity: any, idx: number) => (
                                                    <div key={idx} className="flex items-center justify-between p-5 bg-slate-50/50 hover:bg-slate-50 rounded-2xl border border-slate-100 transition-colors">
                                                        <div className="flex items-center gap-4">
                                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${activity.type === 'exam' ? 'bg-amber-100 text-amber-600' : 'bg-teal-100 text-teal-600'}`}>
                                                                {activity.type === 'exam' ? <FileText className="w-5 h-5" /> : <BookOpen className="w-5 h-5" />}
                                                            </div>
                                                            <div>
                                                                <h4 className="font-bold text-slate-900">{activity.title}</h4>
                                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">
                                                                    {new Date(activity.date).toLocaleDateString()} • {activity.type}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                                                            <div className="font-black text-lg text-slate-900">{activity.score}%</div>
                                                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Score</div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="text-center py-12 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                                                <Activity className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                                                <p className="font-bold text-slate-500">No recent activity</p>
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Start practicing to see insights</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ) : null}
                        </div>
                    </div>
                    <Footer />
                </main>
            </div>
        </div>
    );
}
