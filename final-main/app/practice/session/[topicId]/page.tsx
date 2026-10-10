'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ChevronLeft, ChevronRight, Timer, Trophy, XCircle, CheckCircle2, HelpCircle, ArrowRight, RotateCcw, Send, BookOpen, BookOpenText, Flag, Code } from 'lucide-react';
import MarkdownRenderer from '@/components/shared/MarkdownRenderer';
import Sidebar from '@/components/layout/Sidebar';
import { AuthService } from '@/lib/services/authService';
import { PracticeService, MCQ } from '@/lib/services/practiceService';
import { toast } from 'sonner';
import { useUI } from '@/lib/context/UIContext';

export default function DirectTopicPracticePage() {
    const router = useRouter();
    const params = useParams();
    const topicId = parseInt(params.topicId as string);
    const { isSidebarCollapsed } = useUI();

    const [isInitializing, setIsInitializing] = useState(true);
    const [questions, setQuestions] = useState<MCQ[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [answers, setAnswers] = useState<Record<number, string>>({});
    const [submittedAnswers, setSubmittedAnswers] = useState<Record<number, boolean>>({});
    const [isCompleted, setIsCompleted] = useState(false);
    const [timeElapsed, setTimeElapsed] = useState(0);
    const [session, setSession] = useState<any>(null);
    const [topicName, setTopicName] = useState('');
    const [results, setResults] = useState<any>(null);
    const [user, setUser] = useState<any>(null);
    const [lastInteractionTime, setLastInteractionTime] = useState(Date.now());
    const [isCorrect, setIsCorrect] = useState<Record<number, boolean>>({});
    const [finishedResults, setFinishedResults] = useState<any>(null);
    const [reportedQuestions, setReportedQuestions] = useState<Record<number, boolean>>({});
    const [reportingId, setReportingId] = useState<number | null>(null);
    const [reportModalOpen, setReportModalOpen] = useState(false);
    const [isSubmittingReport, setIsSubmittingReport] = useState(false);


    const timerRef = useRef<any>(null);
    const syncIntervalRef = useRef<any>(null);
    const timeRef = useRef(0);
    const sessionRef = useRef<any>(null);
    const initialized = useRef(false);

    useEffect(() => {
        if (isNaN(topicId)) {
            toast.error('Invalid Topic ID');
            router.push('/practice');
            return;
        }

        if (initialized.current) return;
        initialized.current = true;

        const initSession = async () => {
            setIsInitializing(true);
            try {
                console.log('[Practice] Initializing for Topic:', topicId);
                const currentUser = AuthService.getCurrentUser() || await AuthService.syncSession();
                if (!currentUser) {
                    console.warn('[Practice] No active login found, redirecting...');
                    router.push('/login');
                    return;
                }
                setUser(currentUser);

                // Fetch topic info
                console.log('[Practice] Fetching topic info...');
                const res = await fetch(`/api/mongo/content?type=topics&id=${topicId}&t=${Date.now()}`);
                const data = await res.json();
                const topic = data.topics?.[0];
                setTopicName(topic?.name || 'Topic Practice');

                // Check for existing active session
                console.log('[Practice] Checking for active sessions...');
                const activeRecord = await PracticeService.getActiveSession(currentUser.id, { topicId });
                let finalSession = activeRecord.session;
                let finalMcqs = activeRecord.mcqs;

                if (finalSession && finalMcqs && finalMcqs.length > 0) {
                    console.log('[Practice] Resuming active session:', finalSession.id);
                    // Resume session
                    const priorAttempts = activeRecord.attempts || [];
                    const newAnswers: Record<number, string> = {};
                    const newSubmitted: Record<number, boolean> = {};
                    const newIsCorrect: Record<number, boolean> = {};

                    priorAttempts.forEach((att: any) => {
                        const qIndex = finalMcqs.findIndex((m: any) => m.id === att.mcq_id);
                        if (qIndex !== -1) {
                            newAnswers[qIndex] = att.selected_option;
                            newSubmitted[qIndex] = true;
                            newIsCorrect[qIndex] = att.is_correct;
                        }
                    });

                    setQuestions(finalMcqs);
                    setAnswers(newAnswers);
                    setSubmittedAnswers(newSubmitted);
                    setIsCorrect(newIsCorrect);
                    setTimeElapsed(finalSession.time_spent_seconds || 0);
                    timeRef.current = finalSession.time_spent_seconds || 0;

                    // Skip right to next unanswered
                    const nextIndex = priorAttempts.length;
                    setCurrentIndex(Math.min(nextIndex, finalMcqs.length - 1));

                    setSession(finalSession);
                    sessionRef.current = finalSession;
                    toast.success('Resumed previous session');
                } else {
                    console.log('[Practice] No active session, generating new set...');
                    try {
                        // Generate MCQs — no university_id needed for direct practice
                        const mcqs = await PracticeService.generatePracticeSession(
                            null,
                            currentUser.university_id || null,
                            topic?.subject_id || 0,
                            currentUser.id,
                            topicId,
                            true // showAll: true for all general and university practice
                        );

                        if (!mcqs || mcqs.length === 0) {
                            console.error('[Practice] Zero questions in pool for topic:', topicId);
                            toast.error('No practice questions available for this topic yet.');
                            router.push('/practice');
                            return;
                        }

                        console.log(`[Practice] Successfully fetched ${mcqs.length} questions. Creating session record...`);

                        // Create session (no university_id)
                        const { session: startedSession, error: createError } = await PracticeService.createSession(
                            currentUser.id,
                            null,
                            currentUser.university_id || null,
                            'practice',
                            topicId,
                            mcqs.map((m: any) => m.id),
                            topic?.subject_id
                        );

                        if (createError || !startedSession) {
                            console.error('[Practice] Failed to create session record:', createError);
                            toast.error(createError || 'Failed to create session');
                            router.push('/practice');
                            return;
                        }

                        setSession(startedSession);
                        sessionRef.current = startedSession;
                        setQuestions(mcqs);
                    } catch (apiErr: any) {
                        console.error('[Practice] API failure during session start:', apiErr);
                        toast.error('Could not initialize session: ' + (apiErr.message || 'Server error'));
                        router.push('/practice');
                        return;
                    }
                }

                setLastInteractionTime(Date.now());

                timerRef.current = setInterval(() => {
                    timeRef.current += 1;
                    setTimeElapsed(timeRef.current);
                }, 1000);

            } catch (err: any) {
                console.error('[Practice] Fatal init error:', err);
                toast.error(err.message || 'Failed to start practice.');
                initialized.current = false;
                router.push('/practice');
            } finally {
                setIsInitializing(false);
            }
        };

        if (topicId) initSession();

        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
            if (syncIntervalRef.current) clearInterval(syncIntervalRef.current);
        };
    }, [topicId]);

    useEffect(() => {
        if (!session || isCompleted) return;

        syncIntervalRef.current = setInterval(() => {
            PracticeService.syncSessionProgress(sessionRef.current?.id || session.id, timeRef.current);
        }, 30000); // 30 seconds

        return () => {
            if (syncIntervalRef.current) clearInterval(syncIntervalRef.current);
        };
    }, [session?.id, isCompleted]);

    const handleSelectOption = (option: string) => {
        if (isCompleted || submittedAnswers[currentIndex]) return;
        setAnswers({ ...answers, [currentIndex]: option });
    };

    const handleSubmitAnswer = () => {
        if (!answers[currentIndex] || !session) return;
        const currentMCQ = questions[currentIndex];
        const timeSpent = Math.round((Date.now() - lastInteractionTime) / 1000);

        // ✅ INSTANT — answers are now provided in the initial fetch
        const isCorrectOption = currentMCQ.correct_option === answers[currentIndex];
        setSubmittedAnswers(prev => ({ ...prev, [currentIndex]: true }));
        setIsCorrect(prev => ({ ...prev, [currentIndex]: isCorrectOption }));
        setLastInteractionTime(Date.now());

        // Record attempt in background — fire & forget
        PracticeService.submitAttempt(session.id, currentMCQ.id, user.id, answers[currentIndex] as any, timeSpent)
            .catch(err => console.warn('[Practice] Background attempt record failed:', err));
    };

    const resetSession = () => {
        if (timerRef.current) clearInterval(timerRef.current);
        if (syncIntervalRef.current) clearInterval(syncIntervalRef.current);
        initialized.current = false;
        // Set initializing first so the spinner shows (not a blank flash)
        setIsInitializing(true);
        setQuestions([]);
        setCurrentIndex(0);
        setAnswers({});
        setSubmittedAnswers({});
        setIsCompleted(false);
        setTimeElapsed(0);
        setSession(null);
        setResults(null);
        setIsCorrect({});
        setFinishedResults(null);
        setLastInteractionTime(Date.now());
        setReportedQuestions({});
    };

    const handleReportSubmit = async (reason: string) => {
        if (!reportingId) return;
        setIsSubmittingReport(true);
        try {
            const res = await fetch('/api/mongo/reports', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mcq_id: reportingId, reason })
            });
            if (res.ok) {
                setReportedQuestions(prev => ({ ...prev, [reportingId]: true }));
                toast.success('Question reported for review');
            } else {
                toast.error('Failed to report question');
            }
        } catch (error) {
            console.error(error);
            toast.error('Error reporting question');
        } finally {
            setIsSubmittingReport(false);
            setReportModalOpen(false);
            setReportingId(null);
        }
    };

    const nextQuestion = () => {
        setLastInteractionTime(Date.now());
        if (currentIndex < questions.length - 1) {
            setCurrentIndex(currentIndex + 1);
        } else {
            finalizeSession();
        }
    };

    const prevQuestion = () => {
        setLastInteractionTime(Date.now());
        if (currentIndex > 0) setCurrentIndex(currentIndex - 1);
    };

    const finalizeSession = async () => {
        if (isCompleted || !session || results) return;

        try {
            if (timerRef.current) clearInterval(timerRef.current);

            let correct = 0, wrong = 0, skipped = 0;
            questions.forEach((q, idx) => {
                const answer = answers[idx];
                if (!answer) skipped++;
                else if (answer === q.correct_option) correct++;
                else wrong++;
            });

            const { success, error } = await PracticeService.completeSession(
                session.id, user.id, questions.length, correct, wrong, skipped, timeElapsed
            );

            if (success) {
                const finalResults = {
                    correct,
                    wrong,
                    skipped,
                    score: Math.round((correct / questions.length) * 100),
                    time: timeElapsed
                };
                setFinishedResults(finalResults);
                setIsCompleted(true);
                toast.success('Session completed! Great work!');
            } else {
                toast.error(error || 'Failed to save session');
            }
        } catch (err: any) {
            console.error('Finalize error:', err);
            toast.error('Error completing session: ' + err.message);
        }
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    if (isInitializing || (!isCompleted && questions.length === 0)) return (
        <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
            <div className="w-10 h-10 border-4 border-teal-600 border-t-transparent rounded-full animate-spin" />
        </div>
    );

    // Results Screen
    if (isCompleted && finishedResults) {
        return (
            <div className="min-h-screen bg-[#F8FAFC] flex flex-col">
                <Sidebar userRole="student" />
                <div className={`flex-1 flex flex-col items-center justify-center p-6 transition-all duration-300 ${isSidebarCollapsed ? 'lg:ml-24' : 'lg:ml-72'}`}>
                    <div className="w-full max-w-2xl bg-white rounded-[3rem] shadow-2xl overflow-hidden border border-slate-100">
                        <div className="bg-gradient-to-br from-slate-900 to-teal-950 p-6 sm:p-10 lg:p-12 text-center relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                            <div className="relative z-10">
                                <div className="w-24 h-24 bg-white/10 backdrop-blur-md rounded-[2rem] flex items-center justify-center mx-auto mb-6 border border-white/20">
                                    <Trophy className="w-12 h-12 text-teal-300" />
                                </div>
                                <h1 className="text-4xl font-black text-white mb-2 tracking-tight">Practice Complete!</h1>
                                <p className="text-teal-400 font-bold uppercase tracking-widest text-xs">{topicName}</p>
                            </div>
                        </div>

                        <div className="p-6 sm:p-10 lg:p-12">
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-12">
                                <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 text-center hover:scale-105 transition-transform">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Score</p>
                                    <p className="text-3xl font-black text-teal-600">{finishedResults.score}%</p>
                                </div>
                                <div className="bg-green-50 p-6 rounded-3xl border border-emerald-100 text-center hover:scale-105 transition-transform">
                                    <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-1">Correct</p>
                                    <p className="text-3xl font-black text-emerald-600">{finishedResults.correct}</p>
                                </div>
                                <div className="bg-rose-50 p-6 rounded-3xl border border-rose-100 text-center hover:scale-105 transition-transform">
                                    <p className="text-[10px] font-black text-rose-400 uppercase tracking-widest mb-1">Wrong</p>
                                    <p className="text-3xl font-black text-rose-600">{finishedResults.wrong}</p>
                                </div>
                                <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 text-center hover:scale-105 transition-transform">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Time</p>
                                    <p className="text-3xl font-black text-slate-900">{formatTime(finishedResults.time)}</p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <button
                                    onClick={resetSession}
                                    className="w-full py-5 bg-teal-600 text-white rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] shadow-xl shadow-teal-100 hover:bg-teal-700 transition-all flex items-center justify-center gap-3"
                                >
                                    <RotateCcw className="w-4 h-4" />
                                    Practice Again
                                </button>
                                <button
                                    onClick={() => router.push('/practice')}
                                    className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] shadow-xl shadow-slate-100 hover:bg-slate-800 transition-all flex items-center justify-center gap-3"
                                >
                                    <BookOpen className="w-4 h-4" />
                                    Browse More Topics
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    const currentMCQ = questions[currentIndex];
    const progress = ((currentIndex + 1) / questions.length) * 100;

    // Determine the longest option length to conditionally arrange the grid
    const maxOptionLength = Math.max(
        (currentMCQ?.option_a || '').length,
        (currentMCQ?.option_b || '').length,
        (currentMCQ?.option_c || '').length,
        (currentMCQ?.option_d || '').length
    );
    const optionsGridClass = maxOptionLength > 60 ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2';
    const showExplanation = !!submittedAnswers[currentIndex] && !!currentMCQ.explanation;

    return (
        <div className="h-screen bg-[#F8FAFC] flex flex-col overflow-hidden">
            {/* Header */}
            <header className="h-20 bg-white border-b border-slate-100 flex items-center justify-between px-8 sticky top-0 z-50">
                <div className="flex items-center gap-6">
                    <button
                        onClick={() => router.push('/practice')}
                        className="w-10 h-10 rounded-xl border border-slate-200 flex items-center justify-center text-slate-400 hover:text-teal-600 hover:border-teal-600 transition-all"
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h2 className="text-sm font-black text-slate-900 tracking-tight">{topicName}</h2>
                        <p className="text-[10px] font-black text-teal-500 uppercase tracking-widest">Question {currentIndex + 1} of {questions.length}</p>
                    </div>
                </div>

                <div className="flex items-center gap-8">
                    <div className="hidden sm:flex items-center gap-3 bg-slate-50 px-4 py-2 rounded-2xl border border-slate-100">
                        <Timer className="w-4 h-4 text-slate-400" />
                        <span className="text-sm font-black text-slate-700 font-mono">{formatTime(timeElapsed)}</span>
                    </div>
                    <button
                        onClick={finalizeSession}
                        className="px-6 py-2.5 rounded-xl bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest hover:bg-teal-600 transition-all"
                    >
                        End Session
                    </button>
                </div>
            </header>



            {/* Progress Bar */}
            {questions.length > 0 && (
                <div className="h-1.5 w-full bg-slate-100">
                    <div className="h-full bg-teal-600 transition-all duration-500 ease-out shadow-[0_0_10px_rgba(13,148,136,0.3)]"
                        style={{ width: `${progress}%` }}
                    />
                </div>
            )}

            {/* Main Content */}
            <main className="flex-1 min-w-0 w-full mx-auto p-4 sm:p-6 overflow-y-auto [&::-webkit-scrollbar]:hidden flex justify-center">
                <div className="w-full max-w-5xl transition-all duration-500">
                    {/* Main Column: Question, Options & Explanation */}
                    <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden flex flex-col min-h-[400px] w-full transition-all duration-500">
                        <div className="p-6 sm:p-10 flex-1">
                            {/* Question */}
                            <div className="mb-6">
                                {currentMCQ.passage && (
                                    <div className="mb-8 p-6 bg-amber-50/50 rounded-2xl border border-amber-100/50 max-h-[400px] overflow-y-auto shadow-inner">
                                        <h3 className="text-[10px] font-black text-amber-600 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                                            <BookOpenText className="w-4 h-4" />
                                            {currentMCQ.passage.title || 'Read the following passage'}
                                        </h3>
                                        <div className="prose prose-slate max-w-none text-slate-700 leading-relaxed font-medium">
                                            <MarkdownRenderer content={currentMCQ.passage.content} />
                                        </div>
                                    </div>
                                )}
                                <div className="flex justify-between items-start mb-4">
                                    <span className="text-[10px] font-black text-teal-500 uppercase tracking-[0.2em] block">Question</span>
                                    <button
                                        onClick={() => { setReportingId(currentMCQ.id); setReportModalOpen(true); }}
                                        disabled={reportedQuestions[currentMCQ.id] || reportingId === currentMCQ.id}
                                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-extrabold uppercase tracking-widest transition-all ${reportedQuestions[currentMCQ.id]
                                            ? 'bg-amber-100 text-amber-600'
                                            : 'bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-600'
                                            }`}
                                    >
                                        <Flag className="w-3 h-3" />
                                        {reportedQuestions[currentMCQ.id] ? 'Reported' : 'Report Mistake'}
                                    </button>
                                </div>
                                <div className="text-lg sm:text-xl font-bold text-slate-900 leading-relaxed">
                                    <MarkdownRenderer content={currentMCQ.question} />
                                </div>
                                {currentMCQ.question_image_url && (
                                    <div className="mt-8 rounded-2xl overflow-hidden border border-slate-100 shadow-sm max-w-lg">
                                        <img src={currentMCQ.question_image_url} alt="Question" className="w-full h-auto" />
                                    </div>
                                )}
                            </div>

                            {/* Options */}
                            <div className={`grid gap-3 ${optionsGridClass}`}>
                                {[
                                    { key: 'A', text: currentMCQ.option_a },
                                    { key: 'B', text: currentMCQ.option_b },
                                    { key: 'C', text: currentMCQ.option_c },
                                    { key: 'D', text: currentMCQ.option_d },
                                ].map((option) => {
                                    const isSubmitted = submittedAnswers[currentIndex];
                                    const isSelected = answers[currentIndex] === option.key;
                                    const isCorrect = option.key === currentMCQ.correct_option;
                                    const showCorrect = isSubmitted && isCorrect;
                                    const showWrong = isSubmitted && isSelected && !isCorrect;

                                    return (
                                        <button
                                            key={option.key}
                                            onClick={() => handleSelectOption(option.key)}
                                            disabled={isSubmitted}
                                            className={`group flex items-center p-4 rounded-2xl border-2 transition-all active:scale-[0.99] text-left ${showCorrect
                                                ? 'bg-emerald-50 border-emerald-500 shadow-md shadow-emerald-100'
                                                : showWrong
                                                    ? 'bg-rose-50 border-rose-500 shadow-md shadow-rose-100'
                                                    : isSelected
                                                        ? 'bg-teal-50 border-teal-500 shadow-md shadow-teal-100'
                                                        : 'bg-white border-slate-100 hover:border-slate-200 hover:bg-slate-50'
                                                } ${isSubmitted ? 'cursor-default' : ''}`}
                                        >
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm shrink-0 transition-all ${showCorrect
                                                ? 'bg-emerald-600 text-white'
                                                : showWrong
                                                    ? 'bg-rose-600 text-white'
                                                    : isSelected
                                                        ? 'bg-teal-600 text-white'
                                                        : 'bg-slate-100 text-slate-400 group-hover:bg-white group-hover:text-slate-600'
                                                }`}>
                                                {showCorrect ? <CheckCircle2 className="w-5 h-5" /> : showWrong ? <XCircle className="w-5 h-5" /> : option.key}
                                            </div>
                                            <div className={`ml-6 text-sm font-bold ${isSelected ? 'text-teal-900' : 'text-slate-600'}`}>
                                                <MarkdownRenderer content={option.text} />
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Explanation */}
                            {showExplanation && (
                                <div className="mt-8 bg-slate-50 rounded-[2rem] border border-slate-100 p-6 sm:p-8 animate-fade-in">
                                    <div className="flex items-center gap-3 mb-6">
                                        <div className="w-10 h-10 rounded-xl bg-teal-100 flex items-center justify-center shrink-0">
                                            <HelpCircle className="w-5 h-5 text-teal-600" />
                                        </div>
                                        <h4 className="text-sm font-black text-teal-600 uppercase tracking-widest">Explanation</h4>
                                    </div>
                                    <div className="text-base text-slate-700 leading-relaxed font-medium">
                                        <MarkdownRenderer content={currentMCQ.explanation || ''} />
                                    </div>
                                    {currentMCQ.explanation_url && (
                                        <div className="mt-6 rounded-2xl overflow-hidden border border-slate-200 shadow-sm">
                                            <img src={currentMCQ.explanation_url} alt="Explanation" className="w-full h-auto" />
                                        </div>
                                    )}
                                </div>
                            )}

                        </div>

                        {/* Navigation Footer */}
                        <div className="p-4 sm:p-8 bg-slate-50/50 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={prevQuestion}
                                    disabled={currentIndex === 0}
                                    className="flex items-center justify-center w-12 h-12 rounded-2xl border border-slate-200 bg-white text-slate-400 hover:text-teal-600 hover:border-teal-600 transition-all disabled:opacity-30 disabled:cursor-not-allowed shadow-sm group"
                                >
                                    <ChevronLeft className="w-6 h-6 group-hover:-translate-x-1 transition-transform" />
                                </button>
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-4">
                                    Item {currentIndex + 1} / {questions.length}
                                </span>
                                <button
                                    onClick={nextQuestion}
                                    className="flex items-center justify-center w-12 h-12 rounded-2xl border border-slate-200 bg-white text-slate-400 hover:text-teal-600 hover:border-teal-600 transition-all shadow-sm group"
                                >
                                    <ChevronRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
                                </button>
                            </div>

                            {!submittedAnswers[currentIndex] ? (
                                <button
                                    onClick={handleSubmitAnswer}
                                    disabled={!answers[currentIndex]}
                                    className={`w-full sm:w-auto px-10 py-4 rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] transition-all flex items-center justify-center gap-3 ${
                                        answers[currentIndex]
                                            ? 'bg-teal-600 text-white shadow-xl shadow-teal-200 hover:bg-teal-700 active:scale-95'
                                            : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                                    }`}
                                >
                                    Submit Answer <Send className="w-4 h-4" />
                                </button>
                            ) : (
                                <button
                                    onClick={nextQuestion}
                                    className="w-full sm:w-auto px-10 py-4 rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] bg-slate-900 text-white shadow-xl shadow-slate-200 hover:bg-slate-800 active:scale-95 transition-all flex items-center justify-center gap-3"
                                >
                                    {currentIndex === questions.length - 1 ? (
                                        <>Finish Practice <CheckCircle2 className="w-4 h-4" /></>
                                    ) : (
                                        <>Next Question <ArrowRight className="w-4 h-4" /></>
                                    )}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </main>

            {/* Report Modal */}
            {reportModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-200">
                        <h3 className="text-lg font-black text-slate-900 mb-4 flex items-center gap-2">
                            <Flag className="w-5 h-5 text-rose-500" />
                            Report Content Issue
                        </h3>
                        <div className="grid grid-cols-1 gap-3">
                            <button disabled={isSubmittingReport} onClick={() => handleReportSubmit('Incorrect Answer')} className="flex items-center gap-3 p-4 rounded-2xl border border-slate-200 hover:border-rose-300 hover:bg-rose-50 disabled:opacity-50 text-slate-700 transition-all text-left">
                                <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center text-rose-600"><CheckCircle2 className="w-5 h-5" /></div>
                                <div>
                                    <div className="font-bold text-sm">Incorrect Answer</div>
                                    <div className="text-xs text-slate-500">The marked correct option is wrong</div>
                                </div>
                            </button>
                            <button disabled={isSubmittingReport} onClick={() => handleReportSubmit('Explanation Error')} className="flex items-center gap-3 p-4 rounded-2xl border border-slate-200 hover:border-amber-300 hover:bg-amber-50 disabled:opacity-50 text-slate-700 transition-all text-left">
                                <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600"><HelpCircle className="w-5 h-5" /></div>
                                <div>
                                    <div className="font-bold text-sm">Explanation Error</div>
                                    <div className="text-xs text-slate-500">The academic rationale has mistakes</div>
                                </div>
                            </button>
                            <button disabled={isSubmittingReport} onClick={() => handleReportSubmit('Syntax/Formatting')} className="flex items-center gap-3 p-4 rounded-2xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50 disabled:opacity-50 text-slate-700 transition-all text-left">
                                <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600"><Code className="w-5 h-5" /></div>
                                <div>
                                    <div className="font-bold text-sm">Syntax Error</div>
                                    <div className="text-xs text-slate-500">Typos, LaTeX issues, or illegible text</div>
                                </div>
                            </button>
                        </div>
                        <button disabled={isSubmittingReport} onClick={() => { setReportModalOpen(false); setReportingId(null); }} className="w-full mt-4 py-3 text-sm font-bold text-slate-500 hover:text-slate-800 disabled:opacity-50 transition-colors">
                            Cancel
                        </button>
                    </div>
                </div>
            )}


        </div>
    );
}

