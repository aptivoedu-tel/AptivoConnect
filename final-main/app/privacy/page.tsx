'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Shield,
  Database,
  Cpu,
  Lock,
  Key,
  Cookie,
  UserCheck,
  CheckCircle2,
  GraduationCap
} from 'lucide-react';

const sections = [
  { id: 'privacy-commitment', label: 'Privacy Commitment', icon: Shield, color: 'text-teal-600' },
  { id: 'data-collection', label: 'Data We Collect', icon: Database, color: 'text-emerald-600' },
  { id: 'data-usage', label: 'How We Use Data', icon: Cpu, color: 'text-teal-700' },
  { id: 'no-monetization', label: 'No Data Monetization', icon: Lock, color: 'text-emerald-700' },
  { id: 'security-encryption', label: 'Security & Encryption', icon: Key, color: 'text-teal-600' },
  { id: 'cookies-sessions', label: 'Cookies & Telemetry', icon: Cookie, color: 'text-amber-500' },
  { id: 'rights-contact', label: 'Your Rights & Contact', icon: UserCheck, color: 'text-teal-800' }
];

export default function PrivacyPage() {
  const [activeSection, setActiveSection] = useState('privacy-commitment');
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
                  href="/terms"
                  className="flex items-center justify-between text-xs font-bold text-slate-500 hover:text-teal-700 transition-colors p-2 rounded-xl hover:bg-slate-50"
                >
                  <span>View Terms of Service</span>
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
                  Trust & Security
                </span>
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white pt-1">
                  Privacy policy
                </h1>
                <p className="text-teal-100 text-xs sm:text-sm font-medium pt-1">
                  Last modified: 2026/2027 Entry Season
                </p>
              </div>
              <Shield className="absolute right-6 -bottom-6 w-48 h-48 text-white/5 pointer-events-none" />
            </div>

            {/* Main Document Body Card */}
            <div className="bg-white rounded-3xl p-6 sm:p-12 shadow-xl shadow-slate-200/50 border border-slate-200/80 space-y-12 leading-relaxed text-slate-600 text-sm">
              
              {/* Section 1 */}
              <section id="privacy-commitment" className="scroll-mt-28 space-y-4">
                <div className="flex items-center gap-3 pb-2 border-b border-slate-100">
                  <div className="w-8 h-8 rounded-xl bg-teal-50 border border-teal-200 text-teal-800 flex items-center justify-center text-xs font-black shrink-0">
                    1
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                    Privacy Commitment & Scope
                  </h2>
                </div>
                <p>
                  Aptivo (<strong>"we," "us," or "our"</strong>) respects your fundamental right to privacy. This policy outlines our standards for handling personal data and academic diagnostic history when you use our aptitude test preparation platform.
                </p>
                <p>
                  Our mission is to help students conquer Pakistan's top university entrance exams (NUST NET, FAST NU, MDCAT, ECAT, GIKI, and PIEAS) while maintaining the highest data security standards.
                </p>
              </section>

              {/* Section 2 */}
              <section id="data-collection" className="scroll-mt-28 space-y-4">
                <div className="flex items-center gap-3 pb-2 border-b border-slate-100">
                  <div className="w-8 h-8 rounded-xl bg-teal-50 border border-teal-200 text-teal-800 flex items-center justify-center text-xs font-black shrink-0">
                    2
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                    Information We Collect
                  </h2>
                </div>
                <div className="space-y-4">
                  <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2">
                    <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-teal-600" />
                      <span>2.1 Account Credentials</span>
                    </h3>
                    <ul className="list-disc list-outside space-y-1.5 text-slate-600 text-xs ml-5 marker:text-teal-600">
                      <li><strong>Name & Email:</strong> Used to maintain your progress and send account recovery links.</li>
                      <li><strong>Encrypted Passwords:</strong> Salted and hashed via bcrypt; plain passwords are never stored.</li>
                    </ul>
                  </div>

                  <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2">
                    <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-emerald-600" />
                      <span>2.2 Academic Practice Analytics</span>
                    </h3>
                    <ul className="list-disc list-outside space-y-1.5 text-slate-600 text-xs ml-5 marker:text-emerald-600">
                      <li>MCQ answer choices, time-spent per question, and diagnostic accuracy percentages.</li>
                      <li>University mock exam results and personalized weakness breakdown graphs.</li>
                    </ul>
                  </div>
                </div>
              </section>

              {/* Section 3 */}
              <section id="data-usage" className="scroll-mt-28 space-y-4">
                <div className="flex items-center gap-3 pb-2 border-b border-slate-100">
                  <div className="w-8 h-8 rounded-xl bg-teal-50 border border-teal-200 text-teal-800 flex items-center justify-center text-xs font-black shrink-0">
                    3
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                    How We Use Your Data
                  </h2>
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  {[
                    { title: 'Personalized Practice Engine', desc: 'Curates MCQs matching your weak topics and target university format.' },
                    { title: 'Predictive Entrance Test Scoring', desc: 'Benchmarks your mock scores against historical topper distributions.' },
                    { title: 'Cohort Analytics for Institutions', desc: 'Provides aggregated progress reports for academy and college partners.' },
                    { title: 'Security & Anti-Fraud', desc: 'Detects unauthorized account access and protects exam integrity.' }
                  ].map((item, i) => (
                    <div key={i} className="p-4 bg-teal-50/50 rounded-2xl border border-teal-100/80 space-y-1">
                      <h3 className="text-xs font-black text-teal-900">{item.title}</h3>
                      <p className="text-slate-600 text-[11px] leading-relaxed">{item.desc}</p>
                    </div>
                  ))}
                </div>
              </section>

              {/* Section 4 */}
              <section id="no-monetization" className="scroll-mt-28 space-y-4">
                <div className="flex items-center gap-3 pb-2 border-b border-slate-100">
                  <div className="w-8 h-8 rounded-xl bg-teal-50 border border-teal-200 text-teal-800 flex items-center justify-center text-xs font-black shrink-0">
                    4
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                    No Data Monetization
                  </h2>
                </div>
                <p>
                  <strong>We do not sell, rent, trade, or monetize student data</strong> to third-party marketing companies, advertisers, or lead generators.
                </p>
                <p className="text-xs text-slate-500">
                  Your academic records and personal details exist strictly to power your test preparation journey on Aptivo.
                </p>
              </section>

              {/* Section 5 */}
              <section id="security-encryption" className="scroll-mt-28 space-y-4">
                <div className="flex items-center gap-3 pb-2 border-b border-slate-100">
                  <div className="w-8 h-8 rounded-xl bg-teal-50 border border-teal-200 text-teal-800 flex items-center justify-center text-xs font-black shrink-0">
                    5
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                    Security & Data Encryption
                  </h2>
                </div>
                <p>
                  All traffic across Aptivo is encrypted in transit using <strong>256-bit SSL/TLS encryption</strong>. Databases are protected behind multi-tier firewalls in SOC 2 Type II compliant cloud facilities.
                </p>
                <div className="p-5 bg-emerald-50/70 rounded-2xl border border-emerald-200 flex items-start gap-3">
                  <Key className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
                  <p className="text-xs text-emerald-900 font-semibold leading-relaxed">
                    Always use a strong password and remember to log out when accessing your account from shared coaching center computer labs.
                  </p>
                </div>
              </section>

              {/* Section 6 */}
              <section id="cookies-sessions" className="scroll-mt-28 space-y-4">
                <div className="flex items-center gap-3 pb-2 border-b border-slate-100">
                  <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 flex items-center justify-center text-xs font-black shrink-0">
                    6
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                    Cookies & Telemetry
                  </h2>
                </div>
                <p>
                  We utilize essential session cookies to keep you signed in, remember your university test preferences, and ensure active mock exam timers persist across page refreshes. You can manage cookie permissions in your browser preferences.
                </p>
              </section>

              {/* Section 7 */}
              <section id="rights-contact" className="scroll-mt-28 space-y-4">
                <div className="flex items-center gap-3 pb-2 border-b border-slate-100">
                  <div className="w-8 h-8 rounded-xl bg-teal-50 border border-teal-200 text-teal-800 flex items-center justify-center text-xs font-black shrink-0">
                    7
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                    Your Rights & Support Desk
                  </h2>
                </div>
                <p>
                  You have the right to request an export of your diagnostic data or the permanent deletion of your account. Contact our privacy officer:
                </p>
                <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200/80 text-xs text-slate-700 space-y-1.5">
                  <p className="font-black text-slate-900">Aptivo Privacy & Support Desk</p>
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
                  <span>Your Privacy Matters</span>
                </h3>
                <p className="text-teal-800 text-xs leading-relaxed font-medium">
                  By using Aptivo, you agree to the transparent collection and processing of your academic information as detailed in this policy.
                </p>
              </div>

            </div>

          </div>

        </div>
      </main>

    </div>
  );
}
