import { NextRequest, NextResponse } from 'next/server';
import { getPortalSession } from '@/lib/portalSession';
import { authOptions } from '@/lib/authOptions';
import connectToDatabase from '@/lib/mongodb/connection';
import { PracticeSession, User } from '@/lib/mongodb/models';

export async function GET(req: NextRequest) {
    try {
        const session = await getPortalSession(authOptions);
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { searchParams } = new URL(req.url);
        const daysParam = searchParams.get('days') || '30';
        const userId = searchParams.get('userId');

        await connectToDatabase();

        let matchStage: any = { is_completed: true };
        
        if (daysParam !== 'all') {
            const days = parseInt(daysParam);
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - days);
            matchStage.started_at = { $gte: startDate };
        }

        // Aggregate Practice Sessions for students
        const stats = await PracticeSession.aggregate([
            { $match: matchStage },
            {
                $group: {
                    _id: "$student_id",
                    average_score: { $avg: "$score_percentage" },
                    total_sessions: { $sum: 1 },
                    total_time_spent: { $sum: "$time_spent_seconds" },
                    correct_answers: { $sum: "$correct_answers" },
                }
            },
            // Filter out users who have 0 sessions or invalid data
            { $match: { total_sessions: { $gt: 0 } } }
        ]);

        // Map stats by user id
        const statsMap = new Map();
        stats.forEach(s => {
            statsMap.set(s._id, s);
        });

        const studentIds = Array.from(statsMap.keys());
        
        if (studentIds.length === 0) {
            return NextResponse.json({ leaderboard: [], userRank: null });
        }

        // Fetch User info
        const users = await User.find({ id: { $in: studentIds } }, 'id full_name avatar_url').lean();
        const userMap = new Map(users.map(u => [u.id, u]));

        // Build Leaderboard
        let fullLeaderboard = studentIds.map(id => {
            const s = statsMap.get(id);
            const u = userMap.get(id);
            const avg = Math.round(s.average_score || 0);
            const correct = s.correct_answers || 0;
            const sessions = s.total_sessions || 0;
            // Composite ranking score: rewards BOTH accuracy and volume of work
            // correct_answers already encodes sessions × accuracy, so it's the fairest metric
            const total_points = correct * 10;
            const ranking_score = total_points; // primary sort key
            return {
                student_id: id,
                student_name: u ? u.full_name : 'Unknown Student',
                avatar_url: u ? u.avatar_url : null,
                average_score: avg,
                total_sessions: sessions,
                total_points,
                ranking_score,
                total_time_spent_minutes: Math.round(s.total_time_spent / 60)
            };
        });

        // Require at least 2 completed sessions to appear on leaderboard
        fullLeaderboard = fullLeaderboard.filter(s => s.total_sessions >= 2);

        // Sort: primary = total_points (effort × accuracy), secondary = average_score, tertiary = sessions
        fullLeaderboard.sort((a, b) => {
            if (b.ranking_score !== a.ranking_score) return b.ranking_score - a.ranking_score;
            if (b.average_score !== a.average_score) return b.average_score - a.average_score;
            return b.total_sessions - a.total_sessions;
        });

        // Add rank
        fullLeaderboard = fullLeaderboard.map((item, index) => ({
            ...item,
            rank: index + 1
        }));

        // Students may only see their own row (rank is still computed across the full cohort)
        if (session.user.role === 'student') {
            const ownUserId = session.user.id;
            const ownRow = fullLeaderboard.find(u => u.student_id === ownUserId) || null;
            return NextResponse.json({ leaderboard: ownRow ? [ownRow] : [], userRank: ownRow });
        }

        const top12 = fullLeaderboard.slice(0, 12);

        let userRank = null;
        if (userId) {
            const foundUser = fullLeaderboard.find(u => u.student_id === userId);
            if (foundUser) {
                userRank = foundUser;
            }
        }

        return NextResponse.json({ leaderboard: top12, userRank });

    } catch (error: any) {
        console.error("Student Leaderboard Analytics Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
