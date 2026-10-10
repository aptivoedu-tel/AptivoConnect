import { NextRequest, NextResponse } from 'next/server';
import { getPortalSession as getServerSession } from '@/lib/portalSession';
import { authOptions } from '@/lib/authOptions';
import connectToDatabase from '@/lib/mongodb/connection';
import { PracticeSession, LearningStreak } from '@/lib/mongodb/models';

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { searchParams } = new URL(req.url);
        // Prioritize session user for security, allowing overridden student_id only for admins
        let studentId = (session.user as any).id;
        
        const queryId = searchParams.get('student_id');
        if (queryId && ((session.user as any).role === 'super_admin' || (session.user as any).role === 'institution_admin')) {
            studentId = queryId;
        }

        if (!studentId) return NextResponse.json({ error: 'Missing student identifier' }, { status: 400 });

        await connectToDatabase();

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

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
