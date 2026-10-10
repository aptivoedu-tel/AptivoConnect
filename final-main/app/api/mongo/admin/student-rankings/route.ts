import { NextRequest, NextResponse } from 'next/server';
import { getPortalSession as getServerSession } from '@/lib/portalSession';
import { authOptions } from '@/lib/authOptions';
import connectToDatabase from '@/lib/mongodb/connection';
import { User, StudentUniversityEnrollment, University } from '@/lib/mongodb/models';
import PracticeSession from '@/lib/mongodb/models/PracticeSession';
import LearningStreak from '@/lib/mongodb/models/LearningStreak';

export const dynamic = 'force-dynamic';

/** Count consecutive daily streak entries for a student up to today/yesterday */
function computeStreakFromDates(dates: string[]): number {
    if (!dates.length) return 0;
    const dateSet = new Set(dates);
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    let startOffset = -1;
    if (dateSet.has(today)) startOffset = 0;
    else if (dateSet.has(yesterdayStr)) startOffset = 1;
    if (startOffset < 0) return 0;

    let streak = 0;
    for (let i = startOffset; i < 400; i++) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        if (dateSet.has(d.toISOString().split('T')[0])) streak++;
        else break;
    }
    return streak;
}

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        const role = (session?.user as any)?.role;
        if (!session || (role !== 'super_admin' && role !== 'institution_admin')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await connectToDatabase();
        
        const { searchParams } = new URL(req.url);
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '20');
        const league = searchParams.get('league') || null;
        const skip = (page - 1) * limit;

        // 1. Build query filter
        const query: any = { role: 'student' };
        if (league) {
            if (league === 'bronze') {
                // Bronze = everyone not in gold or silver
                query.$or = [
                    { league: 'bronze' },
                    { league: { $exists: false } },
                    { league: null }
                ];
            } else {
                query.league = league;
            }
        }

        if (role === 'institution_admin' && (session.user as any).institution_id) {
            query.institution_id = (session.user as any).institution_id;
        }

        // 2. Fetch & sort by XP descending
        const allUsers = await User.find(query).lean() as any[];
        allUsers.sort((a, b) => (Number(b.league_xp) || 0) - (Number(a.league_xp) || 0));

        const totalStudents = allUsers.length;
        const paginatedUsers = allUsers.slice(skip, skip + limit);
        const studentIds = paginatedUsers.map((s: any) => String(s.id));

        // 3. Fetch supporting data for the paginated slice
        const [enrollments, universities, sessions, allStreakDocs] = await Promise.all([
            StudentUniversityEnrollment.find({ user_id: { $in: studentIds } }).lean(),
            // will join below
            Promise.resolve([]),
            PracticeSession.find({ student_id: { $in: studentIds }, is_completed: true }, 
                'student_id university_id time_spent_seconds total_questions correct_answers completed_at started_at'
            ).lean(),
            LearningStreak.find({ student_id: { $in: studentIds } }, 'student_id streak_date').lean(),
        ]);

        // Fetch universities for the enrolled ones
        const uniIds = [...new Set((enrollments as any[]).map((e: any) => e.university_id))];
        const univDocs = uniIds.length > 0 
            ? await University.find({ id: { $in: uniIds } }, 'id name').lean() as any[]
            : [];
        const uniMap = new Map(univDocs.map((u: any) => [u.id, u.name]));

        // Group streaks by student_id
        const streaksByStudent = new Map<string, string[]>();
        (allStreakDocs as any[]).forEach((doc: any) => {
            const sid = String(doc.student_id);
            if (!streaksByStudent.has(sid)) streaksByStudent.set(sid, []);
            streaksByStudent.get(sid)!.push(doc.streak_date);
        });

        // 4. Build result for each paginated student
        const rankings = paginatedUsers.map((student: any) => {
            const sid = String(student.id);
            const studentEnrollments = (enrollments as any[]).filter((e: any) => String(e.user_id) === sid);
            const studentSessions = (sessions as any[]).filter((s: any) => String(s.student_id) === sid);
            const streakDates = streaksByStudent.get(sid) || [];

            let totalTime = 0;
            let questionsAttempted = 0;
            let correctQuestions = 0;
            let lastActiveDate: any = student.created_at;
            const timeByUni: Record<string, number> = {};

            studentSessions.forEach((s: any) => {
                const time = Number(s.time_spent_seconds) || 0;
                totalTime += time;
                questionsAttempted += Number(s.total_questions) || 0;
                correctQuestions += Number(s.correct_answers) || 0;

                const sessionDate = s.completed_at || s.started_at;
                if (sessionDate && new Date(sessionDate) > new Date(lastActiveDate)) {
                    lastActiveDate = sessionDate;
                }

                const uniName = s.university_id
                    ? (uniMap.get(s.university_id) || `University ${s.university_id}`)
                    : 'General Practice';
                timeByUni[uniName] = (timeByUni[uniName] || 0) + time;
            });

            const accuracy = questionsAttempted > 0
                ? Math.round((correctQuestions / questionsAttempted) * 100)
                : 0;

            const registeredUniversities = studentEnrollments.map(
                (e: any) => uniMap.get(e.university_id) || `University ${e.university_id}`
            );

            const currentStreak = computeStreakFromDates(streakDates);

            return {
                id: sid,
                name: student.full_name || 'Unknown',
                email: student.email || '',
                avatar: student.avatar_url || null,
                league: student.league || 'bronze',
                league_xp: Number(student.league_xp) || 0,
                universities_enrolled: studentEnrollments.length,
                total_time: totalTime,
                time_by_uni: Object.entries(timeByUni).map(([name, time]) => ({ name, time })),
                registration_date: student.created_at,
                last_active_date: lastActiveDate,
                total_practice_sessions: studentSessions.length,
                questions_attempted: questionsAttempted,
                accuracy,
                current_streak: currentStreak,
                registered_universities: registeredUniversities,
            };
        });

        return NextResponse.json({
            rankings,
            pagination: {
                total: totalStudents,
                page,
                limit,
                pages: Math.ceil(totalStudents / limit),
            },
        });

    } catch (error: any) {
        console.error('Student Rankings API Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
