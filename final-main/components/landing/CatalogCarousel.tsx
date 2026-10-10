'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, ArrowRight, Calculator, Share2, Brain, Activity, Award, Trophy, BookOpen, Target as TargetIcon } from 'lucide-react';
import Link from 'next/link';

const subjectConfig = [
  { gradient: ['#0f2027', '#203a43', '#2c5364'], accent: '#00d4aa', deco: 'grid' },
  { gradient: ['#1a1a2e', '#16213e', '#0f3460'], accent: '#5e72e4', deco: 'circles' },
  { gradient: ['#0d1b2a', '#1b2838', '#1a3a4a'], accent: '#11cdef', deco: 'lines' },
  { gradient: ['#12100e', '#1a1a2e', '#2c3e50'], accent: '#fb6340', deco: 'dots' },
  { gradient: ['#0f0c29', '#302b63', '#24243e'], accent: '#a855f7', deco: 'grid' },
  { gradient: ['#141e30', '#243b55', '#1a2a3a'], accent: '#2dce89', deco: 'circles' },
  { gradient: ['#1a0533', '#2d0d5e', '#1a1050'], accent: '#f59e0b', deco: 'lines' },
  { gradient: ['#0a2818', '#0f4c2a', '#0d3520'], accent: '#34d399', deco: 'dots' },
];

function CardDeco({ type, accent }: { type: string; accent: string }) {
  if (type === 'circles') return (
    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 300 400" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">
      <circle cx="220" cy="80" r="90" stroke={accent} strokeWidth="1" strokeOpacity="0.15" />
      <circle cx="220" cy="80" r="55" stroke={accent} strokeWidth="1" strokeOpacity="0.2" />
      <circle cx="220" cy="80" r="25" fill={accent} fillOpacity="0.12" />
      <circle cx="60" cy="300" r="50" stroke={accent} strokeWidth="0.8" strokeOpacity="0.1" />
    </svg>
  );
  if (type === 'grid') return (
    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 300 400" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">
      <defs>
        <pattern id={`g-${accent}`} width="30" height="30" patternUnits="userSpaceOnUse">
          <path d="M 30 0 L 0 0 0 30" fill="none" stroke={accent} strokeWidth="0.5" strokeOpacity="0.15" />
        </pattern>
      </defs>
      <rect width="300" height="400" fill={`url(#g-${accent})`} />
      <circle cx="240" cy="60" r="60" fill={accent} fillOpacity="0.08" />
    </svg>
  );
  if (type === 'lines') return (
    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 300 400" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">
      <line x1="0" y1="100" x2="300" y2="50" stroke={accent} strokeWidth="0.8" strokeOpacity="0.15" />
      <line x1="0" y1="160" x2="300" y2="110" stroke={accent} strokeWidth="0.8" strokeOpacity="0.12" />
      <line x1="0" y1="220" x2="300" y2="170" stroke={accent} strokeWidth="0.8" strokeOpacity="0.1" />
      <circle cx="230" cy="70" r="70" stroke={accent} strokeWidth="1" strokeOpacity="0.12" />
    </svg>
  );
  return (
    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 300 400" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">
      {[...Array(8)].map((_, r) =>
        [...Array(6)].map((_, c) => (
          <circle key={`${r}-${c}`} cx={30 + c * 45} cy={40 + r * 50} r="2" fill={accent} fillOpacity="0.18" />
        ))
      )}
      <circle cx="220" cy="90" r="65" stroke={accent} strokeWidth="1" strokeOpacity="0.1" fill={accent} fillOpacity="0.05" />
    </svg>
  );
}

export default function CatalogCarousel({ subjects }: { subjects: any[] }) {
  const [catalogIdx, setCatalogIdx] = React.useState(0);
  const catalogRef = React.useRef<HTMLDivElement>(null);
  const [cardPx, setCardPx] = React.useState(0);
  const [cardsVisible, setCardsVisible] = React.useState(4);
  const GAP = 20;

  const icons = [Calculator, Share2, Brain, Activity, Award, Trophy, BookOpen, TargetIcon];

  const tracks = React.useMemo(() => {
    return (subjects || []).map((s: any, i: number) => ({
      id: s.id || s._id || i,
      title: s.name,
      icon: icons[i % icons.length],
      ...subjectConfig[i % subjectConfig.length],
    }));
  }, [subjects]);

  const maxIdx = Math.max(0, tracks.length - cardsVisible);
  const canPrev = catalogIdx > 0;
  const canNext = catalogIdx < maxIdx;
  const slidePrev = () => setCatalogIdx(i => Math.max(0, i - 1));
  const slideNext = () => setCatalogIdx(i => Math.min(maxIdx, i + 1));

  React.useEffect(() => {
    const update = () => {
      if (catalogRef.current) {
        const width = window.innerWidth;
        let visible = 4;
        if (width < 640) visible = 1;
        else if (width < 1024) visible = 2;
        else if (width < 1280) visible = 3;

        setCardsVisible(visible);
        const w = (catalogRef.current.clientWidth - GAP * (visible - 1)) / visible;
        setCardPx(w);
      }
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [tracks]);

  React.useEffect(() => {
    if (catalogIdx > maxIdx) {
      setCatalogIdx(maxIdx);
    }
  }, [maxIdx, catalogIdx]);

  React.useEffect(() => {
    if (tracks.length <= cardsVisible) return;
    const timer = setInterval(() => {
      setCatalogIdx(prev => (prev >= maxIdx ? 0 : prev + 1));
    }, 3000);
    return () => clearInterval(timer);
  }, [tracks.length, maxIdx, cardsVisible]);

  if (tracks.length === 0) return null;

  return (
    <section id="catalog" className="py-24 bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-6 mb-10">
          <div className="space-y-2">
            <p className="text-[10px] font-black text-teal-600 uppercase tracking-[0.25em]">The Academic Catalog</p>
            <h2 className="text-4xl lg:text-5xl font-black text-slate-900 tracking-tight leading-tight">
              Specialized tracks designed for the<br className="hidden lg:block" /> most rigorous global admission demands.
            </h2>
          </div>
          <div className="flex items-center gap-2 shrink-0 self-end md:self-auto">
            <button
              onClick={slidePrev}
              disabled={!canPrev}
              className={`w-10 h-10 rounded-full border flex items-center justify-center transition-all ${canPrev ? 'border-slate-300 text-slate-700 hover:bg-teal-600 hover:border-teal-600 hover:text-white' : 'border-slate-200 text-slate-300 cursor-not-allowed'}`}
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={slideNext}
              disabled={!canNext}
              className={`w-10 h-10 rounded-full border flex items-center justify-center transition-all ${canNext ? 'border-slate-300 text-slate-700 hover:bg-teal-600 hover:border-teal-600 hover:text-white' : 'border-slate-200 text-slate-300 cursor-not-allowed'}`}
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="overflow-hidden" ref={catalogRef}>
          <motion.div
            className="flex"
            style={{ gap: GAP }}
            animate={{ x: cardPx > 0 ? -(catalogIdx * (cardPx + GAP)) : 0 }}
            transition={{ type: 'spring', stiffness: 320, damping: 38 }}
          >
            {tracks.map((track: any) => {
              const IconCmp = track.icon;
              const [g1, g2, g3] = track.gradient;
              return (
                <div
                  key={track.id}
                  className="shrink-0 group cursor-pointer relative rounded-3xl overflow-hidden flex flex-col justify-end shadow-xl hover:shadow-2xl transition-all duration-500"
                  style={{
                    width: cardPx > 0 ? `${cardPx}px` : `calc(${100 / cardsVisible}% - ${GAP * (cardsVisible - 1) / cardsVisible}px)`,
                    height: '300px',
                    background: `linear-gradient(145deg, ${g1} 0%, ${g2} 55%, ${g3} 100%)`
                  }}
                >
                  <CardDeco type={track.deco} accent={track.accent} />

                  <div
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                    style={{ background: `radial-gradient(circle at 60% 30%, ${track.accent}20 0%, transparent 70%)` }}
                  />

                  <div
                    className="absolute top-5 left-5 w-11 h-11 rounded-2xl flex items-center justify-center backdrop-blur-sm border border-white/10 z-10"
                    style={{ background: `${track.accent}22` }}
                  >
                    <IconCmp className="w-5 h-5" style={{ color: track.accent }} />
                  </div>

                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />

                  <div className="relative z-10 p-5">
                    <h3 className="text-base font-black text-white leading-tight mb-0.5">{track.title}</h3>
                    <p className="text-white/40 text-[10px] font-bold uppercase tracking-wider mb-3">Verified Curriculum</p>
                    <Link
                      href="/courses"
                      onClick={e => e.stopPropagation()}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider text-white border border-white/20 hover:bg-white/15 transition-all"
                    >
                      Practice <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </motion.div>
        </div>

        {tracks.length > cardsVisible && (
          <div className="flex justify-center gap-2 mt-7">
            {Array.from({ length: maxIdx + 1 }).map((_, i) => (
              <button
                key={i}
                onClick={() => setCatalogIdx(i)}
                className={`rounded-full transition-all ${i === catalogIdx ? 'w-6 h-2 bg-teal-600' : 'w-2 h-2 bg-slate-300 hover:bg-slate-400'}`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
