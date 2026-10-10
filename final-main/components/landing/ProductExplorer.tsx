'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Target as TargetIcon,
  FileText,
  Trophy,
  BarChart3,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  Flame,
  Zap,
  HelpCircle,
  Clock,
  ShieldCheck,
  BrainCircuit,
  TrendingUp,
  Award,
  GraduationCap,
  Layers
} from 'lucide-react';
import Link from 'next/link';
import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from 'recharts';
import MarkdownRenderer from '@/components/shared/MarkdownRenderer';

const TABS = [
  {
    id: 'practice',
    label: 'Adaptive Practice',
    shortLabel: 'Practice',
    icon: TargetIcon,
    tag: 'Topic by Topic',
    badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200'
  },
  {
    id: 'mocks',
    label: 'Past-Paper Mock Exams',
    shortLabel: 'Mock Exams',
    icon: FileText,
    tag: 'Exact Blueprints',
    badgeColor: 'bg-teal-50 text-teal-700 border-teal-200'
  },
  {
    id: 'league',
    label: 'Gamified Leagues',
    shortLabel: 'Leagues',
    icon: Trophy,
    tag: 'Weekly Podiums',
    badgeColor: 'bg-amber-50 text-amber-700 border-amber-200'
  },
  {
    id: 'analytics',
    label: 'Diagnostic Radar',
    shortLabel: 'Analytics',
    icon: BarChart3,
    tag: 'Skill Heatmap',
    badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200'
  }
];

const mockRadarData = [
  { subject: 'Physics', score: 88, fullMark: 100 },
  { subject: 'Math', score: 94, fullMark: 100 },
  { subject: 'Chemistry', score: 76, fullMark: 100 },
  { subject: 'English', score: 82, fullMark: 100 },
  { subject: 'IQ / Logic', score: 90, fullMark: 100 }
];

export default function ProductExplorer() {
  const [activeTab, setActiveTab] = useState('practice');
  const [selectedOption, setSelectedOption] = useState<number | null>(1); // default option B selected
  const [showExplanation, setShowExplanation] = useState(true);

  return (
    <section className="py-20 md:py-28 bg-gradient-to-b from-white via-slate-50/70 to-white relative overflow-hidden">
      {/* Background ambient accents */}
      <div className="absolute top-1/2 left-0 w-96 h-96 bg-teal-50 rounded-full blur-3xl -translate-y-1/2 -translate-x-1/2 pointer-events-none" />
      <div className="absolute top-1/3 right-0 w-96 h-96 bg-emerald-50 rounded-full blur-3xl translate-x-1/3 pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-12 md:mb-16 space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-teal-50 border border-teal-200/80 text-teal-800 text-[11px] font-black uppercase tracking-widest shadow-xs">
            <Sparkles className="w-3.5 h-3.5 text-teal-600 fill-teal-600" /> Interactive Platform OS
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 tracking-tight leading-tight">
            See how Aptivo transforms your <span className="text-teal-600">daily preparation</span>.
          </h2>
          <p className="text-slate-600 text-base md:text-lg font-medium leading-relaxed">
            Click across the core pillars below to experience the real student portal interface.
          </p>
        </div>

        {/* Tab Navigation Pill Bar */}
        <div className="flex items-center justify-start md:justify-center gap-2 md:gap-3 overflow-x-auto pb-4 mb-8 no-scrollbar">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  inline-flex items-center gap-2.5 px-5 py-3 rounded-2xl text-xs md:text-sm font-black transition-all shrink-0 cursor-pointer border
                  ${
                    isActive
                      ? 'bg-teal-600 text-white border-teal-600 shadow-lg shadow-teal-600/20 scale-[1.02]'
                      : 'bg-white text-slate-700 border-slate-200/80 hover:bg-slate-50 hover:border-slate-300'
                  }
                `}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-teal-600'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Content Canvas */}
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xl shadow-slate-200/60 p-5 md:p-8 lg:p-10 transition-all">
          <AnimatePresence mode="wait">
            {/* TAB 1: AI Practice Engine */}
            {activeTab === 'practice' && (
              <motion.div
                key="practice"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.25 }}
                className="grid lg:grid-cols-12 gap-8 items-center"
              >
                {/* Left: Feature description */}
                <div className="lg:col-span-5 space-y-6">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] font-black uppercase tracking-wider">
                    <Zap className="w-3 h-3 text-emerald-600 fill-current" /> Topic-Level Practice
                  </div>
                  <h3 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight leading-snug">
                    Real exam pressure with instant LaTeX step-by-step clarity.
                  </h3>
                  <p className="text-slate-600 text-sm md:text-base leading-relaxed">
                    Solve real entrance test problems with rendered mathematical equations, live timing analysis, and deep conceptual explanations the moment you answer.
                  </p>

                  <div className="space-y-3 pt-2">
                    {[
                      { title: 'Subtopic Precision', desc: 'Focus strictly on specific topics like Simple Harmonic Motion or Integration.' },
                      { title: 'Instant Mathematical Solutions', desc: 'Step-by-step LaTeX formula derivations with KaTeX.' },
                      { title: 'Real-Time Streak Multiplier', desc: 'Earn +20 XP on consecutive correct answers.' }
                    ].map((item, i) => (
                      <div key={i} className="flex items-start gap-3">
                        <div className="w-5 h-5 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 shrink-0 mt-0.5 font-black text-[10px]">
                          ✓
                        </div>
                        <div>
                          <p className="text-xs font-black text-slate-900">{item.title}</p>
                          <p className="text-xs text-slate-500">{item.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="pt-2">
                    <Link
                      href="/register"
                      className="inline-flex items-center gap-2 px-6 py-3 bg-teal-600 text-white font-black text-xs uppercase tracking-wider rounded-xl hover:bg-teal-700 transition-all shadow-md shadow-teal-600/20"
                    >
                      Try 100+ Free Practice MCQs <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>

                {/* Right: Live Interactive Practice Card Mockup */}
                <div className="lg:col-span-7 bg-slate-50 border border-slate-200 rounded-2xl p-5 md:p-6 shadow-inner space-y-4">
                  {/* Top Bar of Practice Card */}
                  <div className="flex items-center justify-between pb-3 border-b border-slate-200 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-slate-700">Physics: Oscillations</span>
                      <span className="px-2 py-0.5 rounded-md bg-teal-100 text-teal-800 font-bold text-[10px]">Q 4 of 20</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="flex items-center gap-1 font-mono font-bold text-slate-600 text-xs">
                        <Clock className="w-3.5 h-3.5 text-slate-400" /> 00:42
                      </span>
                      <span className="flex items-center gap-1 font-black text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md text-xs border border-amber-200">
                        <Flame className="w-3.5 h-3.5 fill-amber-500 text-amber-500" /> 4 Streak! (+20 XP)
                      </span>
                    </div>
                  </div>

                  {/* Question Stem with LaTeX */}
                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                    <p className="text-slate-800 text-sm md:text-base font-bold leading-relaxed">
                      A simple pendulum of length <span className="font-mono text-teal-700 font-black">L</span> has time period <span className="font-mono text-teal-700 font-black">T</span>. If it is placed inside an elevator accelerating upwards with acceleration <span className="font-mono text-teal-700 font-black">a</span>, what is its new time period?
                    </p>
                  </div>

                  {/* Options */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {[
                      { id: 0, label: 'A', text: 'T\' = 2\\pi \\sqrt{\\frac{L}{g}}' },
                      { id: 1, label: 'B', text: 'T\' = 2\\pi \\sqrt{\\frac{L}{g + a}}' },
                      { id: 2, label: 'C', text: 'T\' = 2\\pi \\sqrt{\\frac{L}{g - a}}' },
                      { id: 3, label: 'D', text: 'T\' = 2\\pi \\sqrt{\\frac{L}{a}}' }
                    ].map((opt) => {
                      const isCorrect = opt.id === 1;
                      const isChosen = selectedOption === opt.id;
                      return (
                        <button
                          key={opt.id}
                          onClick={() => setSelectedOption(opt.id)}
                          className={`
                            p-3 rounded-xl text-left transition-all border flex items-center justify-between cursor-pointer
                            ${
                              isChosen
                                ? isCorrect
                                  ? 'bg-emerald-50/90 border-emerald-400 text-emerald-950 shadow-sm'
                                  : 'bg-rose-50 border-rose-300 text-rose-950'
                                : 'bg-white border-slate-200 hover:border-teal-300 text-slate-700'
                            }
                          `}
                        >
                          <div className="flex items-center gap-2.5">
                            <span className={`w-6 h-6 rounded-lg text-xs font-black flex items-center justify-center shrink-0 ${isChosen && isCorrect ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-700'}`}>
                              {opt.label}
                            </span>
                            <div className="text-xs font-medium">
                              <MarkdownRenderer content={`$${opt.text}$`} />
                            </div>
                          </div>
                          {isChosen && isCorrect && (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 ml-1" />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Step-by-step Solution */}
                  {showExplanation && (
                    <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-xl p-3.5 space-y-1.5 text-xs text-emerald-950">
                      <div className="flex items-center justify-between font-black text-emerald-900">
                        <span className="flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Correct Answer: Option B
                        </span>
                        <span className="text-[10px] uppercase tracking-wider text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded">
                          Physics Derivation
                        </span>
                      </div>
                      <div className="text-slate-700 leading-relaxed pt-1">
                        <MarkdownRenderer content="When the elevator accelerates upwards with $a$, the effective acceleration due to gravity becomes $g_{\text{eff}} = g + a$. Hence: $$T' = 2\pi\sqrt{\frac{L}{g + a}}$$" />
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* TAB 2: Full Past-Paper Mock Exams */}
            {activeTab === 'mocks' && (
              <motion.div
                key="mocks"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.25 }}
                className="grid lg:grid-cols-12 gap-8 items-center"
              >
                <div className="lg:col-span-5 space-y-6">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-teal-50 border border-teal-200 text-teal-800 text-[10px] font-black uppercase tracking-wider">
                    <FileText className="w-3 h-3 text-teal-600" /> Full-Length Past Papers
                  </div>
                  <h3 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight leading-snug">
                    Timed mock tests matching exact university blueprints.
                  </h3>
                  <p className="text-slate-600 text-sm md:text-base leading-relaxed">
                    Practice under real test conditions with section timers, negative marking penalties, and university-specific mark weighting for NUST (NET), FAST, GIKI, and MDCAT.
                  </p>

                  <div className="space-y-3 pt-2">
                    {[
                      { title: 'Official Exam Patterns', desc: 'Exact question distributions (e.g. 80 Math, 60 Physics, 30 Chem, 20 English, 10 Intelligence).' },
                      { title: 'Negative Marking Simulator', desc: 'Calculates net merit scores with exact university deduction formulas.' },
                      { title: 'Detailed Solution Key', desc: 'Comprehensive post-exam review with time-per-question analysis.' }
                    ].map((item, i) => (
                      <div key={i} className="flex items-start gap-3">
                        <div className="w-5 h-5 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 shrink-0 mt-0.5 font-black text-[10px]">
                          ✓
                        </div>
                        <div>
                          <p className="text-xs font-black text-slate-900">{item.title}</p>
                          <p className="text-xs text-slate-500">{item.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="pt-2">
                    <Link
                      href="/register"
                      className="inline-flex items-center gap-2 px-6 py-3 bg-teal-600 text-white font-black text-xs uppercase tracking-wider rounded-xl hover:bg-teal-700 transition-all shadow-md shadow-teal-600/20"
                    >
                      Attempt Full Mock Test <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>

                {/* Right: Mock Exam Blueprint Card Mockup */}
                <div className="lg:col-span-7 bg-slate-50 border border-slate-200 rounded-2xl p-5 md:p-6 shadow-inner space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-200 text-xs">
                    <div className="flex items-center gap-2">
                      <GraduationCap className="w-4 h-4 text-teal-600" />
                      <span className="font-black text-slate-800">NUST NET (Engineering) Mock Test #1</span>
                    </div>
                    <span className="font-mono font-bold text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-md text-xs">
                      ⏱️ 02:44:15 Remaining
                    </span>
                  </div>

                  {/* Section Breakdown Pills */}
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 text-center text-xs">
                    {[
                      { name: 'Mathematics', count: '80 Qs', active: true },
                      { name: 'Physics', count: '60 Qs', active: false },
                      { name: 'Chemistry', count: '30 Qs', active: false },
                      { name: 'English', count: '20 Qs', active: false },
                      { name: 'Intelligence', count: '10 Qs', active: false }
                    ].map((sec, idx) => (
                      <div
                        key={idx}
                        className={`p-2 rounded-xl border ${
                          sec.active
                            ? 'bg-teal-600 text-white border-teal-600 font-black shadow-xs'
                            : 'bg-white border-slate-200 text-slate-700 font-bold'
                        }`}
                      >
                        <p className="text-[10px] truncate">{sec.name}</p>
                        <p className={`text-xs ${sec.active ? 'text-teal-100' : 'text-slate-400'}`}>{sec.count}</p>
                      </div>
                    ))}
                  </div>

                  {/* Question Palette preview */}
                  <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-600">
                      <span>Section: Mathematics (Calculus & Vectors)</span>
                      <span className="text-[11px] text-teal-700 font-mono">Total: 200 Marks</span>
                    </div>

                    <p className="text-xs font-bold text-slate-800">
                      If $f(x) = \sin(2x) \cos(2x)$, what is the derivative $f'(x)$?
                    </p>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-slate-50 p-2 rounded-lg border border-slate-200 text-slate-700 font-medium">
                        (A) $2\cos(4x)$
                      </div>
                      <div className="bg-slate-50 p-2 rounded-lg border border-slate-200 text-slate-700 font-medium">
                        (B) $4\sin(2x)$
                      </div>
                    </div>
                  </div>

                  {/* Negative marking & Progress stats */}
                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="bg-white p-2 rounded-xl border border-slate-200">
                      <p className="text-[10px] text-slate-400 font-bold uppercase">Answered</p>
                      <p className="font-black text-slate-900 text-sm">34 / 200</p>
                    </div>
                    <div className="bg-white p-2 rounded-xl border border-slate-200">
                      <p className="text-[10px] text-slate-400 font-bold uppercase">Marked for Review</p>
                      <p className="font-black text-amber-600 text-sm">6</p>
                    </div>
                    <div className="bg-emerald-50 border border-emerald-200 p-2 rounded-xl">
                      <p className="text-[10px] text-emerald-800 font-bold uppercase">Current Accuracy</p>
                      <p className="font-black text-emerald-950 text-sm">91.2%</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* TAB 3: Gamified Leagues */}
            {activeTab === 'league' && (
              <motion.div
                key="league"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.25 }}
                className="grid lg:grid-cols-12 gap-8 items-center"
              >
                <div className="lg:col-span-5 space-y-6">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-[10px] font-black uppercase tracking-wider">
                    <Trophy className="w-3 h-3 text-amber-600 fill-amber-600" /> Competitive Motivation
                  </div>
                  <h3 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight leading-snug">
                    Climb through 6 League Tiers from Bronze to Diamond.
                  </h3>
                  <p className="text-slate-600 text-sm md:text-base leading-relaxed">
                    Compete in weekly cohorts against peers preparing for the same universities. Finish in the top 10 each Sunday to earn promotion into higher divisions.
                  </p>

                  <div className="space-y-3 pt-2">
                    {[
                      { title: 'Weekly Reset Cycles', desc: 'Fresh competition every Monday keeps you consistently driven.' },
                      { title: 'Promotion & Relegation Zones', desc: 'Top 10 promote to Diamond; bottom 10 relegate to Silver.' },
                      { title: 'Target University Cohorts', desc: 'Compare your XP directly against candidates applying for NUST & FAST.' }
                    ].map((item, i) => (
                      <div key={i} className="flex items-start gap-3">
                        <div className="w-5 h-5 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 shrink-0 mt-0.5 font-black text-[10px]">
                          🏆
                        </div>
                        <div>
                          <p className="text-xs font-black text-slate-900">{item.title}</p>
                          <p className="text-xs text-slate-500">{item.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="pt-2">
                    <Link
                      href="/register"
                      className="inline-flex items-center gap-2 px-6 py-3 bg-amber-600 text-white font-black text-xs uppercase tracking-wider rounded-xl hover:bg-amber-700 transition-all shadow-md shadow-amber-600/20"
                    >
                      Join This Week's League <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>

                {/* Right: Podium Preview Mockup */}
                <div className="lg:col-span-7 bg-slate-50 border border-slate-200 rounded-2xl p-5 md:p-6 shadow-inner space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200 text-xs font-bold text-slate-700">
                    <span className="flex items-center gap-1.5 text-amber-700">
                      🏆 Gold League Division A
                    </span>
                    <span className="text-slate-500 font-mono text-[11px]">
                      ⏱️ Reset in 2d 14h
                    </span>
                  </div>

                  {/* 3 Podiums */}
                  <div className="grid grid-cols-3 gap-2 items-end pt-4 pb-2 text-center">
                    {/* Rank 2 */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-3 shadow-xs space-y-1">
                      <div className="w-10 h-10 rounded-full bg-slate-200 border-2 border-slate-300 mx-auto flex items-center justify-center font-black text-slate-700 text-xs">
                        🥈
                      </div>
                      <p className="text-xs font-black text-slate-800 truncate">Areeba S.</p>
                      <p className="text-[10px] font-bold text-slate-500">2,890 XP</p>
                      <div className="h-12 bg-slate-100 rounded-lg flex items-center justify-center font-black text-slate-500 text-xs">
                        #2
                      </div>
                    </div>

                    {/* Rank 1 */}
                    <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-3 shadow-md space-y-1 scale-105">
                      <div className="w-12 h-12 rounded-full bg-amber-400 border-2 border-amber-200 mx-auto flex items-center justify-center font-black text-white text-base shadow-sm">
                        👑
                      </div>
                      <p className="text-xs font-black text-amber-950 truncate">Hamza Tariq</p>
                      <p className="text-[10px] font-extrabold text-amber-700">3,450 XP</p>
                      <div className="h-18 bg-amber-200/70 rounded-lg flex items-center justify-center font-black text-amber-900 text-sm">
                        🥇 #1
                      </div>
                    </div>

                    {/* Rank 3 */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-3 shadow-xs space-y-1">
                      <div className="w-10 h-10 rounded-full bg-amber-100 border-2 border-amber-300 mx-auto flex items-center justify-center font-black text-amber-800 text-xs">
                        🥉
                      </div>
                      <p className="text-xs font-black text-slate-800 truncate">Bilal Raza</p>
                      <p className="text-[10px] font-bold text-slate-500">2,610 XP</p>
                      <div className="h-10 bg-slate-100 rounded-lg flex items-center justify-center font-black text-slate-500 text-xs">
                        #3
                      </div>
                    </div>
                  </div>

                  {/* Promotion bar */}
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-2.5 flex items-center justify-between text-xs text-emerald-900 font-bold">
                    <span className="flex items-center gap-1.5">
                      <TrendingUp className="w-4 h-4 text-emerald-600" /> Promotion Zone (Ranks 1–10)
                    </span>
                    <span className="text-[10px] uppercase tracking-wider text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded font-black">
                      Advances to Diamond
                    </span>
                  </div>
                </div>
              </motion.div>
            )}

            {/* TAB 4: Diagnostic Radar */}
            {activeTab === 'analytics' && (
              <motion.div
                key="analytics"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.25 }}
                className="grid lg:grid-cols-12 gap-8 items-center"
              >
                <div className="lg:col-span-5 space-y-6">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-teal-50 border border-teal-200 text-teal-800 text-[10px] font-black uppercase tracking-wider">
                    <BrainCircuit className="w-3 h-3 text-teal-600" /> Predictive Intelligence
                  </div>
                  <h3 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight leading-snug">
                    Know exactly where you stand before the official test day.
                  </h3>
                  <p className="text-slate-600 text-sm md:text-base leading-relaxed">
                    Aptivo analyzes your solving accuracy and speed to chart your multi-subject strengths and highlight your single highest-yield weak chapter.
                  </p>

                  <div className="space-y-3 pt-2">
                    {[
                      { title: 'Multi-Axis Radar Profiling', desc: 'Instant visual overview of Physics, Math, Chemistry, and Logic.' },
                      { title: 'Predicted Placement Probability', desc: 'Predicts your test score within a proven 7% error margin.' },
                      { title: 'Targeted Remedial Practice', desc: '1-click recommended practice sets targeting your weakest topic.' }
                    ].map((item, i) => (
                      <div key={i} className="flex items-start gap-3">
                        <div className="w-5 h-5 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 shrink-0 mt-0.5 font-black text-[10px]">
                          📊
                        </div>
                        <div>
                          <p className="text-xs font-black text-slate-900">{item.title}</p>
                          <p className="text-xs text-slate-500">{item.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="pt-2">
                    <Link
                      href="/register"
                      className="inline-flex items-center gap-2 px-6 py-3 bg-teal-600 text-white font-black text-xs uppercase tracking-wider rounded-xl hover:bg-teal-700 transition-all shadow-md shadow-teal-600/20"
                    >
                      Get Your Free Diagnostic <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>

                {/* Right: Radar Chart Mockup */}
                <div className="lg:col-span-7 bg-slate-50 border border-slate-200 rounded-2xl p-5 md:p-6 shadow-inner space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200 text-xs font-bold text-slate-700">
                    <span>Subject Proficiency Balance</span>
                    <span className="text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200 font-black">
                      Overall Mastery: 86%
                    </span>
                  </div>

                  <div className="h-64 w-full bg-white rounded-xl border border-slate-200 p-2 flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart data={mockRadarData}>
                        <PolarGrid stroke="#e2e8f0" />
                        <PolarAngleAxis dataKey="subject" tick={{ fill: '#334155', fontSize: 12, fontWeight: 700 }} />
                        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#94a3b8', fontSize: 10 }} />
                        <Radar
                          name="Proficiency"
                          dataKey="score"
                          stroke="#0d9488"
                          fill="#14b8a6"
                          fillOpacity={0.4}
                        />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-emerald-50 border border-emerald-200 p-2.5 rounded-xl">
                      <p className="text-[10px] font-black uppercase tracking-wider text-emerald-800">Strongest Subject</p>
                      <p className="font-extrabold text-emerald-950 text-sm">Mathematics (94%)</p>
                    </div>
                    <div className="bg-amber-50 border border-amber-200 p-2.5 rounded-xl">
                      <p className="text-[10px] font-black uppercase tracking-wider text-amber-800">Highest ROI Revision</p>
                      <p className="font-extrabold text-amber-950 text-sm">Organic Chemistry (76%)</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
