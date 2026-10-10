'use client';

import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { GraduationCap, Menu, X, ChevronDown, ChevronUp, ArrowUpRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Navbar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUniMenuOpen, setIsUniMenuOpen] = useState(false);
  const [isMobileUniOpen, setIsMobileUniOpen] = useState(false);
  const [isAmbassadorClosed, setIsAmbassadorClosed] = useState(false);
  const [universities, setUniversities] = useState<{ id: number | string; name: string; is_active?: boolean; is_public?: boolean; logo_url?: string }[]>([]);
  const [globalExams, setGlobalExams] = useState<{ id: number | string; name: string; is_active?: boolean; is_public?: boolean; logo_url?: string }[]>([]);
  const uniMenuRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const openUniMenu = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setIsUniMenuOpen(true);
  };

  const closeUniMenuDelayed = () => {
    closeTimer.current = setTimeout(() => setIsUniMenuOpen(false), 150);
  };

  // Fetch all active/public universities, global exams, and ambassador settings
  useEffect(() => {
    const fetchDropdownData = async () => {
      try {
        const [uniRes, examRes, ambassadorRes] = await Promise.all([
          fetch('/api/mongo/universities?active=true&public=true'),
          fetch('/api/mongo/test-sections?active=true&public=true'),
          fetch('/api/ambassadors/settings')
        ]);

        if (uniRes.ok) {
          const uniData = await uniRes.json();
          if (uniData.universities) {
            setUniversities(
              uniData.universities.filter((u: any) => u.is_active === true && u.is_public === true)
            );
          }
        }

        if (examRes.ok) {
          const examData = await examRes.json();
          if (examData.sections) {
            setGlobalExams(
              examData.sections.filter((s: any) => s.is_active === true && s.is_public === true)
            );
          }
        }

        if (ambassadorRes.ok) {
          const ambassadorData = await ambassadorRes.json();
          if (typeof ambassadorData.applicationsClosed === 'boolean') {
            setIsAmbassadorClosed(ambassadorData.applicationsClosed);
          }
        }
      } catch (e) {
        console.error('Failed to fetch dropdown data', e);
      }
    };
    fetchDropdownData();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (uniMenuRef.current && !uniMenuRef.current.contains(e.target as Node)) {
        setIsUniMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Combine and sort alphabetically
  const combinedItems = [
    ...universities.map(u => ({ id: u.id, name: u.name, logo_url: u.logo_url, link: `/university/${u.id}/pattern` })),
    ...globalExams.map(g => ({ id: g.id, name: g.name, logo_url: g.logo_url, link: `/test-sections/${g.id}/pattern` }))
  ].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <header className="fixed top-3 sm:top-5 inset-x-0 z-50 flex justify-center px-3 sm:px-6 pointer-events-none">
      <div className="w-full max-w-6xl pointer-events-auto">
        {/* Floating Capsule Bar */}
        <nav className="bg-white/90 backdrop-blur-xl border border-slate-200/80 shadow-lg shadow-slate-200/50 rounded-full px-4 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between transition-all">
          
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group shrink-0">
            <div className="w-9 h-9 bg-teal-600 rounded-xl flex items-center justify-center text-white transition-transform group-hover:scale-105 shadow-md shadow-teal-600/20">
              <GraduationCap className="w-5 h-5" />
            </div>
            <span className="text-xl font-black text-slate-900 tracking-tight">Aptivo</span>
          </Link>

          {/* Desktop Navigation Links */}
          <div className="hidden md:flex items-center gap-6 lg:gap-8 text-xs font-bold text-slate-600">
            <Link href="#demo" className="hover:text-teal-600 transition-colors">Features</Link>
            <Link href="#catalog" className="hover:text-teal-600 transition-colors">How it works</Link>
            <Link href="#testimonials" className="hover:text-teal-600 transition-colors">Testimonials</Link>
            <Link href="/for-institutions" className="hover:text-teal-600 transition-colors">For Institutions</Link>
            <Link href="/contact" className="hover:text-teal-600 transition-colors">Contact</Link>

            {/* Ambassador Program Link */}
            <Link
              href="/ambassador"
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full transition-all font-black text-xs shrink-0 shadow-xs ${
                isAmbassadorClosed
                  ? "bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200/80"
                  : "bg-teal-50 hover:bg-teal-100 text-teal-700 border border-teal-200/80"
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${isAmbassadorClosed ? "bg-amber-500" : "bg-emerald-500 animate-pulse"}`} />
              <span>Ambassador</span>
              <span className={`px-1.5 py-0.5 rounded text-[8px] font-extrabold uppercase tracking-wider text-white ${isAmbassadorClosed ? "bg-amber-600" : "bg-teal-600"}`}>
                {isAmbassadorClosed ? "CLOSED" : "NEW"}
              </span>
            </Link>

            {/* Universities hover dropdown */}
            <div className="relative" ref={uniMenuRef} onMouseEnter={openUniMenu} onMouseLeave={closeUniMenuDelayed}>
              <button
                className={`flex items-center gap-1 transition-colors ${isUniMenuOpen ? 'text-teal-600' : 'hover:text-teal-600'}`}
              >
                <span>Portals</span>
                {isUniMenuOpen
                  ? <ChevronUp className="w-3.5 h-3.5" />
                  : <ChevronDown className="w-3.5 h-3.5" />
                }
              </button>

              <AnimatePresence>
                {isUniMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -6, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6, scale: 0.97 }}
                    transition={{ duration: 0.15 }}
                    className="absolute left-1/2 -translate-x-1/2 top-full pt-3 w-72 z-50"
                    onMouseEnter={openUniMenu}
                    onMouseLeave={closeUniMenuDelayed}
                  >
                    <div className="bg-white border border-slate-200/80 rounded-2xl shadow-2xl shadow-slate-200/60 overflow-hidden">
                      <div className="px-4 py-2.5 border-b border-slate-100 bg-slate-50/50">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Active Portals</p>
                      </div>
                      <div className="max-h-80 overflow-y-auto divide-y divide-slate-50/60">
                        {combinedItems.length === 0 ? (
                          <p className="px-4 py-6 text-xs font-medium text-slate-400 text-center">No portals available</p>
                        ) : (
                          combinedItems.map((item) => (
                            <Link
                              key={`${item.link}-${item.id}`}
                              href={item.link}
                              className="flex items-center gap-3 px-4 py-3 hover:bg-teal-50/50 hover:text-teal-700 transition-colors"
                              onClick={() => setIsUniMenuOpen(false)}
                            >
                              <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 overflow-hidden">
                                {item.logo_url ? (
                                  <img src={item.logo_url} alt={item.name} className="w-full h-full object-contain p-0.5" />
                                ) : (
                                  <span className="text-[10px] font-black text-teal-600">{item.name.charAt(0)}</span>
                                )}
                              </div>
                              <span className="text-[13px] font-semibold text-slate-700 truncate normal-case tracking-normal">{item.name}</span>
                            </Link>
                          ))
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Desktop Right Actions */}
          <div className="hidden md:flex items-center gap-3 shrink-0">
            <Link href="/login" className="text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors px-2 py-1.5">
              Log In
            </Link>
            <Link
              href="/register"
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-[#042f2e] hover:bg-teal-900 text-white text-xs font-black transition-all shadow-md shadow-[#042f2e]/20 active:scale-95 cursor-pointer"
            >
              <span>Start Free</span>
              <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
            </Link>
          </div>

          {/* Mobile Menu Hamburger Toggle */}
          <button
            className="md:hidden p-1.5 text-slate-600 hover:text-slate-900 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </nav>

        {/* Mobile Dropdown Menu */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.98 }}
              transition={{ duration: 0.2 }}
              className="md:hidden mt-2 bg-white/95 backdrop-blur-xl border border-slate-200/80 shadow-2xl rounded-3xl p-5 overflow-hidden space-y-3"
            >
              <div className="space-y-1">
                <Link href="#demo" className="block text-sm font-bold text-slate-700 py-2 hover:text-teal-600" onClick={() => setIsMobileMenuOpen(false)}>Features</Link>
                <Link href="#catalog" className="block text-sm font-bold text-slate-700 py-2 hover:text-teal-600" onClick={() => setIsMobileMenuOpen(false)}>How it works</Link>
                <Link href="#testimonials" className="block text-sm font-bold text-slate-700 py-2 hover:text-teal-600" onClick={() => setIsMobileMenuOpen(false)}>Testimonials</Link>
                <Link href="/for-institutions" className="block text-sm font-bold text-teal-700 py-2" onClick={() => setIsMobileMenuOpen(false)}>For Institutions</Link>
                <Link href="/contact" className="block text-sm font-bold text-slate-700 py-2 hover:text-teal-600" onClick={() => setIsMobileMenuOpen(false)}>Contact</Link>
                <Link
                  href="/ambassador"
                  className={`flex items-center justify-between text-sm font-bold py-2.5 px-3 rounded-2xl border my-1 ${
                    isAmbassadorClosed
                      ? "text-amber-800 bg-amber-50/80 border-amber-200/80"
                      : "text-teal-700 bg-teal-50/80 border-teal-100/80"
                  }`}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <span className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${isAmbassadorClosed ? "bg-amber-500" : "bg-emerald-500 animate-pulse"}`} />
                    Ambassador Program
                  </span>
                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wider text-white ${isAmbassadorClosed ? "bg-amber-600" : "bg-teal-600"}`}>
                    {isAmbassadorClosed ? "CLOSED" : "NEW"}
                  </span>
                </Link>

                {/* Mobile Universities & Exams Accordion */}
                {combinedItems.length > 0 && (
                  <div className="border-t border-slate-100 pt-2">
                    <button
                      onClick={() => setIsMobileUniOpen(prev => !prev)}
                      className="w-full flex items-center justify-between text-sm font-bold text-slate-700 py-2"
                    >
                      <span>Active Portals</span>
                      {isMobileUniOpen ? <ChevronUp className="w-4 h-4 text-teal-600" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                    </button>
                    <AnimatePresence>
                      {isMobileUniOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden pl-2 space-y-1 pt-1"
                        >
                          {combinedItems.map((item) => (
                            <Link
                              key={`${item.link}-${item.id}`}
                              href={item.link}
                              className="flex items-center gap-3 py-2 text-xs font-bold text-slate-600 hover:text-teal-600 transition-colors"
                              onClick={() => setIsMobileMenuOpen(false)}
                            >
                              <div className="w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 overflow-hidden">
                                {item.logo_url ? (
                                  <img src={item.logo_url} alt={item.name} className="w-full h-full object-contain p-0.5" />
                                ) : (
                                  <span className="text-[10px] font-black text-teal-600">{item.name.charAt(0)}</span>
                                )}
                              </div>
                              <span className="truncate">{item.name}</span>
                            </Link>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}
              </div>

              <div className="pt-3 flex flex-col gap-2 border-t border-slate-100">
                <Link href="/login" className="w-full py-2.5 text-center font-bold text-xs text-slate-700 border border-slate-200 rounded-xl" onClick={() => setIsMobileMenuOpen(false)}>Log In</Link>
                <Link href="/register" className="w-full py-2.5 text-center font-black text-xs bg-[#042f2e] text-white rounded-xl flex items-center justify-center gap-1.5 shadow-md" onClick={() => setIsMobileMenuOpen(false)}>
                  <span>Start Free</span>
                  <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
}
