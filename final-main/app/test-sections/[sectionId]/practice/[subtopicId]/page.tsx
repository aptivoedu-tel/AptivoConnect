'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
    ChevronLeft, RotateCcw, ArrowRight,
    Trophy, Clock, Target as TargetIcon, CheckCircle2, XCircle, HelpingHand,
    Sparkles, BookOpen, Brain, BookOpenText,
    Timer, ChevronRight, HelpCircle, Send, Play, Layout, AlertCircle, Flag, Code
} from 'lucide-react';
import MarkdownRenderer from '@/components/shared/MarkdownRenderer';
import { AuthService } from '@/lib/services/authService';
import { PracticeService, MCQ } from '@/lib/services/practiceService';
import { toast } from 'sonner';
import { useLoading } from '@/lib/context/LoadingContext';

export default function PracticeSessionPage() {
    const router = useRouter();
    const params = useParams();
    const sectionId = parseInt(params.sectionId as string);
    const subtopicId = parseInt(params.subtopicId as string);
    const { setLoading: setGlobalLoading } = useLoading();

    const [questions, setQuestions] = useState<MCQ[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [answers, setAnswers] = useState<Record<number, string>>({});
    const [isCompleted, setIsCompleted] = useState(false);
    const [timeElapsed, setTimeElapsed] = useState(0);
    const [session, setSession] = useState<any>(null);
    const [subtopicName, setSubtopicName] = useState('');
    const [user, setUser] = useState<any>(null);
    const [submittedAnswer, setSubmittedAnswer] = useState<Record<number, boolean>>({});
    const [isCorrect, setIsCorrect] = useState<Record<number, boolean>>({});
    const [finishedResults, setFinishedResults] = useState<any>(null);

    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const initialized = useRef(false);
    const [lastInteractionTime, setLastInteractionTime] = useState(Date.now());
    const [reportedQuestions, setReportedQuestions] = useState<Record<number, boolean>>({});
    const [reportingId, setReportingId] = useState<number | null>(null);
    const [reportModalOpen, setReportModalOpen] = useState(false);
    const [isSubmittingReport, setIsSubmittingReport] = useState(false);
    const [taskRequirement, setTaskRequirement] = useState<{ required_mcqs: number, due_date?: string } | null>(null);

    useEffect(() => {
        if (initialized.current) return;
        initialized.current = true;
        const initSession = async () => {
            setGlobalLoading(true, 'Initializing Practice Session...');
            try {
                const currentUser = AuthService.getCurrentUser() || await AuthService.syncSession();
                if (!currentUser) { router.push('/login'); return; }
                setUser(currentUser);
                const stRes = await fetch(`/api/mongo/content?type=subtopics&id=${subtopicId}`);
                const stData = await stRes.json();
                const subtopic = stData.subtopics?.[0];
                setSubtopicName(subtopic?.name || 'Subtopic');
                let subtopicSubjectId: number | null = null;
                if (subtopic?.topic_id) {
                    const topRes = await fetch(`/api/mongo/content?type=topics&id=${subtopic.topic_id}`);
                    const topData = await topRes.json();
                    if (topData.topics?.[0]) subtopicSubjectId = topData.topics[0].subject_id;
                }
                let customLimit: number | undefined = undefined;
                if (currentUser.institution_id) {
                    try {
                        const taskRes = await fetch(`/api/mongo/institutions/tasks?institution_id=${currentUser.institution_id}&test_section_id=${sectionId}`);
                        if (taskRes.ok) {
                            const tasksData = await taskRes.json();
                            const relevantTask = tasksData.tasks?.find((t: any) => t.type === 'subtopic' && t.target_id === subtopicId);
                            if (relevantTask && relevantTask.required_mcqs) { customLimit = Number(relevantTask.required_mcqs); setTaskRequirement({ required_mcqs: customLimit, due_date: relevantTask.due_date }); }
                        }
                    } catch (e) { console.error(e); }
                }
                const activeRecord = await PracticeService.getActiveSession(currentUser.id, { subtopicId, testSectionId: sectionId });
                let finalSession = activeRecord.session;
                let finalMcqs = activeRecord.mcqs;
                if (finalSession && finalMcqs && finalMcqs.length > 0) {
                    const priorAttempts = activeRecord.attempts || [];
                    const newAnswers: Record<number, string> = {}, newSubmitted: Record<number, boolean> = {}, newIsCorrect: Record<number, boolean> = {};
                    priorAttempts.forEach((att: any) => {
                        const qIndex = finalMcqs.findIndex((m: any) => m.id === att.mcq_id);
                        if (qIndex !== -1) { newAnswers[qIndex] = att.selected_option; newSubmitted[qIndex] = true; newIsCorrect[qIndex] = att.is_correct; }
                    });
                    setQuestions(finalMcqs); setAnswers(newAnswers); setSubmittedAnswer(newSubmitted); setIsCorrect(newIsCorrect);
                    setTimeElapsed(finalSession.time_spent_seconds || 0); setCurrentIndex(Math.min(priorAttempts.length, finalMcqs.length - 1));
                    setSession(finalSession); toast.success('Resumed previous session');
                } else {
                    const mcqs = await PracticeService.generatePracticeSession(subtopicId, null, subtopicSubjectId || 0, currentUser.id, null, false, customLimit, sectionId);
                    if (!mcqs || mcqs.length === 0) { toast.error('No practice questions available.'); router.push(`/test-sections/${sectionId}`); return; }
                    const { session: startedSession, error: createError } = await PracticeService.createSession(currentUser.id, subtopicId, null, 'practice', subtopic?.topic_id || null, mcqs.map((m: any) => m.id), subtopicSubjectId, sectionId);
                    if (createError || !startedSession) { toast.error(createError || 'Failed to create session'); router.push(`/test-sections/${sectionId}`); return; }
                    setSession(startedSession); setQuestions(mcqs);
                }
                setLastInteractionTime(Date.now());
                timerRef.current = setInterval(() => { setTimeElapsed(prev => prev + 1); }, 1000);
            } catch (error: any) { toast.error(error.message || 'Failed to start practice.'); router.push(`/test-sections/${sectionId}`); } finally { setGlobalLoading(false); }
        };
        if (subtopicId && sectionId) initSession();
        return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }, [subtopicId, sectionId]);

    const handleSelectOption = (option: string) => { if (isCompleted) return; setAnswers({ ...answers, [currentIndex]: option }); };
    const nextQuestion = () => { setLastInteractionTime(Date.now()); if (currentIndex < questions.length - 1) setCurrentIndex(currentIndex + 1); else finalizeSession(); };
    const prevQuestion = () => { setLastInteractionTime(Date.now()); if (currentIndex > 0) setCurrentIndex(currentIndex - 1); };

    const finalizeSession = async () => {
        if (isCompleted || !session || finishedResults) return;
        setGlobalLoading(true, 'Finalizing your session...');
        try {
            if (timerRef.current) clearInterval(timerRef.current);
            let correct = 0, wrong = 0, skipped = 0;
            questions.forEach((q, idx) => { const answer = answers[idx]; if (!answer) skipped++; else if (answer === q.correct_option) correct++; else wrong++; });
            const { success, error } = await PracticeService.completeSession(session.id, user.id, questions.length, correct, wrong, skipped, timeElapsed);
            if (success) {
                setFinishedResults({ correct, wrong, skipped, score: Math.round((correct / questions.length) * 100), time: timeElapsed });
                setIsCompleted(true); toast.success('Session completed!');
            } else toast.error(error || 'Failed to save session');
        } catch (err: any) { toast.error('Error completing session: ' + err.message); } finally { setGlobalLoading(false); }
    };

    const formatTime = (seconds: number) => { const mins = Math.floor(seconds / 60), secs = seconds % 60; return `${mins}:${secs.toString().padStart(2, '0')}`; };

    if (!isCompleted && questions.length === 0) return (
        <div className="h-screen bg-[#F8FAFC] flex flex-col overflow-hidden">
            {/* Header Skeleton */}
            <header className="h-20 bg-white border-b border-slate-100 flex items-center justify-between px-8 sticky top-0 z-50">
                <div className="flex items-center gap-6">
                    <div className="w-10 h-10 rounded-xl border border-slate-200 bg-slate-50 animate-pulse" />
                    <div className="space-y-2">
                        <div className="h-4 w-32 bg-slate-200 rounded animate-pulse" />
                        <div className="h-3 w-20 bg-slate-100 rounded animate-pulse" />
                    </div>
                </div>
                <div className="flex items-center gap-8">
                    <div className="hidden sm:flex w-24 h-9 bg-slate-100 rounded-2xl animate-pulse" />
                    <div className="w-28 h-10 bg-slate-200 rounded-xl animate-pulse" />
                </div>
            </header>

            {/* Progress Bar Line Skeleton */}
            <div className="h-1.5 w-full bg-slate-150 animate-pulse" style={{ backgroundColor: '#E2E8F0' }} />

            {/* Main Content Skeleton */}
            <main className="flex-1 w-full mx-auto p-4 lg:p-6 overflow-y-auto flex justify-center">
                <div className="w-full max-w-5xl">
                    <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden flex flex-col min-h-[400px]">
                        <div className="p-6 sm:p-10 flex-1">
                            <div className="mb-12">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="h-3 w-16 bg-slate-200 rounded animate-pulse" />
                                    <div className="h-7 w-28 bg-slate-100 rounded-full animate-pulse" />
                                </div>
                                <div className="space-y-3 mt-4">
                                    <div className="h-6 w-3/4 bg-slate-200 rounded animate-pulse" />
                                    <div className="h-6 w-1/2 bg-slate-100 rounded animate-pulse" />
                                </div>
                            </div>
                            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                                {[1, 2, 3, 4].map((i) => (
                                    <div key={i} className="flex items-center p-6 rounded-2xl border-2 border-slate-100 bg-white animate-pulse">
                                        <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center shrink-0" />
                                        <div className="ml-6 h-4 w-2/3 bg-slate-200 rounded" />
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="p-6 sm:p-12 bg-slate-50/50 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-6">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-2xl border border-slate-200 bg-white animate-pulse" />
                                <div className="w-24 h-3 bg-slate-100 rounded animate-pulse" />
                                <div className="w-12 h-12 rounded-2xl border border-slate-200 bg-white animate-pulse" />
                            </div>
                            <div className="w-36 h-12 bg-slate-200 rounded-2xl animate-pulse" />
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );

    if (isCompleted && finishedResults) {
        return (
            <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-4">
                <div className="w-full max-w-2xl bg-white rounded-[3rem] shadow-2xl overflow-hidden border border-slate-100 animate-scale-in">
                    <div className="bg-gradient-to-br from-slate-900 to-teal-950 p-6 sm:p-10 lg:p-12 text-center relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                        <div className="relative z-10">
                            <div className="w-24 h-24 bg-white/10 backdrop-blur-md rounded-[2rem] flex items-center justify-center mx-auto mb-6 border border-white/20">
                                <Trophy className="w-12 h-12 text-teal-300" />
                            </div>
                            <h1 className="text-4xl font-black text-white mb-2 tracking-tight">Session Complete!</h1>
                            <p className="text-teal-400 font-bold uppercase tracking-widest text-xs">{subtopicName}</p>
                        </div>
                    </div>
                    <div className="p-6 sm:p-10 lg:p-12">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-12">
                            <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 text-center"><p className="text-[10px] font-black text-slate-400 uppercase mb-1">Score</p><p className="text-3xl font-black text-teal-600">{finishedResults.score}%</p></div>
                            <div className="bg-teal-50 p-6 rounded-3xl border border-teal-100 text-center"><p className="text-[10px] font-black text-teal-400 uppercase mb-1">Correct</p><p className="text-3xl font-black text-teal-600">{finishedResults.correct}</p></div>
                            <div className="bg-rose-50 p-6 rounded-3xl border border-rose-100 text-center"><p className="text-[10px] font-black text-rose-400 uppercase mb-1">Wrong</p><p className="text-3xl font-black text-rose-600">{finishedResults.wrong}</p></div>
                            <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 text-center"><p className="text-[10px] font-black text-slate-400 uppercase mb-1">Time</p><p className="text-3xl font-black text-slate-900">{formatTime(finishedResults.time)}</p></div>
                        </div>
                        <div className="space-y-4">
                            <button onClick={() => window.location.reload()} className="w-full py-5 bg-teal-600 text-white rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] shadow-xl shadow-teal-100 hover:bg-teal-700 transition-all flex items-center justify-center gap-3"><RotateCcw className="w-4 h-4" /> Practice More</button>
                            <button onClick={() => router.push(`/test-sections/${sectionId}`)} className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] shadow-xl shadow-slate-100 hover:bg-slate-800 transition-all flex items-center justify-center gap-3"><ArrowRight className="w-4 h-4" /> Return to Curriculum</button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    const currentMCQ = questions[currentIndex], progress = ((currentIndex + 1) / questions.length) * 100, showExplanation = (submittedAnswer[currentIndex] || isCorrect[currentIndex] !== undefined) && !!currentMCQ.explanation;

    return (
        <div className="min-h-screen bg-[#F8FAFC] flex flex-col">
            <header className="h-20 bg-white border-b border-slate-100 flex items-center justify-between px-8 sticky top-0 z-50">
                <div className="flex items-center gap-6">
                    <button onClick={() => router.back()} className="w-10 h-10 rounded-xl border border-slate-200 flex items-center justify-center text-slate-400 hover:text-teal-600 transition-all"><ChevronLeft className="w-5 h-5" /></button>
                    <div><h2 className="text-sm font-black text-slate-900 tracking-tight">{subtopicName}</h2><p className="text-[10px] font-black text-teal-500 uppercase tracking-widest">Question {currentIndex + 1} of {questions.length}</p></div>
                </div>
                <div className="flex items-center gap-8">
                    <div className="hidden sm:flex items-center gap-3 bg-slate-50 px-4 py-2 rounded-2xl border border-slate-100 font-mono text-sm font-black text-slate-700">{formatTime(timeElapsed)}</div>
                    <button onClick={() => finalizeSession()} className="px-6 py-2 bg-teal-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest">End Session</button>
                </div>
            </header>
            <div className="h-1.5 w-full bg-slate-100"><div className="h-full bg-teal-600 transition-all duration-500 shadow-[0_0_10px_rgba(20,184,166,0.3)]" style={{ width: `${progress}%` }} /></div>
            <main className="flex-1 min-w-0 w-full mx-auto p-4 sm:p-6 overflow-y-auto flex justify-center">
                <div className="w-full max-w-5xl">
                    <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden flex flex-col min-h-[400px]">
                        <div className="p-6 sm:p-10 flex-1">
                            <div className="mb-12">
                                <span className="text-[10px] font-black text-teal-500 uppercase tracking-widest block mb-4">Question</span>
                                <div className="text-xl sm:text-2xl font-bold text-slate-900 leading-relaxed"><MarkdownRenderer content={currentMCQ.question} /></div>
                                {currentMCQ.question_image_url && <div className="mt-8 rounded-2xl overflow-hidden max-w-lg border border-slate-100"><img src={currentMCQ.question_image_url} alt="Question" className="w-full h-auto" /></div>}
                            </div>
                            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                                {[ { key: 'A', text: currentMCQ.option_a }, { key: 'B', text: currentMCQ.option_b }, { key: 'C', text: currentMCQ.option_c }, { key: 'D', text: currentMCQ.option_d } ].map((option) => {
                                    const isSubmitted = submittedAnswer[currentIndex], isSelected = answers[currentIndex] === option.key, isCorr = option.key === currentMCQ.correct_option;
                                    return (
                                        <button key={option.key} onClick={() => handleSelectOption(option.key)} disabled={isSubmitted} className={`flex items-center p-6 rounded-2xl border-2 transition-all ${isSubmitted && isCorr ? 'bg-teal-50 border-teal-500' : isSubmitted && isSelected && !isCorr ? 'bg-rose-50 border-rose-500' : isSelected ? 'bg-teal-50 border-teal-500' : 'bg-white border-slate-100'}`}>
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm shrink-0 ${isSubmitted && isCorr ? 'bg-teal-600 text-white' : isSubmitted && isSelected && !isCorr ? 'bg-rose-600 text-white' : isSelected ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-400'}`}>{isSubmitted && isCorr ? <CheckCircle2 className="w-5 h-5" /> : isSubmitted && isSelected && !isCorr ? <XCircle className="w-5 h-5" /> : option.key}</div>
                                            <div className="ml-6 text-sm font-bold text-slate-700"><MarkdownRenderer content={option.text} /></div>
                                        </button>
                                    );
                                })}
                            </div>
                            {showExplanation && <div className="mt-12 bg-slate-50 rounded-[2rem] border border-slate-100 p-8 sm:p-10"><div className="flex items-center gap-4 mb-8"><div className="w-12 h-12 rounded-2xl bg-teal-100 flex items-center justify-center"><HelpCircle className="w-6 h-6 text-teal-600" /></div><h4 className="text-sm font-black text-teal-600 uppercase tracking-widest">Explanation</h4></div><div className="text-base text-slate-700 font-medium"><MarkdownRenderer content={currentMCQ.explanation || ''} /></div></div>}
                        </div>
                        <div className="p-6 sm:p-12 bg-slate-50/50 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-6">
                            <div className="flex items-center gap-3">
                                <button onClick={prevQuestion} disabled={currentIndex === 0} className="w-12 h-12 rounded-2xl border bg-white disabled:opacity-30"><ChevronLeft className="w-6 h-6 mx-auto" /></button>
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-4">Item {currentIndex + 1} / {questions.length}</span>
                                <button onClick={nextQuestion} className="w-12 h-12 rounded-2xl border bg-white"><ChevronRight className="w-6 h-6 mx-auto" /></button>
                            </div>
                            <div className="flex gap-3 w-full sm:w-auto">
                                {!submittedAnswer[currentIndex] ? (
                                    <button onClick={async () => { if (answers[currentIndex]) { const timeSpent = Math.round((Date.now() - lastInteractionTime) / 1000); setGlobalLoading(true, 'Checking...'); try { const result = await PracticeService.submitAttempt(session.id, currentMCQ.id, user.id, answers[currentIndex] as any, timeSpent); setSubmittedAnswer(prev => ({ ...prev, [currentIndex]: true })); setIsCorrect(prev => ({ ...prev, [currentIndex]: result.isCorrect })); setLastInteractionTime(Date.now()); } catch (err: any) { toast.error(err.message); } finally { setGlobalLoading(false); } } }} disabled={!answers[currentIndex]} className={`px-10 py-4 rounded-2xl font-black uppercase text-[10px] ${answers[currentIndex] ? 'bg-teal-600 text-white shadow-xl shadow-teal-200' : 'bg-slate-100 text-slate-400'}`}>Check Answer</button>
                                ) : (
                                    <button onClick={() => { if (currentIndex === questions.length - 1) finalizeSession(); else nextQuestion(); }} className="px-10 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-[10px] shadow-xl">{currentIndex === questions.length - 1 ? 'Finish Session' : 'Next Question'}</button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
