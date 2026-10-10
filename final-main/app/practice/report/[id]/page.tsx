'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AuthService } from '@/lib/services/authService';
import {
    Clock, ChevronLeft, CheckCircle, Info, GraduationCap, ArrowLeft, Trophy,
    Calendar, Target, Activity, AlertCircle, BookOpen, Brain, Zap, Sparkles
} from 'lucide-react';
import { toast } from 'sonner';
import { useLoading } from '@/lib/context/LoadingContext';
import MarkdownRenderer from '@/components/shared/MarkdownRenderer';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import Footer from '@/components/shared/Footer';
import { useUI } from '@/lib/context/UIContext';

export default function PracticeReportPage() {
    const { id: sessionId } = useParams();
    const router = useRouter();
    const { setLoading: setGlobalLoading } = useLoading();
    const { isSidebarCollapsed } = useUI();

    const [user, setUser] = useState<any>(null);
    const [session, setSession] = useState<any>(null);
    const [attempts, setAttempts] = useState<any[]>([]);
    const [questions, setQuestions] = useState<any[]>([]);
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
    }, [sessionId]);

    const loadReportData = async () => {
        setGlobalLoading(true, 'Extracting Practice Insights...');
        try {
            // 1. Fetch Session
            const sessRes = await fetch(`/api/mongo/practice?session_id=${sessionId}`);
            const sessData = await sessRes.json();
            if (!sessData.session) throw new Error('Session not found');
            const sess = sessData.session;
            setSession(sess);

            // 2. Fetch Attempts for this session
            const attRes = await fetch(`/api/mongo/practice/attempt?session_id=${sessionId}`);
            const attData = await attRes.json();
            const atts = attData.attempts || [];
            setAttempts(atts);

            // 3. Fetch Questions
            const qIds = atts.map((a: any) => a.mcq_id).filter(Boolean);
            if (qIds.length > 0) {
                const qRes = await fetch(`/api/mongo/mcqs/bulk?ids=${qIds.join(',')}`);
                const qData = await qRes.json();
                setQuestions(qData.mcqs || []);
            }

        } catch (err: any) {
            console.error('Failed to load practice report', err);
            toast.error(err.message || 'Failed to load report');
        } finally {
            setLoading(false);
            setGlobalLoading(false);
        }
    };

    if (loading || !session) return null;

    const totalSolved = attempts.length;
    const correctCount = attempts.filter(a => a.is_correct).length;
    const accuracy = totalSolved > 0 ? Math.round((correctCount / totalSolved) * 100) : 0;

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
                            <span className="px-3 py-1 bg-teal-50 text-teal-600 rounded-full text-[10px] font-black uppercase tracking-widest">
                                Practice Session Analytics
                            </span>
                        </div>
                    </div>

                    {/* Result Hero Card */}
                    <div className="bg-white rounded-[3rem] p-6 sm:p-10 lg:p-16 shadow-2xl border border-slate-100 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-80 h-80 bg-teal-50 rounded-full -translate-y-1/2 translate-x-1/2 opacity-40" />
                        <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-12">
                            <div className="text-center lg:text-left flex-1">
                                <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-50 text-amber-600 rounded-full text-[10px] font-black uppercase tracking-[0.2em] mb-6">
                                    <Brain className="w-3 h-3" />
                                    Cognitive Engagement Report
                                </div>
                                <h1 className="text-4xl lg:text-5xl font-black text-slate-900 leading-tight mb-4">Adaptive Practice</h1>
                                <p className="text-slate-500 font-bold text-lg mb-8 max-w-xl">Deep analysis of your topical mastery and behavioral patterns during this session.</p>
                                
                                <div className="flex flex-wrap justify-center lg:justify-start gap-6 text-slate-500 font-bold">
                                    <div className="flex items-center gap-2">
                                        <Calendar className="w-4 h-4 text-slate-300" />
                                        {new Date(session.started_at).toLocaleDateString()}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Clock className="w-4 h-4 text-slate-300" />
                                        {Math.floor(session.time_spent_seconds / 60) || 0}m Duration
                                    </div>
                                    <div className="flex items-center gap-2 text-teal-600">
                                        <Target className="w-4 h-4" />
                                        {correctCount} / {totalSolved} Solved
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
                                        stroke="#14b8a6"
                                        strokeWidth="16"
                                        strokeDasharray={`${(accuracy * 597) / 100} 597`}
                                        strokeLinecap="round"
                                        className="transition-all duration-[2s] ease-out shadow-lg"
                                    />
                                </svg>
                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                    <span className="text-5xl font-black text-teal-600">{accuracy}%</span>
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Accuracy Rate</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Behavioral Stats Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm group hover:border-orange-200 transition-all">
                            <div className="w-14 h-14 bg-orange-50 text-orange-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                <Sparkles className="w-7 h-7" />
                            </div>
                            <h3 className="text-3xl font-black text-slate-900 mb-1">{attempts.filter(a => a.is_overthink).length}</h3>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Overthink Events</p>
                            <p className="text-[10px] text-slate-400 mt-4 leading-relaxed uppercase font-bold tracking-tight">Delayed responses that suggest hesitation.</p>
                        </div>
                        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm group hover:border-rose-200 transition-all">
                            <div className="w-14 h-14 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                <Zap className="w-7 h-7" />
                            </div>
                            <h3 className="text-3xl font-black text-slate-900 mb-1">{attempts.filter(a => a.is_rush).length}</h3>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Rush Events</p>
                            <p className="text-[10px] text-slate-400 mt-4 leading-relaxed uppercase font-bold tracking-tight">Fast incorrect answers indicating haste.</p>
                        </div>
                        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm group hover:border-teal-200 transition-all">
                            <div className="w-14 h-14 bg-teal-50 text-teal-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                <Clock className="w-7 h-7" />
                            </div>
                            <h3 className="text-3xl font-black text-slate-900 mb-1">{session.time_spent_seconds > 0 ? Math.round(session.time_spent_seconds / totalSolved) : 0}s</h3>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Avg Time / Q</p>
                            <p className="text-[10px] text-slate-400 mt-4 leading-relaxed uppercase font-bold tracking-tight">Your cognitive processing tempo.</p>
                        </div>
                    </div>

                    {/* Detailed Question Analysis */}
                    <div className="space-y-8">
                        <div className="flex items-center gap-4">
                            <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.4em]">Granular Session Breakdown</h2>
                            <div className="h-px flex-1 bg-slate-200" />
                        </div>

                        <div className="space-y-8">
                            {attempts.map((attempt: any, idx: number) => {
                                const q = questions.find(question => question.id === attempt.mcq_id);
                                if (!q) return null;

                                const isCorrect = attempt.is_correct;
                                const isSkipped = attempt.is_skipped;

                                return (
                                    <div key={attempt._id || idx} className={`bg-white rounded-[2.5rem] p-8 lg:p-12 border-2 transition-all ${
                                        isSkipped ? 'border-slate-100 opacity-80' : isCorrect ? 'border-teal-100' : 'border-rose-100'
                                    } shadow-xl relative group`}>
                                        
                                        {/* Status Badge */}
                                        <div className="absolute top-8 right-8 flex flex-col items-end gap-2">
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
                                            {attempt.is_overthink && (
                                                <div className="flex items-center gap-2 px-3 py-1 bg-orange-50 text-orange-600 rounded-full text-[9px] font-black uppercase tracking-widest">
                                                    <Brain className="w-3 h-3" /> Overthink
                                                </div>
                                            )}
                                            {attempt.is_rush && (
                                                <div className="flex items-center gap-2 px-3 py-1 bg-rose-50 text-rose-600 rounded-full text-[9px] font-black uppercase tracking-widest">
                                                    <Zap className="w-3 h-3" /> Rushed
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
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Time Spent: {attempt.time_spent || 0}s</p>
                                                <p className="text-xs font-bold text-slate-600">Adaptive Difficulty Level</p>
                                            </div>
                                        </div>

                                        <div className="text-xl lg:text-2xl font-bold text-slate-900 leading-relaxed mb-10">
                                            <MarkdownRenderer content={q.question_text} />
                                        </div>

                                        {/* Options */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
                                            {['a', 'b', 'c', 'd'].map((key) => {
                                                const optText = q[`option_${key}`];
                                                if (!optText) return null;
                                                
                                                const isStudentPick = attempt.student_answer?.toLowerCase() === key;
                                                const isCorrectOpt = q.correct_answer?.toLowerCase() === key;

                                                let style = 'bg-slate-50 border-slate-50 text-slate-500';
                                                if (isCorrectOpt) style = 'bg-teal-50 border-teal-200 text-teal-700 font-bold ring-2 ring-teal-500/10';
                                                else if (isStudentPick && !isCorrectOpt) style = 'bg-rose-50 border-rose-200 text-rose-700 font-bold ring-2 ring-rose-500/10';

                                                return (
                                                    <div key={key} className={`p-6 rounded-2xl border transition-all flex items-center gap-4 ${style}`}>
                                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs border-2 ${
                                                            isCorrectOpt ? 'bg-teal-600 border-teal-600 text-white' : 
                                                            isStudentPick ? 'bg-rose-600 border-rose-600 text-white' : 
                                                            'bg-white border-slate-200 text-slate-400'
                                                        }`}>
                                                            {key.toUpperCase()}
                                                        </div>
                                                        <div className="text-sm">
                                                            <MarkdownRenderer content={optText} />
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
                                                    <p className="text-[10px] font-black text-teal-600 uppercase tracking-widest mb-2">Conceptual Clarification</p>
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

                    <Footer />
                </div>
            </main>
        </div>
    );
}
