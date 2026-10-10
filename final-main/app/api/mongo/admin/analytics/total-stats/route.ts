import { NextRequest, NextResponse } from 'next/server';
import { getPortalSession as getServerSession } from '@/lib/portalSession';
import { authOptions } from '@/lib/authOptions';
import connectToDatabase from '@/lib/mongodb/connection';
import { User, Subject, Topic, Subtopic, MCQ, PracticeSession } from '@/lib/mongodb/models';

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || (session.user as any)?.role !== 'super_admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await connectToDatabase();

        const [
            totalUsers,
            totalStudents,
            totalAdmins,
            totalSubjects,
            totalTopics,
            totalSubtopics,
            totalMCQs,
            totalPracticeSessions
        ] = await Promise.all([
            User.countDocuments(),
            User.countDocuments({ role: 'student', status: 'active' }),
            User.countDocuments({ role: { $in: ['super_admin', 'institution_admin'] } }),
            Subject.countDocuments({ is_active: true }),
            Topic.countDocuments({ is_active: true }),
            Subtopic.countDocuments({ is_active: true }),
            MCQ.countDocuments({ is_active: true }),
            PracticeSession.countDocuments({ is_completed: true })
        ]);

        return NextResponse.json({
            stats: {
                totalUsers,
                totalStudents,
                totalAdmins,
                totalSubjects,
                totalTopics,
                totalSubtopics,
                totalMCQs,
                totalPracticeSessions
            }
        });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
