'use client';

import Link from 'next/link';
import {
  ArrowRight,
  BarChart3,
  Check,
  MessageCircle,
  ShieldCheck,
  Users,
  WandSparkles,
  Target,
  TrendingUp,
  GraduationCap,
  Building2,
  Zap,
  BookOpen,
  ClipboardList,
  LineChart,
  ArrowUpRight
} from 'lucide-react';
import Navbar from '@/components/landing/Navbar';
import Footer from '@/components/layout/Footer';
import { motion } from 'framer-motion';

const features = [
  {
    icon: Users,
    title: 'Manage Your Learners',
    text: 'Create student access, organize cohorts, and keep your institution directory current — all from one clean dashboard.',
    badge: 'Roster Control'
  },
  {
    icon: WandSparkles,
    title: 'Assign Focused Practice',
    text: 'Send topic-level tasks and full-length mock tests that align with how your faculty teaches and the real entrance test patterns.',
    badge: 'Task Studio'
  },
  {
    icon: BarChart3,
    title: 'Real-Time Cohort Analytics',
    text: 'Track per-student completion rates, subject accuracy, and weak chapters on a live heatmap — no spreadsheets needed.',
    badge: 'Batch Heatmap'
  },
  {
    icon: ShieldCheck,
    title: 'Full Institution Control',
    text: 'Institution-level access settings, white-labeled experience, and a read-only curriculum viewer keep ownership clear and secure.',
    badge: 'Access Control'
  },
];

const partnershipTiers = [
  {
    title: 'Partner Access',
    desc: 'Give your students Aptivo access under an institution workspace. Manage groups, assign tasks, and monitor progress.'
  },
  {
    title: 'Custom Portal Identity',
    desc: 'Shape the portal around your academy name, branding, and specific curriculum workflow for a seamless experience.'
  },
  {
    title: 'Integrated Setup',
    desc: 'Connect Aptivo to the systems your team already uses. Flexible onboarding with hands-on setup support.'
  }
];

const stats = [
  { label: 'Active Students', value: '842', color: 'text-teal-700', bg: 'bg-teal-50' },
  { label: 'Task Completion', value: '76%', color: 'text-slate-900', bg: 'bg-slate-50' },
  { label: 'Avg. Mock Score', value: '83%', color: 'text-emerald-700', bg: 'bg-emerald-50' },
  { label: 'Cohort Accuracy', value: '+18%', color: 'text-teal-700', bg: 'bg-teal-50' }
];

export default function ForInstitutionsPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-teal-100 selection:text-teal-900">
      <Navbar />

      <main className="pt-20">

        {/* ── 1. Hero Section ── Teal 600 brand color ── */}
        <section className="bg-teal-600 py-24 lg:py-32 relative overflow-hidden">
          <div className="absolute right-0 top-0 w-[500px] h-[500px] bg-teal-400/30 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-emerald-400/20 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid lg:grid-cols-12 gap-14 items-center">
            
            {/* Left: Copy */}
            <div className="lg:col-span-7 space-y-7">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-teal-500/50 border border-teal-300/50 text-teal-50 text-[11px] font-black uppercase tracking-widest">
                <Building2 className="w-3.5 h-3.5 text-emerald-300" />
                <span>Become a Partner • Aptivo for Institutions</span>
              </div>

              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-[1.16]">
                Your students. Your identity.<br />
                A <span className="text-emerald-300">smarter preparation</span> system.
              </h1>

              <p className="text-teal-50/90 text-base sm:text-lg leading-relaxed max-w-xl font-medium">
                Give your college, academy, or school a tailored Aptivo workspace for 20,000+ past-paper MCQ practice, timed mock exams, and real-time batch analytics — all under your brand.
              </p>

              {/* Value points */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                {[
                  'White-labeled portal for your academy',
                  'Assign topic-level homework in 1 click',
                  'Live batch accuracy & performance heatmap',
                  'Custom mock exam scheduling & blueprints'
                ].map((point) => (
                  <div key={point} className="flex items-start gap-2.5">
                    <div className="w-5 h-5 rounded-full bg-emerald-400/20 border border-emerald-300/40 flex items-center justify-center shrink-0 mt-0.5">
                      <Check className="w-3 h-3 text-emerald-300" />
                    </div>
                    <span className="text-teal-50/90 text-sm font-medium">{point}</span>
                  </div>
                ))}
              </div>

              {/* CTA Buttons */}
              <div className="flex flex-wrap gap-4 pt-2">
                <a
                  href="https://wa.me/923713215643?text=I%20want%20an%20Aptivo%20institution%20demo"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-white text-teal-700 font-black px-7 py-4 rounded-2xl hover:bg-teal-50 transition-all shadow-xl shadow-teal-900/20 active:scale-95 cursor-pointer"
                >
                  <MessageCircle className="w-5 h-5" />
                  <span>WhatsApp Our Team</span>
                </a>
                <Link
                  href="/contact"
                  className="inline-flex items-center gap-2 border border-white/40 text-white font-bold px-7 py-4 rounded-2xl hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <span>Request a Plan</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>

            {/* Right: Live Institution Dashboard Mockup */}
            <div className="lg:col-span-5 hidden lg:block">
              <div className="bg-white rounded-3xl p-5 shadow-2xl shadow-[#042f2e]/60 border border-teal-900/30">
                
                {/* Mock Header */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Institution Dashboard</p>
                    <p className="text-slate-900 font-black mt-0.5 text-sm">Your academy overview</p>
                  </div>
                  <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center border border-teal-200">
                    <Target className="w-4 h-4" />
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  {stats.map((stat) => (
                    <div key={stat.label} className={`${stat.bg} rounded-2xl p-4`}>
                      <p className={`${stat.color} text-2xl font-black`}>{stat.value}</p>
                      <p className="text-slate-500 text-xs mt-1 font-medium">{stat.label}</p>
                    </div>
                  ))}
                </div>

                {/* Mini Bar Chart */}
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <div className="flex justify-between items-center mb-3">
                    <p className="text-slate-800 text-xs font-black">Cohort Performance Trend</p>
                    <TrendingUp className="w-4 h-4 text-teal-600" />
                  </div>
                  <div className="flex items-end gap-2 h-16">
                    {[38, 52, 47, 64, 58, 78, 90].map((height, index) => (
                      <div
                        key={index}
                        className="flex-1 rounded-t-md bg-teal-500 transition-all"
                        style={{ height: `${height}%`, opacity: 0.35 + index * 0.1 }}
                      />
                    ))}
                  </div>
                  <p className="text-[10px] font-bold text-slate-400 mt-2 text-right">Last 7 weeks</p>
                </div>

              </div>
            </div>

          </div>
        </section>

        {/* ── 2. Feature Pillars ── Pure White ── */}
        <section className="py-20 md:py-28 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl mb-14">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-50 border border-teal-200 text-teal-800 text-[10px] font-black uppercase tracking-widest mb-4">
                <Zap className="w-3 h-3 text-teal-600 fill-teal-600" />
                Built around your workflow
              </div>
              <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900 leading-tight">
                A platform your academic team can actually run.
              </h2>
              <p className="text-slate-600 text-base mt-4 leading-relaxed">
                Built for department heads, subject teachers, and center coordinators — not just IT admins.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
              {features.map(({ icon: Icon, title, text, badge }) => (
                <div
                  key={title}
                  className="bg-white border border-slate-200 rounded-2xl p-6 hover:border-teal-300 hover:shadow-lg hover:-translate-y-1 transition-all group"
                >
                  <div className="flex items-center justify-between mb-5">
                    <div className="w-11 h-11 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center border border-teal-200/70 group-hover:bg-teal-600 group-hover:text-white transition-all">
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-[9px] font-black uppercase tracking-wider text-teal-800 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded">
                      {badge}
                    </span>
                  </div>
                  <h3 className="font-black text-slate-900 text-base mb-2">{title}</h3>
                  <p className="text-slate-500 text-sm leading-relaxed">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── 3. How It Works (Process Steps) ── Slate 50 ── */}
        <section className="py-20 md:py-28 bg-slate-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-14">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-50 border border-teal-200 text-teal-800 text-[10px] font-black uppercase tracking-widest mb-4">
                <ClipboardList className="w-3 h-3 text-teal-600" />
                Simple onboarding
              </div>
              <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900">
                Up and running in 3 steps.
              </h2>
              <p className="text-slate-600 text-base mt-4">
                No technical setup required. We handle the configuration — you focus on teaching.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6 relative">
              {/* Connector line */}
              <div className="hidden md:block absolute top-10 left-[calc(16.67%+1rem)] right-[calc(16.67%+1rem)] h-0.5 bg-gradient-to-r from-teal-200 via-teal-400 to-teal-200" />

              {[
                { step: 'Step 01', icon: Building2, title: 'Register your institution', desc: 'Fill a short onboarding form or WhatsApp our team. We set up your dedicated workspace within 24 hours.' },
                { step: 'Step 02', icon: Users, title: 'Add your students', desc: 'Bulk-import your student roster via CSV or share an invitation link. Organize into batches or branches.' },
                { step: 'Step 03', icon: LineChart, title: 'Assign, test & track', desc: 'Start assigning topic homework, schedule timed mock exams, and watch your batch heatmap update live.' }
              ].map(({ step, icon: Icon, title, desc }) => (
                <div key={step} className="relative bg-white rounded-2xl p-7 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between gap-3 mb-5">
                    <div className="w-12 h-12 rounded-2xl bg-teal-600 text-white flex items-center justify-center shadow-md shadow-teal-600/20">
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-black uppercase tracking-widest text-teal-800 bg-teal-50 border border-teal-200/80 px-3 py-1 rounded-full">{step}</span>
                  </div>
                  <h3 className="font-black text-slate-900 text-base mb-2">{title}</h3>
                  <p className="text-slate-500 text-sm leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── 4. Partnership Tiers ── Teal 50 ── */}
        <section className="py-20 md:py-28 bg-teal-50/50 border-y border-teal-100">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-50 border border-teal-200 text-teal-800 text-[10px] font-black uppercase tracking-widest mb-4">
              <BookOpen className="w-3 h-3 text-teal-600" />
              Flexible partnership
            </div>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900 mt-2 mb-12">
              Start with the setup your institution needs.
            </h2>

            <div className="grid md:grid-cols-3 gap-5 text-left">
              {partnershipTiers.map(({ title, desc }) => (
                <div
                  key={title}
                  className="bg-white border border-teal-200/70 rounded-2xl p-7 hover:border-teal-400 hover:shadow-lg hover:-translate-y-1 transition-all"
                >
                  <div className="w-2 h-2 rounded-full bg-emerald-500 mb-5" />
                  <h3 className="font-black text-slate-900 text-base mb-2">{title}</h3>
                  <p className="text-slate-500 text-sm leading-relaxed mb-5">{desc}</p>
                  <div className="flex items-center gap-2 text-teal-700 text-xs font-black uppercase tracking-wider">
                    <Check className="w-4 h-4 text-teal-600" />
                    <span>Discuss your setup</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap justify-center gap-4 mt-12">
              <a
                href="https://wa.me/923713215643?text=Hello%20Aptivo%2C%20I%20want%20to%20customize%20an%20institution%20plan"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-[#042f2e] hover:bg-teal-900 text-white font-black px-7 py-4 rounded-2xl transition-all shadow-lg shadow-[#042f2e]/20 active:scale-95 cursor-pointer"
              >
                <MessageCircle className="w-5 h-5" />
                <span>Chat with Aptivo</span>
                <ArrowUpRight className="w-4 h-4 text-emerald-400" />
              </a>
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 border-2 border-slate-200 text-slate-700 font-bold px-7 py-4 rounded-2xl hover:border-teal-300 hover:bg-teal-50 transition-all cursor-pointer"
              >
                <span>Submit an Inquiry</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </section>

      </main>

      <Footer />
    </div>
  );
}