import { NextRequest, NextResponse } from 'next/server';
import { getPortalSession as getServerSession } from '@/lib/portalSession';
import { authOptions } from '@/lib/authOptions';
import connectToDatabase from '@/lib/mongodb/connection';
import { 
    PracticeSession, 
    MCQAttempt, 
    LearningStreak, 
    Subject, 
    Topic,
    Subtopic,
    StudentUniversityEnrollment,
    User
} from '@/lib/mongodb/models';
import { getCachedStudentRank } from '@/lib/services/rankCacheService';

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        await connectToDatabase();
        const { searchParams } = new URL(req.url);
        
        let studentId = (session.user as any).id;
        const queryId = searchParams.get('student_id');
        if (queryId && ((session.user as any).role === 'super_admin' || (session.user as any).role === 'institution_admin')) {
            if ((session.user as any).role === 'institution_admin') {
                const student = await User.findOne({ id: queryId });
                if (!student || Number(student.institution_id) !== Number((session.user as any).institution_id)) {
                    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
                }
            }
            studentId = queryId;
        } else if (queryId && queryId !== studentId) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        if (!studentId) {
            return NextResponse.json({ error: 'Missing student identifier' }, { status: 400 });
        }

        // 1. Fetch Basic Stats, Streaks, Attempt totals and Enrollments in parallel
        const [sessions, streaks, attemptStatsRows, subjects, topics, subtopics] = await Promise.all([
            PracticeSession.find({ student_id: studentId, is_completed: true }).sort({ started_at: -1 }).lean(),
            LearningStreak.find({ student_id: studentId }).sort({ streak_date: -1 }).lean(),
            MCQAttempt.aggregate([
                { $match: { student_id: studentId } },
                {
                    $group: {
                        _id: null,
                        totalAttempts: { $sum: 1 },
                        totalCorrect: { $sum: { $cond: ['$is_correct', 1, 0] } },
                        totalWrong: { $sum: { $cond: [{ $eq: ['$is_correct', false] }, 1, 0] } }
                    }
                }
            ]),
            Subject.find({ is_active: true }).lean(),
            Topic.find({ is_active: true }).lean(),
            Subtopic.find({ is_active: true }).lean()
        ]);

        // --- Calculate Stats ---
        const totalSessions = sessions.length;
        const attemptStats = attemptStatsRows[0] || { totalAttempts: 0, totalCorrect: 0, totalWrong: 0 };
        const totalAttempts = attemptStats.totalAttempts || 0;
        const totalCorrect = attemptStats.totalCorrect || 0;
        const totalWrong = attemptStats.totalWrong || 0;
        const overallAccuracy = totalAttempts > 0 ? Math.round((totalCorrect / totalAttempts) * 100) : 0;
        const totalTimeSeconds = sessions.reduce((sum: number, s: any) => sum + (s.time_spent_seconds || 0), 0);


        // --- Calculate Streak ---
        let currentStreak = 0;
        const streakDates = new Set(streaks.map((s: any) => s.streak_date));
        const today = new Date().toISOString().split('T')[0];
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];

        let startOffset = -1;
        if (streakDates.has(today)) startOffset = 0;
        else if (streakDates.has(yesterdayStr)) startOffset = 1;

        if (startOffset >= 0) {
            for (let i = startOffset; i < 365; i++) {
                const d = new Date();
                d.setDate(d.getDate() - i);
                if (streakDates.has(d.toISOString().split('T')[0])) currentStreak++;
                else break;
            }
        }

        // --- Subject Performance (Radar Chart) ---
        const topicMap = new Map(topics.map((t: any) => [t.id, t]));
        const subtopicMap = new Map((subtopics || []).map((st: any) => [st.id, st]));
        const subjectScores: Record<number, number[]> = {};

        for (const sess of sessions as any[]) {
            if (sess.score_percentage !== null) {
                let subjId = sess.subject_id;
                if (!subjId && sess.topic_id) {
                    const topic = topicMap.get(sess.topic_id);
                    if (topic) subjId = topic.subject_id;
                }
                if (subjId && sess.score_percentage !== null) {
                    if (!subjectScores[subjId]) subjectScores[subjId] = [];
                    subjectScores[subjId].push(sess.score_percentage);
                }
            }
        }

        const performance = subjects.map((s: any) => {
            const scores = subjectScores[s.id] || [];
            return {
                subject: s.name,
                score: scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0,
                fullMark: 100
            };
        }).filter((p: any) => p.score > 0 || subjects.length < 5);

        // --- Recent/Continue Learning Items ---
        const colors = ['text-teal-600', 'text-orange-600', 'text-teal-600', 'text-purple-600'];
        const continueLearning = sessions.slice(0, 3).map((s: any, i: number) => {
            const st = s.subtopic_id ? subtopicMap.get(s.subtopic_id) : null;
            const t = s.topic_id ? topicMap.get(s.topic_id) : null;
            
            return {
                title: st?.name || t?.name || 'Continue Session',
                progress: s.score_percentage || 0,
                subtopicId: s.subtopic_id || 0,
                topicId: s.topic_id || 0,
                color: colors[i % colors.length]
            };
        });

        const streakBonus = Math.min(50, currentStreak * 5);
        const totalXP = (totalCorrect * 10) - (totalWrong * 5) + streakBonus;

        const { rank, totalStudents } = await getCachedStudentRank(studentId, totalXP);

        return NextResponse.json({
            stats: {
                totalXP,
                questionsSolved: totalAttempts,
                currentStreak,
                overallAccuracy,
                totalStudyTime: totalTimeSeconds
            },
            performance,
            continueLearning,
            rankData: {
                rank,
                total: totalStudents,
                change: 'Global Portal Rank'
            },
            recommended: null // Can add logic later if needed
        });

    } catch (error: any) {
        console.error('Dashboard Summary API Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
