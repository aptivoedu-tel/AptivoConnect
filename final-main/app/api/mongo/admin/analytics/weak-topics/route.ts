import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb/connection';
import { MCQAttempt, Topic } from '@/lib/mongodb/models';

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const limit = parseInt(searchParams.get('limit') || '5');

        await connectToDatabase();

        // 1. Get recent attempts grouped by topic
        // Join with MCQ to get topic_id
        const weakTopics = await MCQAttempt.aggregate([
            {
                $lookup: {
                    from: 'mcqs',
                    localField: 'mcq_id',
                    foreignField: 'id',
                    as: 'mcq'
                }
            },
            { $unwind: "$mcq" },
            {
                $group: {
                    _id: "$mcq.topic_id",
                    averageScore: { $avg: { $cond: ["$is_correct", 100, 0] } },
                    attemptCount: { $sum: 1 }
                }
            },
            { $sort: { averageScore: 1 } }, // Weakest first
            { $limit: limit }
        ]);

        // 2. Map Topic IDs to Names
        const result = await Promise.all(weakTopics.map(async (item) => {
            const topic = await Topic.findOne({ id: item._id }).select('name').lean();
            return {
                topicName: topic?.name || `Topic ${item._id}`,
                averageScore: Math.round(item.averageScore),
                attemptCount: item.attemptCount
            };
        }));

        return NextResponse.json({ topics: result });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
