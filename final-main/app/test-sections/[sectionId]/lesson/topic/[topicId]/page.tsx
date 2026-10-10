"use client";

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import { AuthService } from '@/lib/services/authService';
import { BookOpen, ChevronLeft, Play, GraduationCap, Clock, CheckCircle, BarChart, MoveRight, Trophy } from 'lucide-react';
import MarkdownRenderer from '@/components/shared/MarkdownRenderer';
import Link from 'next/link';
import { useUI } from '@/lib/context/UIContext';
import { PracticeService } from '@/lib/services/practiceService';
import { useRef } from 'react';
import { toast } from 'sonner';

export default function TopicLessonReaderPage() {
    const { isSidebarCollapsed } = useUI();
    const params = useParams();
    const router = useRouter();
    const sectionId = params.sectionId as string;
    const topicId = params.topicId as string;

    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<any>(null);
    const [userRole, setUserRole] = useState<string>('student');
    const [topic, setTopic] = useState<any>(null);
    const [subject, setSubject] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);
    const [mcqCount, setMcqCount] = useState(0);
    const [timeElapsed, setTimeElapsed] = useState(0);
    const [session, setSession] = useState<any>(null);
    
    const timerRef = useRef<any>(null);
    const syncIntervalRef = useRef<any>(null);
    const initialized = useRef(false);

    useEffect(() => {
        const init = async () => {
            const userData = AuthService.getCurrentUser() || await AuthService.syncSession();
            if (userData) {
                setUser(userData);
                setUserRole(userData.role || 'student');
                if (topicId) {
                    await loadLessonData();
                    await markAsRead(userData.id, parseInt(topicId));
                }
            } else {
                router.push('/login');
            }
        };
        init();
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
            if (syncIntervalRef.current) clearInterval(syncIntervalRef.current);
        };
    }, [topicId]);

    // Timer & Sync for reading time
    useEffect(() => {
        if (!user || !topicId || initialized.current) return;
        initialized.current = true;

        const startReadingSession = async () => {
            try {
                const { session: readingSession } = await PracticeService.createSession(
                    user.id, 
                    null, 
                    null, 
                    'reading', 
                    parseInt(topicId), 
                    [], 
                    subject?.id || null
                );
                if (readingSession) {
                    setSession(readingSession);
                    timerRef.current = setInterval(() => setTimeElapsed(prev => prev + 1), 1000);
                }
            } catch (err) {
                console.error('Failed to start reading session:', err);
            }
        };

        if (subject) startReadingSession();
    }, [user, topicId, subject]);

    useEffect(() => {
        if (!session || !user) return;

        syncIntervalRef.current = setInterval(() => {
            PracticeService.syncSessionProgress(session.id, timeElapsed);
        }, 30000);

        return () => {
            if (syncIntervalRef.current) clearInterval(syncIntervalRef.current);
        };
    }, [session, timeElapsed, user]);

    const loadLessonData = async () => {
        try {
            const res = await fetch(`/api/mongo/content?type=topics&id=${topicId}`);
            const data = await res.json();
            const t = data.topics?.[0];
            if (!t) throw new Error('Topic not found');
            setTopic(t);
            if (t.subject_id) {
                const subRes = await fetch(`/api/mongo/content?type=subjects&id=${t.subject_id}`);
                const subData = await subRes.json();
                setSubject(subData.subjects?.[0]);
            }
            const mcqRes = await fetch(`/api/mongo/mcqs?topic_id=${topicId}`);
            const mcqData = await mcqRes.json();
            setMcqCount(mcqData.mcqs?.length || 0);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    const markAsRead = async (userId: string, tId: number) => {
        try {
            await fetch('/api/mongo/progress', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ student_id: userId, topic_id: tId, is_completed: true })
            });
        } catch (e) { console.error(e); }
    };

    if (loading) return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
            <div className="w-12 h-12 border-4 border-teal-600 border-t-transparent rounded-full animate-spin" />
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-50 flex font-sans">
            <Sidebar userRole={userRole as any} />
            <div className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ${isSidebarCollapsed ? 'lg:ml-28' : 'lg:ml-80'}`}>
                <Header userName={user?.full_name} userEmail={user?.email} />
                <main className="mt-24 p-3 sm:p-6 lg:p-8">
                    <div className="max-w-4xl mx-auto">
                        <nav className="flex items-center gap-2 text-[10px] font-black text-slate-400 mb-8 uppercase tracking-widest">
                            <Link href={`/test-sections/${sectionId}`} className="hover:text-teal-600 transition-colors">EXAM PORTAL</Link>
                            <ChevronLeft className="w-3 h-3 rotate-180" />
                            <span className="text-teal-600">{topic?.name}</span>
                        </nav>

                        <div className="bg-white p-5 sm:p-8 lg:p-12 rounded-[2rem] lg:rounded-[3rem] shadow-sm border border-slate-100 mb-6 sm:mb-8 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-teal-50 rounded-full -translate-y-1/2 translate-x-1/2 opacity-50" />
                            <div className="relative z-10">
                                <div className="bg-teal-600 px-3 py-1 rounded-lg text-[9px] font-black text-white uppercase tracking-widest inline-block mb-4">Reading Module</div>
                                <h1 className="text-2xl sm:text-3xl lg:text-5xl font-black text-slate-900 leading-tight mb-6 break-words">{topic?.name}</h1>
                                <div className="flex flex-wrap gap-4 items-center">
                                    <div className="flex items-center gap-2 bg-slate-50 px-4 py-2 rounded-xl border border-slate-100 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                        <GraduationCap className="w-4 h-4 text-teal-500" /> {subject?.name}
                                    </div>
                                    <div className="flex items-center gap-2 bg-slate-50 px-4 py-2 rounded-xl border border-slate-100 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                        <Clock className="w-4 h-4 text-teal-500" /> 15-20 Min Read
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white p-5 sm:p-8 lg:p-14 rounded-[2rem] lg:rounded-[3.5rem] shadow-sm border border-slate-100 prose prose-slate max-w-none prose-headings:font-black prose-p:text-slate-600 prose-p:leading-loose">
                            {topic?.content_markdown ? (
                                <MarkdownRenderer content={topic?.content_markdown} />
                            ) : (
                                <div className="py-20 text-center text-slate-300 italic">Content is being prepared by our academic team.</div>
                            )}
                        </div>

                        {mcqCount > 0 && (
                            <div className="mt-8 bg-teal-900 p-8 lg:p-12 rounded-[2.5rem] lg:rounded-[3rem] text-white flex flex-col md:flex-row items-center justify-between gap-8 shadow-2xl shadow-teal-200">
                                <div>
                                    <h4 className="text-2xl font-black mb-2">Ready to test yourself?</h4>
                                    <p className="text-teal-200 font-medium">We've prepared <span className="text-white font-black">{mcqCount} practice questions</span> based on this module.</p>
                                </div>
                                <button onClick={() => router.push(`/test-sections/${sectionId}/practice/topic/${topicId}`)} className="px-8 py-4 bg-white text-teal-900 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-teal-50 transition-all flex items-center gap-3 shrink-0">
                                    Start Practice <MoveRight className="w-4 h-4" />
                                </button>
                            </div>
                        )}
                    </div>
                </main>
            </div>
        </div>
    );
}
