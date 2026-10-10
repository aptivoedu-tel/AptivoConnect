import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb/connection';
import { User } from '@/lib/mongodb/models';

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const daysParam = searchParams.get('days') || '30';

        await connectToDatabase();

        let matchStage: any = { role: 'student' };
        let startDate = new Date();
        let endDate = new Date();
        let days = 30;

        const startDateParam = searchParams.get('start_date');
        const endDateParam = searchParams.get('end_date');

        if (startDateParam && endDateParam) {
            startDate = new Date(startDateParam);
            endDate = new Date(endDateParam);
            endDate.setHours(23, 59, 59, 999);
            matchStage.created_at = {
                $gte: startDate,
                $lte: endDate
            };
        } else if (daysParam !== 'all') {
            days = parseInt(daysParam);
            startDate.setDate(startDate.getDate() - days);
            matchStage.created_at = { $gte: startDate };
        } else {
            const firstStudent = await User.findOne({ role: 'student' }).sort({ created_at: 1 }).lean();
            if (firstStudent && firstStudent.created_at) {
                startDate = new Date(firstStudent.created_at);
            } else {
                startDate.setDate(startDate.getDate() - 365);
            }
        }

        const growth = await User.aggregate([
            { $match: matchStage },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$created_at" } },
                    count: { $sum: 1 }
                }
            },
            { $sort: { "_id": 1 } }
        ]);

        const dateMap = new Map();
        growth.forEach(g => dateMap.set(g._id, g.count));

        const filledGrowth = [];
        const currentDate = new Date(startDate);
        const endOfRange = startDateParam && endDateParam ? new Date(endDate) : new Date();
        
        while (currentDate <= endOfRange) {
            const dateStr = currentDate.toISOString().split('T')[0];
            filledGrowth.push({
                date: dateStr,
                count: dateMap.get(dateStr) || 0
            });
            currentDate.setDate(currentDate.getDate() + 1);
        }

        return NextResponse.json({ growth: filledGrowth });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
