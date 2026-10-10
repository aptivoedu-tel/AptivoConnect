'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { usePathname } from 'next/navigation';

export type TourStep = {
    id: string;
    targetSelector: string;
    title: string;
    description: string;
    position: 'top' | 'bottom' | 'left' | 'right';
    navigateTo?: string;
};

export const TOUR_STEPS: TourStep[] = [
    {
        id: 'mobile-menu',
        targetSelector: '[data-tour="mobile-menu-toggle"]',
        title: '📱 Open Menu',
        description: 'Tap here to open your sidebar and access the University Library, Practice sessions, and more.',
        position: 'bottom',
    },
    {
        id: 'sidebar-university',
        targetSelector: '[data-tour="sidebar-university"]',
        title: '🎓 University Library',
        description: 'Click here to browse and join universities. This is your gateway to all institutional content.',
        position: 'right',
        navigateTo: '/university',
    },
    {
        id: 'join-institutions',
        targetSelector: '[data-tour="join-institutions"]',
        title: '➕ Join an Institution',
        description: 'Click this button to find and enroll in a university that matches your academic goals.',
        position: 'bottom',
        navigateTo: '/university',
    },
    {
        id: 'join-uni-btn',
        targetSelector: '[data-tour="join-uni-btn"]',
        title: '🏫 Connect to a University',
        description: 'Search for your university and tap "Join" to enroll and unlock its full curriculum.',
        position: 'left',
        navigateTo: '/university',
    },
    {
        id: 'university-card',
        targetSelector: '[data-tour="university-card"]',
        title: '🚀 Enter Your Campus',
        description: 'Your enrolled universities appear here. Click a card to enter its dedicated learning portal.',
        position: 'top',
        navigateTo: '/university',
    },
    {
        id: 'practice-btn',
        targetSelector: '[data-tour="practice-btn"]',
        title: '🎯 Start Practising',
        description: 'Click "Practice" on any topic or subtopic to launch an interactive MCQ session!',
        position: 'left',
    },
];

// Admin roles that should NEVER see the tour
const ADMIN_ROLES = ['super_admin', 'institution_admin', 'admin'];

type TourContextType = {
    isTourActive: boolean;
    currentStepIndex: number;
    totalSteps: number;
    currentStep: TourStep | null;
    goToStep: (index: number) => void;
    endTour: () => void;
    restartTour: () => void;
};

const TourContext = createContext<TourContextType | undefined>(undefined);

export const TourProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isTourActive, setIsTourActive] = useState(false);
    const [currentStepIndex, setCurrentStepIndex] = useState(0);
    const pathname = usePathname();

    const getTourKey = useCallback(() => {
        try {
            const userStr = localStorage.getItem('aptivo_user');
            if (userStr) {
                const user = JSON.parse(userStr);
                if (user?.id) {
                    return `aptivo_tour_completed_${user.id}`;
                }
            }
        } catch { }
        return 'aptivo_tour_completed_fallback';
    }, []);

    useEffect(() => {
        try {
            // Only start tour if on the dashboard or university pages
            if (!pathname || (!pathname.startsWith('/dashboard') && !pathname.startsWith('/university'))) {
                return;
            }

            // Must be logged in fully
            const userStr = localStorage.getItem('aptivo_user');
            if (!userStr) return;

            // Skip tour for any admin role
            const user = JSON.parse(userStr);
            const role = user?.role ?? '';
            if (ADMIN_ROLES.includes(role)) return;

            // Permanent database check
            if (user.tour_completed === true) return;

            // Only start if not already completed for THIS user locally (in case DB didn't sync yet)
            const tourKey = getTourKey();
            const done = localStorage.getItem(tourKey);
            if (done) return;

            // Delay starts only on first valid page render
            const timer = setTimeout(() => setIsTourActive(true), 1200);
            return () => clearTimeout(timer);
        } catch {
            // Fail silently — don't break the app
        }
    }, [pathname, getTourKey]);

    const endTour = useCallback(async () => {
        setIsTourActive(false);
        try { localStorage.setItem(getTourKey(), 'true'); } catch { /* no-op */ }
        
        try {
            // Sync with backend permanently
            const res = await fetch('/api/auth/me', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tour_completed: true })
            });
            if (res.ok) {
                const data = await res.json();
                if (data.user) {
                    localStorage.setItem('aptivo_user', JSON.stringify(data.user));
                }
            }
        } catch (e) {
            console.error('Failed to save tour state to DB', e);
        }
    }, [getTourKey]);

    const restartTour = useCallback(() => {
        try { localStorage.removeItem(getTourKey()); } catch { /* no-op */ }
        setCurrentStepIndex(0);
        setIsTourActive(true);
    }, [getTourKey]);

    const goToStep = useCallback((index: number) => {
        if (index < 0) { endTour(); return; }
        if (index >= TOUR_STEPS.length) { endTour(); return; }
        setCurrentStepIndex(index);
    }, [endTour]);

    const currentStep = isTourActive ? TOUR_STEPS[currentStepIndex] : null;

    return (
        <TourContext.Provider value={{
            isTourActive,
            currentStepIndex,
            totalSteps: TOUR_STEPS.length,
            currentStep,
            goToStep,
            endTour,
            restartTour,
        }}>
            {children}
        </TourContext.Provider>
    );
};

export const useTour = (): TourContextType => {
    const ctx = useContext(TourContext);
    if (!ctx) throw new Error('useTour must be used within TourProvider');
    return ctx;
};
