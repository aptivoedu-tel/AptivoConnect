'use client';

import React, { useState } from 'react';
import Navbar from '@/components/landing/Navbar';
import { 
  Mail,
  MessageSquare,
  Send,
  Instagram,
  Facebook,
  Linkedin,
  MessageCircle,
  MapPin,
  Phone,
  ArrowRight,
  CheckCircle2,
  Globe,
  Sparkles,
  Copy,
  Check,
  Building2,
  GraduationCap,
  HelpCircle,
  Clock,
  ArrowUpRight
} from 'lucide-react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import Footer from '@/components/layout/Footer';

export default function ContactPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [inquiryType, setInquiryType] = useState<'student' | 'institution' | 'support'>('student');
  const [subject, setSubject] = useState('General Inquiry');
  const [isSubjectOpen, setIsSubjectOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    message: ''
  });

  const subjectsByRole = {
    student: [
      'General Inquiry',
      'Curriculum & Past Papers',
      'Test Pattern & Blueprints',
      'Mock Exam Feedback',
      'Billing & Pro Access'
    ],
    institution: [
      'Institutional Partnership',
      'Custom Test Portal Setup',
      'Faculty Roster & Group Pricing',
      'B2B Demo Request',
      'Other Academy Inquiry'
    ],
    support: [
      'Technical Support',
      'Login / Account Issues',
      'Content Error Report',
      'Feature Request',
      'Other Technical Question'
    ]
  };

  const currentSubjects = subjectsByRole[inquiryType];

  const handleCopyEmail = () => {
    navigator.clipboard.writeText('aptivo.edu@gmail.com');
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          inquiryType,
          subject
        })
      });

      if (res.ok) {
        setSubmitted(true);
        setFormData({ name: '', email: '', phone: '', message: '' });
      } else {
        const error = await res.json();
        alert(error.error || 'Something went wrong. Please try again.');
      }
    } catch (err) {
      console.error(err);
      alert('Failed to connect to the server. Please check your internet connection.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans selection:bg-teal-100 selection:text-teal-900 flex flex-col justify-between">
      <Navbar />

      <main className="pt-28 sm:pt-36 pb-24 flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* ── Header Section ── */}
          <div className="max-w-3xl mb-14 sm:mb-16 relative">
            <motion.div 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-teal-50 border border-teal-200/80 text-teal-800 text-[11px] font-black uppercase tracking-widest shadow-xs mb-5"
            >
              <Sparkles className="w-3.5 h-3.5 text-teal-600 fill-teal-600" />
              <span>Built by toppers for next ones • 24/7 Support</span>
            </motion.div>
            
            <motion.h1 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 tracking-tight leading-[1.2] mb-6"
            >
              Let's connect &amp;{' '}
              <span className="relative inline-block text-teal-600">
                accelerate your score
                <svg className="absolute -bottom-1 left-0 w-full" height="6" viewBox="0 0 200 6" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
                  <path d="M0 5 Q50 1 100 4 Q150 7 200 3" stroke="#0d9488" strokeWidth="2.5" strokeLinecap="round" fill="none" />
                </svg>
              </span>.
            </motion.h1>
            
            <motion.p 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-base sm:text-lg text-slate-600 font-medium leading-relaxed max-w-2xl"
            >
              Have questions about university blueprints (NUST NET, FAST, ECAT, MDCAT), custom institutional portal packages, or technical assistance? Our academic team responds within 2 hours.
            </motion.p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-start">
            
            {/* ── Left Column: Interactive Contact Form Card ── */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="lg:col-span-7 bg-white rounded-3xl p-6 sm:p-10 shadow-xl shadow-slate-200/60 border border-slate-200/80 relative overflow-hidden"
            >
              {/* Decorative background glow */}
              <div className="absolute -top-24 -right-24 w-64 h-64 bg-teal-50 rounded-full blur-3xl opacity-60 pointer-events-none" />
              
              {submitted ? (
                <div className="py-16 text-center space-y-6">
                  <div className="w-20 h-20 bg-emerald-100 rounded-3xl flex items-center justify-center mx-auto text-emerald-600 shadow-lg shadow-emerald-500/20">
                    <CheckCircle2 className="w-10 h-10" />
                  </div>
                  <h3 className="text-2xl sm:text-3xl font-black text-slate-900">Message Transmitted!</h3>
                  <p className="text-slate-600 font-medium max-w-md mx-auto text-sm sm:text-base leading-relaxed">
                    We have received your inquiry and our academic desk will get back to you via email or WhatsApp within 2 hours.
                  </p>
                  <button 
                    onClick={() => setSubmitted(false)}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-teal-600 text-white font-black text-xs uppercase tracking-wider rounded-xl hover:bg-teal-700 transition-all shadow-md shadow-teal-600/20 active:scale-95"
                  >
                    Send Another Message
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
                  
                  {/* Persona / Inquiry Selector Pills */}
                  <div className="space-y-2.5">
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-0.5">
                      I am reaching out as a:
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      {[
                        { id: 'student', label: 'Student / Aspirant', icon: GraduationCap },
                        { id: 'institution', label: 'College / Academy', icon: Building2 },
                        { id: 'support', label: 'Technical / Help', icon: HelpCircle }
                      ].map((tab) => {
                        const Icon = tab.icon;
                        const active = inquiryType === tab.id;
                        return (
                          <button
                            key={tab.id}
                            type="button"
                            onClick={() => {
                              setInquiryType(tab.id as any);
                              setSubject(subjectsByRole[tab.id as keyof typeof subjectsByRole][0]);
                            }}
                            className={`flex items-center justify-center gap-2 px-3.5 py-3 rounded-2xl text-xs font-black transition-all cursor-pointer border ${
                              active
                                ? 'bg-teal-600 text-white border-teal-600 shadow-md shadow-teal-600/20'
                                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            <Icon className="w-4 h-4 shrink-0" />
                            <span className="truncate">{tab.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Name & Email Fields */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div className="space-y-2">
                      <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-0.5">
                        Full Name <span className="text-teal-600">*</span>
                      </label>
                      <input 
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        type="text" 
                        placeholder="e.g. Abdullah Khan"
                        className="w-full bg-slate-50 border border-slate-200 focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 rounded-2xl px-4 py-3.5 text-slate-900 placeholder:text-slate-400 text-sm font-medium transition-all outline-none"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-0.5">
                        Email Address <span className="text-teal-600">*</span>
                      </label>
                      <input 
                        required
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        type="email" 
                        placeholder="student@example.com"
                        className="w-full bg-slate-50 border border-slate-200 focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 rounded-2xl px-4 py-3.5 text-slate-900 placeholder:text-slate-400 text-sm font-medium transition-all outline-none"
                      />
                    </div>
                  </div>

                  {/* Phone & Subject Fields */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div className="space-y-2">
                      <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-0.5">
                        Phone / WhatsApp (Optional)
                      </label>
                      <input 
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        type="tel" 
                        placeholder="Enter your phone or WhatsApp"
                        className="w-full bg-slate-50 border border-slate-200 focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 rounded-2xl px-4 py-3.5 text-slate-900 placeholder:text-slate-400 text-sm font-medium transition-all outline-none"
                      />
                    </div>

                    <div className="space-y-2 relative">
                      <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-0.5">
                        Subject Topic
                      </label>
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setIsSubjectOpen(!isSubjectOpen)}
                          className="w-full flex items-center justify-between bg-slate-50 border border-slate-200 focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 rounded-2xl px-4 py-3.5 text-slate-900 text-sm font-bold transition-all outline-none text-left cursor-pointer"
                        >
                          <span className="truncate">{subject}</span>
                          <motion.div animate={{ rotate: isSubjectOpen ? 180 : 0 }}>
                            <svg className="w-4 h-4 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                            </svg>
                          </motion.div>
                        </button>
                        
                        <AnimatePresence>
                          {isSubjectOpen && (
                            <motion.div
                              initial={{ opacity: 0, y: 8, scale: 0.98 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0, y: 8, scale: 0.98 }}
                              transition={{ duration: 0.15 }}
                              className="absolute z-50 top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-2xl shadow-2xl py-2 overflow-hidden"
                            >
                              {currentSubjects.map((s) => (
                                <button
                                  key={s}
                                  type="button"
                                  onClick={() => {
                                    setSubject(s);
                                    setIsSubjectOpen(false);
                                  }}
                                  className={`w-full text-left px-4 py-2.5 text-xs font-bold transition-colors hover:bg-teal-50 cursor-pointer ${
                                    subject === s ? 'text-teal-700 bg-teal-50/70' : 'text-slate-700'
                                  }`}
                                >
                                  {s}
                                </button>
                              ))}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  </div>

                  {/* Message Body Field */}
                  <div className="space-y-2">
                    <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-0.5">
                      Your Message <span className="text-teal-600">*</span>
                    </label>
                    <textarea 
                      required
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      rows={5}
                      placeholder="Please specify which university test or institutional service you need assistance with..."
                      className="w-full bg-slate-50 border border-slate-200 focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 rounded-2xl px-4 py-3.5 text-slate-900 placeholder:text-slate-400 text-sm font-medium transition-all outline-none resize-none"
                    />
                  </div>

                  {/* Submit Button */}
                  <button 
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-4 bg-teal-600 text-white font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-teal-700 transition-all shadow-xl shadow-teal-600/25 active:scale-95 disabled:opacity-50 cursor-pointer"
                  >
                    <span>{isSubmitting ? 'Transmitting Message...' : 'Transmit Message'}</span>
                    <Send className="w-4 h-4" />
                  </button>

                </form>
              )}
            </motion.div>

            {/* ── Right Column: Direct Connect & WhatsApp Sidebar ── */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="lg:col-span-5 space-y-6"
            >
              
              {/* WhatsApp Fast-Track Card */}
              <a 
                href="https://wa.me/923713215643?text=Hi%20Aptivo%20Team%2C%20I%20have%20a%20question%20regarding%20Aptivo" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="group block bg-emerald-50 border border-emerald-200 rounded-3xl p-6 text-emerald-950 hover:bg-emerald-100/80 transition-all shadow-md shadow-emerald-900/5 cursor-pointer"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-600 flex items-center justify-center text-white shadow-md shadow-emerald-600/25 shrink-0 group-hover:scale-105 transition-transform">
                      <MessageCircle className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <strong className="text-base font-black text-slate-900">Prefer WhatsApp?</strong>
                        <span className="text-[9px] font-black uppercase tracking-wider text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md">
                          ⚡ &lt; 15 mins
                        </span>
                      </div>
                      <p className="text-xs text-emerald-800 font-bold mt-0.5">
                        Chat directly with our academic guidance team
                      </p>
                    </div>
                  </div>
                  <ArrowUpRight className="w-5 h-5 text-emerald-700 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform shrink-0" />
                </div>
              </a>

              {/* Direct Connect Deep Forest Green Foundation Card (#042F2E - strictly NO blue/slate) */}
              <div className="bg-gradient-to-br from-[#042f2e] via-[#083b38] to-[#042f2e] rounded-3xl p-7 sm:p-8 text-white shadow-2xl relative overflow-hidden border border-teal-900/50">
                <div className="absolute top-0 right-0 w-40 h-40 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />
                
                <h3 className="text-xl font-black mb-6 text-white flex items-center gap-2">
                  <Globe className="w-5 h-5 text-emerald-400" /> Direct Connect Desk
                </h3>
                
                <div className="space-y-6">
                  
                  {/* Email with copy button */}
                  <div className="flex items-center justify-between p-3.5 rounded-2xl bg-white/5 border border-white/10 hover:border-teal-400/40 transition-colors">
                    <div className="flex items-center gap-3.5">
                      <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center shrink-0">
                        <Mail className="w-5 h-5 text-emerald-400" />
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-teal-300">Official Email</p>
                        <p className="font-bold text-sm text-white">aptivo.edu@gmail.com</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleCopyEmail}
                      className="p-2 rounded-lg bg-white/10 hover:bg-emerald-500 text-white transition-colors cursor-pointer"
                      title="Copy Email"
                    >
                      {copiedEmail ? <Check className="w-4 h-4 text-white" /> : <Copy className="w-4 h-4 text-white" />}
                    </button>
                  </div>

                  {/* Coverage & Availability */}
                  <div className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-white/5 border border-white/10">
                    <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center shrink-0">
                      <Clock className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-teal-300">Operating Hours</p>
                      <p className="font-bold text-sm text-white">24/7 Nationwide Support</p>
                      <p className="text-[11px] text-teal-200/80 mt-0.5">Average reply time under 2 hours</p>
                    </div>
                  </div>

                </div>

                {/* Social Digital Channels */}
                <div className="mt-8 pt-6 border-t border-white/10">
                  <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-teal-300 mb-4">
                    Official Social Channels
                  </h4>
                  <div className="flex gap-3">
                    <Link 
                      href="https://www.instagram.com/aptivo.education" 
                      target="_blank" 
                      className="w-11 h-11 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center hover:bg-pink-600 transition-all text-white cursor-pointer"
                      title="Instagram"
                    >
                      <Instagram className="w-5 h-5" />
                    </Link>
                    <Link 
                      href="https://www.facebook.com/share/17EjFzZJWo/" 
                      target="_blank" 
                      className="w-11 h-11 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center hover:bg-teal-600 transition-all text-white cursor-pointer"
                      title="Facebook"
                    >
                      <Facebook className="w-5 h-5" />
                    </Link>
                    <Link 
                      href="https://www.linkedin.com/company/aptivoedu" 
                      target="_blank" 
                      className="w-11 h-11 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center hover:bg-emerald-600 transition-all text-white cursor-pointer"
                      title="LinkedIn"
                    >
                      <Linkedin className="w-5 h-5" />
                    </Link>
                  </div>
                </div>
              </div>

              {/* FAQ Knowledge Jump */}
              <div className="bg-teal-50/80 rounded-3xl p-6 border border-teal-200/70 flex items-start gap-4">
                <div className="w-11 h-11 bg-teal-600 rounded-2xl flex items-center justify-center text-white shrink-0 mt-0.5 shadow-md shadow-teal-600/20">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div className="space-y-1.5">
                  <h4 className="font-black text-slate-900 text-sm">Need Instant Answers?</h4>
                  <p className="text-slate-600 text-xs font-medium leading-relaxed">
                    Check out our frequently asked questions for quick answers on syllabus coverage, mock test scoring, and app access.
                  </p>
                  <Link 
                    href="/#faq" 
                    className="inline-flex items-center gap-1.5 text-teal-800 font-black uppercase tracking-wider text-[11px] hover:gap-2.5 transition-all pt-1 cursor-pointer"
                  >
                    <span>Browse FAQs</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>

            </motion.div>

          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
