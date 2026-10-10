/**
 * Shared XP calculation utilities for the Aptivo League system.
 *
 * XP Formula (per session / exam):
 *   xp = (correct_answers × 10) − (wrong_answers × 5) + streak_bonus
 *   streak_bonus = min(50, current_streak × 5)   [max +50 XP for a 10-day streak]
 *
 * XP can go NEGATIVE — this mirrors MDCAT negative-marking rules and
 * discourages random guessing on the leaderboard.
 */

import LearningStreak from '@/lib/mongodb/models/LearningStreak';

/**
 * Compute the current learning streak for a student.
 * Counts consecutive days (including today or yesterday) with at least one session.
 */
export async function computeCurrentStreak(studentId: string): Promise<number> {
    try {
        const streaks = await LearningStreak.find({ student_id: studentId })
            .sort({ streak_date: -1 })
            .limit(400)
            .lean();

        if (!streaks.length) return 0;

        const streakDates = new Set(streaks.map((s: any) => s.streak_date as string));
        const today = new Date().toISOString().split('T')[0];
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];

        // Streak must include today or yesterday to be "active"
        let startOffset = -1;
        if (streakDates.has(today)) startOffset = 0;
        else if (streakDates.has(yesterdayStr)) startOffset = 1;

        if (startOffset < 0) return 0;

        let streak = 0;
        for (let i = startOffset; i < 400; i++) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            if (streakDates.has(d.toISOString().split('T')[0])) streak++;
            else break;
        }
        return streak;
    } catch {
        return 0;
    }
}

/**
 * Calculate XP earned for a completed activity.
 * @param correct  Number of correct answers
 * @param wrong    Number of wrong answers (not skipped)
 * @param streak   Current learning streak in days
 */
export function calculateXP(correct: number, wrong: number, streak: number): number {
    const base = (correct * 10) - (wrong * 5);
    const streakBonus = Math.min(50, streak * 5);
    return base + streakBonus;
}

/**
 * Get the ISO week string for a given date, e.g. "2026-W28".
 * Used to detect when the league week has changed and reset XP.
 */
export function getISOWeekKey(date: Date = new Date()): string {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    // ISO week starts Monday — find Thursday of the current week
    d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
    const week1 = new Date(d.getFullYear(), 0, 4);
    const weekNum = 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
    return `${d.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}
