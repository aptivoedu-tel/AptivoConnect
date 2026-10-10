'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Minus } from 'lucide-react';

export default function FaqAccordion({ faqs }: { faqs: any[] }) {
  const [activeFaq, setActiveFaq] = React.useState<string | null>(null);

  if (!faqs || faqs.length === 0) return null;

  return (
    <section id="faq" className="py-24 bg-slate-50 border-t border-slate-100 scroll-mt-24">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16 space-y-3">
          <p className="text-[10px] font-black text-teal-600 uppercase tracking-[0.25em]">Got Questions?</p>
          <h2 className="text-4xl lg:text-5xl font-black text-slate-900 tracking-tight">Frequently Asked Questions</h2>
        </div>
        
        <div className="space-y-4">
          {faqs.map((faq, i) => {
            const isActive = activeFaq === faq.id || activeFaq === faq._id;
            return (
              <motion.div 
                key={faq.id || faq._id || i}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className={`bg-white border rounded-2xl overflow-hidden transition-all duration-300 ${isActive ? 'border-teal-200 shadow-md shadow-teal-500/10' : 'border-slate-100 hover:border-slate-200'}`}
              >
                <button
                  onClick={() => setActiveFaq(isActive ? null : (faq.id || faq._id))}
                  className="w-full flex items-center justify-between p-6 text-left focus:outline-none"
                >
                  <span className={`text-base font-bold transition-colors ${isActive ? 'text-teal-700' : 'text-slate-800'}`}>
                    {faq.question}
                  </span>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-transform duration-300 ${isActive ? 'bg-teal-50 rotate-180' : 'bg-slate-50'}`}>
                    {isActive ? <Minus className="w-4 h-4 text-teal-600" /> : <Plus className="w-4 h-4 text-slate-400" />}
                  </div>
                </button>
                <AnimatePresence>
                  {isActive && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: 'easeInOut' }}
                    >
                      <div className="px-6 pb-6 pt-2 border-t border-slate-50">
                        <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-line">
                          {faq.answer}
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
