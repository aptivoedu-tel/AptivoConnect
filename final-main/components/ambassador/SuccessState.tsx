'use client';

import React from 'react';
import Link from 'next/link';
import { Award, ArrowUpRight, MessageCircle, RotateCcw } from 'lucide-react';

interface SuccessStateProps {
  onReset?: () => void;
}

export default function SuccessState({ onReset }: SuccessStateProps) {
  return (
    <div className="text-center py-12 px-4 max-w-lg mx-auto">
      <div className="w-20 h-20 rounded-3xl bg-teal-50 border border-teal-200/80 flex items-center justify-center mx-auto mb-6 shadow-md shadow-teal-600/10">
        <Award className="w-10 h-10 text-teal-600" />
      </div>

      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-black uppercase tracking-wider mb-4">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
        Submission Received
      </div>

      <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mb-3">
        Application Submitted!
      </h2>

      <p className="text-sm font-medium text-slate-600 leading-relaxed mb-8">
        Thank you for applying to represent Aptivo! Our team reviews every application thoroughly. Selected candidates will be contacted via WhatsApp and email.
      </p>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
        <Link
          href="/"
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-[#042f2e] hover:bg-teal-900 text-white font-black text-xs transition-all shadow-md shadow-[#042f2e]/20 active:scale-95"
        >
          <span>Return to Aptivo Home</span>
          <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
        </Link>

        <a
          href="https://wa.me/923713215643"
          target="_blank"
          rel="noopener noreferrer"
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs border border-slate-200 shadow-xs transition-all hover:text-teal-600"
        >
          <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
          <span>WhatsApp Support</span>
        </a>

        {onReset && (
          <button
            onClick={onReset}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-5 py-3 rounded-full text-slate-500 hover:text-slate-800 font-bold text-xs transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
            <span>New Application</span>
          </button>
        )}
      </div>
    </div>
  );
}
