import React from 'react';
import Link from 'next/link';
import { GraduationCap, Facebook, Instagram, Linkedin, MessageCircle } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-white border-t border-slate-100 pt-16 pb-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-10 mb-14">
          <div className="sm:col-span-2 md:col-span-2 space-y-5">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="w-9 h-9 bg-teal-600 rounded-xl flex items-center justify-center text-white shadow-md shadow-teal-600/20">
                <GraduationCap className="w-5 h-5" />
              </div>
              <span className="text-xl font-black text-slate-900 tracking-tight">Aptivo</span>
            </Link>
            <p className="text-slate-500 text-sm leading-relaxed max-w-xs">
              Enabling cognitive science with predictive analytics to prepare you for top-league results through a curated, skill-progressive learning path.
            </p>
            <div className="flex gap-3">
              <Link href="https://www.facebook.com/share/17EjFzZJWo/" target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-blue-600 hover:text-white transition-all">
                <Facebook className="w-4 h-4" />
              </Link>
              <Link href="https://www.instagram.com/aptivo.education" target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-pink-500 hover:text-white transition-all">
                <Instagram className="w-4 h-4" />
              </Link>
              <Link href="https://www.linkedin.com/company/aptivoedu" target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-blue-700 hover:text-white transition-all">
                <Linkedin className="w-4 h-4" />
              </Link>
              <Link href="https://wa.me/923713215643" target="_blank" rel="noopener noreferrer" aria-label="Chat with Aptivo on WhatsApp" className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-green-500 hover:text-white transition-all">
                <MessageCircle className="w-4 h-4" />
              </Link>
            </div>
          </div>
          {[
            { title: 'Platform', links: [{ label: 'Practice', href: '/courses' }, { label: 'Ambassador Program', href: '/ambassador' }, { label: 'Study Materials', href: '#' }, { label: 'Mock Tests', href: '#' }, { label: 'Analytics', href: '#' }] },
            { title: 'Support', links: [{ label: 'Contact Us', href: '/contact' }, { label: 'About Us', href: '#' }, { label: 'Terms of Service', href: '/terms' }, { label: 'Privacy Policy', href: '/privacy' }] },
            { title: 'Connect', links: [{ label: 'WhatsApp Support', href: 'https://wa.me/923713215643' }, { label: 'Instagram', href: 'https://www.instagram.com/aptivo.education' }, { label: 'Facebook', href: 'https://www.facebook.com/share/17EjFzZJWo/' }, { label: 'LinkedIn', href: 'https://www.linkedin.com/company/aptivoedu' }] },
          ].map(col => (
            <div key={col.title} className="space-y-5">
              <h5 className="font-black text-slate-900 text-[10px] uppercase tracking-widest">{col.title}</h5>
              <ul className="space-y-3">
                {col.links.map(link => (
                  <li key={link.label}><Link href={link.href} className="text-sm font-medium text-slate-500 hover:text-teal-600 transition-colors">{link.label}</Link></li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="pt-8 border-t border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">© 2026 Aptivo Education. All rights reserved.</p>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-100 rounded-lg">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">All Systems Operational</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
