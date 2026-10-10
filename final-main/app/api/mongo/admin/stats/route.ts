import { NextRequest, NextResponse } from 'next/server';
import { getPortalSession as getServerSession } from '@/lib/portalSession';
import { authOptions } from '@/lib/authOptions';
import connectToDatabase from '@/lib/mongodb/connection';
import { MCQ, User, Subject, Topic, StudentUniversityEnrollment } from '@/lib/mongodb/models';

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const userRole = (session.user as any).role;
        const userInstId = (session.user as any).institution_id;

        if (userRole !== 'super_admin' && userRole !== 'institution_admin') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const { searchParams } = new URL(req.url);
        const institutionId = searchParams.get('institution_id');

        let targetInstId: number | null = null;
        if (userRole === 'institution_admin') {
            targetInstId = Number(userInstId);
            if (institutionId && Number(institutionId) !== targetInstId) {
                return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
            }
        } else if (institutionId) {
            targetInstId = parseInt(institutionId);
        }

        await connectToDatabase();

        // 1. Total Questions
        const mcqCount = await MCQ.countDocuments({ is_active: true });

        // 2. Total Students
        let studentFilter: any = { role: 'student', status: 'active' };
        if (targetInstId) {
            const enrollments = await StudentUniversityEnrollment.find({
                institution_id: targetInstId,
                is_active: true
            }).select('student_id');
            const studentIds = enrollments.map((e: any) => e.student_id);
            studentFilter.id = { $in: studentIds };
        }
        const studentCount = await User.countDocuments(studentFilter);

        // 3. Subjects & Topics
        const subjectCount = await Subject.countDocuments({ is_active: true });
        const topicCount = await Topic.countDocuments({ is_active: true });

        // 4. Calculate Changes (Simple mock for now or real logic if timestamps exist)
        const oneMonthAgo = new Date();
        oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

        const oldMcqCount = await MCQ.countDocuments({
            is_active: true,
            created_at: { $lt: oneMonthAgo }
        });
        const oldStudentCount = await User.countDocuments({
            ...studentFilter,
            created_at: { $lt: oneMonthAgo }
        });

        const calculatePercentage = (oldVal: number, newVal: number) => {
            if (oldVal === 0) return newVal > 0 ? '+100%' : '0%';
            const change = ((newVal - oldVal) / oldVal) * 100;
            return change > 0 ? `+${Math.round(change)}%` : `${Math.round(change)}%`;
        };

        return NextResponse.json({
            stats: {
                totalQuestions: mcqCount,
                activeStudents: studentCount,
                subjects: subjectCount,
                topics: topicCount,
                changePercentages: {
                    questions: calculatePercentage(oldMcqCount, mcqCount),
                    students: calculatePercentage(oldStudentCount, studentCount),
                    subjects: '0%',
                    topics: '+1'
                }
            }
        });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
