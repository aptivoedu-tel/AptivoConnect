import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb/connection';
import PracticeSession from '@/lib/mongodb/models/PracticeSession';
import MCQAttempt from '@/lib/mongodb/models/MCQAttempt';
import { MCQ, Passage } from '@/lib/mongodb/models';
import { getPortalSession as getServerSession } from '@/lib/portalSession';
import { authOptions } from '@/lib/authOptions';

export async function GET(req: NextRequest) {
    try {
        // Authenticate session
        const session = await getServerSession(authOptions);
        if (!session || !['super_admin','institution_admin','student'].includes((session.user as any).role)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const userId = (session.user as any).id;

        // Parse query parameters
        const { searchParams } = new URL(req.url);
        const studentId = searchParams.get('student_id');
        const subtopicId = searchParams.get('subtopic_id');
        const topicId = searchParams.get('topic_id');
        const universityId = searchParams.get('university_id');
        const testSectionId = searchParams.get('test_section_id');

        // Verify student ownership unless admin
        if (studentId && studentId !== userId && !['super_admin','institution_admin'].includes((session.user as any).role)) {
            return NextResponse.json({ error: 'Forbidden: student mismatch' }, { status: 403 });
        }
        const effectiveStudentId = studentId || userId;

        // Ensure database connection
        await connectToDatabase();

        // Build base query with ownership
        const query:any = {
            student_id: effectiveStudentId,
            is_completed: false,
        };

        if (subtopicId) query.subtopic_id = Number(subtopicId);
        if (topicId) query.topic_id = Number(topicId);
        if (universityId && universityId !== 'null') query.university_id = Number(universityId);
        if (testSectionId && testSectionId !== 'null') query.test_section_id = Number(testSectionId);

        // Find the most recent incomplete session
        const sessionDoc = await PracticeSession.findOne(query).sort({ started_at: -1 });

        if (!sessionDoc) {
            return NextResponse.json({ session: null, mcqs: [], attempts: [] }, { status: 200 });
        }

        // Check expiration
        if (sessionDoc.expiresAt && new Date() > sessionDoc.expiresAt) {
            await PracticeSession.findOneAndUpdate(
                { id: sessionDoc.id },
                { $set: { is_completed: true, completed_at: new Date() }, $unset: { expiresAt: "" } }
            );
            return NextResponse.json({ session: null, mcqs: [], attempts: [], error: 'Session expired' }, { status: 410 });
        }

        const attempts = await MCQAttempt.find({ practice_session_id: sessionDoc.id }).sort({ created_at: 1 }).lean();

        let mcqs: any[] = [];
        if (sessionDoc.mcq_ids && sessionDoc.mcq_ids.length > 0) {
            const rawMcqs = await MCQ.find({ id: { $in: sessionDoc.mcq_ids } }).lean();
            const mcqMap = new Map<number, any>();

            rawMcqs.forEach((mcq: any) => {
                const { correct_option, explanation, ...publicData } = mcq;
                mcqMap.set(mcq.id, publicData);
            });

            mcqs = sessionDoc.mcq_ids.map((id: number) => mcqMap.get(id)).filter(Boolean);

            const passageIds = Array.from(new Set(mcqs.filter((mcq: any) => mcq.passage_id).map((mcq: any) => mcq.passage_id)));
            if (passageIds.length > 0) {
                const passages = await Passage.find({ id: { $in: passageIds } }).lean();
                const passageMap = new Map<number, any>();
                passages.forEach((passage: any) => passageMap.set(passage.id, passage));

                mcqs = mcqs.map((mcq: any) => (
                    mcq.passage_id && passageMap.has(mcq.passage_id)
                        ? { ...mcq, passage: passageMap.get(mcq.passage_id) }
                        : mcq
                ));
            }
        }

        return NextResponse.json({ session: sessionDoc, mcqs, attempts });
    } catch (error: any) {
        console.error('[API/PracticeActive] Error:', error);
        return NextResponse.json({ error: error.message || 'Failed to load active practice session' }, { status: 500 });
    }
}
