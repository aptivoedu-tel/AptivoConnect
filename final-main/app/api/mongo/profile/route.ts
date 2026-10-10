import { NextRequest, NextResponse } from 'next/server';
import { getPortalSession as getServerSession } from '@/lib/portalSession';
import { authOptions } from '@/lib/authOptions';
import connectToDatabase from '@/lib/mongodb/connection';
import { StudentUniversityEnrollment, University, InstitutionAdmin, Institution, ActivityLog, PracticeSession, LearningStreak, User } from '@/lib/mongodb/models';

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const isAdmin = (session.user as any).role === 'institution_admin' || (session.user as any).role === 'admin';
        
        // --- SECURITY: Prevent IDOR (Private Data Leak) ---
        // If the user is a student, they can ONLY see their own data.
        // We force the IDs to be their own session ID unless they are an admin.
        const studentId = !isAdmin ? (session.user as any).id : searchParams.get('student_id');
        const adminId = !isAdmin ? null : searchParams.get('admin_id');
        const userId = !isAdmin ? (session.user as any).id : (searchParams.get('user_id') || (session.user as any).id);
        
        const checkAdmin = searchParams.get('checkAdmin') === 'true';
        const path = req.nextUrl.pathname;

        await connectToDatabase();

        // --- Base Profile / Metadata ---
        if (path === '/api/mongo/profile') {
            const ids = searchParams.get('ids');
            if (ids) {
                const idArray = ids.split(',');
                const users = await User.find({ id: { $in: idArray } }).select('id full_name email').lean();
                return NextResponse.json({ users });
            }

            if (checkAdmin) {
                const adminLink = await InstitutionAdmin.findOne({ user_id: userId }).lean();
                return NextResponse.json({ data: adminLink });
            }

            const profile = await User.findOne({ id: userId }).lean();
            if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
            return NextResponse.json({ data: profile });
        }

        // --- Universities ---
        if (path.endsWith('/universities')) {
            if (!studentId) return NextResponse.json({ error: 'Missing student_id' }, { status: 400 });

            const enrollments = await StudentUniversityEnrollment.find({
                user_id: studentId,
                status: 'approved'
            }).lean();

            const universityIds = enrollments.map((e: any) => e.university_id);
            const universities = await University.find({ id: { $in: universityIds } }).lean();

            // Format to match the expected structure in ProfilePage
            const formatted = enrollments.map((e: any) => ({
                id: e.id || e._id,
                university_id: e.university_id,
                enrollment_date: e.created_at,
                is_active: true,
                universities: universities.find((u: any) => u.id === e.university_id)
            })).filter((item: any) => item.universities);

            return NextResponse.json({ universities: formatted });
        }

        // --- Institutions ---
        if (path.endsWith('/institutions')) {
            if (!adminId) return NextResponse.json({ error: 'Missing admin_id' }, { status: 400 });

            const adminAccess = await InstitutionAdmin.find({ user_id: adminId }).lean();
            const institutionIds = adminAccess.map((a: any) => a.institution_id);
            const institutions = await Institution.find({ id: { $in: institutionIds } }).lean();

            const formatted = adminAccess.map((a: any) => ({
                assigned_at: a.assigned_at,
                institutions: institutions.find((i: any) => i.id === a.institution_id)
            })).filter((item: any) => item.institutions);

            return NextResponse.json({ institutions: formatted });
        }

        // --- Activity ---
        if (path.endsWith('/activity')) {
            if (!userId) return NextResponse.json({ error: 'Missing user_id' }, { status: 400 });
            const limit = parseInt(searchParams.get('limit') || '10');

            const activities = await ActivityLog.find({ user_id: userId })
                .sort({ created_at: -1 })
                .limit(limit)
                .lean();

            return NextResponse.json({ activities });
        }

        // --- Stats ---
        if (path.endsWith('/stats')) {
            if (!studentId) return NextResponse.json({ error: 'Missing student_id' }, { status: 400 });

            const sessions = await PracticeSession.find({
                student_id: studentId,
                is_completed: true
            }).lean();

            const totalSessions = sessions.length;
            const totalSeconds = (sessions as any[]).reduce((sum: number, s: any) => sum + (s.time_spent_seconds || 0), 0);
            const totalHours = Math.round(totalSeconds / 3600);

            const completedWithScore = (sessions as any[]).filter((s: any) => s.score_percentage != null);
            const avgScore = completedWithScore.length > 0
                ? Math.round(completedWithScore.reduce((sum: number, s: any) => sum + (s.score_percentage || 0), 0) / completedWithScore.length)
                : 0;

            // Get streaks
            const streakData = await LearningStreak.find({ student_id: studentId })
                .sort({ streak_date: -1 })
                .limit(30)
                .lean();

            const calculateStreak = (data: any[]) => {
                if (!data || data.length === 0) return 0;
                const streakDates = new Set(data.map((d: any) => d.streak_date));
                const today = new Date().toISOString().split('T')[0];
                const yesterday = new Date();
                yesterday.setDate(yesterday.getDate() - 1);
                const yesterdayStr = yesterday.toISOString().split('T')[0];

                let startOffset = -1;
                if (streakDates.has(today)) startOffset = 0;
                else if (streakDates.has(yesterdayStr)) startOffset = 1;

                if (startOffset < 0) return 0;

                let streak = 0;
                for (let i = startOffset; i < 365; i++) {
                    const checkDate = new Date();
                    checkDate.setDate(checkDate.getDate() - i);
                    const checkStr = checkDate.toISOString().split('T')[0];
                    if (streakDates.has(checkStr)) streak++;
                    else break;
                }
                return streak;
            };

            const currentStreak = calculateStreak(streakData);

            return NextResponse.json({
                stats: {
                    totalSessions,
                    totalHours,
                    averageScore: avgScore,
                    currentStreak
                }
            });
        }

        return NextResponse.json({ error: 'Invalid profile endpoint' }, { status: 404 });

    } catch (error: any) {
        console.error('Profile API Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
