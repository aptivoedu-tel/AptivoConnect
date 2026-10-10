import { NextRequest, NextResponse } from 'next/server';
import { getPortalSession as getServerSession } from '@/lib/portalSession';
import { authOptions } from '@/lib/authOptions';
import connectToDatabase from '@/lib/mongodb/connection';
import { InstitutionAdmin } from '@/lib/mongodb/models';

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        const userRole = (session.user as any)?.role;
        const userId = (session.user as any)?.id;
        let userInstId = (session.user as any)?.institution_id;
        const { searchParams } = new URL(req.url);
        let institutionId = searchParams.get('institution_id');
        const startDateStr = searchParams.get('start_date');
        const selectedUniId = searchParams.get('university_id');
        await connectToDatabase();
        if (userRole !== 'super_admin') {
            if (!userInstId) {
                const adminLink = await InstitutionAdmin.findOne({ user_id: userId }).lean() as any;
                if (adminLink?.institution_id) userInstId = adminLink.institution_id;
            }
            if (!userInstId) return NextResponse.json({ error: 'Institution not linked' }, { status: 403 });
            institutionId = userInstId.toString();
        }
        if (!institutionId) return NextResponse.json({ error: 'institution_id required' }, { status: 400 });
        const mongooseInstance = await connectToDatabase();
        const db = mongooseInstance.connection.db;
        if (!db) return NextResponse.json({ error: 'Database temporarily unavailable' }, { status: 503 });
        let instId: string | number = institutionId;
        const parsed = parseInt(institutionId);
        if (!isNaN(parsed)) instId = parsed;
        const studentQuery: any = { institution_id: { $in: [instId, instId.toString()] }, role: 'student' };
        if (selectedUniId) {
            const e4u = await db.collection('studentuniversityenrollments').find({ university_id: parseInt(selectedUniId) }).toArray();
            studentQuery.id = { $in: e4u.map((e: any) => e.user_id.toString()) };
        }
        const students = await db.collection('users').find(studentQuery).toArray();
        const studentIds = students.map((s: any) => s.id).filter(Boolean);
        if (studentIds.length === 0) return NextResponse.json({ overall: { totalStudents: 0, totalUniversities: 0, averageScore: 0, totalSessions: 0 }, universityStats: [], studentStats: [], availableUniversities: [] });
        const enrollments = await db.collection('studentuniversityenrollments').find({ user_id: { $in: studentIds } }).toArray();
        const universityIds = Array.from(new Set(enrollments.map((e: any) => e.university_id))).filter((id: any) => id != null);
        const universities = universityIds.length > 0 ? await db.collection('universities').find({ id: { $in: universityIds } }).toArray() : [];
        const sessionFilter: any = { student_id: { $in: studentIds }, is_completed: true };
        if (startDateStr) { const sd = new Date(startDateStr); if (!isNaN(sd.getTime())) sessionFilter.started_at = { $gte: sd }; }
        const sessions = await db.collection('practicesessions').find(sessionFilter).toArray();
        const universityStats = universities.map((uni: any) => {
            const uniSIds = enrollments.filter((e: any) => e.university_id === uni.id).map((e: any) => e.user_id.toString());
            const uniSess = sessions.filter((s: any) => uniSIds.includes(s.student_id?.toString()));
            const totalSessions = uniSess.length;
            const avgScore = totalSessions > 0 ? Math.round(uniSess.reduce((sum: number, s: any) => sum + (s.score_percentage || 0), 0) / totalSessions) : 0;
            const totalQuestions = uniSess.reduce((sum: number, s: any) => sum + (s.total_questions || 0), 0);
            return { id: uni.id, name: uni.name, logo_url: uni.logo_url, studentCount: uniSIds.length, averageScore: avgScore, totalSessions, totalQuestions };
        });
        const studentStats = students.map((s: any) => {
            const ss = sessions.filter((sess: any) => sess.student_id?.toString() === s.id?.toString());
            const totalSessions = ss.length;
            const avgScore = totalSessions > 0 ? Math.round(ss.reduce((sum: number, sess: any) => sum + (sess.score_percentage || 0), 0) / totalSessions) : 0;
            const studentUnis = enrollments.filter((e: any) => e.user_id?.toString() === s.id?.toString()).map((e: any) => { const u = universities.find((uni: any) => uni.id === e.university_id); return u ? { name: u.name } : null; }).filter(Boolean);
            let status = 'On Track';
            if (avgScore >= 85) status = 'Mastery'; else if (avgScore < 60 && totalSessions > 0) status = 'At Risk'; else if (totalSessions === 0) status = 'Pending';
            return { id: s.id, name: s.full_name, email: s.email, averageScore: avgScore, totalSessions, status, universities: studentUnis };
        });
        const overallAvg = sessions.length > 0 ? Math.round(sessions.reduce((sum: number, s: any) => sum + (s.score_percentage || 0), 0) / sessions.length) : 0;
        const allStudents = await db.collection('users').find({ institution_id: { $in: [instId, instId.toString()] }, role: 'student' }).toArray();
        const allStudentIds = allStudents.map((s: any) => s.id);
        const allEnrollments = await db.collection('studentuniversityenrollments').find({ user_id: { $in: allStudentIds } }).toArray();
        const allUniIds = Array.from(new Set(allEnrollments.map((e: any) => e.university_id))).filter(Boolean);
        const allUnis = allUniIds.length > 0 ? await db.collection('universities').find({ id: { $in: allUniIds } }).project({ id: 1, name: 1 }).toArray() : [];
        return NextResponse.json({ overall: { totalStudents: students.length, totalUniversities: universities.length, averageScore: overallAvg, totalSessions: sessions.length }, universityStats: universityStats.sort((a: any, b: any) => b.averageScore - a.averageScore), studentStats: studentStats.sort((a: any, b: any) => b.averageScore - a.averageScore), availableUniversities: allUnis });
    } catch (error: any) {
        console.error('Analytics Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
