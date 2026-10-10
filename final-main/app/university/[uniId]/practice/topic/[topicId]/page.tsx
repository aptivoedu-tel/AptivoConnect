'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
    ChevronLeft,
    ChevronRight,
    Send,
    Timer,
    Trophy,
    XCircle,
    CheckCircle2,
    HelpCircle,
    AlertCircle,
    ArrowRight,
    Play,
    RotateCcw,
    Layout,
    Clock,
    Target as TargetIcon,
    HelpingHand,
    Sparkles,
    BookOpen,
    Brain,
    BookOpenText,
    Flag,
    Code
} from 'lucide-react';
import MarkdownRenderer from '@/components/shared/MarkdownRenderer';
import Sidebar from '@/components/layout/Sidebar';
import { AuthService } from '@/lib/services/authService';
import { PracticeService, MCQ } from '@/lib/services/practiceService';
import { toast } from 'sonner';
import { useLoading } from '@/lib/context/LoadingContext';

export default function TopicPracticeSessionPage() {
    const router = useRouter();
    const params = useParams();
    const uniId = parseInt(params.uniId as string);
    const topicId = parseInt(params.topicId as string);

    const { setLoading: setGlobalLoading, isLoading: loading } = useLoading();
    const [questions, setQuestions] = useState<MCQ[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [answers, setAnswers] = useState<Record<number, string>>({});
    const [submittedAnswers, setSubmittedAnswers] = useState<Record<number, boolean>>({});
    const [isCompleted, setIsCompleted] = useState(false);
    const [isFinishing, setIsFinishing] = useState(false);
    const [reportedQuestions, setReportedQuestions] = useState<Record<number, boolean>>({});
    const [reportingId, setReportingId] = useState<number | null>(null);
    const [reportModalOpen, setReportModalOpen] = useState(false);
    const [isSubmittingReport, setIsSubmittingReport] = useState(false);
    const [taskRequirement, setTaskRequirement] = useState<{ required_mcqs: number, due_date?: string } | null>(null);

    const [startTime] = useState(new Date());
    const [timeElapsed, setTimeElapsed] = useState(0);
    const [session, setSession] = useState<any>(null);
    const [topicName, setTopicName] = useState('');
    const [user, setUser] = useState<any>(null);

    const [lastInteractionTime, setLastInteractionTime] = useState(Date.now());
    const [isCorrect, setIsCorrect] = useState<Record<number, boolean>>({});
    const [prefetchData, setPrefetchData] = useState<Record<number, any>>({});
    const [finishedResults, setFinishedResults] = useState<any>(null);
    const timerRef = useRef<any>(null);
    const timeRef = useRef(0);
    const sessionRef = useRef<any>(null);
    const initialized = useRef(false);

    // Handle background prefetching when question changes
    useEffect(() => {
        if (!questions.length || !session) return;
        
        const currentMCQ = questions[currentIndex];
        if (!currentMCQ) return;

        // Prefetch current question data if not already loaded
        if (!prefetchData[currentMCQ.id]) {
            PracticeService.prefetchQuestionData(currentMCQ.id, session.id).then(data => {
                if (data) setPrefetchData(prev => ({ ...prev, [currentMCQ.id]: data }));
            });
        }

        // Also prefetch next question data for a smooth transition
        const nextQ = questions[currentIndex + 1];
        if (nextQ && !prefetchData[nextQ.id]) {
            PracticeService.prefetchQuestionData(nextQ.id, session.id).then(data => {
                if (data) setPrefetchData(prev => ({ ...prev, [nextQ.id]: data }));
            });
        }
    }, [currentIndex, questions, session]);

    useEffect(() => {
        if (initialized.current) return;
        initialized.current = true;

        const initSession = async () => {
            setGlobalLoading(true, 'Initialising Topic Practice...');
            try {
                console.log('Practicing Topic:', topicId, 'Uni:', uniId);
                const currentUser = AuthService.getCurrentUser() || await AuthService.syncSession();
                if (!currentUser) {
                    console.error('No user found');
                    router.push('/login');
                    return;
                }
                setUser(currentUser);

                // Fetch topic info
                const res = await fetch(`/api/mongo/content?type=topics&id=${topicId}`);
                const data = await res.json();
                const topic = data.topics?.[0];
                setTopicName(topic?.name || 'Topic');

                // 1. Fetch task requirement
                let customLimit: number | undefined = undefined;
                if (currentUser.institution_id) {
                    try {
                        const taskRes = await fetch(`/api/mongo/institutions/tasks?institution_id=${currentUser.institution_id}&university_id=${uniId}`);
                        if (taskRes.ok) {
                            const tasksData = await taskRes.json();
                            const relevantTask = tasksData.tasks?.find((t: any) => t.type === 'topic' && t.target_id === topicId);
                            if (relevantTask && relevantTask.required_mcqs) {
                                customLimit = Number(relevantTask.required_mcqs);
                                setTaskRequirement({ required_mcqs: customLimit, due_date: relevantTask.due_date });
                            }
                        }
                    } catch (e) {
                        console.error('Failed to fetch task limit', e);
                    }
                }

                // Check for existing active session
                const activeRecord = await PracticeService.getActiveSession(currentUser.id, { topicId, universityId: uniId });
                let finalSession = activeRecord.session;
                let finalMcqs = activeRecord.mcqs;

                if (finalSession && finalMcqs && finalMcqs.length > 0) {
                    // Resume session
                    const priorAttempts = activeRecord.attempts || [];
                    const newAnswers: Record<number, string> = {};
                    const newSubmitted: Record<number, boolean> = {};
                    const newIsCorrect: Record<number, boolean> = {};
                    const newPrefetch: Record<number, any> = {};

                    priorAttempts.forEach((att: any) => {
                        const qIndex = finalMcqs.findIndex((m: any) => m.id === att.mcq_id);
                        if (qIndex !== -1) {
                            newAnswers[qIndex] = att.selected_option;
                            newSubmitted[qIndex] = true;
                            newIsCorrect[qIndex] = att.is_correct;
                            // Since these are previous attempts, the back-end already processed them, 
                            // we can assume the correct option for UI feedback if needed, 
                            // though simple re-fetching is safer.
                        }
                    });

                    // For resumed sessions, we still fetch the question set without answers to be safe
                    const secureData = await PracticeService.startSecureSession(finalSession.id);
                    if (secureData && secureData.questions) {
                        finalMcqs = secureData.questions;
                    }

                    setQuestions(finalMcqs);
                    setAnswers(newAnswers);
                    setSubmittedAnswers(newSubmitted);
                    setIsCorrect(newIsCorrect);
                    setTimeElapsed(finalSession.time_spent_seconds || 0);
                    timeRef.current = finalSession.time_spent_seconds || 0;

                    const nextIndex = priorAttempts.length;
                    setCurrentIndex(Math.min(nextIndex, finalMcqs.length - 1));

                    setSession(finalSession);
                    sessionRef.current = finalSession;
                } else {
                    // Start new session
                    const mcqs = await PracticeService.generatePracticeSession(
                        null, uniId, topic?.subject_id || 0, currentUser.id, topicId, false, customLimit
                    );

                    if (!mcqs || mcqs.length === 0) {
                        toast.error('No practice questions available.');
                        router.push(`/university/${uniId}`);
                        return;
                    }

                    const { session: startedSession, error } = await PracticeService.createSession(
                        currentUser.id, null, uniId, 'practice', topicId, mcqs.map((m: any) => m.id), topic?.subject_id
                    );

                    if (error || !startedSession) {
                        toast.error(error || 'Failed to create session');
                        router.push(`/university/${uniId}`);
                        return;
                    }

                    // Re-fetch securely to start the "clean" session
                    const secureData = await PracticeService.startSecureSession(startedSession.id);
                    setQuestions(secureData?.questions || mcqs);
                    setSession(startedSession);
                    sessionRef.current = startedSession;
                }

                setLastInteractionTime(Date.now());

                const syncInterval = setInterval(() => {
                    if (sessionRef.current && !isCompleted) {
                        PracticeService.syncSessionProgress(sessionRef.current.id, timeRef.current);
                    }
                }, 30000);

                timerRef.current = setInterval(() => {
                    timeRef.current += 1;
                    setTimeElapsed(timeRef.current);
                }, 1000);

                return () => {
                    clearInterval(syncInterval);
                    if (timerRef.current) clearInterval(timerRef.current);
                };
            } catch (error: any) {
                console.error('Init failure:', error);
                toast.error('Failed to start practice.');
                router.push(`/university/${uniId}`);
            } finally {
                setGlobalLoading(false);
            }
        };

        if (topicId && uniId) initSession();
    }, [topicId, uniId]);

    const handleSelectOption = (option: string) => {
        if (isCompleted || submittedAnswers[currentIndex]) return;
        setAnswers({ ...answers, [currentIndex]: option });
    };

    const handleSubmitAttempt = async (mcqId: number, selectedOption: string, timeSpent: number) => {
        return await PracticeService.submitAttempt(
            session.id,
            mcqId,
            user.id,
            selectedOption as any,
            timeSpent
        );
    };

    const nextQuestion = () => {
        setLastInteractionTime(Date.now());
        if (currentIndex < questions.length - 1) {
            setCurrentIndex(currentIndex + 1);
        } else {
            finalizeSession();
        }
    };

    const handleSubmitAnswer = async () => {
        if (!answers[currentIndex]) return;

        const currentMCQ = questions[currentIndex];
        const timeSpent = Math.round((Date.now() - lastInteractionTime) / 1000);

        // CHECK LOCALLY using background fetched data
        let answerData = prefetchData[currentMCQ.id];
        
        // If the student is faster than the background fetch, wait for it
        if (!answerData) {
            setGlobalLoading(true, 'Verifying answer...');
            try {
                answerData = await PracticeService.prefetchQuestionData(currentMCQ.id, session.id);
                if (answerData) {
                    setPrefetchData(prev => ({ ...prev, [currentMCQ.id]: answerData }));
                }
            } catch (err) {
                toast.error('Connection error. Please try again.');
                return;
            } finally {
                setGlobalLoading(false);
            }
        }

        if (!answerData) {
            toast.error('Could not verify answer. Please check your connection.');
            return;
        }

        // Comparison Logic
        const selected = answers[currentIndex];
        const correct = answerData.correct_option;
        const resultIsCorrect = (selected === correct);

        // Update UI state instantly
        setSubmittedAnswers(prev => ({ ...prev, [currentIndex]: true }));
        setIsCorrect(prev => ({ ...prev, [currentIndex]: resultIsCorrect }));
        
        // Record Attempt in state for end-of-session submission
        // We'll calculate the final array in finalizeSession to keep the state clean
        setLastInteractionTime(Date.now());
    };

    const prevQuestion = () => {
        setLastInteractionTime(Date.now());
        if (currentIndex > 0) {
            setCurrentIndex(currentIndex - 1);
        }
    };

    const finalizeSession = async () => {
        if (isCompleted || !session || finishedResults) return;

        setGlobalLoading(true, 'Finalizing your session...');
        try {
            if (timerRef.current) clearInterval(timerRef.current);

            // 1. Prepare attempts array
            const attemptsList: any[] = [];
            let correct = 0, wrong = 0, skipped = 0;

            questions.forEach((q, idx) => {
                const answer = answers[idx];
                const data = prefetchData[q.id];
                const isCorr = isCorrect[idx];

                if (!answer) {
                    skipped++;
                } else if (isCorr) {
                    correct++;
                } else {
                    wrong++;
                }

                // Push to sync list if answered
                if (answer) {
                    attemptsList.push({
                        mcq_id: q.id,
                        student_id: user.id,
                        selected_option: answer,
                        is_correct: !!isCorr,
                        time_spent_seconds: 0 // We could track per-question time but total is sent anyway
                    });
                }
            });

            // 2. Submit all in BATCH
            const { success, error } = await PracticeService.completeSession(
                session.id, 
                user.id, 
                questions.length, 
                correct, 
                wrong, 
                skipped, 
                timeElapsed,
                attemptsList
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
                toast.success('Session completed!');
            } else {
                toast.error(error || 'Failed to save session');
            }
        } catch (err: any) {
            console.error('Finalize error:', err);
            toast.error('Error completing session: ' + err.message);
        } finally {
            setGlobalLoading(false);
        }
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

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    if (loading || (!isCompleted && questions.length === 0)) return (
        <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
            <div className="w-10 h-10 border-4 border-teal-600 border-t-transparent rounded-full animate-spin" />
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
                            <h1 className="text-4xl font-black text-white mb-2 tracking-tight">Practice Complete!</h1>
                            <p className="text-teal-400 font-bold uppercase tracking-widest text-xs">{topicName}</p>
                        </div>
                    </div>

                    <div className="p-6 sm:p-10 lg:p-12">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-12">
                            <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 text-center transition-transform hover:scale-105">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Score</p>
                                <p className="text-3xl font-black text-teal-600">{finishedResults.score}%</p>
                            </div>
                            <div className="bg-teal-50 p-6 rounded-3xl border border-teal-100 text-center transition-transform hover:scale-105">
                                <p className="text-[10px] font-black text-teal-400 uppercase tracking-widest mb-1">Correct</p>
                                <p className="text-3xl font-black text-teal-600">{finishedResults.correct}</p>
                            </div>
                            <div className="bg-rose-50 p-6 rounded-3xl border border-rose-100 text-center transition-transform hover:scale-105">
                                <p className="text-[10px] font-black text-rose-400 uppercase tracking-widest mb-1">Wrong</p>
                                <p className="text-3xl font-black text-rose-600">{finishedResults.wrong}</p>
                            </div>
                            <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 text-center transition-transform hover:scale-105">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Time</p>
                                <p className="text-3xl font-black text-slate-900">{formatTime(finishedResults.time)}</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <button
                                onClick={() => window.location.reload()}
                                className="w-full py-5 bg-teal-600 text-white rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] shadow-xl shadow-teal-100 hover:bg-teal-700 transition-all active:scale-98 flex items-center justify-center gap-3 animate-pulse hover:animate-none"
                            >
                                <RotateCcw className="w-4 h-4" />
                                Practice More Questions
                            </button>
                            <button
                                onClick={() => router.push(`/university/${uniId}`)}
                                className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] shadow-xl shadow-slate-100 hover:bg-slate-800 transition-all active:scale-98 flex items-center justify-center gap-3"
                            >
                                <ArrowRight className="w-4 h-4" />
                                Return to Library
                            </button>
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
    const showExplanation = (submittedAnswers[currentIndex] || isCorrect[currentIndex] !== undefined) && !!prefetchData[currentMCQ.id]?.explanation;
    const currentExplanation = prefetchData[currentMCQ.id]?.explanation || '';
    const currentCorrectOption = prefetchData[currentMCQ.id]?.correct_option;
    const currentExplanationUrl = prefetchData[currentMCQ.id]?.explanation_url;

    return (
        <div className="h-screen bg-[#F8FAFC] flex flex-col overflow-hidden">
            {/* Header */}
            <header className="h-20 bg-white border-b border-slate-100 flex items-center justify-between px-8 sticky top-0 z-50">
                <div className="flex items-center gap-6">
                    <button
                        onClick={() => router.back()}
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
                        onClick={() => finalizeSession()}
                        className="btn btn-primary h-10 px-6 text-[10px]"
                    >
                        End Session
                    </button>
                </div>
            </header>

            {/* Task Requirement Banner */}
            {taskRequirement && (
                <div className="bg-gradient-to-r from-teal-600 via-teal-700 to-teal-800 text-white px-8 py-3 flex items-center justify-between shadow-lg relative z-40 overflow-hidden">
                    <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] pointer-events-none" />
                    <div className="flex items-center gap-4 relative z-10">
                        <div className="w-8 h-8 bg-white/20 backdrop-blur-md rounded-lg flex items-center justify-center">
                            <TargetIcon className="w-5 h-5 text-teal-100" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-teal-100 leading-none mb-1">Institutional Assignment</p>
                            <p className="text-sm font-black tracking-tight">Requirement: Complete <span className="text-amber-400">{taskRequirement.required_mcqs}</span> MCQs for Credit</p>
                        </div>
                    </div>
                    {taskRequirement.due_date && (
                        <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md px-4 py-2 rounded-xl border border-white/10 relative z-10">
                            <Clock className="w-4 h-4 text-teal-200" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-teal-50">
                                Deadline: {new Date(taskRequirement.due_date).toLocaleDateString()}
                            </span>
                        </div>
                    )}
                </div>
            )}

            {/* Progress Bar */}
            <div className="h-1.5 w-full bg-slate-100">
                <div
                    className="h-full bg-teal-600 transition-all duration-500 ease-out shadow-[0_0_10px_rgba(13,148,136,0.3)]"
                    style={{ width: `${progress}%` }}
                />
            </div>

            <main className="flex-1 min-w-0 w-full mx-auto p-4 sm:p-6 overflow-y-auto [&::-webkit-scrollbar]:hidden flex justify-center">
                <div className="w-full max-w-5xl transition-all duration-500">
                    {/* Main Column: Question, Options & Explanation */}
                    <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden flex flex-col min-h-[400px] w-full transition-all duration-500">
                        <div className="p-6 sm:p-10 flex-1">
                            {/* Question */}
                            <div className="mb-12">
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
                                <div className="text-xl sm:text-2xl font-bold text-slate-900 leading-relaxed">
                                    <MarkdownRenderer content={currentMCQ.question} />
                                </div>
                                {currentMCQ.question_image_url && (
                                    <div className="mt-8 rounded-2xl overflow-hidden border border-slate-100 shadow-sm max-w-lg">
                                        <img src={currentMCQ.question_image_url} alt="Question" className="w-full h-auto" />
                                    </div>
                                )}
                            </div>

                            {/* Options */}
                            <div className={`grid gap-4 ${optionsGridClass}`}>
                                {[
                                    { key: 'A', text: currentMCQ.option_a },
                                    { key: 'B', text: currentMCQ.option_b },
                                    { key: 'C', text: currentMCQ.option_c },
                                    { key: 'D', text: currentMCQ.option_d },
                                ].map((option) => {
                                    const isSubmitted = submittedAnswers[currentIndex];
                                    const isSelected = answers[currentIndex] === option.key;
                                    const isCorrect = option.key === currentCorrectOption;
                                    const showCorrect = isSubmitted && isCorrect;
                                    const showWrong = isSubmitted && isSelected && !isCorrect;

                                    return (
                                        <button
                                            key={option.key}
                                            onClick={() => handleSelectOption(option.key)}
                                            disabled={isSubmitted}
                                            className={`group flex items-center p-6 rounded-2xl border-2 transition-all active:scale-[0.99] text-left ${showCorrect
                                                ? 'bg-teal-50 border-teal-500 shadow-md shadow-teal-100'
                                                : showWrong
                                                    ? 'bg-rose-50 border-rose-500 shadow-md shadow-rose-100'
                                                    : isSelected
                                                        ? 'bg-teal-50 border-teal-500 shadow-md shadow-teal-100'
                                                        : 'bg-white border-slate-100 hover:border-slate-200 hover:bg-slate-50'
                                                } ${isSubmitted ? 'cursor-default' : ''}`}
                                        >
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm shrink-0 transition-all ${showCorrect
                                                ? 'bg-teal-600 text-white'
                                                : showWrong
                                                    ? 'bg-rose-600 text-white'
                                                    : isSelected
                                                        ? 'bg-teal-600 text-white'
                                                        : 'bg-slate-100 text-slate-400 group-hover:bg-white group-hover:text-slate-600'
                                                }`}>
                                                {showCorrect ? (
                                                    <CheckCircle2 className="w-5 h-5" />
                                                ) : showWrong ? (
                                                    <XCircle className="w-5 h-5" />
                                                ) : (
                                                    option.key
                                                )}
                                            </div>
                                            <div className={`ml-6 text-sm font-bold ${isSelected ? 'text-teal-900' : 'text-slate-600'
                                                }`}>
                                                <MarkdownRenderer content={option.text} />
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Explanation */}
                            {showExplanation && (
                                <div className="mt-12 bg-slate-50 rounded-[2rem] border border-slate-100 p-8 sm:p-10 animate-fade-in">
                                    <div className="flex items-center gap-4 mb-8">
                                        <div className="w-12 h-12 rounded-2xl bg-teal-100 flex items-center justify-center shrink-0">
                                            <HelpCircle className="w-6 h-6 text-teal-600" />
                                        </div>
                                        <h4 className="text-sm font-black text-teal-600 uppercase tracking-widest">Explanation</h4>
                                    </div>
                                    <div className="text-base text-slate-700 leading-relaxed font-medium">
                                        <MarkdownRenderer content={currentExplanation} />
                                    </div>
                                    {currentExplanationUrl && (
                                        <div className="mt-6 rounded-2xl overflow-hidden border border-slate-200 shadow-sm">
                                            <img src={currentExplanationUrl} alt="Explanation" className="w-full h-auto" />
                                        </div>
                                    )}
                                </div>
                            )}

                        </div>

                        {/* Navigation Footer */}
                        <div className="p-6 sm:p-12 bg-slate-50/50 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-6">
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
                                    className={`w-full sm:w-auto px-10 py-4 rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] transition-all flex items-center justify-center gap-3 ${answers[currentIndex]
                                        ? 'bg-teal-600 text-white shadow-xl shadow-teal-200 hover:bg-teal-700 active:scale-95'
                                        : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                                        }`}
                                >
                                    Submit Answer
                                    <Send className="w-4 h-4" />
                                </button>
                            ) : (
                                <button
                                    onClick={nextQuestion}
                                    className="w-full sm:w-auto px-10 py-4 rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] transition-all flex items-center justify-center gap-3 bg-slate-900 text-white shadow-xl shadow-slate-200 hover:bg-slate-800 active:scale-95"
                                >
                                    {currentIndex === questions.length - 1 ? (
                                        <>
                                            Finish Practice
                                            <CheckCircle2 className="w-4 h-4" />
                                        </>
                                    ) : (
                                        <>
                                            Next Question
                                            <ArrowRight className="w-4 h-4" />
                                        </>
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
