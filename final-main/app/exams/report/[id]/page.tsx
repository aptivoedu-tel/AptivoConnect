'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AuthService } from '@/lib/services/authService';
import {
    Clock, ChevronLeft, CheckCircle, Info, GraduationCap, ArrowLeft, Trophy,
    Calendar, Target, Activity, AlertCircle, Bookmark
} from 'lucide-react';
import { toast } from 'sonner';
import { useLoading } from '@/lib/context/LoadingContext';
import MarkdownRenderer from '@/components/shared/MarkdownRenderer';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import Footer from '@/components/shared/Footer';
import { useUI } from '@/lib/context/UIContext';

export default function ExamReportPage() {
    const { id: attemptId } = useParams();
    const router = useRouter();
    const { setLoading: setGlobalLoading } = useLoading();
    const { isSidebarCollapsed } = useUI();

    const [user, setUser] = useState<any>(null);
    const [attempt, setAttempt] = useState<any>(null);
    const [exam, setExam] = useState<any>(null);
    const [sections, setSections] = useState<any[]>([]);
    const [questions, setQuestions] = useState<any[]>([]);
    const [answers, setAnswers] = useState<Record<number, any>>({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const init = async () => {
            const u = AuthService.getCurrentUser() || await AuthService.syncSession();
            if (!u) {
                router.push('/login');
                return;
            }
            setUser(u);
            await loadReportData();
        };

        init();

        // Prevent copying and screenshots
        const preventCopy = (e: ClipboardEvent) => { e.preventDefault(); toast.error("Copying is disabled."); };
        const preventContextMenu = (e: MouseEvent) => { e.preventDefault(); };
        const preventKeys = (e: KeyboardEvent) => {
            if (
                (e.ctrlKey && e.key === 'c') || 
                (e.ctrlKey && e.shiftKey && e.key === 'I') || 
                e.key === 'F12' || 
                (e.ctrlKey && e.key === 'u') ||
                e.key === 'PrintScreen' ||
                (e.metaKey && e.shiftKey && (e.key === 's' || e.key === 'S' || e.key === '3' || e.key === '4' || e.key === '5'))
            ) {
                e.preventDefault();
                navigator.clipboard.writeText('');
                toast.error("Security policy blocks this action (Screenshots/Copying disabled).");
            }
        };
        const preventKeyUp = (e: KeyboardEvent) => {
            if (e.key === 'PrintScreen') {
                navigator.clipboard.writeText('');
                toast.error("Screenshots are disabled.");
            }
        };

        document.addEventListener('copy', preventCopy);
        document.addEventListener('contextmenu', preventContextMenu);
        document.addEventListener('keydown', preventKeys);
        document.addEventListener('keyup', preventKeyUp);

        return () => {
            document.removeEventListener('copy', preventCopy);
            document.removeEventListener('contextmenu', preventContextMenu);
            document.removeEventListener('keydown', preventKeys);
            document.removeEventListener('keyup', preventKeyUp);
        };
    }, [attemptId]);

    const loadReportData = async () => {
        setGlobalLoading(true, 'Analyzing Performance Data...');
        try {
            const res = await fetch(`/api/mongo/exams/report?attempt_id=${attemptId}`);
            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.error || 'Failed to load report');
            }
            const data = await res.json();
            
            setAttempt(data.attempt);
            setExam(data.exam);
            setSections(data.sections || []);
            setQuestions(data.questions || []);
            setAnswers(data.answersMap || {});

        } catch (err: any) {
            console.error('Failed to load report', err);
            toast.error(err.message || 'Failed to load report');
        } finally {
            setLoading(false);
            setGlobalLoading(false);
        }
    };

    if (loading || !attempt) return null;

    const scorePercentage = attempt ? Math.round((attempt.score / attempt.total_marks) * 100) : 0;

    return (
        <div className="min-h-screen bg-slate-50 font-sans">
            <Sidebar userRole={user?.role || 'student'} />
            <Header userName={user?.full_name || user?.name} userAvatar={user?.avatar_url} />

            <main className={`${isSidebarCollapsed ? 'lg:ml-28' : 'lg:ml-80'} pt-28 lg:pt-24 p-4 sm:p-6 lg:p-10 transition-all duration-300`}>
                <div className="max-w-6xl mx-auto space-y-12">
                    
                    {/* Header Action */}
                    <div className="flex items-center justify-between">
                        <button 
                            onClick={() => router.back()}
                            className="flex items-center gap-2 text-slate-500 hover:text-teal-600 font-bold transition-all group"
                        >
                            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                            Back to Activity
                        </button>
                        <div className="flex items-center gap-3">
                            <span className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-black uppercase tracking-widest">
                                Global Exam Report
                            </span>
                        </div>
                    </div>

                    {/* Result Hero Card */}
                    <div className="bg-white rounded-[3rem] p-6 sm:p-10 lg:p-16 shadow-2xl border border-slate-100 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-80 h-80 bg-teal-50 rounded-full -translate-y-1/2 translate-x-1/2 opacity-40" />
                        <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-12">
                            <div className="text-center lg:text-left flex-1">
                                <div className="inline-flex items-center gap-2 px-3 py-1 bg-teal-50 text-teal-600 rounded-full text-[10px] font-black uppercase tracking-[0.2em] mb-6">
                                    <Trophy className="w-3 h-3" />
                                    Performance Analytics
                                </div>
                                <h1 className="text-4xl lg:text-5xl font-black text-slate-900 leading-tight mb-4">{exam?.name}</h1>
                                <div className="flex flex-wrap justify-center lg:justify-start gap-6 text-slate-500 font-bold">
                                    <div className="flex items-center gap-2">
                                        <Calendar className="w-4 h-4 text-slate-300" />
                                        {new Date(attempt.created_at || attempt.start_time).toLocaleDateString()}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Clock className="w-4 h-4 text-slate-300" />
                                        {Math.floor(attempt.time_spent_seconds / 60) || 0}m invested
                                    </div>
                                    <div className="flex items-center gap-2 text-teal-600">
                                        <Target className="w-4 h-4" />
                                        {attempt.score} / {attempt.total_marks} Marks
                                    </div>
                                </div>
                            </div>

                            <div className="relative w-56 h-56 shrink-0">
                                <svg className="absolute inset-0 w-full h-full -rotate-90">
                                    <circle
                                        cx="112" cy="112" r="95"
                                        fill="none"
                                        stroke="#f1f5f9"
                                        strokeWidth="16"
                                    />
                                    <circle
                                        cx="112" cy="112" r="95"
                                        fill="none"
                                        stroke="#0d9488"
                                        strokeWidth="16"
                                        strokeDasharray={`${(scorePercentage * 597) / 100} 597`}
                                        strokeLinecap="round"
                                        className="transition-all duration-[2s] ease-out shadow-lg"
                                    />
                                </svg>
                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                    <span className="text-5xl font-black text-teal-600">{scorePercentage}%</span>
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Mastery Score</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Section Breakdown Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {sections.map((section: any, idx: number) => {
                            const sectionScores = attempt.section_scores?.[section.id];
                            
                            const sectionQs = questions.filter(q => q.section_id === section.id);
                            let correct = sectionScores?.correct || 0;
                            let total = sectionScores?.total || sectionQs.length;
                            let wrong = sectionScores?.wrong || 0;
                            let skipped = sectionScores?.skipped || 0;
                            
                            if (!sectionScores && sectionQs.length > 0) {
                                sectionQs.forEach(q => {
                                    const studentAns = answers[q.id]?.answer;
                                    if (studentAns !== undefined && studentAns !== null && studentAns !== '' && (Array.isArray(studentAns) ? studentAns.length > 0 : true)) {
                                         if (q.correct_answer !== undefined && String(studentAns) === String(q.correct_answer)) correct++;
                                         else wrong++;
                                    } else {
                                         skipped++;
                                    }
                                });
                            }

                            const sectionAcc = total > 0 ? Math.round((correct / total) * 100) : 0;

                            return (
                                <div key={section.id} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:border-teal-100 transition-all group">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="w-10 h-10 bg-slate-50 text-slate-400 group-hover:bg-teal-50 group-hover:text-teal-600 rounded-xl flex items-center justify-center transition-all">
                                            <Bookmark className="w-5 h-5" />
                                        </div>
                                        <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest group-hover:text-teal-400 transition-colors">Section {idx + 1}</span>
                                    </div>
                                    <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider mb-4 line-clamp-1">{section.name}</h4>
                                    
                                    {/* Stats row */}
                                    <div className="flex items-center justify-between mb-4 text-[10px] font-black uppercase tracking-widest">
                                        <div className="flex items-center gap-1.5 text-teal-600">
                                            <CheckCircle className="w-3 h-3" /> {correct}
                                        </div>
                                        <div className="flex items-center gap-1.5 text-rose-500">
                                            <Activity className="w-3 h-3" /> {wrong}
                                        </div>
                                        <div className="flex items-center gap-1.5 text-slate-400">
                                            <AlertCircle className="w-3 h-3" /> {skipped}
                                        </div>
                                    </div>

                                    <div className="h-1.5 w-full bg-slate-50 rounded-full overflow-hidden">
                                        <div 
                                            className="h-full bg-teal-500 rounded-full transition-all duration-1000 delay-500"
                                            style={{ width: `${sectionAcc}%` }}
                                        />
                                    </div>
                                    <div className="mt-3 flex justify-between text-[10px] font-black text-slate-400 uppercase tracking-tighter">
                                        <span>{sectionAcc}% Accuracy</span>
                                        <span>{total} Total</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Detailed Question Analysis */}
                    <div className="space-y-8">
                        <div className="flex items-center gap-4">
                            <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.4em]">Granular Answer Analysis</h2>
                            <div className="h-px flex-1 bg-slate-200" />
                        </div>

                        {sections.map((section: any) => {
                            const sectionQs = questions.filter(q => q.section_id === section.id);
                            return (
                                <div key={section.id} className="space-y-6">
                                    <div className="bg-slate-900 text-white px-8 py-3 rounded-2xl inline-block text-[10px] font-black uppercase tracking-widest shadow-xl">
                                        {section.name}
                                    </div>
                                    
                                    <div className="space-y-8">
                                        {sectionQs.map((q: any, idx: number) => {
                                            const studentAns = answers[q.id]?.answer;
                                            const isCorrect = studentAns !== undefined && studentAns !== null && studentAns !== '' && (Array.isArray(studentAns) ? studentAns.length > 0 : true) && q.correct_answer !== undefined && String(studentAns) === String(q.correct_answer);
                                            const isSkipped = studentAns === undefined || studentAns === null || studentAns === '' || (Array.isArray(studentAns) && studentAns.length === 0);

                                            return (
                                                <div key={q.id} className={`bg-white rounded-[2.5rem] p-8 lg:p-12 border-2 transition-all ${
                                                    isSkipped ? 'border-slate-100 opacity-80' : isCorrect ? 'border-teal-100' : 'border-rose-100'
                                                } shadow-xl relative group`}>
                                                    
                                                    {/* Status Badge */}
                                                    <div className="absolute top-8 right-8">
                                                        {isSkipped ? (
                                                            <div className="flex items-center gap-2 px-3 py-1 bg-slate-100 text-slate-500 rounded-full text-[9px] font-black uppercase tracking-widest">
                                                                <AlertCircle className="w-3 h-3" /> Skipped
                                                            </div>
                                                        ) : isCorrect ? (
                                                            <div className="flex items-center gap-2 px-3 py-1 bg-teal-50 text-teal-600 rounded-full text-[9px] font-black uppercase tracking-widest">
                                                                <CheckCircle className="w-3 h-3" /> Correct
                                                            </div>
                                                        ) : (
                                                            <div className="flex items-center gap-2 px-3 py-1 bg-rose-50 text-rose-600 rounded-full text-[9px] font-black uppercase tracking-widest">
                                                                <Activity className="w-3 h-3" /> Incorrect
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className="flex items-center gap-4 mb-8">
                                                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg ${
                                                            isSkipped ? 'bg-slate-100 text-slate-400' : isCorrect ? 'bg-teal-600 text-white' : 'bg-rose-600 text-white'
                                                        }`}>
                                                            {idx + 1}
                                                        </div>
                                                        <div>
                                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Question Assessment</p>
                                                            <p className="text-xs font-bold text-slate-600">{q.marks} Mark(s) Assigned</p>
                                                        </div>
                                                    </div>

                                                    <div className="text-xl lg:text-2xl font-bold text-slate-900 leading-relaxed mb-10">
                                                        <MarkdownRenderer content={q.question_text} />
                                                    </div>

                                                    {/* Options */}
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
                                                        {q.options?.map((opt: any, optIdx: number) => {
                                                            const normalizedOpt = typeof opt === 'string'
                                                                ? { id: (optIdx + 1).toString(), text: opt }
                                                                : opt;
                                                            
                                                            const isStudentPick = studentAns !== undefined && studentAns !== null && (Array.isArray(studentAns) ? studentAns.map(String).includes(normalizedOpt.id?.toString()) : studentAns?.toString() === normalizedOpt.id?.toString());
                                                            const isCorrectOpt = q.correct_answer !== undefined && q.correct_answer !== null && (Array.isArray(q.correct_answer) ? q.correct_answer.map(String).includes(normalizedOpt.id?.toString()) : q.correct_answer?.toString() === normalizedOpt.id?.toString());

                                                            let style = 'bg-slate-50 border-slate-50 text-slate-500';
                                                            if (isCorrectOpt) style = 'bg-teal-50 border-teal-200 text-teal-700 font-bold ring-2 ring-teal-500/10';
                                                            else if (isStudentPick && !isCorrectOpt) style = 'bg-rose-50 border-rose-200 text-rose-700 font-bold ring-2 ring-rose-500/10';

                                                            return (
                                                                <div key={optIdx} className={`p-6 rounded-2xl border transition-all flex items-center gap-4 ${style}`}>
                                                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs border-2 ${
                                                                        isCorrectOpt ? 'bg-teal-600 border-teal-600 text-white' : 
                                                                        isStudentPick ? 'bg-rose-600 border-rose-600 text-white' : 
                                                                        'bg-white border-slate-200 text-slate-400'
                                                                    }`}>
                                                                        {String.fromCharCode(65 + optIdx)}
                                                                    </div>
                                                                    <div className="text-sm">
                                                                        <MarkdownRenderer content={normalizedOpt.text} />
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>

                                                    {/* Explanation */}
                                                    {q.explanation && (
                                                        <div className="p-8 bg-slate-50/80 rounded-3xl border border-slate-100 flex gap-6 group-hover:bg-teal-50/30 transition-colors">
                                                            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-teal-600 shrink-0 shadow-sm">
                                                                <Info className="w-6 h-6" />
                                                            </div>
                                                            <div>
                                                                <p className="text-[10px] font-black text-teal-600 uppercase tracking-widest mb-2">Conceptual Explanation</p>
                                                                <div className="text-sm font-medium text-slate-600 leading-relaxed italic">
                                                                    <MarkdownRenderer content={q.explanation} />
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <Footer />
                </div>
            </main>
        </div>
    );
}
