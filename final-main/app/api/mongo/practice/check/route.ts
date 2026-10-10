import { NextRequest, NextResponse } from 'next/server';
import { getPortalSession as getServerSession } from '@/lib/portalSession';
import { authOptions } from '@/lib/authOptions';
import connectToDatabase from '@/lib/mongodb/connection';
import { MCQ } from '@/lib/mongodb/models';
import PracticeSession from '@/lib/mongodb/models/PracticeSession';

/**
 * GET: Returns only the correct option and explanation for a specific question.
 * Used for background prefetching and immediate feedback.
 */
export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await connectToDatabase();
        const { searchParams } = new URL(req.url);
        const mcq_id = parseInt(searchParams.get('mcq_id') || '');
        const session_id = parseInt(searchParams.get('session_id') || '');

        if (!mcq_id || !session_id) {
            return NextResponse.json({ error: 'mcq_id and session_id are required' }, { status: 400 });
        }

        // Verify session belongs to the user and includes the question
        const practiceSession = await PracticeSession.findOne({ id: session_id });
        if (!practiceSession) {
            return NextResponse.json({ error: 'Session not found' }, { status: 404 });
        }

        const userId = (session.user as any).id;
        const userRole = (session.user as any).role;
        if (practiceSession.student_id !== userId && userRole !== 'super_admin') {
            return NextResponse.json({ error: 'Forbidden: You do not own this session' }, { status: 403 });
        }

        if (!practiceSession.mcq_ids.includes(mcq_id)) {
            return NextResponse.json({ error: 'Invalid question for this session' }, { status: 403 });
        }

        // Fetch just the sensitive data
        const mcq = await MCQ.findOne({ id: mcq_id }).select('correct_option explanation explanation_url').lean() as any;

        if (!mcq) {
            return NextResponse.json({ error: 'Question not found' }, { status: 404 });
        }

        return NextResponse.json({
            mcq_id: mcq_id,
            correct_option: mcq.correct_option,
            explanation: mcq.explanation,
            explanation_url: mcq.explanation_url
        });
    } catch (error: any) {
        console.error('[API/PracticeCheck] Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
