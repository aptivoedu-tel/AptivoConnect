'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  FileText,
  Scale,
  BookOpen,
  Users,
  ShieldCheck,
  AlertTriangle,
  FileCheck,
  Mail,
  CheckCircle2,
  GraduationCap
} from 'lucide-react';

const sections = [
  { id: 'general-terms', label: 'General Terms', icon: Scale, color: 'text-teal-600' },
  { id: 'learning-mission', label: 'Platform Scope', icon: BookOpen, color: 'text-emerald-600' },
  { id: 'account-roles', label: 'Account Roles', icon: Users, color: 'text-teal-700' },
  { id: 'license-fair-use', label: 'License & IP', icon: ShieldCheck, color: 'text-emerald-700' },
  { id: 'prohibited-conduct', label: 'Prohibited Conduct', icon: AlertTriangle, color: 'text-red-500' },
  { id: 'warranties', label: 'Warranties & Scoring', icon: FileCheck, color: 'text-teal-600' },
  { id: 'support-contact', label: 'Support & Inquiries', icon: Mail, color: 'text-teal-800' }
];

export default function TermsPage() {
  const [activeSection, setActiveSection] = useState('general-terms');
  const [tocOpen, setTocOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY + 200;
      for (const section of sections) {
        const el = document.getElementById(section.id);
        if (el) {
          const top = el.offsetTop;
          const height = el.offsetHeight;
          if (scrollPosition >= top && scrollPosition < top + height) {
            setActiveSection(section.id);
            break;
          }
        }
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (id: string) => {
    setActiveSection(id);
    const el = document.getElementById(id);
    if (el) {
      const yOffset = -100;
      const y = el.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-slate-100/70 relative font-sans selection:bg-teal-100 selection:text-teal-900 pb-20">
      
      {/* Top Header Bar */}
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-black text-slate-600 hover:text-teal-800 transition-colors uppercase tracking-wider group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform text-slate-500 group-hover:text-teal-700" />
            <span>Back to Home</span>
          </Link>

          <Link href="/" className="inline-flex items-center gap-2.5 group">
            <div className="w-9 h-9 bg-teal-600 rounded-xl flex items-center justify-center text-white shadow-md shadow-teal-600/20 transition-transform group-hover:scale-105">
              <GraduationCap className="w-5 h-5" />
            </div>
            <span className="text-xl font-black text-slate-900 tracking-tight">Aptivo</span>
          </Link>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 sm:pt-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* ─── Left Sidebar Navigation Card (Sticky) ─── */}
          <aside className="lg:col-span-4 xl:col-span-3 lg:sticky lg:top-24 z-30">
            {/* Mobile toggle */}
            <button
              onClick={() => setTocOpen(!tocOpen)}
              className="lg:hidden w-full flex items-center justify-between px-4 py-3 bg-white rounded-2xl border border-slate-200 shadow-sm text-xs font-black text-slate-700 mb-2"
            >
              <span>📋 Jump to Section</span>
              <span className={`transition-transform duration-200 ${tocOpen ? 'rotate-180' : ''}`}>▾</span>
            </button>
            <div className={`bg-white rounded-3xl p-5 shadow-xl shadow-slate-200/50 border border-slate-200/80 space-y-2 ${
              tocOpen ? 'block' : 'hidden lg:block'
            }`}>
              <div className="pb-3 px-3 border-b border-slate-100">
                <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">
                  Table of Contents
                </p>
              </div>
              <nav className="space-y-1">
                {sections.map((sec) => {
                  const Icon = sec.icon;
                  const isActive = activeSection === sec.id;
                  return (
                    <button
                      key={sec.id}
                      onClick={() => scrollToSection(sec.id)}
                      className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all text-left cursor-pointer ${
                        isActive
                          ? 'bg-teal-50 text-teal-900 shadow-xs border border-teal-200/80 font-black'
                          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 border border-transparent'
                      }`}
                    >
                      <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-teal-700' : sec.color}`} />
                      <span className="truncate">{sec.label}</span>
                    </button>
                  );
                })}
              </nav>

              <div className="pt-3 px-2 border-t border-slate-100">
                <Link
                  href="/privacy"
                  className="flex items-center justify-between text-xs font-bold text-slate-500 hover:text-teal-700 transition-colors p-2 rounded-xl hover:bg-slate-50"
                >
                  <span>View Privacy Policy</span>
                  <span>→</span>
                </Link>
              </div>
            </div>
          </aside>

          {/* ─── Right Content Area ─── */}
          <div className="lg:col-span-8 xl:col-span-9 space-y-6">
            
            {/* Top Curved Gradient Banner Card */}
            <div className="bg-gradient-to-br from-teal-600 via-teal-700 to-[#042f2e] text-white rounded-3xl p-8 sm:p-12 shadow-xl shadow-teal-900/15 relative overflow-hidden">
              <div className="relative z-10 space-y-2">
                <span className="text-[11px] font-black uppercase tracking-widest bg-white/15 backdrop-blur-md px-3 py-1 rounded-full border border-white/20 inline-block">
                  Legal & Terms
                </span>
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white pt-1">
                  Terms & conditions
                </h1>
                <p className="text-teal-100 text-xs sm:text-sm font-medium pt-1">
                  Last modified: 2026/2027 Academic Season
                </p>
              </div>
              <FileText className="absolute right-6 -bottom-6 w-48 h-48 text-white/5 pointer-events-none" />
            </div>

            {/* Main Document Body Card */}
            <div className="bg-white rounded-3xl p-6 sm:p-12 shadow-xl shadow-slate-200/50 border border-slate-200/80 space-y-12 leading-relaxed text-slate-600 text-sm">
              
              {/* Section 1 */}
              <section id="general-terms" className="scroll-mt-28 space-y-4">
                <div className="flex items-center gap-3 pb-2 border-b border-slate-100">
                  <div className="w-8 h-8 rounded-xl bg-teal-50 border border-teal-200 text-teal-800 flex items-center justify-center text-xs font-black shrink-0">
                    1
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                    General Terms & Acceptance
                  </h2>
                </div>
                <p>
                  Welcome to Aptivo! These terms and conditions outline the legal rules and regulations governing your use of Aptivo's test preparation platform.
                </p>
                <p>
                  By accessing, registering, or using this website, you agree to accept all terms and conditions stated on this page in full. If you do not agree to any part of these terms, please discontinue using Aptivo immediately.
                </p>
              </section>

              {/* Section 2 */}
              <section id="learning-mission" className="scroll-mt-28 space-y-4">
                <div className="flex items-center gap-3 pb-2 border-b border-slate-100">
                  <div className="w-8 h-8 rounded-xl bg-teal-50 border border-teal-200 text-teal-800 flex items-center justify-center text-xs font-black shrink-0">
                    2
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                    Platform Scope & Learning Mission
                  </h2>
                </div>
                <p>
                  Aptivo delivers university entrance examination preparation intelligence, featuring <strong>20,000+ verified past-paper MCQs</strong>, timed university mock simulations, LaTeX formula step-by-step derivations, and diagnostic accuracy trackers tailored for Pakistan's premier entrance tests:
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1">
                  {['NUST NET (Engineering & CS)', 'FAST NU (Computing & Math)', 'MDCAT (Medical & Dental)', 'ECAT (Engineering UET)', 'GIKI & PIEAS', 'Sindh & Punjab Entry Tests'].map((uni, i) => (
                    <div key={i} className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-xs font-bold text-slate-800 flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-teal-600 shrink-0" />
                      <span>{uni}</span>
                    </div>
                  ))}
                </div>
              </section>

              {/* Section 3 */}
              <section id="account-roles" className="scroll-mt-28 space-y-4">
                <div className="flex items-center gap-3 pb-2 border-b border-slate-100">
                  <div className="w-8 h-8 rounded-xl bg-teal-50 border border-teal-200 text-teal-800 flex items-center justify-center text-xs font-black shrink-0">
                    3
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                    Account Roles & Custody
                  </h2>
                </div>
                <div className="space-y-4">
                  <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2">
                    <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-teal-600" />
                      <span>3.1 Student Accounts</span>
                    </h3>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Students can create accounts independently or be enrolled through participating institutions. You must provide authentic credentials and keep your account access confidential. Single-user custody is strictly enforced.
                    </p>
                  </div>

                  <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2">
                    <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-emerald-600" />
                      <span>3.2 Institution Admin Accounts</span>
                    </h3>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Colleges, coaching academies, and educators undergo verification before access keys are active. Institution administrators are responsible for student seat assignments and ethical cohort performance oversight.
                    </p>
                  </div>
                </div>
              </section>

              {/* Section 4 */}
              <section id="license-fair-use" className="scroll-mt-28 space-y-4">
                <div className="flex items-center gap-3 pb-2 border-b border-slate-100">
                  <div className="w-8 h-8 rounded-xl bg-teal-50 border border-teal-200 text-teal-800 flex items-center justify-center text-xs font-black shrink-0">
                    4
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                    License & Intellectual Property
                  </h2>
                </div>
                <p>
                  Unless otherwise stated, Aptivo and/or its licensors own the intellectual property rights for all material on the platform, including question formulations, test architectures, LaTeX explanations, and design components.
                </p>
                <div className="p-5 bg-teal-50/50 rounded-2xl border border-teal-100/80 space-y-2 text-xs">
                  <p className="font-bold text-teal-900">You must not:</p>
                  <ul className="list-disc list-outside space-y-1.5 text-slate-600 ml-5 marker:text-teal-600">
                    <li>Republish, sell, or rent materials from Aptivo without written authorization.</li>
                    <li>Scrape question banks or test sequences using automated tools or scripts.</li>
                    <li>Redistribute content from Aptivo for commercial test preparation services.</li>
                  </ul>
                </div>
              </section>

              {/* Section 5 */}
              <section id="prohibited-conduct" className="scroll-mt-28 space-y-4">
                <div className="flex items-center gap-3 pb-2 border-b border-slate-100">
                  <div className="w-8 h-8 rounded-xl bg-red-50 border border-red-200 text-red-700 flex items-center justify-center text-xs font-black shrink-0">
                    5
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                    Prohibited Conduct & Anti-Abuse
                  </h2>
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  {[
                    { title: 'No Account Sharing', desc: 'Concurrent logins across different cities or public sharing of passwords.' },
                    { title: 'No Automated Answer Bots', desc: 'Using unauthorized browser extensions or bots to game practice tests.' },
                    { title: 'No Malicious Content', desc: 'Injecting malicious scripts or probing platform security measures.' },
                    { title: 'No Commercial Redistribution', desc: 'Reselling Aptivo mock exams or PDF compilations.' }
                  ].map((item, i) => (
                    <div key={i} className="p-4 bg-red-50/50 rounded-2xl border border-red-100 space-y-1">
                      <h3 className="text-xs font-black text-red-900">{item.title}</h3>
                      <p className="text-slate-600 text-[11px] leading-relaxed">{item.desc}</p>
                    </div>
                  ))}
                </div>
              </section>

              {/* Section 6 */}
              <section id="warranties" className="scroll-mt-28 space-y-4">
                <div className="flex items-center gap-3 pb-2 border-b border-slate-100">
                  <div className="w-8 h-8 rounded-xl bg-teal-50 border border-teal-200 text-teal-800 flex items-center justify-center text-xs font-black shrink-0">
                    6
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                    Warranties, Scoring & Disclaimers
                  </h2>
                </div>
                <p>
                  While all Aptivo practice materials and formula solutions undergo multi-tier editorial review, materials are provided on an <strong>"as is"</strong> basis. Official test formats, scoring criteria, and university admissions remain under the sole jurisdiction of the respective examination bodies (e.g. NUST, FAST, PMDC, UET).
                </p>
              </section>

              {/* Section 7 */}
              <section id="support-contact" className="scroll-mt-28 space-y-4">
                <div className="flex items-center gap-3 pb-2 border-b border-slate-100">
                  <div className="w-8 h-8 rounded-xl bg-teal-50 border border-teal-200 text-teal-800 flex items-center justify-center text-xs font-black shrink-0">
                    7
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                    Support & Legal Inquiries
                  </h2>
                </div>
                <p>
                  For questions regarding these Terms of Service or institutional licensing agreements, contact us:
                </p>
                <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200/80 text-xs text-slate-700 space-y-1.5">
                  <p className="font-black text-slate-900">Aptivo Legal & Administrative Desk</p>
                  <p>
                    Email:{' '}
                    <a href="mailto:aptivo.edu@gmail.com" className="text-teal-700 font-black hover:underline">
                      aptivo.edu@gmail.com
                    </a>
                  </p>
                </div>
              </section>

              {/* Bottom Acknowledgment */}
              <div className="mt-8 p-6 sm:p-8 bg-gradient-to-br from-teal-50 via-emerald-50 to-teal-50/40 rounded-2xl border border-teal-200/80 relative overflow-hidden">
                <CheckCircle2 className="absolute -right-3 -bottom-3 w-28 h-28 text-teal-500/10 pointer-events-none" />
                <h3 className="font-black text-teal-950 text-base sm:text-lg mb-1 flex items-center gap-2">
                  <span>Agreement Acknowledgment</span>
                </h3>
                <p className="text-teal-800 text-xs leading-relaxed font-medium">
                  By using Aptivo, you confirm that you have read, understood, and agree to these Terms and Conditions in their entirety.
                </p>
              </div>

            </div>

          </div>

        </div>
      </main>

    </div>
  );
}
