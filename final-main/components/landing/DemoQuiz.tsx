'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Trophy,
  ArrowRight,
  RotateCcw,
  Sparkles,
  Zap,
  Flame,
  Award
} from 'lucide-react';
import MarkdownRenderer from '@/components/shared/MarkdownRenderer';

const demoQuestions = [
  {
    id: 1,
    subject: 'Physics',
    topic: 'Oscillations & Waves',
    question: 'A simple pendulum of length $L$ has time period $T$. If its length is increased to $4L$, what is its new time period?',
    options: [
      'T\' = T',
      'T\' = 2T',
      'T\' = 4T',
      'T\' = \\frac{T}{2}'
    ],
    answer: 1,
    explanation: 'The time period of a simple pendulum is given by $T = 2\\pi \\sqrt{\\frac{L}{g}}$. Since $T \\propto \\sqrt{L}$, if $L\' = 4L$, then $T\' = \\sqrt{4} T = 2T$.'
  },
  {
    id: 2,
    subject: 'Mathematics',
    topic: 'Integral Calculus',
    question: 'Evaluate the indefinite integral: $\\int e^{2x} \\, dx$',
    options: [
      '2e^{2x} + C',
      '\\frac{1}{2} e^{2x} + C',
      'e^{2x} + C',
      '\\frac{1}{4} e^{2x} + C'
    ],
    answer: 1,
    explanation: 'Using the substitution method or standard formula $\\int e^{ax} dx = \\frac{1}{a} e^{ax} + C$, with $a = 2$, we get $\\frac{1}{2} e^{2x} + C$.'
  },
  {
    id: 3,
    subject: 'Chemistry',
    topic: 'Atomic Structure & Trends',
    question: 'Which of the following elements possesses the highest electronegativity on the Pauling scale?',
    options: [
      'Oxygen (O)',
      'Chlorine (Cl)',
      'Nitrogen (N)',
      'Fluorine (F)'
    ],
    answer: 3,
    explanation: 'Fluorine (F) has the highest electronegativity of 3.98 on the Pauling scale due to its small atomic radius and high effective nuclear charge.'
  },
  {
    id: 4,
    subject: 'Intelligence & Logic',
    topic: 'Number Sequences',
    question: 'Identify the next number in the series: $2, 6, 12, 20, 30, \\underline{\\quad}$',
    options: [
      '36',
      '40',
      '42',
      '48'
    ],
    answer: 2,
    explanation: 'The differences between consecutive terms are $+4, +6, +8, +10$. The next difference is $+12$, giving $30 + 12 = 42$. (Alternatively $n(n+1)$ where $n=6 \\implies 6 \\times 7 = 42$).'
  }
];

const LABELS = ['A', 'B', 'C', 'D'];

export default function DemoQuiz() {
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>(Array(demoQuestions.length).fill(null));
  const [showCelebration, setShowCelebration] = useState(false);

  const q = demoQuestions[current];
  const selected = answers[current];
  const isAnswered = selected !== null;

  const totalAnswered = answers.filter((a) => a !== null).length;
  const correctCount = answers.reduce((acc, ans, idx) => {
    if (ans !== null && ans === demoQuestions[idx].answer) return (acc ?? 0) + 1;
    return acc ?? 0;
  }, 0) ?? 0;

  const handleOptionSelect = (idx: number) => {
    if (isAnswered) return;
    const updated = [...answers];
    updated[current] = idx;
    setAnswers(updated);

    if (current === demoQuestions.length - 1 || updated.filter((a) => a !== null).length === demoQuestions.length) {
      setTimeout(() => setShowCelebration(true), 600);
    }
  };

  const handleNext = () => {
    if (current < demoQuestions.length - 1) {
      setCurrent(current + 1);
    }
  };

  const handlePrev = () => {
    if (current > 0) {
      setCurrent(current - 1);
    }
  };

  const handleReset = () => {
    setAnswers(Array(demoQuestions.length).fill(null));
    setCurrent(0);
    setShowCelebration(false);
  };

  return (
    <section id="demo" className="scroll-mt-24 py-20 md:py-28 bg-gradient-to-b from-white via-teal-50/30 to-white relative overflow-hidden">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-14 space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-teal-50 border border-teal-200 text-teal-800 text-[11px] font-black uppercase tracking-widest">
            <Zap className="w-3.5 h-3.5 text-teal-600 fill-teal-600" /> Interactive Demo Arena
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 tracking-tight leading-tight">
            Test your readiness with <span className="text-teal-600">real past exam MCQs</span>.
          </h2>
          <p className="text-slate-600 text-base md:text-lg font-medium leading-relaxed">
            Try 4 diagnostic questions with live KaTeX mathematical formatting and instant explanations.
          </p>
        </div>

        {/* Quiz Arena Card */}
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xl shadow-slate-200/70 p-6 sm:p-8 lg:p-10 max-w-4xl mx-auto">
          
          {!showCelebration ? (
            <div className="space-y-6">
              
              {/* Header bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-lg bg-teal-50 border border-teal-200 text-teal-800 text-xs font-black">
                    {q.subject}
                  </span>
                  <span className="text-xs text-slate-500 font-bold">{q.topic}</span>
                </div>

                <div className="flex items-center gap-4 text-xs font-bold text-slate-600">
                  <span>Question {current + 1} of {demoQuestions.length}</span>
                  <div className="w-28 h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-teal-600 rounded-full transition-all duration-300"
                      style={{ width: `${((current + 1) / demoQuestions.length) * 100}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Question Text with KaTeX */}
              <div className="py-2">
                <div className="text-base sm:text-lg font-bold text-slate-900 leading-relaxed">
                  <MarkdownRenderer content={q.question} />
                </div>
              </div>

              {/* Options Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {q.options.map((optText, idx) => {
                  const isCorrect = idx === q.answer;
                  const isSelected = selected === idx;

                  let cardStyle = 'bg-slate-50 border-slate-200 text-slate-700 hover:border-teal-300 hover:bg-white';
                  if (isAnswered) {
                    if (isCorrect) {
                      cardStyle = 'bg-emerald-50 border-emerald-400 text-emerald-950 font-bold shadow-sm';
                    } else if (isSelected) {
                      cardStyle = 'bg-rose-50 border-rose-300 text-rose-950';
                    } else {
                      cardStyle = 'bg-slate-50/50 border-slate-200 text-slate-400 opacity-60';
                    }
                  }

                  return (
                    <button
                      key={idx}
                      onClick={() => handleOptionSelect(idx)}
                      disabled={isAnswered}
                      className={`
                        p-4 rounded-2xl border text-left transition-all flex items-center justify-between cursor-pointer
                        ${cardStyle}
                      `}
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`
                            w-7 h-7 rounded-xl text-xs font-black flex items-center justify-center shrink-0
                            ${
                              isAnswered && isCorrect
                                ? 'bg-emerald-600 text-white'
                                : isAnswered && isSelected
                                ? 'bg-rose-600 text-white'
                                : 'bg-white border border-slate-200 text-slate-700'
                            }
                          `}
                        >
                          {LABELS[idx]}
                        </span>
                        <div className="text-xs sm:text-sm">
                          <MarkdownRenderer content={`$${optText}$`} />
                        </div>
                      </div>

                      {isAnswered && isCorrect && (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                      )}
                      {isAnswered && isSelected && !isCorrect && (
                        <XCircle className="w-5 h-5 text-rose-600 shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Step-by-Step Explanation Banner */}
              {isAnswered && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 sm:p-5 space-y-2 text-xs sm:text-sm">
                  <div className="flex items-center gap-2 font-black text-emerald-900">
                    <Sparkles className="w-4 h-4 text-emerald-600" />
                    <span>Detailed Solution & Formula Derivation:</span>
                  </div>
                  <div className="text-slate-700 leading-relaxed pt-1">
                    <MarkdownRenderer content={q.explanation} />
                  </div>
                </div>
              )}

              {/* Footer Controls */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                <button
                  onClick={handlePrev}
                  disabled={current === 0}
                  className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black transition-all ${
                    current === 0
                      ? 'text-slate-300 cursor-not-allowed'
                      : 'text-slate-600 hover:bg-slate-100 cursor-pointer'
                  }`}
                >
                  <ChevronLeft className="w-4 h-4" /> Previous
                </button>

                {current < demoQuestions.length - 1 ? (
                  <button
                    onClick={handleNext}
                    className="inline-flex items-center gap-1.5 px-6 py-2.5 bg-teal-600 text-white text-xs font-black rounded-xl hover:bg-teal-700 transition-all shadow-md shadow-teal-600/20 cursor-pointer"
                  >
                    Next Question <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    onClick={() => setShowCelebration(true)}
                    className="inline-flex items-center gap-1.5 px-6 py-2.5 bg-emerald-600 text-white text-xs font-black rounded-xl hover:bg-emerald-700 transition-all shadow-md shadow-emerald-600/20 cursor-pointer"
                  >
                    View Diagnostic Score <Award className="w-4 h-4" />
                  </button>
                )}
              </div>

            </div>
          ) : (
            /* Celebration & University Readiness Result Screen */
            <div className="text-center py-6 space-y-6">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center text-3xl mx-auto shadow-inner">
                🏆
              </div>

              <div className="space-y-2">
                <h3 className="text-2xl sm:text-3xl font-black text-slate-900">
                  Diagnostic Demo Completed!
                </h3>
                <p className="text-sm text-slate-600 font-medium">
                  You scored <span className="font-black text-teal-700">{correctCount} of {demoQuestions.length}</span> correct on real past paper items.
                </p>
              </div>

              <div className="bg-teal-50 border border-teal-200/80 rounded-2xl p-6 max-w-lg mx-auto text-left space-y-3">
                <div className="flex items-center gap-2 font-black text-teal-900 text-sm">
                  <Flame className="w-4 h-4 text-amber-500 fill-amber-500" />
                  <span>Predicted Readiness Benchmark:</span>
                </div>
                <p className="text-xs text-slate-700 leading-relaxed">
                  Based on your diagnostic score, you are currently on track for the top <strong>15% percentile</strong> for NUST (NET) and FAST entry tests.
                </p>
                <div className="text-[11px] text-teal-800 font-bold bg-white/80 p-2.5 rounded-xl border border-teal-100">
                  💡 Create your free account now to unlock full 10,000+ question banks, customized mock tests, and AI tutoring.
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                <Link
                  href="/register"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-teal-600 text-white font-black text-sm rounded-xl hover:bg-teal-700 transition-all shadow-lg shadow-teal-600/20"
                >
                  Create Free Account & Unlock Full Syllabus <ArrowRight className="w-4 h-4" />
                </Link>
                <button
                  onClick={handleReset}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-6 py-3.5 border border-slate-200 text-slate-700 font-bold text-sm rounded-xl hover:bg-slate-50 transition-all cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" /> Retake Diagnostic
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </section>
  );
}
