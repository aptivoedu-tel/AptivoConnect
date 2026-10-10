/**
 * POST /api/mongo/leagues/backfill-xp
 *
 * One-time backfill script to recalculate and save Lifetime XP for ALL students
 * based on their historical practice sessions and exam attempts.
 *
 * XP Formula (per completed session/exam):
 *   xp = (correct_answers × 10) − (wrong_answers × 5)
 *   (streak bonus is NOT applied retroactively — only future sessions get it)
 *
 * This OVERWRITES each student's league_xp with the sum recalculated from their records.
 * 
 * ⚠️  Call this endpoint ONCE from the admin panel or via Postman. 
 *     After backfill, ongoing XP is incremented normally via practice/exam routes.
 */

import { NextResponse } from 'next/server';
import { getPortalSession as getServerSession } from '@/lib/portalSession';
import { authOptions } from '@/lib/authOptions';
import connectToDatabase from '@/lib/mongodb/connection';
import { User } from '@/lib/mongodb/models';
import PracticeSession from '@/lib/mongodb/models/PracticeSession';
import { ExamAttempt } from '@/lib/mongodb/models';

export async function POST() {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        // Only super_admin can run this
        const role = (session.user as any).role;
        if (role !== 'super_admin') {
            return NextResponse.json({ error: 'Forbidden: super_admin only' }, { status: 403 });
        }

        await connectToDatabase();

        // 1. Fetch all active students
        const students = await User.find(
            { role: 'student', status: { $ne: 'inactive' } },
            'id full_name'
        ).lean() as any[];

        const results: { name: string; id: string; xp: number }[] = [];

        for (const student of students) {
            const studentId = String(student.id);
            let totalXP = 0;

            // ── Practice Sessions ──────────────────────────────────────────
            const practiceSessions = await PracticeSession.find(
                { student_id: studentId, is_completed: true },
                'correct_answers wrong_answers xp_earned'
            ).lean() as any[];

            for (const ps of practiceSessions) {
                // If xp_earned was already saved on the session, use that directly
                if (typeof ps.xp_earned === 'number' && ps.xp_earned !== 0) {
                    totalXP += ps.xp_earned;
                } else {
                    // Recalculate from raw correct/wrong counts
                    const correct = Number(ps.correct_answers || 0);
                    const wrong = Number(ps.wrong_answers || 0);
                    const xp = (correct * 10) - (wrong * 5);
                    totalXP += xp;
                }
            }

            // ── Exam Attempts ──────────────────────────────────────────────
            const examAttempts = await ExamAttempt.find(
                { student_id: studentId, status: 'completed' },
                'xp_earned score total_marks'
            ).lean() as any[];

            for (const ea of examAttempts) {
                // If xp_earned was already saved on the attempt, use that directly
                if (typeof ea.xp_earned === 'number' && ea.xp_earned !== 0) {
                    totalXP += ea.xp_earned;
                } else {
                    // Fallback: estimate from score ratio
                    // score = marks earned, total_marks = max marks
                    // Convert to an estimated correct count: score / 1 mark per Q ≈ correct
                    const score = Number(ea.score || 0);
                    const totalMarks = Number(ea.total_marks || 0);
                    if (totalMarks > 0) {
                        // Estimate: correct = score (assuming 1 mark per Q), wrong = 0 (can't reliably calc)
                        const estimatedCorrect = Math.max(0, Math.round(score));
                        totalXP += estimatedCorrect * 10;
                    }
                }
            }

            // ── Save the recalculated XP ───────────────────────────────────
            // Make sure XP is at least 0 (never go negative from backfill)
            const finalXP = Math.max(0, totalXP);
            await User.updateOne(
                { id: studentId },
                { $set: { league_xp: finalXP } }
            );

            results.push({
                name: student.full_name,
                id: studentId,
                xp: finalXP,
            });
        }

        // Sort results descending by XP for a nice preview
        results.sort((a, b) => b.xp - a.xp);

        return NextResponse.json({
            success: true,
            message: `Backfilled XP for ${results.length} students.`,
            topStudents: results.slice(0, 20), // Show top 20 for verification
        });

    } catch (error: any) {
        console.error('[Backfill XP] Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
