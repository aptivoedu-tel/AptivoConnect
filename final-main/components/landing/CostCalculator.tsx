'use client';

import React, { useState } from 'react';
import { Check, X, ArrowRight, Zap, TrendingDown, Clock, ShieldCheck, DollarSign } from 'lucide-react';
import Link from 'next/link';

export default function CostCalculator() {
  const [coursesCount, setCoursesCount] = useState(3); // e.g., 3 subjects (Physics, Math, Chem)

  const academyFeePerCourse = 15000; // Rs. 15,000 avg per subject at traditional academies (KIPS, STEP, etc.)
  const totalAcademyCost = coursesCount * academyFeePerCourse;
  const aptivoCost = 0; // Free to start
  const savings = totalAcademyCost - aptivoCost;
  const commuteHoursSaved = coursesCount * 45; // ~45 hours per course spent traveling in traffic

  return (
    <section className="py-20 md:py-28 bg-slate-50 border-y border-slate-200/80 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-14 space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-teal-100 text-teal-800 text-[11px] font-black uppercase tracking-widest">
            <DollarSign className="w-3.5 h-3.5 text-teal-700" /> Value & Flexibility Benchmark
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 tracking-tight leading-tight">
            Stop overpaying <span className="text-teal-600">Rs. 45,000+</span> for physical academies.
          </h2>
          <p className="text-slate-600 text-base md:text-lg font-medium leading-relaxed">
            Eliminate hours wasted in traffic and rigid schedules. Learn faster with personalized AI practice at zero initial cost.
          </p>
        </div>

        {/* Interactive Comparison & Calculator Box */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xl p-6 sm:p-8 lg:p-10 max-w-5xl mx-auto">
          
          {/* Slider for course selection */}
          <div className="mb-10 p-6 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-slate-500">Select Number of Entry Test Subjects:</p>
                <p className="text-lg font-black text-slate-900">{coursesCount} Subjects (Physics, Math, Chem / Comp)</p>
              </div>
              <div className="text-right">
                <span className="text-xs font-bold text-teal-700 bg-teal-50 border border-teal-200 px-3 py-1 rounded-full">
                  Instant Savings: Rs. {savings.toLocaleString()}
                </span>
              </div>
            </div>
            
            <input
              type="range"
              min="1"
              max="5"
              step="1"
              value={coursesCount}
              onChange={(e) => setCoursesCount(parseInt(e.target.value))}
              className="w-full h-2.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-teal-600"
            />
            
            <div className="flex justify-between text-[11px] font-bold text-slate-400">
              <span>1 Subject</span>
              <span>2 Subjects</span>
              <span>3 Subjects (Standard)</span>
              <span>4 Subjects</span>
              <span>5 Subjects (Full Bundle)</span>
            </div>
          </div>

          {/* Side-by-Side Comparison Cards */}
          <div className="grid md:grid-cols-2 gap-8 items-stretch">
            
            {/* Left: Traditional Academy */}
            <div className="bg-slate-50 rounded-2xl p-6 sm:p-8 border border-slate-200 flex flex-col justify-between space-y-6">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-black uppercase tracking-widest text-slate-500">Physical Coaching Academy</span>
                  <span className="px-2.5 py-1 bg-red-100 text-red-800 text-[10px] font-black rounded-md uppercase">High Cost & Friction</span>
                </div>
                <div className="mb-4">
                  <p className="text-4xl font-black text-slate-400 line-through decoration-red-500">
                    Rs. {totalAcademyCost.toLocaleString()}
                  </p>
                  <p className="text-xs text-slate-500 mt-1 font-medium">Session fee + test series charges</p>
                </div>

                <ul className="space-y-3.5 text-xs sm:text-sm text-slate-600">
                  <li className="flex items-start gap-2.5">
                    <div className="w-5 h-5 rounded-full bg-red-100 flex items-center justify-center text-red-600 shrink-0 mt-0.5 font-black text-xs">
                      ✕
                    </div>
                    <span><strong>~{commuteHoursSaved} hours lost</strong> in heat and rush-hour daily traffic</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <div className="w-5 h-5 rounded-full bg-red-100 flex items-center justify-center text-red-600 shrink-0 mt-0.5 font-black text-xs">
                      ✕
                    </div>
                    <span>Rigid fixed class schedules (no pause or re-listening)</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <div className="w-5 h-5 rounded-full bg-red-100 flex items-center justify-center text-red-600 shrink-0 mt-0.5 font-black text-xs">
                      ✕
                    </div>
                    <span>1 teacher for 80+ students — zero individual weakness tracking</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <div className="w-5 h-5 rounded-full bg-red-100 flex items-center justify-center text-red-600 shrink-0 mt-0.5 font-black text-xs">
                      ✕
                    </div>
                    <span>Paper tests with delayed manual grading days later</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Right: Aptivo Smart Prep */}
            <div className="bg-gradient-to-br from-teal-600 to-teal-800 text-white rounded-2xl p-6 sm:p-8 shadow-xl shadow-teal-600/20 flex flex-col justify-between space-y-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-48 h-48 bg-teal-400/20 rounded-full blur-2xl pointer-events-none" />
              
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-black uppercase tracking-widest text-teal-200">Aptivo Smart Prep</span>
                  <span className="px-2.5 py-1 bg-white/20 text-white text-[10px] font-black rounded-md uppercase backdrop-blur-md">Recommended</span>
                </div>
                <div className="mb-4">
                  <div className="flex items-baseline gap-2">
                    <p className="text-4xl sm:text-5xl font-black text-white">Free</p>
                    <span className="text-sm font-bold text-teal-200">to start</span>
                  </div>
                  <p className="text-xs text-teal-100 mt-1 font-medium">Zero admission charges • Instant unrestricted access</p>
                </div>

                <ul className="space-y-3.5 text-xs sm:text-sm text-teal-50">
                  <li className="flex items-start gap-2.5">
                    <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-white shrink-0 mt-0.5 font-black text-xs">
                      ✓
                    </div>
                    <span><strong>Save Rs. {savings.toLocaleString()}</strong> in upfront coaching academy fees</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-white shrink-0 mt-0.5 font-black text-xs">
                      ✓
                    </div>
                    <span><strong>Save {commuteHoursSaved}+ hours</strong> — practice on mobile, tablet, or laptop anytime</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-white shrink-0 mt-0.5 font-black text-xs">
                      ✓
                    </div>
                    <span>Personalized 24/7 AI tutor derives step-by-step solutions instantly</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-white shrink-0 mt-0.5 font-black text-xs">
                      ✓
                    </div>
                    <span>Diagnostic radar pinpoints your exact weak chapters with 98% accuracy</span>
                  </li>
                </ul>
              </div>

              <div className="pt-4 relative z-10">
                <Link
                  href="/register"
                  className="w-full inline-flex items-center justify-center gap-2 py-3.5 px-6 bg-white text-teal-800 font-black text-sm rounded-xl hover:bg-teal-50 transition-all shadow-lg text-center"
                >
                  Claim Free Access Now <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>

          </div>
        </div>
      </div>
    </section>
  );
}
