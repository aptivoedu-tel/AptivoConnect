import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb/connection';
import { PracticeSession, University } from '@/lib/mongodb/models';

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const daysParam = searchParams.get('days') || '30';

        await connectToDatabase();

        // 1. Fetch ALL active and public universities
        const universities = await University.find({ 
            is_active: true,
            is_public: true 
        }).lean();

        if (universities.length === 0) {
            return NextResponse.json({ leaderboard: [] });
        }

        const validUniIds = universities.map(u => u.id);
        const uniMap = new Map(universities.map(u => [u.id, u.name]));

        let matchStage: any = { is_completed: true, university_id: { $in: validUniIds } };
        
        if (daysParam !== 'all') {
            const days = parseInt(daysParam);
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - days);
            matchStage.started_at = { $gte: startDate };
        }

        // 2. Aggregate Practice Sessions for those exact university IDs
        const stats = await PracticeSession.aggregate([
            { $match: matchStage },
            {
                $group: {
                    _id: "$university_id",
                    average_score: { $avg: "$score_percentage" },
                    total_sessions: { $sum: 1 },
                    total_time_spent: { $sum: "$time_spent_seconds" }
                }
            }
        ]);

        const statsMap = new Map();
        stats.forEach(s => {
            statsMap.set(s._id, s);
        });

        // 3. Map over ALL valid universities to ensure those with 0 sessions are still included
        let leaderboard = validUniIds.map(id => {
            const s = statsMap.get(id);
            return {
                university_id: id,
                university_name: uniMap.get(id) || 'Unknown',
                average_score: s ? Math.round(s.average_score || 0) : 0,
                total_sessions: s ? s.total_sessions : 0,
                total_time_spent_minutes: s ? Math.round(s.total_time_spent / 60) : 0
            };
        });

        // 4. Sort descending by total time spent, and then by total sessions for ties
        leaderboard.sort((a, b) => {
            if (b.total_time_spent_minutes !== a.total_time_spent_minutes) return b.total_time_spent_minutes - a.total_time_spent_minutes;
            return b.total_sessions - a.total_sessions;
        });

        return NextResponse.json({ leaderboard });

    } catch (error: any) {
        console.error("Leaderboard Analytics Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
