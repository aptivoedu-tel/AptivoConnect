'use client';

import Link from 'next/link';
import { Home, LibraryBig, Target, TrendingUp, Globe2 } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

const items = [
    { label: 'Dashboard', href: '/dashboard', icon: Home, matches: (path: string) => path === '/dashboard' },
    { label: 'University', href: '/university', icon: LibraryBig, matches: (path: string) => path.startsWith('/university') },
    { label: 'Practice', href: '/practice', icon: Target, matches: (path: string) => path === '/practice' || path.startsWith('/practice/') },
    { label: 'Exams', href: '/test-sections', icon: Globe2, matches: (path: string) => path === '/test-sections' || path.startsWith('/test-sections/') },
    { label: 'Progress', href: '/progress', icon: TrendingUp, matches: (path: string) => path === '/progress' },
];

export default function MobileBottomNav() {
    const pathname = usePathname();

    useEffect(() => {
        document.body.classList.add('aptivo-mobile-nav');
        return () => document.body.classList.remove('aptivo-mobile-nav');
    }, []);

    return (
        <nav aria-label="Primary mobile navigation" className="fixed inset-x-3.5 bottom-[calc(env(safe-area-inset-bottom)+0.75rem)] z-40 rounded-[1.95rem] border border-slate-200/90 bg-[#fdfefd] p-1.5 shadow-[0_14px_32px_rgba(15,23,42,0.12),0_2px_8px_rgba(13,148,136,0.06)] lg:hidden">
            <div className="mx-auto flex h-[3.35rem] max-w-md items-center justify-between rounded-[1.55rem] bg-white/70 px-0.5">
                {items.map(({ label, href, icon: Icon, matches }) => {
                    const active = matches(pathname);
                    return (
                        <Link key={href} href={href} aria-label={label === 'Exams' ? 'Global Exams' : label} className={`flex h-12 shrink-0 items-center justify-center rounded-[1.35rem] text-[11px] font-semibold transition-all duration-200 ease-out ${active ? 'w-auto gap-2 border border-teal-100 bg-[#e8fbf6] px-3.5 text-teal-800 shadow-[0_2px_7px_rgba(13,148,136,0.12)]' : 'w-11 text-slate-700 hover:bg-slate-50 hover:text-slate-900'}`}>
                            <Icon className={`h-[22px] w-[22px] shrink-0 ${active ? 'stroke-[2.5]' : 'stroke-[2.25]'}`} />
                            <span className={`overflow-hidden whitespace-nowrap transition-all duration-200 ease-out ${active ? 'max-w-20 opacity-100' : 'max-w-0 opacity-0'}`}>{label}</span>
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
}
