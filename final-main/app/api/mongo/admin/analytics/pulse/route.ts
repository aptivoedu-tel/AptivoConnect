import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb/connection';
import { PracticeSession } from '@/lib/mongodb/models';

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const daysParam = searchParams.get('days') || '30';

        await connectToDatabase();
        
        let matchStage: any = { is_completed: true, started_at: { $ne: null } };
        
        const startDateParam = searchParams.get('start_date');
        const endDateParam = searchParams.get('end_date');

        if (startDateParam && endDateParam) {
            const startDate = new Date(startDateParam);
            const endDate = new Date(endDateParam);
            endDate.setHours(23, 59, 59, 999);
            matchStage.started_at = {
                $gte: startDate,
                $lte: endDate
            };
        } else if (daysParam !== 'all') {
            const days = parseInt(daysParam);
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - days);
            matchStage.started_at = { $gte: startDate };
        }

        // 24-Hour Pulse (aggregates all practice sessions based on their local creation hour)
        const pulseStats = await PracticeSession.aggregate([
            { $match: matchStage },
            {
                $group: {
                    _id: { $hour: "$started_at" },
                    sessions: { $sum: 1 }
                }
            },
            { $sort: { "_id": 1 } }
        ]);

        const pulseMap = new Map();
        pulseStats.forEach(p => pulseMap.set(p._id, p.sessions));

        const pulseData = [];
        for (let i = 0; i < 24; i++) {
            const timeLabel = i === 0 ? "12 AM" : i < 12 ? `${i} AM` : i === 12 ? "12 PM" : `${i - 12} PM`;
            pulseData.push({
                hour: timeLabel,
                sessions: pulseMap.get(i) || 0
            });
        }

        return NextResponse.json({ pulse: pulseData });

    } catch (error: any) {
        console.error("24-Hour Pulse API Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
