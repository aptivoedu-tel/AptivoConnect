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
    const sectionId = parseInt(params.sectionId as string);
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
    const [prefetchData, setPrefetchData] = useState<Record<number, any>>({});

    const [startTime] = useState(new Date());
    const [timeElapsed, setTimeElapsed] = useState(0);
    const [session, setSession] = useState<any>(null);
    const [topicName, setTopicName] = useState('');
    const [user, setUser] = useState<any>(null);

    const [lastInteractionTime, setLastInteractionTime] = useState(Date.now());
    const [isCorrect, setIsCorrect] = useState<Record<number, boolean>>({});

    const [finishedResults, setFinishedResults] = useState<any>(null);
    const timerRef = useRef<any>(null);
    const timeRef = useRef(0);
    const sessionRef = useRef<any>(null);
    const initialized = useRef(false);

    useEffect(() => {
        if (initialized.current) return;
        initialized.current = true;

        const initSession = async () => {
            setGlobalLoading(true, 'Initialising Topic Practice...');
            try {
                const currentUser = AuthService.getCurrentUser() || await AuthService.syncSession();
                if (!currentUser) {
                    router.push('/login');
                    return;
                }
                setUser(currentUser);

                const res = await fetch(`/api/mongo/content?type=topics&id=${topicId}`);
                const data = await res.json();
                const topic = data.topics?.[0];
                setTopicName(topic?.name || 'Topic');

                let customLimit: number | undefined = undefined;
                if (currentUser.institution_id) {
                    try {
                        const taskRes = await fetch(`/api/mongo/institutions/tasks?institution_id=${currentUser.institution_id}&test_section_id=${sectionId}`);
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

                const activeRecord = await PracticeService.getActiveSession(currentUser.id, { topicId, testSectionId: sectionId });
                let finalSession = activeRecord.session;
                let finalMcqs = activeRecord.mcqs;

                if (finalSession && finalMcqs && finalMcqs.length > 0) {
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
                    setCurrentIndex(Math.min(priorAttempts.length, finalMcqs.length - 1));
                    setSession(finalSession);
                    sessionRef.current = finalSession;
                } else {
                    const mcqs = await PracticeService.generatePracticeSession(
                        null, null, topic?.subject_id || 0, currentUser.id, topicId, true, customLimit, sectionId
                    );

                    if (!mcqs || mcqs.length === 0) {
                        toast.error('No practice questions available.');
                        router.push(`/test-sections/${sectionId}`);
                        return;
                    }

                    const { session: startedSession, error } = await PracticeService.createSession(
                        currentUser.id, null, null, 'practice', topicId, mcqs.map((m: any) => m.id), topic?.subject_id, sectionId
                    );

                    if (error || !startedSession) {
                        toast.error(error || 'Failed to create session');
                        router.push(`/test-sections/${sectionId}`);
                        return;
                    }

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
                router.push(`/test-sections/${sectionId}`);
            } finally {
                setGlobalLoading(false);
            }
        };

        if (topicId && sectionId) initSession();
    }, [topicId, sectionId]);

    const handleSelectOption = (option: string) => {
        if (isCompleted || submittedAnswers[currentIndex]) return;
        setAnswers({ ...answers, [currentIndex]: option });
    };

    const nextQuestion = () => {
        setLastInteractionTime(Date.now());
        if (currentIndex < questions.length - 1) {
            setCurrentIndex(currentIndex + 1);
        } else {
            finalizeSession();
        }
    };

    const handleSubmitAnswer = () => {
        if (!answers[currentIndex] || !session) return;
        
        // Prefetch answer data for current and next MCQ to make UI snappy
        if (!questions.length || !session) return;
        const cur = questions[currentIndex];
        if (cur && !prefetchData[cur.id]) {
            PracticeService.prefetchQuestionData(cur.id, session.id).then(data => {
                if (data) setPrefetchData(prev => ({ ...prev, [cur.id]: data }));
            });
        }
        const nxt = questions[currentIndex + 1];
        if (nxt && !prefetchData[nxt.id]) {
            PracticeService.prefetchQuestionData(nxt.id, session.id).then(data => {
                if (data) setPrefetchData(prev => ({ ...prev, [nxt.id]: data }));
            });
        }
        
        const currentMCQ = questions[currentIndex];
        let answerData = prefetchData[currentMCQ.id];
        
        if (!answerData) {
            setGlobalLoading(true, 'Verifying answer...');
            PracticeService.prefetchQuestionData(currentMCQ.id, session.id).then(data => {
                if (data) {
                    setPrefetchData(prev => ({ ...prev, [currentMCQ.id]: data }));
                    const isCorrectOption = data.correct_option === answers[currentIndex];
                    setSubmittedAnswers(prev => ({ ...prev, [currentIndex]: true }));
                    setIsCorrect(prev => ({ ...prev, [currentIndex]: isCorrectOption }));
                    const timeSpent = Math.round((Date.now() - lastInteractionTime) / 1000);
                    PracticeService.submitAttempt(session.id, currentMCQ.id, user.id, answers[currentIndex] as any, timeSpent)
                        .catch(err => console.warn('[Practice] Background attempt record failed:', err));
                }
                setGlobalLoading(false);
            }).catch(() => {
                toast.error('Connection error. Please try again.');
                setGlobalLoading(false);
            });
        } else {
            const isCorrectOption = answerData.correct_option === answers[currentIndex];
            setSubmittedAnswers(prev => ({ ...prev, [currentIndex]: true }));
            setIsCorrect(prev => ({ ...prev, [currentIndex]: isCorrectOption }));
            const timeSpent = Math.round((Date.now() - lastInteractionTime) / 1000);
            PracticeService.submitAttempt(session.id, currentMCQ.id, user.id, answers[currentIndex] as any, timeSpent)
                .catch(err => console.warn('[Practice] Background attempt record failed:', err));
        }
    };

    const prevQuestion = () => {
        setLastInteractionTime(Date.now());
        if (currentIndex > 0) setCurrentIndex(currentIndex - 1);
    };

    const finalizeSession = async () => {
        if (isCompleted || !session || finishedResults) return;
        setGlobalLoading(true, 'Finalizing your session...');
        try {
            if (timerRef.current) clearInterval(timerRef.current);
            const attemptsList: any[] = [];
            let correct = 0, wrong = 0, skipped = 0;
            questions.forEach((q, idx) => {
                const answer = answers[idx];
                if (!answer) skipped++;
                else if (isCorrect[idx]) { correct++; attemptsList.push({ mcq_id: q.id, student_id: user.id, selected_option: answer, is_correct: true, time_spent_seconds: 0 }); }
                else { wrong++; attemptsList.push({ mcq_id: q.id, student_id: user.id, selected_option: answer, is_correct: false, time_spent_seconds: 0 }); }
            });
            const { success, error } = await PracticeService.completeSession(session.id, user.id, questions.length, correct, wrong, skipped, timeElapsed, attemptsList);
            if (success) {
                setFinishedResults({ correct, wrong, skipped, score: Math.round((correct / questions.length) * 100), time: timeElapsed });
                setIsCompleted(true);
                toast.success('Session completed!');
            } else toast.error(error || 'Failed to save session');
        } catch (err: any) {
            toast.error('Error completing session: ' + err.message);
        } finally {
            setGlobalLoading(false);
        }
    };

    const handleReportSubmit = async (reason: string) => {
        if (!reportingId) return;
        setIsSubmittingReport(true);
        try {
            const res = await fetch('/api/mongo/reports', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mcq_id: reportingId, reason }) });
            if (res.ok) { setReportedQuestions(prev => ({ ...prev, [reportingId]: true })); toast.success('Question reported'); }
            else toast.error('Failed to report');
        } catch (error) { toast.error('Error reporting'); }
        finally { setIsSubmittingReport(false); setReportModalOpen(false); setReportingId(null); }
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    if (loading || (!isCompleted && questions.length === 0)) return (
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
                            <button onClick={() => window.location.reload()} className="w-full py-5 bg-teal-600 text-white rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] shadow-xl shadow-teal-100 hover:bg-teal-700 transition-all flex items-center justify-center gap-3">
                                <RotateCcw className="w-4 h-4" /> Practice More Questions
                            </button>
                            <button onClick={() => router.push(`/test-sections/${sectionId}`)} className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] shadow-xl shadow-slate-100 hover:bg-slate-800 transition-all flex items-center justify-center gap-3">
                                <ArrowRight className="w-4 h-4" /> Return to Library
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    const currentMCQ = questions[currentIndex];
    const progress = ((currentIndex + 1) / questions.length) * 100;
    const currentCorrectOption = prefetchData[currentMCQ?.id]?.correct_option;
    const showExplanation = (submittedAnswers[currentIndex] || isCorrect[currentIndex] !== undefined) && !!prefetchData[currentMCQ?.id]?.explanation;
    const currentExplanation = prefetchData[currentMCQ?.id]?.explanation || '';

    return (
        <div className="h-screen bg-[#F8FAFC] flex flex-col overflow-hidden">
            <header className="h-20 bg-white border-b border-slate-100 flex items-center justify-between px-8 sticky top-0 z-50">
                <div className="flex items-center gap-6">
                    <button onClick={() => router.back()} className="w-10 h-10 rounded-xl border border-slate-200 flex items-center justify-center text-slate-400 hover:text-teal-600 hover:border-teal-600 transition-all"><ChevronLeft className="w-5 h-5" /></button>
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
                    <button onClick={() => finalizeSession()} className="btn btn-primary h-10 px-6 text-[10px] bg-teal-600 hover:bg-teal-700 text-white rounded-xl uppercase font-black tracking-widest">End Session</button>
                </div>
            </header>
            {taskRequirement && (
                <div className="bg-gradient-to-r from-teal-600 via-teal-700 to-teal-800 text-white px-8 py-3 flex items-center justify-between shadow-lg relative z-40">
                    <div className="flex items-center gap-4">
                        <div className="w-8 h-8 bg-white/20 backdrop-blur-md rounded-lg flex items-center justify-center"><TargetIcon className="w-5 h-5 text-teal-100" /></div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-teal-100 mb-1">Institutional Assignment</p>
                            <p className="text-sm font-black tracking-tight">Requirement: Complete <span className="text-amber-400">{taskRequirement.required_mcqs}</span> MCQs</p>
                        </div>
                    </div>
                </div>
            )}
            <div className="h-1.5 w-full bg-slate-100"><div className="h-full bg-teal-600 transition-all duration-500 shadow-[0_0_10px_rgba(20,184,166,0.3)]" style={{ width: `${progress}%` }} /></div>
            <main className="flex-1 min-w-0 w-full mx-auto p-4 sm:p-6 overflow-y-auto flex justify-center">
                <div className="w-full max-w-5xl">
                    <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden flex flex-col min-h-[400px]">
                        <div className="p-6 sm:p-10 flex-1">
                            <div className="mb-12">
                                <div className="flex justify-between items-start mb-4">
                                    <span className="text-[10px] font-black text-teal-500 uppercase tracking-[0.2em]">Question</span>
                                    <button onClick={() => { setReportingId(currentMCQ.id); setReportModalOpen(true); }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-extrabold uppercase tracking-widest bg-slate-100 text-slate-400">Report Mistake</button>
                                </div>
                                <div className="text-xl sm:text-2xl font-bold text-slate-900 leading-relaxed"><MarkdownRenderer content={currentMCQ.question} /></div>
                                {currentMCQ.question_image_url && <div className="mt-8 rounded-2xl overflow-hidden border border-slate-100 max-w-lg"><img src={currentMCQ.question_image_url} alt="Question" className="w-full h-auto" /></div>}
                            </div>
                            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                                {[ { key: 'A', text: currentMCQ.option_a }, { key: 'B', text: currentMCQ.option_b }, { key: 'C', text: currentMCQ.option_c }, { key: 'D', text: currentMCQ.option_d } ].map((option) => {
                                    const isSubmitted = submittedAnswers[currentIndex];
                                    const isSelected = answers[currentIndex] === option.key;
                                    const isCorr = option.key === currentCorrectOption;
                                    const showCorrect = isSubmitted && isCorr;
                                    const showWrong = isSubmitted && isSelected && !isCorr;
                                    return (
                                        <button key={option.key} onClick={() => handleSelectOption(option.key)} disabled={isSubmitted} className={`flex items-center p-6 rounded-2xl border-2 transition-all ${showCorrect ? 'bg-teal-50 border-teal-500' : showWrong ? 'bg-rose-50 border-rose-500' : isSelected ? 'bg-teal-50 border-teal-500' : 'bg-white border-slate-100 hover:border-slate-200 hover:bg-slate-50'}`}>
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm shrink-0 ${showCorrect ? 'bg-teal-600 text-white' : showWrong ? 'bg-rose-600 text-white' : isSelected ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-400'}`}>{showCorrect ? <CheckCircle2 className="w-5 h-5" /> : showWrong ? <XCircle className="w-5 h-5" /> : option.key}</div>
                                            <div className="ml-6 text-sm font-bold text-slate-700"><MarkdownRenderer content={option.text} /></div>
                                        </button>
                                    );
                                })}
                            </div>
                            {showExplanation && (
                                <div className="mt-12 bg-slate-50 rounded-[2rem] border border-slate-100 p-8 sm:p-10">
                                    <div className="flex items-center gap-4 mb-8">
                                        <div className="w-12 h-12 rounded-2xl bg-teal-100 flex items-center justify-center"><HelpCircle className="w-6 h-6 text-teal-600" /></div>
                                        <h4 className="text-sm font-black text-teal-600 uppercase tracking-widest">Explanation</h4>
                                    </div>
                                    <div className="text-base text-slate-700 font-medium"><MarkdownRenderer content={currentExplanation} /></div>
                                </div>
                            )}
                        </div>
                        <div className="p-6 sm:p-12 bg-slate-50/50 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-6">
                            <div className="flex items-center gap-3">
                                <button onClick={prevQuestion} disabled={currentIndex === 0} className="flex items-center justify-center w-12 h-12 rounded-2xl border border-slate-200 bg-white disabled:opacity-30"><ChevronLeft className="w-6 h-6" /></button>
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-4">Item {currentIndex + 1} / {questions.length}</span>
                                <button onClick={nextQuestion} className="flex items-center justify-center w-12 h-12 rounded-2xl border border-slate-200 bg-white"><ChevronRight className="w-6 h-6" /></button>
                            </div>
                            {!submittedAnswers[currentIndex] ? (
                                <button onClick={handleSubmitAnswer} disabled={!answers[currentIndex]} className={`px-10 py-4 rounded-2xl font-black uppercase text-[10px] ${answers[currentIndex] ? 'bg-teal-600 text-white shadow-xl shadow-teal-200' : 'bg-slate-200 text-slate-400'}`}>Submit Answer</button>
                            ) : (
                                <button onClick={nextQuestion} className="px-10 py-4 rounded-2xl font-black uppercase text-[10px] bg-slate-900 text-white shadow-xl">Next Question</button>
                            )}
                        </div>
                    </div>
                </div>
            </main>
            {reportModalOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"><div className="bg-white rounded-3xl p-6 w-full max-w-sm"><h3 className="text-lg font-black mb-4 flex items-center gap-2"><Flag className="w-5 h-5 text-rose-500" /> Report Issue</h3><button onClick={() => handleReportSubmit('Incorrect Answer')} className="w-full p-4 mb-2 border rounded-xl font-bold">Incorrect Answer</button><button onClick={() => setReportModalOpen(false)} className="w-full mt-4 font-bold text-slate-400">Cancel</button></div></div>}
        </div>
    );
}
