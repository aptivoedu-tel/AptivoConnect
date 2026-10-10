// MongoDB API - Practice Sessions
// POST: Start a new practice session
// GET: Get user practice history

import { nonnegativeSeconds } from '@/lib/attempt-policy';
import { NextRequest, NextResponse } from 'next/server';
import { getNextSequence } from '@/lib/mongodb/counter';
import { getPortalSession as getServerSession } from '@/lib/portalSession';
import { authOptions } from '@/lib/authOptions';
import connectToDatabase from '@/lib/mongodb/connection';
import PracticeSession from '@/lib/mongodb/models/PracticeSession';
import MCQAttempt from '@/lib/mongodb/models/MCQAttempt';
import LearningStreak from '@/lib/mongodb/models/LearningStreak';
import { User } from '@/lib/mongodb/models';
import { computeCurrentStreak, calculateXP } from '@/lib/services/xpService';

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        await connectToDatabase();
        const { searchParams } = new URL(req.url);
        
        const sessionId = searchParams.get('session_id');
        if (sessionId) {
            const sess = await PracticeSession.findOne({ id: sessionId }).lean() as any;
            if (!sess) return NextResponse.json({ error: 'Session not found' }, { status: 404 });
            
            const userId = (session.user as any).id;
            const userRole = (session.user as any).role;
            if (sess.student_id !== userId && userRole !== 'super_admin') {
                if (userRole === 'institution_admin') {
                    const student = await User.findOne({ id: sess.student_id });
                    if (!student || Number(student.institution_id) !== Number((session.user as any).institution_id)) {
                        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
                    }
                } else {
                    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
                }
            }
            return NextResponse.json({ session: sess });
        }

        let studentId = (session.user as any).id;
        const queryId = searchParams.get('student_id');
        if (queryId && ((session.user as any).role === 'super_admin' || (session.user as any).role === 'institution_admin')) {
            if ((session.user as any).role === 'institution_admin') {
                const student = await User.findOne({ id: queryId });
                if (!student || Number(student.institution_id) !== Number((session.user as any).institution_id)) {
                    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
                }
            }
            studentId = queryId;
        } else if (queryId && queryId !== studentId) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const limit = parseInt(searchParams.get('limit') || '20');

        if (!studentId) {
            return NextResponse.json({ error: 'Missing student identifier' }, { status: 400 });
        }

        const sessions = await PracticeSession.find({ student_id: studentId })
            .sort({ started_at: -1 })
            .limit(limit);

        return NextResponse.json({ sessions, count: sessions.length });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        await connectToDatabase();
        const body = await req.json();
        let student_id = (session.user as any).id;
        const { subtopic_id, topic_id, subject_id, university_id, test_section_id, session_type = 'practice', mcq_ids = [] } = body;

        if (body.student_id && ((session.user as any).role === 'super_admin' || (session.user as any).role === 'institution_admin')) {
            student_id = body.student_id;
        }

        if (!student_id) {
            return NextResponse.json({ error: 'Missing student identifier' }, { status: 400 });
        }

        // Generate a unique incremental ID using atomic counter
        const newId = await getNextSequence('practiceSession');
        const newSession = await PracticeSession.create({
            id: newId,
            student_id,
            subtopic_id,
            topic_id,
            subject_id,
            university_id,
            test_section_id,
            session_type,
            started_at: new Date(),
            is_completed: false,
            total_questions: 0,
            correct_answers: 0,
            wrong_answers: 0,
            skipped_questions: 0,
            time_spent_seconds: 0,
            mcq_ids: mcq_ids,
        });

        return NextResponse.json({ session: newSession }, { status: 201 });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// PATCH: Complete a session and save attempts
export async function PATCH(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        await connectToDatabase();
        const body = await req.json();
        const {
            session_id,
            attempts = [],
            time_spent_seconds,
            total_questions,
            correct_answers,
            wrong_answers,
            skipped_questions
        } = body;

        if (!session_id) {
            return NextResponse.json({ error: 'session_id is required' }, { status: 400 });
        }

        // Verify ownership and fetch session before calculating attempts
        const existingSession = await PracticeSession.findOne({ id: Number(session_id) });
        if (!existingSession) {
            return NextResponse.json({ error: 'Practice session not found' }, { status: 404 });
        }
        const userId = (session.user as any).id;
        const userRole = (session.user as any).role;
        if (existingSession.student_id !== userId && userRole !== 'super_admin') {
            return NextResponse.json({ error: 'Forbidden: You do not own this practice session' }, { status: 403 });
        }
        if (existingSession.is_completed) return NextResponse.json({session:existingSession,attempts_saved:0});
        if (attempts?.length) return NextResponse.json({error:'Save answers through the answer endpoint before completing a session.'},{status:400});
        // Recalculate counts from the DB to ensure integrity and scope to the current student
        const dbAttempts = await MCQAttempt.find({
          practice_session_id: Number(session_id),
          student_id: existingSession.student_id,
        });

        const finalTotal = dbAttempts.length;
        const finalCorrect = dbAttempts.filter(a => a.is_correct).length;
        const finalWrong = dbAttempts.filter(a => !a.is_correct && a.selected_option && a.selected_option !== 'SKIPPED').length;
        const finalSkipped = dbAttempts.filter(a => !a.selected_option || a.selected_option === 'SKIPPED').length;

        const score = finalTotal > 0 ? Math.round(((finalCorrect || 0) / finalTotal) * 100) : 0;

        const isFinalize = body.is_completed === true || body.finalize === true;

        // Update session
        const updateData: any = {
            time_spent_seconds: Math.max(existingSession.time_spent_seconds || 0, nonnegativeSeconds(time_spent_seconds)),
        };

        if (isFinalize) {
            updateData.completed_at = new Date();
            updateData.is_completed = true;
            updateData.total_questions = finalTotal || 0;
            updateData.correct_answers = finalCorrect || 0;
            updateData.wrong_answers = finalWrong || 0;
            updateData.skipped_questions = finalSkipped || 0;
            updateData.score_percentage = score;

            // ── XP Calculation ──────────────────────────────────────────────
            try {
                const streak = await computeCurrentStreak(existingSession.student_id);
                const xp = calculateXP(finalCorrect, finalWrong, streak);
                updateData.xp_earned = xp;
            } catch (xpErr) {
                console.error('[PATCH Practice] XP calc failed:', xpErr);
            }
        } else {
            // Partial sync
            if (finalTotal !== undefined) updateData.total_questions = finalTotal;
            if (finalCorrect !== undefined) updateData.correct_answers = finalCorrect;
            if (finalWrong !== undefined) updateData.wrong_answers = finalWrong;
            if (finalSkipped !== undefined) updateData.skipped_questions = finalSkipped;
        }

        const updateOperation: { $set: Record<string, unknown>; $unset?: Record<string, string> } = { $set: updateData };
        if (isFinalize) {
            updateOperation.$unset = { expiresAt: "" };
        }

        const updatedSession = await PracticeSession.findOneAndUpdate(
            { id: Number(session_id), is_completed: { $ne: true } },
            updateOperation,
            { returnDocument: 'after' }
        );

        if (!updatedSession) {
            return NextResponse.json({ session: await PracticeSession.findOne({id:Number(session_id)}), attempts_saved:0 });
        }

        const attemptsSaved = 0;

        // Update learning streak when a session is finalized
        if (isFinalize && updatedSession?.student_id) {
            try {
                const today = new Date().toISOString().split('T')[0]; // UTC date YYYY-MM-DD
                const streakCount = await LearningStreak.countDocuments({});
                await LearningStreak.findOneAndUpdate(
                    { student_id: updatedSession.student_id, streak_date: today },
                    { 
                        $setOnInsert: { id: streakCount + Date.now() },
                        $set: { student_id: updatedSession.student_id, streak_date: today }
                    },
                    { upsert: true }
                );
            } catch (streakErr) {
                console.error('[PATCH Practice] Streak update failed:', streakErr);
                // Don't fail the whole request if just the streak fails
            }

            // ── Update user league XP ────────────────────────────────────────
            if (updateData.xp_earned !== undefined) {
                try {
                    await User.updateOne(
                        { id: updatedSession.student_id },
                        { $inc: { league_xp: updateData.xp_earned } }
                    );
                } catch (leagueErr) {
                    console.error('[PATCH Practice] League XP update failed:', leagueErr);
                }
            }
        }

        return NextResponse.json({ session: updatedSession, attempts_saved: attemptsSaved });
    } catch (error: any) {
        console.error('[PATCH Practice] Finalize error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
