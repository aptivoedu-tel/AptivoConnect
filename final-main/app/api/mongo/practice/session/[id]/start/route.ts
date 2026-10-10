import { NextRequest, NextResponse } from 'next/server';
import { getPortalSession as getServerSession } from '@/lib/portalSession';
import { authOptions } from '@/lib/authOptions';
import connectToDatabase from '@/lib/mongodb/connection';
import PracticeSession from '@/lib/mongodb/models/PracticeSession';
import { MCQ, Passage } from '@/lib/mongodb/models';

export async function GET(
    req: NextRequest,
    context: { params: Promise<unknown> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await context.params as { id: string };
        await connectToDatabase();
        const sessionId = parseInt(id);

        if (isNaN(sessionId)) {
            return NextResponse.json({ error: 'Invalid session ID' }, { status: 400 });
        }

        const practiceSession = await PracticeSession.findOne({ id: sessionId });

        if (!practiceSession) {
            return NextResponse.json({ error: 'Practice session not found' }, { status: 404 });
        }

        // Verify session ownership
        const userId = (session.user as any).id;
        const userRole = (session.user as any).role;
        if (practiceSession.student_id !== userId && userRole !== 'super_admin') {
            return NextResponse.json({ error: 'Forbidden: You do not own this session.' }, { status: 403 });
        }

        // Fetch the associated MCQs but STRIP the correct answers and explanations
        let mcqs = [];
        if (practiceSession.mcq_ids && practiceSession.mcq_ids.length > 0) {
            // Find all MCQs in the session
            const rawMcqs = await MCQ.find({ id: { $in: practiceSession.mcq_ids } }).lean();
            
            // Map into the correct order and strip sensitive data
            const mcqMap = new Map();
            rawMcqs.forEach(m => {
                const { correct_option, explanation, ...publicData } = m;
                mcqMap.set(m.id, publicData);
            });
            
            mcqs = practiceSession.mcq_ids.map((id: number) => mcqMap.get(id)).filter(Boolean);

            // Populate passages if they exist
            try {
                const passageIds = Array.from(new Set(
                    mcqs
                        .filter((m: any) => m.passage_id)
                        .map((m: any) => m.passage_id)
                ));

                if (passageIds.length > 0) {
                    const passages = await Passage.find({ id: { $in: passageIds } }).lean();
                    const fetchedPassageMap = new Map();
                    passages.forEach((p: any) => fetchedPassageMap.set(p.id, p));

                    mcqs = mcqs.map((m: any) => {
                        if (m.passage_id && fetchedPassageMap.has(m.passage_id)) {
                            return { ...m, passage: fetchedPassageMap.get(m.passage_id) };
                        }
                        return m;
                    });
                }
            } catch (passageErr) {
                console.error('[API/SessionStart] Error populating passages:', passageErr);
            }
        }

        return NextResponse.json({
            practice_session_id: practiceSession.id,
            university_id: practiceSession.university_id,
            topic_id: practiceSession.topic_id,
            questions: mcqs
        });
    } catch (error: any) {
        console.error('[API/SessionStart] Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
