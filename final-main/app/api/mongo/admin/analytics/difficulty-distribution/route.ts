import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb/connection';
import { MCQ } from '@/lib/mongodb/models';

export async function GET(req: NextRequest) {
    try {
        await connectToDatabase();

        const pipeline = [
            { $match: { is_active: { $ne: false } } },
            {
                $group: {
                    _id: "$difficulty",
                    count: { $sum: 1 }
                }
            }
        ];

        const results = await MCQ.aggregate(pipeline);

        const difficultyMap = {
            'easy': { name: 'Easy', value: 0, color: '#10b981' }, // Emerald
            'medium': { name: 'Medium', value: 0, color: '#f59e0b' }, // Amber
            'hard': { name: 'Hard', value: 0, color: '#ef4444' } // Red
        };

        let total = 0;

        results.forEach(item => {
            const diff = item._id ? item._id.toLowerCase() : 'medium';
            if (difficultyMap[diff as keyof typeof difficultyMap]) {
                difficultyMap[diff as keyof typeof difficultyMap].value += item.count;
                total += item.count;
            }
        });

        // Calculate percentages
        const distribution = Object.values(difficultyMap).map(item => ({
            ...item,
            percentage: total > 0 ? Math.round((item.value / total) * 100) : 0
        })).filter(item => item.value > 0);

        return NextResponse.json({ distribution });

    } catch (error: any) {
        console.error("Difficulty Distribution Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
