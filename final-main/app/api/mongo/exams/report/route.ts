// Secure Exam Report API
// Returns full exam structure (with correct_answer) only for completed attempts
// Security: verifies the requesting student owns the attempt OR is an admin

import { NextRequest, NextResponse } from 'next/server';
import { getPortalSession as getServerSession } from '@/lib/portalSession';
import { authOptions } from '@/lib/authOptions';
import connectToDatabase from '@/lib/mongodb/connection';
import ExamAttempt from '@/lib/mongodb/models/ExamAttempt';
import ExamAnswer from '@/lib/mongodb/models/ExamAnswer';
import UniversityExam from '@/lib/mongodb/models/UniversityExam';
import ExamSection from '@/lib/mongodb/models/ExamSection';
import ExamQuestion from '@/lib/mongodb/models/ExamQuestion';
import {canReadStudent} from '@/lib/student-access';

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        await connectToDatabase();
        const { searchParams } = new URL(req.url);
        const attemptId = searchParams.get('attempt_id');

        if (!attemptId) return NextResponse.json({ error: 'attempt_id is required' }, { status: 400 });

        // 1. Fetch the attempt
        const attempt = await ExamAttempt.findOne({ id: attemptId }).lean() as any;
        if (!attempt) return NextResponse.json({ error: 'Attempt not found' }, { status: 404 });

        // 2. Security: only the owner or admin can view this report
        const userId = (session.user as any).id;
        const role = (session.user as any).role;
        if (!await canReadStudent(session.user, attempt.student_id)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // 3. Fetch exam info
        const exam = await UniversityExam.findOne({ id: attempt.exam_id }).lean();
        if (!exam) return NextResponse.json({ error: 'Exam not found' }, { status: 404 });
        if (role === 'student' && (!['completed','submitted'].includes(attempt.status) || exam.result_release_setting !== 'instant')) {
            return NextResponse.json({error:'This report is not available yet.'},{status:403});
        }

        // 4. Fetch sections ordered
        const sections = await ExamSection.find({ exam_id: attempt.exam_id })
            .sort({ order_index: 1 })
            .lean();

        // 5. Fetch all questions for those sections — including correct_answer (safe: exam completed)
        const sectionIds = sections.map((s: any) => s.id);
        const questions = await ExamQuestion.find({ section_id: { $in: sectionIds } })
            .sort({ section_id: 1, order_index: 1 })
            .lean();

        // 6. Fetch all student answers for this attempt
        const answers = await ExamAnswer.find({ attempt_id: attemptId }).lean();

        // Build answer map: question_id -> answer record
        const answersMap: Record<number, any> = {};
        answers.forEach((a: any) => { answersMap[a.question_id] = a; });

        return NextResponse.json({
            attempt,
            exam,
            sections,
            questions,
            answers,
            answersMap,
        });

    } catch (error: any) {
        console.error('[GET /api/mongo/exams/report]', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
