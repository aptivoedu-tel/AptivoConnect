'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
    ChevronLeft, ChevronRight, Timer, Trophy, XCircle,
    CheckCircle2, HelpCircle, ArrowRight, RotateCcw, Send, BookOpen, Flag, Code
} from 'lucide-react';
import MarkdownRenderer from '@/components/shared/MarkdownRenderer';
import Sidebar from '@/components/layout/Sidebar';
import { AuthService } from '@/lib/services/authService';
import { PracticeService, MCQ } from '@/lib/services/practiceService';
import { toast } from 'sonner';
import { useLoading } from '@/lib/context/LoadingContext';
import { useUI } from '@/lib/context/UIContext';

export default function DirectSubtopicPracticePage() {
    const router = useRouter();
    const params = useParams();
    const subtopicId = parseInt(params.subtopicId as string);
    const { isSidebarCollapsed } = useUI();
    const { setLoading: setGlobalLoading } = useLoading();

    const [questions, setQuestions] = useState<MCQ[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [answers, setAnswers] = useState<Record<number, string>>({});
    const [submittedAnswers, setSubmittedAnswers] = useState<Record<number, boolean>>({});
    const [isCompleted, setIsCompleted] = useState(false);
    const [timeElapsed, setTimeElapsed] = useState(0);
    const [session, setSession] = useState<any>(null);
    const [subtopicName, setSubtopicName] = useState('');
    const [results, setResults] = useState<any>(null);
    const [user, setUser] = useState<any>(null);
    const [lastInteractionTime, setLastInteractionTime] = useState(Date.now());
    const [isCorrect, setIsCorrect] = useState<Record<number, boolean>>({});
    const [finishedResults, setFinishedResults] = useState<any>(null);
    // Reporting state
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
        if (initialized.current) return;
        initialized.current = true;

        const initSession = async () => {
            setGlobalLoading(true, 'Preparing Practice Session...');
            try {
                const currentUser = AuthService.getCurrentUser() || await AuthService.syncSession();
                if (!currentUser) { router.push('/login'); return; }
                setUser(currentUser);

                // Fetch subtopic info
                const res = await fetch(`/api/mongo/content?type=subtopics&id=${subtopicId}`);
                const data = await res.json();
                const subtopic = data.subtopics?.[0];
                setSubtopicName(subtopic?.name || 'Subtopic Practice');

                // Get topic to find subject_id
                let subjectId = 0;
                if (subtopic?.topic_id) {
                    const topicRes = await fetch(`/api/mongo/content?type=topics&id=${subtopic.topic_id}`);
                    const topicData = await topicRes.json();
                    subjectId = topicData.topics?.[0]?.subject_id || 0;
                }

                // Check for existing active session
                const activeRecord = await PracticeService.getActiveSession(currentUser.id, { subtopicId });
                let finalSession = activeRecord.session;
                let finalMcqs = activeRecord.mcqs;

                if (finalSession && finalMcqs && finalMcqs.length > 0) {
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
                    console.log('[Practice-Subtopic] Generating new questions set...');
                    const mcqs = await PracticeService.generatePracticeSession(subtopicId, currentUser.university_id || null, subjectId, currentUser.id, null, true);

                    if (!mcqs || mcqs.length === 0) {
                        console.error('[Practice-Subtopic] Zero questions found for subtopic:', subtopicId);
                        toast.error('No practice questions available for this subtopic yet.');
                        router.push('/practice');
                        return;
                    }

                    const mcqIds = mcqs.map((m: any) => m.id);

                    console.log(`[Practice-Subtopic] Fetched ${mcqs.length} questions. Creating session...`);
                    const { session: startedSession, error } = await PracticeService.createSession(
                        currentUser.id, subtopicId, currentUser.university_id || null, 'practice', subtopic?.topic_id || null, mcqIds, subjectId
                    );

                    if (error || !startedSession) {
                        console.error('[Practice-Subtopic] Create session failure:', error);
                        throw new Error(error || 'Could not initialize session');
                    }

                    setSession(startedSession);
                    sessionRef.current = startedSession;
                    setQuestions(mcqs);
                }

                setLastInteractionTime(Date.now());
                timerRef.current = setInterval(() => {
                    timeRef.current += 1;
                    setTimeElapsed(timeRef.current);
                }, 1000);
            } catch (err: any) {
                console.error('[Practice-Subtopic] Session loading error:', err);
                toast.error(err.message || 'Failed to start practice.');
                initialized.current = false; // Allow retry on next mount
                router.push('/practice');
            } finally {
                setGlobalLoading(false);
            }
        };

        if (subtopicId) initSession();
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
            if (syncIntervalRef.current) clearInterval(syncIntervalRef.current);
        };
    }, [subtopicId]);

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

        const selectedOption = answers[currentIndex] as any;
        const isCorrectOption = currentMCQ.correct_option === selectedOption;
        setSubmittedAnswers(prev => ({ ...prev, [currentIndex]: true }));
        setIsCorrect(prev => ({ ...prev, [currentIndex]: isCorrectOption }));
        setLastInteractionTime(Date.now());

        PracticeService.submitAttempt(session.id, currentMCQ.id, user.id, selectedOption, timeSpent)
            .then((result) => {
            setQuestions(prev => prev.map((q, idx) =>
                idx === currentIndex
                    ? {
                        ...q,
                        correct_option: result.correctOption as any,
                        explanation: result.explanation ?? q.explanation,
                        explanation_url: result.explanation_url ?? q.explanation_url
                    }
                    : q
            ));

            if (currentIndex < questions.length - 1) {
                const nextQ = questions[currentIndex + 1];
                PracticeService.prefetchQuestionData(nextQ.id, session.id)
                    .then((checkData) => {
                        if (!checkData) return;
                        setQuestions(prev => prev.map((q, idx) =>
                            idx === currentIndex + 1
                                ? {
                                    ...q,
                                    correct_option: checkData.correct_option as any,
                                    explanation: checkData.explanation ?? q.explanation,
                                    explanation_url: checkData.explanation_url ?? q.explanation_url
                                }
                                : q
                        ));
                    })
                    .catch(checkErr => console.warn('[Practice] Could not prefetch next explanation:', checkErr));
            }
            })
            .catch((err: any) => {
            console.error('Submit error:', err);
                toast.error('Answer saved locally. Server sync will retry on session finish.');
            });
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
        if (currentIndex < questions.length - 1) setCurrentIndex(currentIndex + 1);
        else finalizeSession();
    };

    const prevQuestion = () => {
        setLastInteractionTime(Date.now());
        if (currentIndex > 0) setCurrentIndex(currentIndex - 1);
    };

    const finalizeSession = async () => {
        if (isCompleted || !session || results) return;

        setGlobalLoading(true, 'Finalizing your session...');
        try {
            if (timerRef.current) clearInterval(timerRef.current);

            let correct = 0, wrong = 0, skipped = 0;
            questions.forEach((q, idx) => {
                const a = answers[idx];
                if (!a) skipped++;
                else if (a === q.correct_option) correct++;
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

    const fmt = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

    if (!isCompleted && questions.length === 0) return (
        <div className="min-h-screen flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
        </div>
    );

    if (isCompleted && finishedResults) return (
        <div className={`min-h-screen bg-gray-50 flex items-center justify-center p-4 ${isSidebarCollapsed ? 'lg:ml-24' : 'lg:ml-72'} transition-all duration-300`}>
            <Sidebar userRole="student" />
            <div className="w-full max-w-lg bg-white rounded-3xl shadow-xl overflow-hidden">
                <div className="bg-gradient-to-br from-slate-900 to-teal-900 p-6 sm:p-10 text-center">
                    <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <Trophy className="w-8 h-8 text-teal-300" />
                    </div>
                    <h1 className="text-2xl font-black text-white">Practice Complete!</h1>
                    <p className="text-teal-300 text-xs font-bold uppercase tracking-widest mt-1">{subtopicName}</p>
                </div>
                <div className="p-8">
                    <div className="grid grid-cols-4 gap-3 mb-8">
                        {[
                            { label: 'Score', value: `${finishedResults.score}%`, cls: 'text-teal-600' },
                            { label: 'Correct', value: finishedResults.correct, cls: 'text-emerald-600' },
                            { label: 'Wrong', value: finishedResults.wrong, cls: 'text-rose-600' },
                            { label: 'Time', value: fmt(finishedResults.time), cls: 'text-slate-700' },
                        ].map(c => (
                            <div key={c.label} className="bg-slate-50 rounded-2xl p-4 text-center">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{c.label}</p>
                                <p className={`text-xl font-black ${c.cls}`}>{c.value}</p>
                            </div>
                        ))}
                    </div>
                    <div className="space-y-3">
                        <button onClick={() => window.location.reload()} className="w-full py-4 bg-teal-600 text-white rounded-xl font-black text-sm hover:bg-teal-700 transition-all flex items-center justify-center gap-2">
                            <RotateCcw className="w-4 h-4" /> Practice Again
                        </button>
                        <button onClick={() => router.push('/practice')} className="w-full py-4 bg-slate-900 text-white rounded-xl font-black text-sm hover:bg-slate-800 transition-all flex items-center justify-center gap-2">
                            <BookOpen className="w-4 h-4" /> Browse Topics
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );

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
        <div className="h-screen bg-gray-50 flex flex-col overflow-hidden">
            <header className="h-16 bg-white border-b border-slate-100 flex items-center justify-between px-6 sticky top-0 z-50">
                <div className="flex items-center gap-4">
                    <button onClick={() => router.push('/practice')} className="w-9 h-9 rounded-lg border border-slate-200 flex items-center justify-center text-slate-400 hover:text-teal-600 hover:border-teal-600 transition-all">
                        <ChevronLeft className="w-4 h-4" />
                    </button>
                    <div>
                        <h2 className="text-sm font-black text-slate-900">{subtopicName}</h2>
                        <p className="text-[10px] font-bold text-teal-500 uppercase tracking-wider">Q{currentIndex + 1} / {questions.length}</p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
                        <Timer className="w-3.5 h-3.5 text-slate-400" />
                        <span className="text-sm font-black text-slate-700 font-mono">{fmt(timeElapsed)}</span>
                    </div>
                    <button onClick={finalizeSession} className="px-4 py-2 rounded-lg bg-slate-900 text-white text-xs font-black uppercase tracking-widest hover:bg-teal-600 transition-all">End</button>
                </div>
            </header>

            <div className="h-1 w-full bg-slate-100">
                <div className="h-full bg-teal-500 transition-all duration-500" style={{ width: `${progress}%` }} />
            </div>

            <main className="flex-1 min-w-0 w-full mx-auto p-4 sm:p-6 overflow-y-auto [&::-webkit-scrollbar]:hidden flex justify-center">
                <div className="w-full max-w-5xl transition-all duration-500">
                    {/* Main Column: Question, Options & Explanation */}
                    <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden flex flex-col min-h-[400px] w-full transition-all duration-500">
                        <div className="p-6 sm:p-10 flex-1">
                            <div className="flex justify-between items-start mb-4">
                                <span className="text-[10px] font-black text-teal-500 uppercase tracking-widest block">Question</span>
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
                            <div className="text-lg sm:text-xl font-bold text-slate-900 leading-relaxed mb-8">
                                <MarkdownRenderer content={currentMCQ.question} />
                            </div>
                            <div className={`grid gap-3 ${optionsGridClass}`}>
                                {[
                                    { key: 'A', text: currentMCQ.option_a },
                                    { key: 'B', text: currentMCQ.option_b },
                                    { key: 'C', text: currentMCQ.option_c },
                                    { key: 'D', text: currentMCQ.option_d },
                                ].map(opt => {
                                    const isSubmitted = submittedAnswers[currentIndex];
                                    const isSelected = answers[currentIndex] === opt.key;
                                    const isCorrect = opt.key === currentMCQ.correct_option;
                                    const showCorrect = isSubmitted && isCorrect;
                                    const showWrong = isSubmitted && isSelected && !isCorrect;
                                    return (
                                        <button key={opt.key} onClick={() => handleSelectOption(opt.key)} disabled={isSubmitted}
                                            className={`w-full flex items-center gap-4 p-3 rounded-xl border-2 transition-all text-left ${showCorrect ? 'bg-emerald-50 border-emerald-400' : showWrong ? 'bg-rose-50 border-rose-400' : isSelected ? 'bg-teal-50 border-teal-400' : 'bg-white border-slate-100 hover:border-slate-200 hover:bg-slate-50'} ${isSubmitted ? 'cursor-default' : ''}`}>
                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm shrink-0 ${showCorrect ? 'bg-emerald-500 text-white' : showWrong ? 'bg-rose-500 text-white' : isSelected ? 'bg-teal-500 text-white' : 'bg-slate-100 text-slate-500'}`}>
                                                {showCorrect ? <CheckCircle2 className="w-4 h-4" /> : showWrong ? <XCircle className="w-4 h-4" /> : opt.key}
                                            </div>
                                            <span className={`text-sm font-semibold ${isSelected ? 'text-teal-900' : 'text-slate-700'}`}>
                                                <MarkdownRenderer content={opt.text} />
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Explanation */}
                            {showExplanation && (
                                <div className="mt-8 bg-slate-50 rounded-2xl border border-slate-100 p-5 sm:p-6 animate-fade-in">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="w-8 h-8 rounded-lg bg-teal-100 flex items-center justify-center shrink-0">
                                            <HelpCircle className="w-4 h-4 text-teal-600" />
                                        </div>
                                        <h4 className="text-xs font-black text-teal-600 uppercase tracking-widest">Explanation</h4>
                                    </div>
                                    <div className="text-sm text-slate-700 leading-relaxed font-medium">
                                        <MarkdownRenderer content={currentMCQ.explanation || ''} />
                                    </div>
                                    {currentMCQ.explanation_url && (
                                        <div className="mt-4 rounded-xl overflow-hidden border border-slate-200 shadow-sm">
                                            <img src={currentMCQ.explanation_url} alt="Explanation" className="w-full h-auto" />
                                        </div>
                                    )}
                                </div>
                            )}

                        </div>
                        <div className="px-5 py-3 bg-slate-50/60 border-t border-slate-100 flex items-center justify-between gap-4">
                            <div className="flex items-center gap-2">
                                <button onClick={prevQuestion} disabled={currentIndex === 0}
                                    className="w-9 h-9 rounded-lg border border-slate-200 bg-white flex items-center justify-center text-slate-400 hover:text-teal-600 hover:border-teal-400 transition-all disabled:opacity-30">
                                    <ChevronLeft className="w-4 h-4" />
                                </button>
                                <span className="text-xs font-bold text-slate-400 px-2">{currentIndex + 1}/{questions.length}</span>
                                <button onClick={nextQuestion}
                                    className="w-9 h-9 rounded-lg border border-slate-200 bg-white flex items-center justify-center text-slate-400 hover:text-teal-600 hover:border-teal-400 transition-all">
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                            {!submittedAnswers[currentIndex] ? (
                                <button onClick={handleSubmitAnswer} disabled={!answers[currentIndex]}
                                    className={`px-6 py-2.5 rounded-xl font-black text-sm uppercase tracking-widest transition-all flex items-center gap-2 ${answers[currentIndex] ? 'bg-teal-600 text-white hover:bg-teal-700 shadow-md' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}>
                                    Submit <Send className="w-3.5 h-3.5" />
                                </button>
                            ) : (
                                <button onClick={nextQuestion}
                                    className="px-6 py-2.5 rounded-xl font-black text-sm uppercase tracking-widest bg-slate-900 text-white hover:bg-slate-800 transition-all flex items-center gap-2">
                                    {currentIndex === questions.length - 1 ? <>Finish <CheckCircle2 className="w-3.5 h-3.5" /></> : <>Next <ArrowRight className="w-3.5 h-3.5" /></>}
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
