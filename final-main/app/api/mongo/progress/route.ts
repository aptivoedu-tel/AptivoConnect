import { NextRequest, NextResponse } from 'next/server';
import { getPortalSession as getServerSession } from '@/lib/portalSession';
import { authOptions } from '@/lib/authOptions';
import connectToDatabase from '@/lib/mongodb/connection';
import PracticeSession from '@/lib/mongodb/models/PracticeSession';
import MCQAttempt from '@/lib/mongodb/models/MCQAttempt';
import LearningStreak from '@/lib/mongodb/models/LearningStreak';
import { getNextSequence } from '@/lib/mongodb/counter';
import { SubtopicProgress, TopicProgress } from '@/lib/mongodb/models';

export async function POST(req: NextRequest) {
    try {
        await connectToDatabase();
        // Authenticate
        const session = await getServerSession(authOptions);
        if (!session || !['super_admin', 'institution_admin', 'student'].includes(session.user.role)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const body = await req.json();
        const { subtopic_id, topic_id, is_completed = true } = body;
        const student_id = session.user.id; // enforce session ID

        if (!student_id) {
            return NextResponse.json({ error: 'student_id is required' }, { status: 400 });
        }

        if (subtopic_id) {
            await SubtopicProgress.findOneAndUpdate(
                { student_id, subtopic_id },
                {
                    is_completed,
                    reading_percentage: is_completed ? 100 : 0,
                    last_accessed_at: new Date(),
                    completed_at: is_completed ? new Date() : undefined
                },
                { upsert: true, returnDocument: 'after' }
            );
        } else if (topic_id) {
            await TopicProgress.findOneAndUpdate(
                { student_id, topic_id },
                {
                    is_completed,
                    reading_percentage: is_completed ? 100 : 0,
                    last_accessed_at: new Date(),
                    completed_at: is_completed ? new Date() : undefined
                },
                { upsert: true, returnDocument: 'after' }
            );
        } else {
            return NextResponse.json({ error: 'subtopic_id or topic_id is required' }, { status: 400 });
        }

        // Verify student has at least one completed practice session before granting a streak
        const completedSession = await PracticeSession.findOne({ student_id, is_completed: true });
        if (!completedSession) {
            return NextResponse.json({ success: true, streak_updated: false });
        }
        // Update streak
        const today = new Date().toISOString().split('T')[0];
        await LearningStreak.findOneAndUpdate(
            { student_id, streak_date: today },
            { student_id, streak_date: today },
            { upsert: true }
        );

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('[/api/mongo/progress POST] Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function GET(req: NextRequest) {
    try {
        await connectToDatabase();
        // Authentication & RBAC guard
        const session = await getServerSession(authOptions);
        if (!session || !['super_admin', 'institution_admin', 'student'].includes(session.user.role)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const studentId = session.user.id; // secured from session

        if (!studentId) {
            return NextResponse.json({ error: 'student_id is required' }, { status: 400 });
        }

        const [subtopicProgress, topicProgress] = await Promise.all([
            SubtopicProgress.find({ student_id: studentId }),
            TopicProgress.find({ student_id: studentId })
        ]);

        return NextResponse.json({
            subtopic_progress: subtopicProgress,
            topic_progress: topicProgress
        });
    } catch (error: any) {
        console.error('[/api/mongo/progress GET] Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
