'use client';

import React from 'react';

interface FormSectionProps {
  title: string;
  description?: string;
  badge?: string;
  stepNumber?: number | string;
  children: React.ReactNode;
}

export default function FormSection({
  title,
  description,
  badge,
  stepNumber,
  children,
}: FormSectionProps) {
  const displayBadge = badge || (stepNumber !== undefined ? String(stepNumber) : undefined);

  return (
    <div className="space-y-4 pb-8 mb-8 border-b border-slate-100 last:border-b-0 last:mb-0 last:pb-0">
      <div className="flex items-center gap-2.5">
        {displayBadge && (
          <span className="w-6 h-6 rounded-lg bg-teal-50 border border-teal-200/60 text-teal-700 text-xs font-black flex items-center justify-center shrink-0">
            {displayBadge}
          </span>
        )}
        <div>
          <h3 className="text-base font-black text-slate-900 tracking-tight">
            {title}
          </h3>
          {description && (
            <p className="text-xs font-medium text-slate-500 mt-0.5">{description}</p>
          )}
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">{children}</div>
    </div>
  );
}
