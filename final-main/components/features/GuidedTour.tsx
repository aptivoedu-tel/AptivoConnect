'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTour, TOUR_STEPS } from '@/lib/context/TourContext';

const CARD_W = 310;
const CARD_H = 240;
const GAP    = 16;
const PAD    = 10;

type Spot = { top: number; left: number; width: number; height: number };

function calcCardPos(spot: Spot, pos: string, vpW: number, vpH: number) {
    const isMobile = vpW < 768;
    
    if (isMobile) {
        // On mobile, keep the card at the bottom for better reachability
        return {
            top: vpH - CARD_H - 24,
            left: vpW / 2 - CARD_W / 2,
            isMobile: true
        };
    }

    let top = 0, left = 0;
    switch (pos) {
        case 'right':  top = spot.top + spot.height / 2 - CARD_H / 2;  left = spot.left + spot.width + GAP; break;
        case 'left':   top = spot.top + spot.height / 2 - CARD_H / 2;  left = spot.left - CARD_W - GAP;    break;
        case 'bottom': top  = spot.top + spot.height + GAP;              left = spot.left + spot.width / 2 - CARD_W / 2; break;
        default:       top  = spot.top - CARD_H - GAP;                   left = spot.left + spot.width / 2 - CARD_W / 2;
    }
    return {
        top:  Math.max(12, Math.min(top,  vpH - CARD_H - 12)),
        left: Math.max(12, Math.min(left, vpW - CARD_W - 12)),
        isMobile: false
    };
}

export default function GuidedTour() {
    const router = useRouter();
    const { isTourActive, currentStep, currentStepIndex, totalSteps, goToStep, endTour } = useTour();

    const [spot, setSpot]       = useState<Spot | null>(null);
    const [vp, setVp]           = useState({ w: 1280, h: 800 });
    const [mounted, setMounted] = useState(false);
    const intervalRef           = useRef<ReturnType<typeof setInterval> | null>(null);
    const listenerElRef         = useRef<HTMLElement | null>(null);

    // Portal needs DOM
    useEffect(() => { setMounted(true); }, []);

    // Viewport tracking
    useEffect(() => {
        const fn = () => setVp({ w: window.innerWidth, h: window.innerHeight });
        fn();
        window.addEventListener('resize', fn);
        return () => window.removeEventListener('resize', fn);
    }, []);

    // Navigate to next step's page + advance index
    const nextStep = useCallback(() => {
        const next = currentStepIndex + 1;
        if (next >= TOUR_STEPS.length) { endTour(); return; }
        const nextDef = TOUR_STEPS[next];
        goToStep(next);
        if (nextDef.navigateTo) router.push(nextDef.navigateTo);
    }, [currentStepIndex, goToStep, endTour, router]);

    // Click handler attached to the real target element
    const handleTargetClick = useCallback(() => {
        // 200ms delay lets the element's own handler fire first (navigate, set state, etc.)
        setTimeout(() => nextStep(), 200);
    }, [nextStep]);

    // Track target element rect + attach click listener
    useEffect(() => {
        if (!isTourActive || !currentStep) { setSpot(null); return; }

        const attachAndMeasure = (isInitial = false) => {
            const el = document.querySelector(currentStep.targetSelector) as HTMLElement | null;
            
            // If element is missing (e.g. mobile element on desktop or vice versa)
            if (!el) {
                setSpot(null);
                // If it's the very first attempt to find this element and it's missing,
                // wait a tiny bit then skip it to prevent stuck users
                if (isInitial) {
                    setTimeout(() => {
                        const stillMissing = !document.querySelector(currentStep.targetSelector);
                        if (stillMissing) nextStep();
                    }, 500);
                }
                return; 
            }

            // Scroll into view only on initial load or if significantly out of view
            if (isInitial) {
                el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
            }

            // Measure
            const r = el.getBoundingClientRect();
            const newSpot = { top: r.top - PAD, left: r.left - PAD, width: r.width + PAD * 2, height: r.height + PAD * 2 };
            
            // Only update if changed slightly to prevent jitter
            setSpot(prev => {
                if (!prev) return newSpot;
                const diff = Math.abs(prev.top - newSpot.top) + Math.abs(prev.left - newSpot.left);
                return diff > 2 ? newSpot : prev;
            });

            // Attach click listener only once per element
            if (listenerElRef.current !== el) {
                listenerElRef.current?.removeEventListener('click', handleTargetClick);
                el.addEventListener('click', handleTargetClick);
                listenerElRef.current = el;
            }
        };

        const handleScroll = () => attachAndMeasure(false);
        const delay = setTimeout(() => attachAndMeasure(true), 400);
        intervalRef.current = setInterval(() => attachAndMeasure(false), 800); // Slower interval
        window.addEventListener('scroll', handleScroll, true);

        return () => {
            clearTimeout(delay);
            if (intervalRef.current) clearInterval(intervalRef.current);
            window.removeEventListener('scroll', handleScroll, true);
            listenerElRef.current?.removeEventListener('click', handleTargetClick);
            listenerElRef.current = null;
            setSpot(null);
        };
    }, [isTourActive, currentStep, currentStepIndex, handleTargetClick]);

    if (!mounted || !isTourActive || !currentStep) return null;

    const cardPos = spot
        ? calcCardPos(spot, currentStep.position, vp.w, vp.h)
        : vp.w < 768 
            ? { top: vp.h - CARD_H - 24, left: vp.w / 2 - CARD_W / 2, isMobile: true } 
            : { top: vp.h / 2 - CARD_H / 2, left: vp.w / 2 - CARD_W / 2, isMobile: false };

    const pct    = ((currentStepIndex + 1) / totalSteps) * 100;
    const isLast = currentStepIndex === totalSteps - 1;

    const overlay = (
        <div style={{ position: 'fixed', inset: 0, zIndex: 99999, pointerEvents: 'none' }}>

            {/* Fallback dark bg when element not found yet */}
            {!spot && (
                <div
                    style={{ position: 'absolute', inset: 0, background: 'rgba(10,15,30,0.82)', pointerEvents: 'auto' }}
                    onClick={endTour}
                />
            )}

            {/* ── SPOTLIGHT ─────────────────────────────────────────────────────
                pointer-events: NONE → clicks pass through to the real element.
                Huge box-shadow creates the dark overlay; transparent body = hole.
            ─────────────────────────────────────────────────────────────────── */}
            <AnimatePresence>
                {spot && (
                    <motion.div
                        key={`spot-${currentStepIndex}`}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        style={{
                            position:      'absolute',
                            top:           spot.top,
                            left:          spot.left,
                            width:         spot.width,
                            height:        spot.height,
                            borderRadius:  14,
                            background:    'transparent',
                            pointerEvents: 'none',
                            boxShadow: [
                                '0 0 0 9999px rgba(10,15,30,0.82)',
                                '0 0 0 3px rgba(255,255,255,0.95)',
                                '0 0 30px 10px rgba(255,255,255,0.18)',
                            ].join(', '),
                        }}
                    />
                )}
            </AnimatePresence>

            {/* ── TOOLTIP CARD ──────────────────────────────────────────────── */}
            <AnimatePresence mode="wait">
                <motion.div
                    key={`card-${currentStepIndex}`}
                    initial={cardPos.isMobile ? { opacity: 0, y: 100 } : { opacity: 0, y: 10, scale: 0.94 }}
                    animate={{ opacity: 1, y: 0,  scale: 1    }}
                    exit={cardPos.isMobile ? { opacity: 0, y: 100 } : { opacity: 0, y: -8,  scale: 0.96 }}
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    onClick={(e) => e.stopPropagation()}
                    style={{
                        position:      'absolute',
                        top:           cardPos.top,
                        left:          cardPos.left,
                        width:         vp.w < 768 ? Math.min(CARD_W, vp.w - 32) : CARD_W,
                        pointerEvents: 'auto',
                        borderRadius:  22,
                        background:    '#ffffff',
                        boxShadow:     '0 20px 60px rgba(0,0,0,0.28), 0 4px 16px rgba(0,0,0,0.10)',
                        overflow:      'hidden',
                    }}
                >
                    {/* Top progress bar */}
                    <div style={{ height: 4, background: '#f1f5f9' }}>
                        <motion.div
                            style={{ height: '100%', background: 'linear-gradient(90deg,#6366f1,#8b5cf6)', borderRadius: 4 }}
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{ duration: 0.4 }}
                        />
                    </div>

                    <div style={{ padding: '18px 20px 20px' }}>
                        {/* Header */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                                <div style={{ width: 24, height: 24, borderRadius: 7, background: '#eef2ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Sparkles style={{ width: 12, height: 12, color: '#6366f1' }} />
                                </div>
                                <span style={{ fontSize: 10, fontWeight: 900, color: '#6366f1', textTransform: 'uppercase', letterSpacing: '0.15em' }}>
                                    Step {currentStepIndex + 1} of {totalSteps}
                                </span>
                            </div>
                            <button
                                onClick={(e) => { e.stopPropagation(); endTour(); }}
                                style={{ 
                                    width: 36, height: 36, // Larger for touch
                                    border: 'none', background: 'transparent', cursor: 'pointer', 
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', 
                                    borderRadius: 10, color: '#94a3b8', padding: 0 
                                }}
                                onMouseEnter={e => (e.currentTarget.style.background = '#f1f5f9')}
                                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                                title="Skip tour"
                            >
                                <X style={{ width: 20, height: 20 }} />
                            </button>
                        </div>

                        {/* Step dots */}
                        <div style={{ display: 'flex', gap: 5, marginBottom: 12 }}>
                            {TOUR_STEPS.map((_, i) => (
                                <div key={i} style={{
                                    height: 5, borderRadius: 3,
                                    width:      i === currentStepIndex ? 22 : 7,
                                    background: i <= currentStepIndex
                                        ? 'linear-gradient(90deg,#6366f1,#8b5cf6)'
                                        : '#e2e8f0',
                                    transition: 'all 0.25s',
                                }} />
                            ))}
                        </div>

                        {/* Title */}
                        <p style={{ fontSize: 16, fontWeight: 900, color: '#0f172a', margin: '0 0 7px', lineHeight: 1.3 }}>
                            {currentStep.title}
                        </p>

                        {/* Description */}
                        <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 14px', lineHeight: 1.55, fontWeight: 500 }}>
                            {currentStep.description}
                        </p>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {/* Action hint */}
                            <div style={{
                                display: 'flex', alignItems: 'center', gap: 8,
                                background: '#eef2ff', borderRadius: 10, padding: '10px 14px',
                                border: '1px solid #e0e7ff',
                            }}>
                                <div style={{
                                    width: 7, height: 7, borderRadius: '50%',
                                    background: '#6366f1', flexShrink: 0,
                                    animation: 'aptTourPulse 2s ease-in-out infinite',
                                }} />
                                <span style={{ fontSize: 11, color: '#4f46e5', fontWeight: 700 }}>
                                    {spot
                                        ? isLast
                                            ? 'Tap the highlighted element to finish!'
                                            : 'Tap the highlighted element to continue'
                                        : 'Connecting…'}
                                </span>
                            </div>

                            {/* Mobile Skip Button - Prominent */}
                            <button
                                onClick={(e) => { e.stopPropagation(); endTour(); }}
                                style={{ 
                                    width: '100%', 
                                    padding: '10px', 
                                    borderRadius: 12, 
                                    border: '1px solid #e2e8f0', 
                                    background: '#fff', 
                                    color: '#64748b', 
                                    fontSize: 12, 
                                    fontWeight: 700,
                                    cursor: 'pointer'
                                }}
                            >
                                Skip Tutorial
                            </button>
                        </div>
                    </div>
                </motion.div>
            </AnimatePresence>

            <style>{`
                @keyframes aptTourPulse {
                    0%, 100% { opacity: 1; transform: scale(1); }
                    50%       { opacity: 0.4; transform: scale(1.5); }
                }
            `}</style>
        </div>
    );

    return createPortal(overlay, document.body);
}
