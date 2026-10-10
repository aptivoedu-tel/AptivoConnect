"use client";

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import {
    GraduationCap, ShieldAlert, ArrowLeft, BookOpen,
    FileText, Clock, GraduationCap as GradIcon, ArrowRight,
    Sparkles, Award
} from 'lucide-react';
import Navbar from '@/components/landing/Navbar';
import Footer from '@/components/layout/Footer';

const MarkdownRenderer = dynamic(() => import('@/components/shared/MarkdownRenderer'), { ssr: false });

export default function TestSectionPatternPage() {
    const params = useParams();
    const sectionId = Number(params.sectionId);

    const [testSection, setTestSection] = useState<any>(null);
    const [exams, setExams] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);

    useEffect(() => {
        if (isNaN(sectionId)) { setNotFound(true); setLoading(false); return; }

        const init = async () => {
            try {
                // Fetch test section details
                const sectionRes = await fetch(`/api/mongo/test-sections?id=${sectionId}`);
                const sectionData = await sectionRes.json();
                const section = sectionData.sections?.find((s: any) => s.id === sectionId);
                
                // Only show test sections that are active and public
                if (!section || section.is_active !== true || section.is_public !== true) {
                    setNotFound(true); return;
                }
                setTestSection(section);

                // Fetch global/public exams for this test section (institution_id=null means open to all)
                const examRes = await fetch(`/api/mongo/exams?test_section_id=${sectionId}&active=true&institution_id=null`);
                const examData = await examRes.json();
                setExams(examData.exams || []);
            } catch {
                setNotFound(true);
            } finally {
                setLoading(false);
            }
        };
        init();
    }, [sectionId]);

    return (
        <div className="min-h-screen bg-slate-50/70 font-sans selection:bg-teal-100 selection:text-teal-900 flex flex-col justify-between">
            {/* Global Floating Navbar */}
            <Navbar />

            <main className="pt-28 sm:pt-36 pb-20 px-4 sm:px-6 lg:px-8 flex-1">
                <div className="max-w-6xl mx-auto">

                    {/* Back Button */}
                    <div className="mb-6">
                        <Link
                            href="/"
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-slate-200/90 shadow-xs hover:border-teal-300 text-xs font-black text-slate-600 hover:text-teal-700 transition-all group"
                        >
                            <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform text-slate-400 group-hover:text-teal-600" />
                            <span>Back to Home</span>
                        </Link>
                    </div>

                    {loading ? (
                        <div className="animate-pulse space-y-6">
                            <div className="flex items-center gap-5 pb-6 border-b border-slate-200">
                                <div className="w-16 h-16 bg-slate-200 rounded-2xl" />
                                <div className="space-y-2">
                                    <div className="h-3 w-24 bg-slate-200 rounded" />
                                    <div className="h-8 w-64 bg-slate-200 rounded-xl" />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                                <div className="lg:col-span-8 h-96 bg-white rounded-3xl border border-slate-200" />
                                <div className="lg:col-span-4 h-96 bg-white rounded-3xl border border-slate-200" />
                            </div>
                        </div>

                    ) : notFound ? (
                        <div className="text-center py-24 space-y-4 bg-white rounded-3xl border border-slate-200/80 p-12 max-w-lg mx-auto shadow-sm">
                            <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto text-slate-400">
                                <BookOpen className="w-8 h-8" />
                            </div>
                            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Exam Track Not Found</h2>
                            <p className="text-slate-500 text-sm font-medium">This exam track is currently unavailable or inactive.</p>
                            <Link
                                href="/"
                                className="inline-block mt-4 px-7 py-3 bg-teal-600 text-white rounded-xl text-xs font-black uppercase tracking-wider hover:bg-teal-700 transition-all shadow-md shadow-teal-600/20"
                            >
                                Back to Home
                            </Link>
                        </div>

                    ) : (
                        <div className="space-y-8">
                            
                            {/* Exam Header Banner Card */}
                            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xl shadow-slate-200/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                                <div className="flex items-center gap-5">
                                    <div className="w-16 h-16 sm:w-20 sm:h-20 bg-slate-50 rounded-2xl shadow-inner border border-slate-200/80 p-2.5 flex items-center justify-center overflow-hidden shrink-0">
                                        {testSection?.logo_url ? (
                                            <img src={testSection.logo_url} alt={testSection.name} className="w-full h-full object-contain" />
                                        ) : (
                                            <span className="text-2xl font-black text-teal-600">{testSection?.name?.charAt(0)}</span>
                                        )}
                                    </div>
                                    <div className="space-y-1">
                                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-50 border border-teal-200 text-teal-800 text-[10px] font-black uppercase tracking-widest">
                                            <Award className="w-3 h-3 text-teal-600" />
                                            <span>Standardized Exam Pattern</span>
                                        </div>
                                        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 tracking-tight">
                                            {testSection?.name}
                                        </h1>
                                    </div>
                                </div>
                                <div className="hidden md:flex items-center gap-2 px-4 py-2 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs font-bold text-slate-600 shrink-0">
                                    <Sparkles className="w-4 h-4 text-teal-600" />
                                    <span>2026/2027 Syllabus Standard</span>
                                </div>
                            </div>

                            {/* 2-Column Main Layout */}
                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                                
                                {/* ── Left Column: Official Test Pattern Document ── */}
                                <div className="lg:col-span-8 space-y-6">
                                    <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xl shadow-slate-200/40 overflow-hidden">
                                        
                                        {/* Card Header */}
                                        <div className="flex items-center gap-4 p-6 sm:p-8 border-b border-slate-100 bg-slate-50/50">
                                            <div className="w-11 h-11 bg-teal-50 rounded-xl flex items-center justify-center text-teal-600 border border-teal-200 shrink-0">
                                                <ShieldAlert className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <h2 className="text-lg font-black text-slate-900 tracking-tight">Official Test Pattern</h2>
                                                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Exam structure &amp; weighting pattern</p>
                                            </div>
                                        </div>

                                        {/* Markdown Body */}
                                        <div className="p-6 sm:p-10 overflow-x-auto text-slate-700">
                                            {testSection?.test_pattern_markdown ? (
                                                <MarkdownRenderer content={testSection.test_pattern_markdown} />
                                            ) : (
                                                <div className="py-16 text-center space-y-3">
                                                    <ShieldAlert className="w-12 h-12 text-slate-300 mx-auto" />
                                                    <p className="text-slate-500 font-bold">No official test pattern documented yet.</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* ── Right Column: Open Examinations & Access Card ── */}
                                <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-24">
                                    
                                    {/* Open Examinations Card */}
                                    <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xl shadow-slate-200/40 overflow-hidden">
                                        <div className="flex items-center gap-3.5 p-5 sm:p-6 border-b border-slate-100 bg-slate-50/50">
                                            <div className="w-10 h-10 bg-teal-50 rounded-xl flex items-center justify-center text-teal-700 border border-teal-200 shrink-0">
                                                <FileText className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <h3 className="text-base font-black text-slate-900 tracking-tight">Open Exams</h3>
                                                <p className="text-[10px] font-bold text-teal-700 uppercase tracking-wider">Available without login</p>
                                            </div>
                                        </div>

                                        {exams.length > 0 ? (
                                            <div className="divide-y divide-slate-100">
                                                {exams.map((exam) => (
                                                    <div key={exam.id} className="p-5 hover:bg-slate-50/70 transition-colors space-y-3">
                                                        <div className="space-y-1">
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-2 h-2 rounded-full bg-teal-500 animate-pulse shadow-[0_0_8px_rgba(13,148,136,0.6)] shrink-0" />
                                                                <h4 className="font-bold text-sm text-slate-900 tracking-tight line-clamp-2">
                                                                    {exam.exam_name || exam.name}
                                                                </h4>
                                                            </div>
                                                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-semibold text-slate-500">
                                                                <span className="flex items-center gap-1">
                                                                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                                                                    {exam.duration_minutes || exam.total_duration} mins
                                                                </span>
                                                                <span className="text-slate-300">•</span>
                                                                <span className="capitalize">{(exam.attempt_policy || 'unrestricted').replace('_', ' ')}</span>
                                                            </div>
                                                        </div>
                                                        <Link
                                                            href={`/login?redirect=/test-sections/${sectionId}/exam/${exam.id}`}
                                                            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-black uppercase tracking-wider active:scale-[0.98] transition-all shadow-md shadow-teal-600/20 cursor-pointer"
                                                        >
                                                            <span>Start Exam</span>
                                                            <ArrowRight className="w-3.5 h-3.5" />
                                                        </Link>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="py-12 text-center space-y-2 px-6">
                                                <GradIcon className="w-10 h-10 text-slate-300 mx-auto" />
                                                <p className="text-xs font-bold text-slate-500">No open public exams right now.</p>
                                                <p className="text-[11px] text-slate-400">Sign in to access all standardized prep materials.</p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Full Prep Access CTA Card */}
                                    <div className="bg-gradient-to-br from-teal-600 via-teal-700 to-[#042f2e] rounded-3xl p-7 flex flex-col gap-5 shadow-xl shadow-teal-900/15 text-white relative overflow-hidden">
                                        <div className="space-y-2 relative z-10">
                                            <span className="text-[10px] font-black uppercase tracking-widest bg-white/15 px-2.5 py-1 rounded-full border border-white/20 inline-block">
                                                Full Admission Prep
                                            </span>
                                            <h3 className="font-black text-xl leading-tight">
                                                Ace {testSection?.name}?
                                            </h3>
                                            <p className="text-teal-100 text-xs font-medium leading-relaxed">
                                                Unlock 20,000+ past-paper MCQs, full-length timed mock tests, and step-by-step solutions.
                                            </p>
                                        </div>
                                        <div className="flex flex-col gap-2.5 relative z-10 pt-1">
                                            <Link
                                                href="/login"
                                                className="w-full py-3 text-center bg-white/15 hover:bg-white/25 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all border border-white/25 cursor-pointer"
                                            >
                                                Log In
                                            </Link>
                                            <Link
                                                href="/register"
                                                className="w-full py-3 text-center bg-white text-teal-800 hover:bg-teal-50 text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-lg cursor-pointer"
                                            >
                                                Join Free
                                            </Link>
                                        </div>
                                    </div>

                                </div>

                            </div>
                        </div>
                    )}
                </div>
            </main>

            <Footer />
        </div>
    );
}
