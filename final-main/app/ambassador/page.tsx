'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  GraduationCap,
  Award,
  Users,
  Gift,
  ArrowRight,
  ArrowLeft,
  MessageCircle,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  Lock
} from 'lucide-react';
import Navbar from '@/components/landing/Navbar';
import Footer from '@/components/layout/Footer';
import AmbassadorForm from '@/components/ambassador/AmbassadorForm';

export default function AmbassadorPage() {
  const [view, setView] = useState<'overview' | 'form'>('overview');
  const [isClosed, setIsClosed] = useState<boolean>(false);

  useEffect(() => {
    fetch('/api/ambassadors/settings')
      .then(res => res.json())
      .then(data => {
        if (data && typeof data.applicationsClosed === 'boolean') {
          setIsClosed(data.applicationsClosed);
        }
      })
      .catch(err => console.error('Failed to load ambassador settings', err));
  }, []);

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans text-slate-900 selection:bg-teal-100 selection:text-teal-900">
      {/* Floating Capsule Header */}
      <Navbar />

      <main className="flex-1 pt-24 sm:pt-32 pb-16 flex items-center justify-center px-3 sm:px-6 lg:px-8 w-full">
        <div className="w-full max-w-4xl">

          {/* VIEW 1: OVERVIEW & PERKS CARD */}
          {view === 'overview' && (
            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xl shadow-slate-200/50 p-6 sm:p-10 lg:p-12 transition-all">
              {/* Card Header Badge */}
              <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
                {isClosed ? (
                  <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-50 border border-amber-200/80 text-amber-800 text-[11px] font-black uppercase tracking-wider">
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    Official Aptivo Ambassador Recruitment • Applications Closed
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-teal-50 border border-teal-200/80 text-teal-800 text-[11px] font-black uppercase tracking-wider">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    Official Aptivo Ambassador Recruitment • 2026
                  </div>
                )}
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-50 border border-slate-200 text-slate-600 text-xs font-bold">
                  <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
                  <span>Verified Program</span>
                </div>
              </div>

              {/* Title & Tagline */}
              <div className="mb-8">
                <h1 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight leading-[1.15] mb-3">
                  Represent <span className="text-teal-600 underline decoration-teal-300/60 underline-offset-8">Aptivo</span> at Your Campus
                </h1>
                <p className="text-sm sm:text-base font-medium text-slate-600 leading-relaxed max-w-2xl">
                  Lead student outreach, inspire peers, and connect thousands of students with 20,000+ curated entry test MCQs, mock exams, and admissions prep.
                </p>
                <p className="text-xs font-bold text-teal-800 uppercase tracking-widest mt-2">
                  “Built by toppers for next ones”
                </p>
              </div>

              {/* Prominent Callout Banner */}
              {isClosed ? (
                <div className="bg-gradient-to-br from-amber-50/80 to-slate-50/80 rounded-2xl p-5 sm:p-6 border border-amber-200/80 flex flex-col sm:flex-row items-center justify-between gap-4 mb-8">
                  <div>
                    <h3 className="font-black text-amber-950 text-base sm:text-lg flex items-center gap-2">
                      <span>Applications Closed</span>
                    </h3>
                    <p className="text-xs font-medium text-amber-800/80 mt-0.5">
                      Applications for the current cohort are currently closed. Check back soon for our next recruitment cycle!
                    </p>
                  </div>

                  <button
                    disabled
                    className="w-full sm:w-auto px-8 py-4 rounded-full bg-slate-200 text-slate-500 font-black text-sm tracking-wide cursor-not-allowed flex items-center justify-center gap-2 shrink-0 shadow-inner"
                  >
                    <Lock className="w-4 h-4 text-slate-400" />
                    <span>Application Closed</span>
                  </button>
                </div>
              ) : (
                <div className="bg-gradient-to-br from-teal-50/80 to-emerald-50/50 rounded-2xl p-5 sm:p-6 border border-teal-100 flex flex-col sm:flex-row items-center justify-between gap-4 mb-8">
                  <div>
                    <h3 className="font-black text-slate-900 text-base sm:text-lg">
                      Ready to make an impact?
                    </h3>
                    <p className="text-xs font-medium text-slate-600 mt-0.5">
                      Takes only 3 minutes to complete. No registration fee required.
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      setView('form');
                      window.scrollTo({ top: 120, behavior: 'smooth' });
                    }}
                    className="w-full sm:w-auto px-8 py-4 rounded-full bg-[#042f2e] hover:bg-teal-900 text-white font-black text-sm tracking-wide transition-all shadow-lg shadow-[#042f2e]/25 active:scale-95 flex items-center justify-center gap-2 cursor-pointer shrink-0"
                  >
                    <span>Apply Now — Start Application</span>
                    <ArrowRight className="w-4 h-4 text-emerald-400" />
                  </button>
                </div>
              )}

              {/* Why Join / Benefits Grid */}
              <div className="mb-8">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">
                  Ambassador Perks &amp; Recognition
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 rounded-2xl bg-slate-50/60 border border-slate-100 hover:border-teal-200 transition-colors flex items-start gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
                      <Award className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-black text-sm text-slate-900">Official Certification</h4>
                      <p className="text-xs font-medium text-slate-500 mt-0.5 leading-relaxed">
                        Verified Certificate of Merit and Executive Recommendation Letter for your CV.
                      </p>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50/60 border border-slate-100 hover:border-teal-200 transition-colors flex items-start gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
                      <Users className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-black text-sm text-slate-900">Campus Leadership</h4>
                      <p className="text-xs font-medium text-slate-500 mt-0.5 leading-relaxed">
                        Lead campus activities, run study sessions, and build executive management skills.
                      </p>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50/60 border border-slate-100 hover:border-teal-200 transition-colors flex items-start gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
                      <GraduationCap className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-black text-sm text-slate-900">Free Premium Prep</h4>
                      <p className="text-xs font-medium text-slate-500 mt-0.5 leading-relaxed">
                        Free premium access to Aptivo test bank, full mocks, and entry counseling.
                      </p>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50/60 border border-slate-100 hover:border-teal-200 transition-colors flex items-start gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
                      <Gift className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-black text-sm text-slate-900">Merit Rewards &amp; Swag</h4>
                      <p className="text-xs font-medium text-slate-500 mt-0.5 leading-relaxed">
                        Performance bonuses, Aptivo merchandise, and campus director badges.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Support Callout */}
              <div className="pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-medium text-slate-500">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span>Open to all college &amp; university students</span>
                </div>

                <a
                  href="https://wa.me/923713215643"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-teal-700 hover:text-teal-800 font-bold hover:underline"
                >
                  <MessageCircle className="w-4 h-4 text-emerald-600" />
                  <span>Questions? Chat on WhatsApp</span>
                </a>
              </div>
            </div>
          )}

          {/* VIEW 2: APPLICATION FORM CARD */}
          {view === 'form' && (
            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xl shadow-slate-200/50 p-6 sm:p-10 lg:p-12 transition-all">
              {/* Back button & Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 mb-6 border-b border-slate-100">
                <div>
                  <button
                    onClick={() => {
                      setView('overview');
                      window.scrollTo({ top: 120, behavior: 'smooth' });
                    }}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-teal-700 mb-2 transition-colors cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back to Program Overview</span>
                  </button>
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                    Ambassador Application Form
                  </h2>
                  <p className="text-xs font-medium text-slate-500 mt-0.5">
                    {isClosed
                      ? "Applications are currently closed."
                      : "Fields marked with * are required. Your application is kept strictly confidential."}
                  </p>
                </div>

                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-50 border border-teal-200/60 text-teal-700 text-xs font-black self-start sm:self-auto">
                  <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
                  <span>Official Portal</span>
                </div>
              </div>

              {/* Form Component or Closed State */}
              {isClosed ? (
                <div className="py-12 text-center max-w-md mx-auto space-y-4">
                  <div className="w-14 h-14 bg-amber-100 rounded-2xl flex items-center justify-center text-amber-700 mx-auto shadow-sm">
                    <Lock className="w-7 h-7" />
                  </div>
                  <h3 className="text-xl font-black text-slate-900">Applications Are Currently Closed</h3>
                  <p className="text-xs font-medium text-slate-600 leading-relaxed">
                    We are not accepting new ambassador applications at this time. Please check back later or follow our social channels for announcement of the next recruitment cycle.
                  </p>
                  <button
                    onClick={() => {
                      setView('overview');
                      window.scrollTo({ top: 120, behavior: 'smooth' });
                    }}
                    className="px-6 py-3 rounded-full bg-[#042f2e] text-white font-black text-xs uppercase tracking-wider hover:bg-teal-900 transition-all cursor-pointer shadow-md inline-flex items-center gap-2"
                  >
                    <ArrowLeft className="w-4 h-4 text-emerald-400" />
                    <span>Return to Overview</span>
                  </button>
                </div>
              ) : (
                <AmbassadorForm />
              )}
            </div>
          )}

        </div>
      </main>

      {/* Standard Aptivo Footer */}
      <Footer />
    </div>
  );
}
