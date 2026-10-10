import React from 'react';
import Link from 'next/link';
import {
  BarChart3,
  Target as TargetIcon,
  BookOpen,
  Star,
  ArrowRight,
  TrendingUp,
  Users,
  Award,
  GraduationCap,
  Zap,
  FileText,
  Flame,
  CheckCircle2,
  Sparkles,
  Bot,
  ShieldCheck,
  Clock
} from 'lucide-react';

import connectToDatabase from '@/lib/mongodb/connection';
import { User, University, Subject, Feedback, FAQ } from '@/lib/mongodb/models';

import Navbar from '@/components/landing/Navbar';
import FloatingIcons from '@/components/landing/FloatingIcons';
import ProductExplorer from '@/components/landing/ProductExplorer';
import CostCalculator from '@/components/landing/CostCalculator';
import CatalogCarousel from '@/components/landing/CatalogCarousel';
import DemoQuiz from '@/components/landing/DemoQuiz';
import FaqAccordion from '@/components/landing/FaqAccordion';
import Footer from '@/components/layout/Footer';
import AvatarImage from '@/components/shared/AvatarImage';
import MarkdownRenderer from '@/components/shared/MarkdownRenderer';

export const dynamic = 'force-dynamic';

export default async function LandingPage() {
  await connectToDatabase();

  const [universities, subjects, studentCount, feedbacks, faqs] = await Promise.all([
    University.find({ show_on_landing: { $ne: false } }).sort({ name: 1 }).lean(),
    Subject.find({ is_active: true }).limit(6).lean(),
    User.countDocuments({ role: 'student' }),
    Feedback.find({ is_published: true }).sort({ created_at: -1 }).limit(10).lean(),
    FAQ.find({ is_published: true }).sort({ order: 1, created_at: 1 }).lean(),
  ]);

  const userIds = [...new Set((feedbacks || []).map((f: any) => f.user_id).filter(Boolean))];
  const mongoIds = userIds.filter(id => /^[0-9a-fA-F]{24}$/.test(id));

  const users = userIds.length > 0
    ? await User.find({
      $or: [
        { id: { $in: userIds } },
        { _id: { $in: mongoIds } }
      ]
    }).select('id full_name avatar_url role').lean()
    : [];

  const userMap: Record<string, any> = {};
  (users as any[]).forEach((u: any) => {
    if (u.id) userMap[u.id] = u;
    userMap[u._id.toString()] = u;
  });

  const enrichedFeedbacks = (feedbacks || []).map((f: any) => ({
    ...f,
    users: userMap[f.user_id] || null,
  }));

  const studentFaces = [
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80'
  ];

  const realStudents = await User.find({ role: 'student' })
    .select('full_name avatar_url')
    .sort({ created_at: -1 })
    .limit(4)
    .lean();

  const rawCount = studentCount || 0;
  // Round off to next multiple of 50 (e.g., 2023 -> 2050, 2051 -> 2100)
  const roundedCount = rawCount > 0 ? Math.ceil(rawCount / 50) * 50 : 2500;

  const studentMetrics = {
    count: roundedCount,
    avatars: Array.from({ length: 4 }).map((_, i) => {
      const realAvatar = realStudents[i]?.avatar_url;
      return {
        url: realAvatar && realAvatar.trim() !== '' ? realAvatar : studentFaces[i % studentFaces.length],
        fallback: studentFaces[i % studentFaces.length],
        name: realStudents[i]?.full_name || 'Student'
      };
    }),
    averageRating: 4.9,
  };

  return (
    <div className="min-h-screen bg-white font-sans text-slate-900 overflow-x-hidden selection:bg-teal-100 selection:text-teal-900">
      <Navbar />

      {/* ── 1. Hero Section ── */}
      <section className="relative pt-28 pb-20 lg:pt-36 lg:pb-28 overflow-hidden bg-gradient-to-b from-slate-50/80 via-white to-white">
        {/* Ambient background glows */}
        <div className="hero-bg" aria-hidden="true" />
        <div className="absolute top-12 right-1/4 w-[500px] h-[500px] bg-teal-100/50 rounded-full blur-3xl pointer-events-none -z-10 animate-pulse" />
        <div className="absolute bottom-10 left-10 w-96 h-96 bg-emerald-100/40 rounded-full blur-3xl pointer-events-none -z-10" />

        <FloatingIcons />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            
            {/* Left Column: Hero Value Proposition */}
            <div className="lg:col-span-7 space-y-7 text-left">
              
              {/* Top Eyebrow Tag */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-teal-50 border border-teal-200/80 text-teal-800 text-[11px] font-black uppercase tracking-widest shadow-xs">
                <Zap className="w-3.5 h-3.5 text-teal-600 fill-teal-600" />
                <span>Built by toppers for next ones</span>
              </div>

              {/* Main Headline */}
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 leading-[1.16] tracking-tight">
                Crack NUST, FAST & MDCAT with{' '}
                <span className="relative inline-block text-teal-600">
                  smart precision
                  <svg className="absolute -bottom-1 left-0 w-full" height="6" viewBox="0 0 200 6" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
                    <path d="M0 5 Q50 1 100 4 Q150 7 200 3" stroke="#0d9488" strokeWidth="2.5" strokeLinecap="round" fill="none" />
                  </svg>
                </span>.
              </h1>

              {/* Subheading */}
              <p className="text-base sm:text-lg text-slate-600 leading-relaxed font-medium max-w-xl">
                <strong>20,000+ real past MCQs</strong>, full-length mock tests, and step-by-step explanations for every question.
              </p>

              {/* CTA Action Cluster */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 pt-2">
                <Link
                  href="/register"
                  className="group inline-flex items-center justify-center gap-2.5 px-8 py-4 bg-teal-600 text-white font-black rounded-2xl hover:bg-teal-700 transition-all shadow-xl shadow-teal-600/25 active:scale-[0.98] text-base cursor-pointer"
                >
                  <span>Start Free Practice Now</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1.5 transition-transform" />
                </Link>
                <Link
                  href="#demo"
                  className="inline-flex items-center justify-center gap-2 px-7 py-4 border-2 border-slate-200 text-slate-700 font-bold rounded-2xl hover:border-teal-300 hover:bg-teal-50/50 hover:text-teal-800 transition-all text-base cursor-pointer"
                >
                  <span>Try 4-Question Demo Arena</span>
                </Link>
              </div>

              {/* Clean Metric Stats Row */}
              <div className="flex flex-wrap items-center gap-6 sm:gap-8 pt-4 border-t border-slate-100">
                <div>
                  <p className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                    {studentMetrics.count.toLocaleString()}+
                  </p>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">students</p>
                </div>
                <div className="h-8 w-px bg-slate-200" />
                <div>
                  <p className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                    20,000+
                  </p>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">practice MCQs</p>
                </div>
                <div className="h-8 w-px bg-slate-200" />
                <div>
                  <p className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                    100% Free
                  </p>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">to start</p>
                </div>
              </div>

            </div>

            {/* Right Column: Live Interactive Product Hero Card */}
            <div className="lg:col-span-5 relative hidden lg:block">
              {/* Outer Glow frame */}
              <div className="relative z-10 bg-white/95 backdrop-blur-xl border border-slate-200/90 rounded-3xl p-6 shadow-2xl shadow-slate-300/60 space-y-4">
                
                {/* Header of Mockup Card */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-400" />
                    <div className="w-3 h-3 rounded-full bg-amber-400" />
                    <div className="w-3 h-3 rounded-full bg-emerald-400" />
                    <span className="text-[11px] font-black text-slate-500 ml-2 font-mono uppercase">Aptivo Practice Session</span>
                  </div>
                  <span className="inline-flex items-center gap-1 text-[11px] font-black text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                    <Flame className="w-3.5 h-3.5 fill-emerald-600 text-emerald-600" /> 7-Day Streak
                  </span>
                </div>

                {/* Live Question Card Mockup */}
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-500">
                    <span>Physics: Simple Harmonic Motion</span>
                    <span className="text-teal-700 font-black">NET / ECAT Past Paper</span>
                  </div>
                  <p className="text-xs font-black text-slate-800 leading-relaxed">
                    What is the time period of a simple pendulum in an elevator accelerating upward with <span className="font-mono text-teal-700">a</span>?
                  </p>
                  
                  {/* Option preview with LaTeX */}
                  <div className="space-y-1.5 text-xs">
                    <div className="bg-white p-2.5 rounded-xl border border-slate-200 text-slate-600 flex items-center justify-between">
                      <MarkdownRenderer content="(A) $T = 2\pi\sqrt{L/g}$" />
                    </div>
                    <div className="bg-emerald-50 border-2 border-emerald-500 p-2.5 rounded-xl text-emerald-950 font-bold flex items-center justify-between shadow-xs">
                      <MarkdownRenderer content="(B) $T = 2\pi\sqrt{L/(g+a)}$" />
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    </div>
                  </div>
                </div>

                {/* Floating Metric Badges */}
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div className="bg-teal-50 border border-teal-200 rounded-2xl p-3.5">
                    <div className="flex items-center gap-2 mb-1">
                      <TrendingUp className="w-4 h-4 text-teal-600" />
                      <span className="text-[10px] font-black uppercase text-teal-800">Placement Rate</span>
                    </div>
                    <p className="text-2xl font-black text-slate-900">98.2%</p>
                    <p className="text-[10px] text-teal-700 font-bold mt-0.5">Top-choice admission</p>
                  </div>

                  <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3.5">
                    <div className="flex items-center gap-2 mb-1">
                      <BookOpen className="w-4 h-4 text-emerald-600" />
                      <span className="text-[10px] font-black uppercase text-emerald-800">Question Bank</span>
                    </div>
                    <p className="text-2xl font-black text-slate-900">20,000+</p>
                    <p className="text-[10px] text-emerald-700 font-bold mt-0.5">Curated Past MCQs</p>
                  </div>
                </div>

              </div>

              {/* Decorative floating blur bulbs */}
              <div className="absolute -top-6 -right-6 w-36 h-36 bg-teal-200/50 rounded-full blur-2xl -z-10" />
              <div className="absolute -bottom-6 -left-6 w-36 h-36 bg-emerald-200/50 rounded-full blur-2xl -z-10" />
            </div>

          </div>
        </div>
      </section>

      {/* ── 2. University & Exam Marquee Ticker ── */}
      {universities.length > 0 && (
        <section className="py-10 bg-slate-50/90 border-y border-slate-200/80">
          <div className="max-w-7xl mx-auto px-4 mb-6 text-center">
            <p className="text-[11px] font-black text-slate-500 uppercase tracking-[0.25em]">
              Curated for Pakistan's most competitive university entry tests
            </p>
          </div>
          <div className="relative flex overflow-hidden">
            <div className="absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-slate-50 to-transparent z-10 pointer-events-none" />
            <div className="absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-slate-50 to-transparent z-10 pointer-events-none" />
            <div className="flex gap-4 items-center whitespace-nowrap animate-marquee w-max">
              {[...universities, ...universities].map((uni: any, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3.5 px-6 py-3.5 bg-white border border-slate-200/80 rounded-2xl min-w-max shrink-0 shadow-xs hover:border-teal-300 hover:shadow-md transition-all"
                >
                  <div className="w-9 h-9 shrink-0 flex items-center justify-center">
                    {uni.logo_url ? (
                      <img src={uni.logo_url} alt={uni.name} className="max-h-full max-w-full object-contain" />
                    ) : (
                      <div className="w-9 h-9 bg-teal-100 rounded-xl flex items-center justify-center text-teal-700 text-sm font-black">
                        {uni.name?.charAt(0)}
                      </div>
                    )}
                  </div>
                  <span className="text-xs sm:text-sm font-black text-slate-800 tracking-tight pr-1">
                    {uni.name}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── 3. Interactive Product OS Explorer ── */}
      <ProductExplorer />

      {/* ── 4. Interactive Academy Savings & Commute Calculator ── */}
      <CostCalculator />

      {/* ── 5. Renewed Course Catalog Carousel ── */}
      <CatalogCarousel subjects={JSON.parse(JSON.stringify(subjects))} />

      {/* ── 6. Interactive Demo Arena (KaTeX Powered) ── */}
      <DemoQuiz />

      {/* ── 7. Verified Student Testimonials & Success Stories ── */}
      {enrichedFeedbacks.length > 0 && (
        <section id="testimonials" className="py-24 bg-white scroll-mt-24 border-t border-slate-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-8 mb-14">
              <div className="space-y-3">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-50 border border-teal-200 text-teal-800 text-[10px] font-black uppercase tracking-widest">
                  <Award className="w-3 h-3 text-teal-600" /> Proven Results
                </div>
                <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 tracking-tight">
                  From preparation to <span className="text-teal-600">merit lists</span>.
                </h2>
                <p className="text-slate-600 text-base max-w-xl">
                  Hear directly from students who secured top ranks in NUST, FAST, GIKI, and MDCAT using Aptivo.
                </p>
              </div>

              <div className="bg-teal-600 rounded-3xl p-6 shadow-xl shadow-teal-600/20 text-white min-w-[240px]">
                <p className="text-4xl font-black">98.2%</p>
                <p className="text-teal-200 text-xs font-bold uppercase tracking-wider mt-0.5">Top-Choice Admission</p>
                <div className="flex gap-1 mt-3">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-white text-white" />
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {enrichedFeedbacks.map((f: any, i) => (
                <div
                  key={i}
                  className="bg-slate-50 border border-slate-200/80 rounded-3xl p-6 sm:p-7 hover:bg-white hover:border-teal-200 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex gap-1 mb-4">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          className={`w-4 h-4 ${s <= f.rating ? 'text-amber-400 fill-amber-400' : 'text-slate-200'}`}
                        />
                      ))}
                    </div>
                    <p className="text-slate-700 leading-relaxed text-sm italic mb-6">
                      "{f.feedback_text}"
                    </p>
                  </div>

                  <div className="flex items-center gap-3 pt-4 border-t border-slate-200/70">
                    <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-200 shrink-0 border border-slate-300">
                      <AvatarImage
                        src={f.users?.avatar_url || ''}
                        fallbackSrc={`https://ui-avatars.com/api/?name=${encodeURIComponent(f.users?.full_name || 'A')}&background=0d9488&color=fff`}
                        alt={f.users?.full_name || 'Student'}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div>
                      <p className="font-black text-slate-900 text-sm">{f.users?.full_name || 'Verified Student'}</p>
                      <p className="text-teal-600 text-[10px] font-black uppercase tracking-widest">
                        {f.users?.role === 'student' ? 'Admitted Student' : f.users?.role || 'Student'}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── 8. Institution & Academy Partnership ── */}
      <section className="py-20 md:py-28 bg-gradient-to-br from-[#042f2e] via-[#083b38] to-[#042f2e] text-white relative overflow-hidden border-y border-teal-900/50">
        {/* Ambient emerald radial light */}
        <div className="absolute right-0 top-0 w-[500px] h-[500px] bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute left-0 bottom-0 w-96 h-96 bg-teal-500/15 rounded-full blur-3xl pointer-events-none" />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 grid lg:grid-cols-12 gap-12 items-center">
          
          {/* Left Column: Copy & Actions */}
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-teal-900/80 border border-teal-600/50 text-teal-300 text-[11px] font-black uppercase tracking-widest shadow-inner">
              <GraduationCap className="w-3.5 h-3.5 text-emerald-400" />
              <span>Become a Partner • For Colleges, Academies & Schools</span>
            </div>

            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight leading-tight">
              Upgrade your entire institute with a <span className="text-emerald-400">custom digital test portal</span>.
            </h2>

            <p className="text-teal-100/90 text-base sm:text-lg leading-relaxed max-w-xl font-medium">
              Give your teachers the power to assign topic-wise homework, schedule customized mock exams, and monitor student batch accuracy with real-time analytics.
            </p>

            <div className="flex flex-wrap gap-4 pt-3">
              <Link
                href="/for-institutions"
                className="inline-flex items-center gap-2 px-7 py-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-2xl transition-all text-sm shadow-xl shadow-emerald-500/25 cursor-pointer"
              >
                <span>Explore Institution Plans</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <a
                href="https://wa.me/923713215643?text=I%20want%20to%20discuss%20an%20Aptivo%20institution%20plan"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-7 py-4 border border-teal-400/40 text-white font-bold rounded-2xl hover:bg-teal-800/40 transition-colors text-sm cursor-pointer backdrop-blur-sm"
              >
                <span>WhatsApp Institutional Team</span>
              </a>
            </div>
          </div>

          {/* Right Column: 4 Value Pillars */}
          <div className="lg:col-span-5 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {[
              {
                title: 'Custom Portal Identity',
                desc: 'White-labeled experience for your academy brand'
              },
              {
                title: 'Roster & Access Control',
                desc: 'Automated student account provisioning & grouping'
              },
              {
                title: 'Topic Assignment Studio',
                desc: 'Assign homework by specific subtopics in 1-click'
              },
              {
                title: 'Batch Analytics Heatmap',
                desc: 'Real-time pass probability & cohort performance charts'
              }
            ].map((feature, idx) => (
              <div
                key={idx}
                className="border border-teal-700/40 bg-teal-950/60 rounded-2xl p-5 backdrop-blur-md space-y-2 hover:border-emerald-500/50 transition-colors"
              >
                <div className="w-2 h-2 rounded-full bg-emerald-400 mb-1" />
                <p className="text-white font-black text-sm">{feature.title}</p>
                <p className="text-teal-200/80 text-xs leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* ── 9. FAQ Accordion ── */}
      <FaqAccordion faqs={JSON.parse(JSON.stringify(faqs))} />

      {/* ── 10. High-Converting Bottom CTA ── */}
      <section className="py-20 md:py-28 bg-teal-600 relative overflow-hidden text-center text-white">
        <div className="absolute top-0 right-0 w-96 h-96 bg-teal-500/50 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-emerald-500/40 rounded-full blur-3xl pointer-events-none" />
        
        <div className="max-w-4xl mx-auto px-4 relative z-10 space-y-7">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/20 text-white text-[11px] font-black uppercase tracking-widest backdrop-blur-md">
            <Zap className="w-3.5 h-3.5" /> Start Your Prep Today
          </div>
          <h2 className="text-4xl sm:text-5xl md:text-6xl font-black text-white leading-tight tracking-tight">
            Ready to secure your dream <br className="hidden sm:inline" />university admission?
          </h2>
          <p className="text-teal-100 text-base md:text-lg max-w-xl mx-auto font-medium">
            Join thousands of successful students who chose smart, personalized test prep over stressful academy commutes.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-2">
            <Link
              href="/register"
              className="group inline-flex items-center justify-center gap-2.5 px-10 py-5 bg-white text-teal-800 font-black rounded-2xl hover:bg-teal-50 transition-all shadow-2xl text-base cursor-pointer"
            >
              <span>Create Free Account</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1.5 transition-transform" />
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center justify-center px-10 py-5 border-2 border-white/40 text-white font-bold rounded-2xl hover:bg-white/10 transition-all text-base cursor-pointer"
            >
              <span>Sign In to Existing Account</span>
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
