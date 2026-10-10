"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AuthService } from '@/lib/services/authService';
import {
    Clock, ChevronLeft, ChevronRight, X, AlertCircle,
    CheckCircle, Flag, Info, Maximize2, ZoomIn, Search, Layers, GraduationCap, ChevronDown,
    Bookmark, Activity
} from 'lucide-react';
import { toast } from 'sonner';
import { useLoading } from '@/lib/context/LoadingContext';
import MarkdownRenderer from '@/components/shared/MarkdownRenderer';


interface Exam {
    id: number;
    name: string;
    exam_type: string;
    total_duration: number;
    allow_continue_after_time_up: boolean;
    auto_submit: boolean;
    negative_marking?: number;
    start_time?: string;
    end_time?: string;
}

interface Section {
    id: number;
    name: string;
    section_duration: number | null;
    num_questions: number;
    order_index: number;
    negative_marking?: number;
    default_marks_per_question?: number;
    questions?: Question[];
    fallback_test_section_id?: number;
    strictly_no_fallback?: boolean;
}

interface Question {
    id: number;
    section_id: number;
    question_text: string;
    image_url: string | null;
    question_type: string;
    options: any[];
    correct_answer: any;
    marks: number;
    explanation: string | null;
    passage_id?: number | null;
}

interface Passage {
    id: number;
    title: string;
    content: string;
}

export default function StudentExamPage() {
    const { sectionId, examId } = useParams();
    const router = useRouter();
    const { setLoading: setGlobalLoading } = useLoading();

    const [user, setUser] = useState<any>(null);

    // Data
    const [exam, setExam] = useState<Exam | null>(null);
    const [sections, setSections] = useState<Section[]>([]);
    const [questions, setQuestions] = useState<Question[]>([]);
    const [passages, setPassages] = useState<Record<number, Passage>>({});
    const [attemptId, setAttemptId] = useState<string | null>(null);

    

    const [activeSectionId, setActiveSectionId] = useState<number | null>(null);
    const [activeQuestionIdx, setActiveQuestionIdx] = useState(0); // Index within current section
    const [answers, setAnswers] = useState<Record<number, any>>({}); // question_id -> answer
    const [timeLeft, setTimeLeft] = useState<number>(-1);
    const [isTimeUpModalOpen, setIsTimeUpModalOpen] = useState(false);
    const [isZoomed, setIsZoomed] = useState(false);
    const [status, setStatus] = useState<'taking' | 'completed'>('taking');
    const [results, setResults] = useState<{ score: number, total: number } | null>(null);
    const [completedSectionIds, setCompletedSectionIds] = useState<number[]>([]);
    const [sectionTimeLeft, setSectionTimeLeft] = useState<number | null>(null);
    const [showNavMatrix, setShowNavMatrix] = useState(false);
    const [markedForReview, setMarkedForReview] = useState<Record<number, boolean>>({});
    const [visitedQuestions, setVisitedQuestions] = useState<Record<number, boolean>>({});
    const [showAllSections, setShowAllSections] = useState(false);

    // Guard: only save to localStorage AFTER initial data load completes
    const isInitialized = useRef(false);
    const totalTimerRef = useRef<NodeJS.Timeout | null>(null);

    const toggleFullScreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
        } else {
            if (document.exitFullscreen) document.exitFullscreen();
        }
    };

    // Filtered questions for active section
    const currentSectionQuestions = questions.filter(q => q.section_id === activeSectionId);
    const activeQuestion = currentSectionQuestions[activeQuestionIdx];

    // Restore persisted exam state on mount (runs before loadExamData)
    useEffect(() => {
        const saved = localStorage.getItem('examState');
        if (saved) {
            try {
                const state = JSON.parse(saved);
                if (state.answers) setAnswers(state.answers);
                if (state.activeSectionId !== undefined) setActiveSectionId(state.activeSectionId);
                if (state.activeQuestionIdx !== undefined) setActiveQuestionIdx(state.activeQuestionIdx);
                if (state.visitedQuestions) setVisitedQuestions(state.visitedQuestions);
                if (state.completedSectionIds) setCompletedSectionIds(state.completedSectionIds);
                if (state.markedForReview) setMarkedForReview(state.markedForReview);
                if (state.sectionTimeLeft !== undefined) setSectionTimeLeft(state.sectionTimeLeft);
                if (state.showAllSections !== undefined) setShowAllSections(state.showAllSections);
            } catch (e) {
                console.error('Failed to parse saved exam state', e);
            }
        }
    }, []);

    useEffect(() => {
        const init = async () => {
            const u = AuthService.getCurrentUser() || await AuthService.syncSession();
            if (!u) { router.push('/login'); return; }
            setUser(u);
            setGlobalLoading(true, 'Initializing Exam Session...');
            await loadExamData(u.id);
        };
        init();

        // Prevent copying and screenshots of exam questions
        const preventCopy = (e: ClipboardEvent) => { e.preventDefault(); toast.error("Copying is disabled during the exam."); };
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
                toast.error("Security policy blocks this action (Screenshots disabled).");
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
    }, []);

    // Save exam state on every change — guarded so we never overwrite saved state on first render
    useEffect(() => {
        if (!isInitialized.current) return;
        if (status === 'completed') return;
        const state = { answers, activeSectionId, activeQuestionIdx, visitedQuestions, completedSectionIds, markedForReview, sectionTimeLeft, showAllSections };
        localStorage.setItem('examState', JSON.stringify(state));
    }, [answers, activeSectionId, activeQuestionIdx, visitedQuestions, completedSectionIds, markedForReview, sectionTimeLeft, showAllSections]);


    // Clear persisted state upon exam completion
    useEffect(() => {
        if (status === 'completed') localStorage.removeItem('examState');
    }, [status]);

    const loadExamData = async (userId: string) => {
        try {
            const res = await fetch(`/api/mongo/exams?exam_id=${examId}&with_sections=true`);
            const data = await res.json();
            const ex = data.exams?.[0];
            if (!ex) throw new Error('Exam not found');
            setExam(ex);

            const sects: Section[] = ex.sections || [];
            setSections(sects);

            const allQs: Question[] = [];
            sects.forEach((s: Section) => { if (s.questions) allQs.push(...s.questions); });
            setQuestions(allQs);

            // Validate saved section against actual sections from API
            const savedRaw = localStorage.getItem('examState');
            const savedState = savedRaw ? JSON.parse(savedRaw) : null;
            const validSectionIds = sects.map(s => s.id);
            const hasSavedSection = savedState && validSectionIds.includes(savedState.activeSectionId);

            if (!hasSavedSection) {
                // No valid saved section — reset to first section
                const firstSect = sects[0];
                setActiveSectionId(firstSect?.id || null);
                setActiveQuestionIdx(0);
                if (firstSect?.section_duration) setSectionTimeLeft(firstSect.section_duration * 60);
            }

            const pIds = allQs.map((q: Question) => q.passage_id).filter(Boolean);
            if (pIds.length > 0) {
                const pRes = await fetch(`/api/mongo/content?type=passages&ids=${pIds.join(',')}`);
                const pData = await pRes.json();
                const pMap: Record<number, Passage> = {};
                pData.passages?.forEach((p: any) => pMap[p.id] = p);
                setPassages(pMap);
            }

            await handleAttemptSession(userId, ex);
            isInitialized.current = true; // Allow save effect to run from now on
            setGlobalLoading(false);
        } catch (err: any) {
            console.error('Exam initialization failed', err);
            toast.error(`Session Error: ${err.message || 'Unknown error'}`);
            isInitialized.current = true; // Allow save even on error
            setGlobalLoading(false);
        }
    };



    const handleAttemptSession = async (userId: string, ex: Exam) => {
        // Time Window Check
        const now = new Date();
        if (ex.start_time && new Date(ex.start_time) > now) {
            toast.error("This exam has not started yet.");
            throw new Error(`Exam starts at ${new Date(ex.start_time).toLocaleString()}`);
        }

        const res = await fetch(`/api/mongo/exams/attempts?student_id=${userId}&exam_id=${ex.id}`);
        const data = await res.json();
        const existing = data.attempt;

        // Check End Time compliance
        if (ex.end_time && new Date(ex.end_time) < now) {
            const isFinishedOrEmpty = !existing || existing.status === 'completed' || existing.status === 'submitted';
            if (isFinishedOrEmpty) {
                throw new Error(`Exam ended at ${new Date(ex.end_time).toLocaleString()}`);
            }
        }

        const isOngoing = existing && existing.status === 'in_progress';
        const hasSavedAnswers = !!localStorage.getItem('examState');

        if (isOngoing) {
            setAttemptId(existing.id);

            // ALWAYS recalculate timeLeft from server start_time — localStorage snapshot is stale
            const startTime = new Date(existing.start_time).getTime();
            const elapsed = Math.floor((new Date().getTime() - startTime) / 1000);
            const totalSecs = (ex.total_duration || 1) * 60;
            const remaining = totalSecs - elapsed;
            setTimeLeft(remaining > 0 ? remaining : 0);

            // Load answers from server only if no localStorage answers saved
            if (!hasSavedAnswers) {
                const ansRes = await fetch(`/api/mongo/exams/answers?attempt_id=${existing.id}`);
                const ansData = await ansRes.json();
                const ansMap: any = {};
                ansData.answers?.forEach((a: any) => ansMap[a.question_id] = a.answer);
                setAnswers(ansMap);
            }
        } else if (existing && (existing.status === 'completed' || existing.status === 'submitted')) {
            setAttemptId(existing.id);
            setResults({ score: existing.score, total: existing.total_marks });
            setStatus('completed');

            const ansRes = await fetch(`/api/mongo/exams/answers?attempt_id=${existing.id}`);
            const ansData = await ansRes.json();
            const ansMap: any = {};
            ansData.answers?.forEach((a: any) => ansMap[a.question_id] = a.answer);
            setAnswers(ansMap);
            setTimeLeft(0);
        } else {
            const createRes = await fetch('/api/mongo/exams/attempts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ student_id: userId, exam_id: ex.id })
            });
            const newData = await createRes.json();
            if (newData.attempt) {
                setAttemptId(newData.attempt.id);
                setTimeLeft((ex.total_duration || 1) * 60);
            }
        }
    };

    // Ensure activeSectionId is valid after sections are loaded
    useEffect(() => {
        if (!sections.length) return;
        const valid = sections.some(s => s.id === activeSectionId);
        if (activeSectionId === null || !valid) {
            const first = sections[0];
            setActiveSectionId(first?.id || null);
            setActiveQuestionIdx(0);
            if (first?.section_duration) setSectionTimeLeft(first.section_duration * 60);
        }
    }, [sections]);

    const handleFinishSection = (sectionId: number) => {
        // Mark this section as completed
        setCompletedSectionIds(prev => [...new Set([...prev, sectionId])]);

        // Find the current section object
        const currentSection = sections.find(s => s.id === sectionId);

        // If a fallback is defined and not prohibited, navigate to it
        if (currentSection?.fallback_test_section_id && !currentSection.strictly_no_fallback) {
            const fallbackId = currentSection.fallback_test_section_id;
            // Avoid revisiting a completed fallback
            if (!completedSectionIds.includes(fallbackId)) {
                const fallbackSection = sections.find(s => s.id === fallbackId);
                setActiveSectionId(fallbackId);
                setActiveQuestionIdx(0);
                const duration = fallbackSection?.section_duration ? fallbackSection.section_duration * 60 : null;
                setSectionTimeLeft(duration);
                toast.info(`Navigating to fallback section ${fallbackSection?.name || ''}.`);
                return;
            }
        }

        // Default progression: move to the next section or finalize the attempt
        const currentIdx = sections.findIndex(s => s.id === sectionId);
        if (currentIdx < sections.length - 1) {
            const nextSect = sections[currentIdx + 1];
            setActiveSectionId(nextSect.id);
            setActiveQuestionIdx(0);
            const duration = nextSect.section_duration ? nextSect.section_duration * 60 : null;
            setSectionTimeLeft(duration);
            toast.success(`${sections[currentIdx].name} finished and locked.`);
        } else {
            finalizeAttempt(attemptId!);
        }
    };

        // Per‑section countdown timer – decrements sectionTimeLeft and moves to next section when it reaches 0
    useEffect(() => {
        if (!activeSectionId || status === 'completed') return;
        const currentSection = sections.find(s => s.id === activeSectionId);
        if (!currentSection || !currentSection.section_duration) {
            setSectionTimeLeft(null);
            return;
        }
        const sTimer = setInterval(() => {
            setSectionTimeLeft(prev => {
                if (prev === null) return null;
                if (prev <= 1) {
                    clearInterval(sTimer);
                    handleFinishSection(activeSectionId);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(sTimer);
    }, [activeSectionId, sections, status]);
    // Total exam timer – start only when timeLeft is set (>0) and stop on completion
    useEffect(() => {
        // Cleanup any existing timer on status change
        if (totalTimerRef.current) {
            clearInterval(totalTimerRef.current);
            totalTimerRef.current = null;
        }
        if (status === 'completed') return;
        if (timeLeft > 0 && !totalTimerRef.current) {
            totalTimerRef.current = setInterval(() => {
                setTimeLeft(prev => (prev > 1 ? prev - 1 : 0));
            }, 1000);
        }
        // If time reaches 0, clear timer
        if (timeLeft === 0 && totalTimerRef.current) {
            clearInterval(totalTimerRef.current);
            totalTimerRef.current = null;
        }
        // Cleanup on unmount
        return () => {
            if (totalTimerRef.current) {
                clearInterval(totalTimerRef.current);
                totalTimerRef.current = null;
            }
        };
    }, [status, timeLeft]);

    // Show time‑up modal when timer hits zero
    useEffect(() => {
        if (timeLeft === 0 && exam && !isTimeUpModalOpen) {
            setIsTimeUpModalOpen(true);
        }
    }, [timeLeft, exam, isTimeUpModalOpen]);

    // Toast warnings for remaining time
    useEffect(() => {
        if (timeLeft === 600) toast.info('10 minutes remaining');
        if (timeLeft === 60) toast.warning('1 minute remaining');
    }, [timeLeft]);

    const formatTime = (seconds: number) => {
        if (seconds < 0) return '--:--';
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        return `${h > 0 ? h + ':' : ''}${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    // Helper to persist current exam state to localStorage
    const persistExamState = () => {
        if (!isInitialized.current) return;
        const state = {
            answers,
            activeSectionId,
            activeQuestionIdx,
            visitedQuestions,
            completedSectionIds,
            markedForReview,
            sectionTimeLeft,
            showAllSections,
        };
        localStorage.setItem('examState', JSON.stringify(state));
    };

    const handleAnswer = async (questionId: number, answer: any) => {
        setAnswers(prev => ({ ...prev, [questionId]: answer }));
        // Also ensure it's marked as visited when answered
        setVisitedQuestions(prev => ({ ...prev, [questionId]: true }));
        // Persist after updating answers
        persistExamState();

        await fetch('/api/mongo/exams/answers', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                attempt_id: attemptId,
                question_id: questionId,
                answer: answer,
            }),
        });
    };

    const toggleMarkForReview = (questionId: number) => {
        setMarkedForReview(prev => ({ ...prev, [questionId]: !prev[questionId] }));
        // Persist after toggling review flag
        persistExamState();
    };

    useEffect(() => {
        if (activeQuestion) {
            setVisitedQuestions(prev => ({ ...prev, [activeQuestion.id]: true }));
        }
    }, [activeQuestion?.id]);

    const finalizeAttempt = async (attId: string) => {
        setGlobalLoading(true, 'Calculating Results & Finalizing Session...');

        try {
            let score = 0;
            let total = 0;
            const sectionScores: Record<number, { correct: number, total: number, score: number }> = {};

            // Initialize section scores
            sections.forEach(s => {
                sectionScores[s.id] = { correct: 0, total: 0, score: 0 };
            });

            questions.forEach(q => {
                const sect = sections.find(s => s.id === q.section_id);
                if (!sect) return;

                const qMarks = q.marks || sect?.default_marks_per_question || 1;
                const qNeg = sect?.negative_marking !== undefined ? sect.negative_marking : (exam?.negative_marking || 0);

                const studentAns = answers[q.id];
                if (studentAns !== undefined && studentAns !== null && studentAns !== '') {
                    const isCorrect = q.correct_answer !== undefined && String(studentAns) === String(q.correct_answer);
                    if (isCorrect) {
                        score += qMarks;
                        sectionScores[sect.id].correct++;
                        sectionScores[sect.id].score += qMarks;
                    } else {
                        score -= qNeg;
                        sectionScores[sect.id].score -= qNeg;
                    }
                }
                total += qMarks;
                sectionScores[sect.id].total++;
            });

            // Ensure score doesn't go below zero
            score = Math.max(0, score);
            // Ensure section scores don't go below zero
            Object.keys(sectionScores).forEach((sid: any) => {
                sectionScores[sid].score = Math.max(0, sectionScores[sid].score);
            });

            const patchRes = await fetch('/api/mongo/exams/attempts', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ attempt_id: attId, status: 'completed' })
            });
            const patchData = await patchRes.json();
            if (patchData.error) throw new Error(patchData.error);

            // Fetch correct answers now that attempt is completed (API reveals them)
            const ansRes = await fetch(`/api/mongo/exams/answers?attempt_id=${attId}&with_correct=true`);
            const ansData = await ansRes.json();
            if (ansData.answers) {
                const ansMap: any = {};
                ansData.answers.forEach((a: any) => ansMap[a.question_id] = a.answer);
                setAnswers(ansMap);
            }

            // Use locally computed score (server may not return it in PATCH)
            localStorage.removeItem('examState');
            setResults({ score, total });
            setStatus('completed');
            toast.success('Exam submitted successfully!');
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setGlobalLoading(false);
        }
    };



    if (status === 'completed') {

        const scorePercentage = results ? Math.round((results.score / results.total) * 100) : 0;
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col p-4 sm:p-6 md:p-12 overflow-y-auto custom-scrollbar select-none">
                <div className="max-w-5xl mx-auto w-full">
                    <div className="bg-white rounded-[3rem] p-6 sm:p-8 lg:p-12 shadow-2xl border border-slate-100 mb-8 sm:mb-12 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-teal-50 rounded-full -translate-y-1/2 translate-x-1/2 opacity-50" />
                        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6 lg:gap-12">
                            <div className="text-center md:text-left">
                                <h1 className="text-[10px] font-black text-teal-600 uppercase tracking-[0.3em] mb-4">Official Result Summary</h1>
                                <h2 className="text-4xl font-black text-slate-900 leading-tight mb-6">{exam?.name}</h2>
                                <button
                                    onClick={() => router.push(`/test-sections/${sectionId}`)}
                                    className="px-8 py-4 bg-slate-900 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl active:scale-95"
                                >
                                    Return to Dashboard
                                </button>
                            </div>
                            <div className="w-48 h-48 rounded-full border-[12px] border-slate-50 flex flex-col items-center justify-center bg-white shadow-inner relative">
                                <svg className="absolute inset-0 w-full h-full -rotate-90">
                                    <circle
                                        cx="96" cy="96" r="84"
                                        fill="none"
                                        stroke="#0d9488"
                                        strokeWidth="12"
                                        strokeDasharray={`${(scorePercentage * 527) / 100} 527`}
                                        strokeLinecap="round"
                                        className="transition-all duration-[2s] ease-out"
                                    />
                                </svg>
                                <span className="text-5xl font-black text-teal-600 relative">{scorePercentage}%</span>
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest relative mt-1">Total Score</span>
                            </div>
                        </div>
                    </div>

                    {/* Section-wise Breakdown */}
                    <div className="flex justify-end mb-4">
        <button
          onClick={() => setShowAllSections(prev => !prev)}
          className="px-4 py-2 bg-teal-600 text-white rounded-full text-xs font-black uppercase tracking-widest hover:bg-teal-500 transition"
        >
          {showAllSections ? 'Show Less' : 'Show All Sections'}
        </button>
      </div>
      <div className="mb-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {(showAllSections ? sections : sections.slice(0,25)).map(section => {
                            const sectionQs = questions.filter(q => q.section_id === section.id);
                            let correct = 0;
                            let wrong = 0;
                            let skipped = 0;

                            sectionQs.forEach(q => {
                                const studentAns = answers[q.id];
                                const isAnswered = studentAns !== undefined && studentAns !== null && studentAns !== '' && (Array.isArray(studentAns) ? studentAns.length > 0 : true);
                                if (isAnswered) {
                                    const isCorrect = q.correct_answer !== undefined && String(studentAns) === String(q.correct_answer);
                                    if (isCorrect) correct++;
                                    else wrong++;
                                } else {
                                    skipped++;
                                }
                            });

                            const accuracy = sectionQs.length > 0 ? Math.round((correct / sectionQs.length) * 100) : 0;

                            return (
                                <div key={section.id} className="bg-white rounded-[2.5rem] p-6 border border-slate-100 shadow-xl flex flex-col group hover:border-teal-500 transition-all">
                                    <div className="flex items-center justify-between mb-4">
                                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest group-hover:text-teal-600 transition-colors">{section.name}</h4>
                                        <span className="text-[9px] font-black text-slate-300 uppercase tracking-wider italic">Sec {sections.indexOf(section) + 1}</span>
                                    </div>
                                    
                                    {/* Detailed Stats Row */}
                                    <div className="flex items-center justify-between mb-4 text-[10px] font-black uppercase tracking-widest bg-slate-50/50 p-3 rounded-2xl border border-slate-100/50">
                                        <div className="flex items-center gap-1 text-teal-600">
                                            <CheckCircle className="w-3.5 h-3.5" />
                                            <span>{correct} Correct</span>
                                        </div>
                                        <div className="flex items-center gap-1 text-rose-500">
                                            <Activity className="w-3.5 h-3.5" />
                                            <span>{wrong} Wrong</span>
                                        </div>
                                        <div className="flex items-center gap-1 text-slate-400">
                                            <AlertCircle className="w-3.5 h-3.5" />
                                            <span>{skipped} Left</span>
                                        </div>
                                    </div>

                                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-teal-500 rounded-full transition-all duration-1000"
                                            style={{ width: `${accuracy}%` }}
                                        />
                                    </div>
                                    <div className="mt-2.5 flex justify-between text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                        <span>{accuracy}% Accuracy</span>
                                        <span>{sectionQs.length} Questions</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <div className="space-y-8 pb-20">
                        {(showAllSections ? sections : sections.slice(0,25)).map(section => {
                            const sectionQs = questions.filter(q => q.section_id === section.id);
                            return (
                                <div key={section.id} className="space-y-6">
                                    <div className="flex items-center gap-4 mb-4">
                                        <div className="h-px flex-1 bg-slate-200" />
                                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.4em]">{section.name}</h3>
                                        <div className="h-px flex-1 bg-slate-200" />
                                    </div>
                                    {sectionQs.map((q, idx) => {
                                         const studentAns = answers[q.id];
                                         const isCorrect = studentAns !== undefined && studentAns !== null && studentAns !== '' && q.correct_answer !== undefined && String(studentAns) === String(q.correct_answer);
                                        return (
                                            <div key={q.id} className={`bg-white rounded-[2.5rem] p-5 sm:p-8 lg:p-10 border-2 transition-all ${isCorrect ? 'border-teal-100 shadow-teal-50' : 'border-rose-100 shadow-rose-50'} shadow-xl`}>
                                                <div className="flex justify-between items-start mb-6">
                                                    <div className="flex items-center gap-4">
                                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm ${isCorrect ? 'bg-teal-600 text-white' : 'bg-rose-600 text-white'}`}>
                                                            {idx + 1}
                                                        </div>
                                                        <span className={`text-[10px] font-black uppercase tracking-widest ${isCorrect ? 'text-teal-500' : 'text-rose-500'}`}>
                                                            {isCorrect ? 'Correct Response' : 'Incorrect Response'}
                                                        </span>
                                                    </div>
                                                    <span className="text-xs font-black text-slate-400 uppercase tracking-widest">{q.marks} Mark(s)</span>
                                                </div>
                                                <div className="text-xl font-bold text-slate-900 leading-relaxed mb-8">
                                                    <MarkdownRenderer content={q.question_text} />
                                                </div>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                                                    {q.options?.map((opt: any, optIdx: number) => {
                                                        const normalizedOpt = typeof opt === 'string'
                                                            ? { id: (optIdx + 1).toString(), text: opt }
                                                            : opt;
                                                        const isSelected = studentAns?.toString() === normalizedOpt.id?.toString();
                                                        const isCorrectOpt = q.correct_answer?.toString() === normalizedOpt.id?.toString();

                                                        let style = 'bg-slate-50 border-slate-50 text-slate-600';
                                                        if (isCorrectOpt) style = 'bg-teal-50 border-teal-200 text-teal-700 font-bold';
                                                        else if (isSelected && !isCorrectOpt) style = 'bg-rose-50 border-rose-200 text-rose-700 font-bold';

                                                        return (
                                                            <div key={optIdx} className={`p-5 rounded-2xl border text-sm flex items-center gap-4 ${style}`}>
                                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs border-2 ${isCorrectOpt ? 'bg-teal-600 border-teal-600 text-white' : isSelected ? 'bg-rose-600 border-rose-600 text-white' : 'bg-white border-slate-200 text-slate-400'}`}>
                                                                    {String.fromCharCode(65 + optIdx)}
                                                                </div>
                                                                 <div className="text-sm font-medium">
                                                                    <MarkdownRenderer content={normalizedOpt.text} />
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                                {q.explanation && (
                                                    <div className="mt-8 p-8 bg-teal-50/50 rounded-3xl border border-teal-100 flex gap-5">
                                                        <div className="w-10 h-10 bg-teal-600 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-lg">
                                                            <Info className="w-5 h-5" />
                                                        </div>
                                                        <div>
                                                            <p className="text-[10px] font-black text-teal-600 uppercase tracking-widest mb-1">Conceptual Clarification</p>
                                                            <div className="text-sm font-medium text-slate-700 leading-relaxed italic">
                                                                <MarkdownRenderer content={q.explanation || ''} />
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="h-screen flex flex-col bg-white overflow-hidden font-sans text-slate-900 select-none">
            {/* TOP BAR */}
            <header className="h-16 border-b border-gray-200 bg-white flex items-center justify-between px-6 shrink-0 z-50">
                <div className="flex items-center gap-3">
                    <div className="flex flex-col">
                        <span className="text-[10px] font-black text-teal-600 uppercase tracking-widest leading-none mb-1">
                            {exam?.name || 'University Exam'}
                        </span>
                        <div className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 bg-teal-500 rounded-full animate-pulse" />
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-tighter">LIVE</span>
                        </div>
                    </div>
                </div>

                {/* Section Selector Pills */}
                <div className="hidden md:flex items-center gap-2">
                    {sections.map((s) => {
                        const isLocked = completedSectionIds.includes(s.id);
                        const isActive = activeSectionId === s.id;
                        return (
                            <button
                                key={s.id}
                                disabled={isLocked}
                                onClick={() => {
                                    setActiveSectionId(s.id);
                                    setActiveQuestionIdx(0);
                                }}
                                className={`px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${isActive
                                    ? 'bg-teal-600 text-white'
                                    : isLocked
                                        ? 'bg-slate-50 text-slate-300 cursor-not-allowed border border-slate-100'
                                        : 'bg-white text-slate-500 border border-slate-200 hover:border-teal-600 hover:text-teal-600'
                                    }`}
                            >
                                {s.name}
                            </button>
                        );
                    })}
                </div>

                <div className="flex items-center gap-4">
                    <div className={`px-4 py-2 rounded-lg font-mono font-bold text-lg flex items-center gap-2 ${timeLeft < 300 ? 'bg-red-600 text-white animate-pulse' : 'bg-red-50 text-red-600 border border-red-100'
                        }`}>
                        <Clock className="w-4 h-4" />
                        {formatTime(timeLeft)}
                    </div>
                    <button
                        onClick={() => {
                            if (confirm('Are you sure you want to finalize and submit?')) finalizeAttempt(attemptId!);
                        }}
                        className="px-6 py-2 bg-teal-600 text-white rounded-lg text-[10px] font-black uppercase tracking-[0.2em] hover:bg-teal-700 transition-all shadow-sm active:scale-95"
                    >
                        Finalize
                    </button>
                </div>
            </header>

            <div className="flex-1 flex overflow-hidden">
                {/* LEFT: Question Area */}
                <main className="flex-1 overflow-y-auto custom-scrollbar bg-white flex flex-col">
                    {/* Mobile Section Selector - Horizontal Scroll */}
                    <div className="md:hidden flex items-center gap-2 px-4 py-3 bg-slate-50 border-b border-gray-100 overflow-x-auto no-scrollbar">
                        {sections.map((s) => (
                            <button
                                key={s.id}
                                disabled={completedSectionIds.includes(s.id)}
                                onClick={() => {
                                    setActiveSectionId(s.id);
                                    setActiveQuestionIdx(0);
                                }}
                                className={`whitespace-nowrap px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all ${activeSectionId === s.id
                                    ? 'bg-teal-600 text-white'
                                    : 'bg-white text-slate-500 border border-slate-200'
                                    }`}
                            >
                                {s.name}
                            </button>
                        ))}
                    </div>

                    <div className="flex-1 min-w-0 max-w-4xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-10 lg:py-16">
                        {activeQuestion ? (
                            <div className="space-y-10">
                                <div className="space-y-4">
                                    <div className="w-10 h-10 rounded-full border-2 border-teal-600 text-teal-600 flex items-center justify-center font-black text-sm">
                                        {activeQuestionIdx + 1}
                                    </div>
                                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                        {activeQuestion.marks} Mark(s) • Correct Option Required
                                    </div>
                                    {activeQuestion.passage_id && passages[activeQuestion.passage_id] && (
                                        <div className="mb-8 p-6 bg-amber-50/50 rounded-2xl border border-amber-100/50 max-h-[400px] overflow-y-auto shadow-inner">
                                            <h3 className="text-[10px] font-black text-amber-600 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                                                <GraduationCap className="w-4 h-4" />
                                                {passages[activeQuestion.passage_id].title || 'Read the following passage'}
                                            </h3>
                                            <div className="prose prose-slate max-w-none text-slate-700 leading-relaxed font-medium">
                                                <MarkdownRenderer content={passages[activeQuestion.passage_id].content} />
                                            </div>
                                        </div>
                                    )}
                                    <div className="prose prose-slate max-w-none">
                                        <div className="text-2xl lg:text-3xl font-black text-slate-900 leading-tight">
                                            <MarkdownRenderer content={activeQuestion.question_text} />
                                        </div>
                                    </div>
                                </div>

                                {activeQuestion.image_url && (
                                    <div className="rounded-xl overflow-hidden border border-gray-100 max-w-2xl bg-slate-50">
                                        <img
                                            src={activeQuestion.image_url}
                                            alt="Question Visualization"
                                            className="w-full h-auto object-contain cursor-zoom-in"
                                            onClick={() => setIsZoomed(!isZoomed)}
                                        />
                                    </div>
                                )}

                                {/* OPTIONS GRID */}
                                <div className={`grid gap-4 ${activeQuestion.question_type === 'numerical' || activeQuestion.question_type?.includes('essay')
                                    ? 'grid-cols-1'
                                    : 'grid-cols-1 md:grid-cols-2'
                                    }`}>
                                    {(activeQuestion.question_type === 'mcq_single' || activeQuestion.question_type === 'mcq_multiple') &&
                                        activeQuestion.options?.map((opt: any, optIdx: number) => {
                                            const normalizedOpt = typeof opt === 'string'
                                                ? { id: (optIdx + 1).toString(), text: opt }
                                                : opt;

                                            const isSelected = activeQuestion.question_type === 'mcq_single'
                                                ? (answers[activeQuestion.id] !== undefined && answers[activeQuestion.id]?.toString() === normalizedOpt.id?.toString())
                                                : (answers[activeQuestion.id] || []).map((id: any) => id?.toString()).includes(normalizedOpt.id?.toString());

                                            return (
                                                <button
                                                    key={optIdx}
                                                    onClick={() => {
                                                        if (activeQuestion.question_type === 'mcq_single') {
                                                            handleAnswer(activeQuestion.id, normalizedOpt.id);
                                                        } else {
                                                            const current = answers[activeQuestion.id] || [];
                                                            const next = current.includes(normalizedOpt.id)
                                                                ? current.filter((i: any) => i !== normalizedOpt.id)
                                                                : [...current, normalizedOpt.id];
                                                            handleAnswer(activeQuestion.id, next);
                                                        }
                                                    }}
                                                    className={`p-5 rounded-lg border text-left transition-all flex items-center gap-4 group ${isSelected
                                                        ? 'bg-teal-50 border-teal-600 shadow-sm'
                                                        : 'bg-white border-gray-200 hover:border-teal-300'
                                                        }`}
                                                >
                                                    <div className={`w-8 h-8 rounded shrink-0 flex items-center justify-center font-black text-xs transition-colors ${isSelected ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-400 group-hover:bg-teal-100 group-hover:text-teal-600'
                                                        }`}>
                                                        {String.fromCharCode(65 + optIdx)}
                                                    </div>
                                                    <div className="text-sm font-bold text-slate-700">
                                                        <MarkdownRenderer content={normalizedOpt.text} />
                                                    </div>
                                                </button>
                                            );
                                        })
                                    }

                                    {activeQuestion.question_type === 'true_false' && ['true', 'false'].map((val) => (
                                        <button
                                            key={val}
                                            onClick={() => handleAnswer(activeQuestion.id, val)}
                                            className={`p-6 rounded-lg border font-black text-xs uppercase tracking-widest transition-all ${answers[activeQuestion.id] === val
                                                ? 'bg-teal-50 border-teal-600 text-teal-700'
                                                : 'bg-white border-gray-200 hover:border-teal-300'
                                                }`}
                                        >
                                            {val}
                                        </button>
                                    ))}

                                    {activeQuestion.question_type === 'numerical' && (
                                        <div className="max-w-md">
                                            <input
                                                type="text"
                                                className="w-full p-5 bg-white border border-gray-200 rounded-lg outline-none focus:border-teal-600 font-bold text-2xl text-slate-900 transition-all"
                                                placeholder="Enter numerical answer..."
                                                value={answers[activeQuestion.id] || ''}
                                                onChange={(e) => handleAnswer(activeQuestion.id, e.target.value)}
                                            />
                                        </div>
                                    )}

                                    {(activeQuestion.question_type === 'essay' || activeQuestion.question_type === 'short_answer') && (
                                        <textarea
                                            className={`w-full p-5 bg-white border border-gray-200 rounded-lg outline-none focus:border-teal-600 font-bold text-base text-slate-700 leading-relaxed min-h-[300px]`}
                                            placeholder="Write your response here..."
                                            value={answers[activeQuestion.id] || ''}
                                            onChange={(e) => handleAnswer(activeQuestion.id, e.target.value)}
                                        />
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="h-full flex items-center justify-center text-slate-300 font-black uppercase tracking-widest">
                                Loading question...
                            </div>
                        )}
                    </div>

                    {/* BOTTOM BAR - STICKY */}
                    <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex items-center justify-between shrink-0 z-40">
                        <button
                            disabled={activeQuestionIdx === 0 || !activeQuestion}
                            onClick={() => setActiveQuestionIdx(prev => prev - 1)}
                            className="px-6 py-2.5 bg-white border border-gray-200 rounded-lg text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-50 disabled:opacity-30 transition-all flex items-center gap-2"
                        >
                            <ChevronLeft className="w-4 h-4" />
                            Previous
                        </button>

                        <button
                            disabled={!activeQuestion}
                            onClick={() => activeQuestion && toggleMarkForReview(activeQuestion.id)}
                            className={`px-6 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${activeQuestion && markedForReview[activeQuestion.id]
                                ? 'bg-orange-600 text-white'
                                : 'bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200 disabled:opacity-50'
                                }`}
                        >
                            <Flag className="w-4 h-4" />
                            {activeQuestion && markedForReview[activeQuestion.id] ? 'Marked' : 'Mark for Review'}
                        </button>

                        <button
                            disabled={!activeQuestion}
                            onClick={() => {
                                if (!activeQuestion) return;
                                if (activeQuestionIdx < currentSectionQuestions.length - 1) {
                                    setActiveQuestionIdx(prev => prev + 1);
                                } else {
                                    if (confirm(`Finish ${sections.find(s => s.id === activeSectionId)?.name}? You will not be able to change answers in this section later.`)) {
                                        handleFinishSection(activeSectionId!);
                                    }
                                }
                            }}
                            className="px-8 py-2.5 bg-teal-600 text-white rounded-lg text-[10px] font-black uppercase tracking-[0.2em] hover:bg-teal-700 transition-all flex items-center gap-2 group disabled:opacity-50"
                        >
                            {activeQuestionIdx < currentSectionQuestions.length - 1 ? 'Save & Next' : 'Finish Section'}
                            <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                        </button>
                    </div>
                </main>

                {/* RIGHT SIDEBAR: Navigation Matrix */}
                <aside className={`
                    w-[320px] bg-slate-50 border-l border-gray-200 overflow-y-auto hidden lg:flex flex-col p-8 custom-scrollbar
                `}>
                    <div className="flex items-center justify-between mb-8">
                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Question Navigation</h3>
                        <div className="flex items-center gap-2">
                            <Layers className="w-4 h-4 text-slate-300" />
                        </div>
                    </div>

                    <div className="grid grid-cols-5 gap-2 pb-10">
                        {currentSectionQuestions.map((q, idx) => {
                            const isAnswered = answers[q.id] !== undefined && answers[q.id] !== '' && answers[q.id] !== null;
                            const isMarked = markedForReview[q.id];
                            const isVisited = visitedQuestions[q.id];

                            let bgColor = 'bg-white text-slate-400 border-gray-200';
                            if (isMarked) {
                                bgColor = 'bg-orange-500 text-white border-orange-500 shadow-sm';
                            } else if (isAnswered) {
                                bgColor = 'bg-teal-600 text-white border-teal-600 shadow-sm';
                            } else if (isVisited) {
                                bgColor = 'bg-slate-100 text-slate-500 border-slate-200';
                            }

                            return (
                                <button
                                    key={q.id}
                                    onClick={() => setActiveQuestionIdx(idx)}
                                    className={`w-full aspect-square rounded-full flex items-center justify-center text-[10px] font-black border-2 transition-all relative ${bgColor} ${activeQuestionIdx === idx ? 'ring-2 ring-green-600 ring-offset-2 scale-110' : ''
                                        }`}
                                >
                                    {idx + 1}
                                </button>
                            );
                        })}
                    </div>

                    <div className="mt-auto pt-8 border-t border-gray-200 space-y-4">
                        <div className="flex items-center justify-between text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">
                            <span>Exam Progress</span>
                            <span className="text-teal-600">
                                {questions.length > 0 ? Math.round((Object.keys(answers).length / questions.length) * 100) : 0}%
                            </span>
                        </div>
                        <div className="h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-teal-600 rounded-full transition-all duration-500"
                                style={{ width: `${questions.length > 0 ? (Object.keys(answers).length / questions.length) * 100 : 0}%` }}
                            />
                        </div>
                    </div>
                </aside>

                {/* Mobile Drawer Trigger for Navigation */}
                <button
                    onClick={() => setShowNavMatrix(true)}
                    className="lg:hidden fixed bottom-24 right-6 w-12 h-12 bg-teal-600 text-white rounded-full shadow-lg flex items-center justify-center z-50 animate-bounce active:scale-90"
                >
                    <Layers className="w-5 h-5" />
                </button>
            </div>

            {/* Mobile Navigation Matrix Drawer */}
            {showNavMatrix && (
                <div className="lg:hidden fixed inset-0 z-[100] flex flex-col">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowNavMatrix(false)} />
                    <div className="relative mt-auto bg-white rounded-t-[2rem] p-8 max-h-[80vh] overflow-y-auto animate-in slide-in-from-bottom duration-300">
                        <div className="flex items-center justify-between mb-8">
                            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Select Question</h3>
                            <button onClick={() => setShowNavMatrix(false)} className="p-2 bg-slate-100 rounded-full">
                                <X className="w-4 h-4 text-slate-600" />
                            </button>
                        </div>

                        <div className="grid grid-cols-6 gap-3 mb-10">
                            {currentSectionQuestions.map((q, idx) => {
                                const isAnswered = answers[q.id] !== undefined && answers[q.id] !== '';
                                const isMarked = markedForReview[q.id];
                                return (
                                    <button
                                        key={q.id}
                                        onClick={() => {
                                            setActiveQuestionIdx(idx);
                                            setShowNavMatrix(false);
                                        }}
                                        className={`w-full aspect-square rounded-full flex items-center justify-center text-[10px] font-black border-2 transition-all ${isAnswered ? 'bg-teal-600 text-white border-teal-600' :
                                            isMarked ? 'bg-orange-500 text-white border-orange-500' :
                                                'bg-slate-50 text-slate-400 border-slate-200'
                                            } ${activeQuestionIdx === idx ? 'ring-2 ring-green-600 ring-offset-2' : ''}`}
                                    >
                                        {idx + 1}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* ZOOM OVERLAY */}
            {isZoomed && activeQuestion?.image_url && (
                <div
                    className="fixed inset-0 z-[200] bg-slate-900/95 flex flex-col items-center justify-center p-4 lg:p-10"
                    onClick={() => setIsZoomed(false)}
                >
                    <button className="absolute top-8 right-8 p-4 bg-white/10 hover:bg-white/20 rounded-full text-white transition-all">
                        <X className="w-6 h-6" />
                    </button>
                    <div className="w-full h-full flex items-center justify-center p-4">
                        <img
                            src={activeQuestion.image_url}
                            alt="Question Detailed"
                            className="max-w-full max-h-full object-contain cursor-zoom-out shadow-2xl"
                        />
                    </div>
                    <p className="mt-4 text-slate-400 font-bold text-xs uppercase tracking-[0.2em]">Click anywhere to exit zoom</p>
                </div>
            )}

            {/* TIME UP MODAL */}
            {isTimeUpModalOpen && (
                <div className="fixed inset-0 z-[300] flex items-center justify-center bg-slate-900/80 backdrop-blur-md p-4">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in duration-300 border border-red-100">
                        <div className="p-6 sm:p-10 text-center">
                            <div className="w-20 h-20 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-8">
                                <Clock className="w-10 h-10" />
                            </div>
                            <h2 className="text-3xl font-black text-slate-900 mb-2 tracking-tight">Time Exhausted</h2>
                            <p className="text-slate-500 font-bold text-sm leading-relaxed mb-8 px-4">
                                The exam duration has reached its limit. Your responses will now be automatically evaluated.
                            </p>
                            <button
                                onClick={() => finalizeAttempt(attemptId!)}
                                className="w-full py-4 bg-teal-600 text-white rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-teal-700 transition-all shadow-md active:scale-95"
                            >
                                Submit Exam Now
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
