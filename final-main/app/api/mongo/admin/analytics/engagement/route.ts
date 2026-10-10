// MongoDB API - Admin Engagement Analytics (Practice + Exam)
import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb/connection';
import { PracticeSession, ExamAttempt, MCQAttempt } from '@/lib/mongodb/models';

type DateSource = {
    started_at?: unknown;
    created_at?: unknown;
    start_time?: unknown;
};

type EngagementAggregate = {
    _id: string;
    count: number;
    total_time?: number;
};

const toValidDate = (value: unknown): Date | null => {
    if (!value) return null;
    const date = new Date(value as string | number | Date);
    return isNaN(date.getTime()) ? null : date;
};

const getErrorMessage = (error: unknown) => {
    return error instanceof Error ? error.message : 'Unknown engagement analytics error';
};

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const daysParam = searchParams.get('days') || '30';

        await connectToDatabase();

        let startDate = new Date();
        let endDate = new Date();
        
        const startDateParam = searchParams.get('start_date');
        const endDateParam = searchParams.get('end_date');

        if (startDateParam && endDateParam) {
            startDate = new Date(startDateParam);
            endDate = new Date(endDateParam);
            endDate.setHours(23, 59, 59, 999);
        } else if (daysParam !== 'all') {
            const days = parseInt(daysParam);
            startDate.setDate(startDate.getDate() - days);
        } else {
            const [firstSession, firstAttempt, firstExam] = await Promise.all([
                PracticeSession.findOne().sort({ started_at: 1 }).lean(),
                MCQAttempt.findOne().sort({ created_at: 1 }).lean(),
                ExamAttempt.findOne().sort({ start_time: 1 }).lean()
            ]);
            const firstSessionDoc = firstSession as DateSource | null;
            const firstAttemptDoc = firstAttempt as DateSource | null;
            const firstExamDoc = firstExam as DateSource | null;
            const firstDates = [
                toValidDate(firstSessionDoc?.started_at),
                toValidDate(firstAttemptDoc?.created_at),
                toValidDate(firstExamDoc?.start_time || firstExamDoc?.created_at)
            ]
                .filter((date): date is Date => date instanceof Date)
                .sort((a: Date, b: Date) => a.getTime() - b.getTime());

            if (firstDates.length > 0) {
                startDate = firstDates[0];
            } else {
                startDate.setDate(startDate.getDate() - 365);
            }
        }

        const rangeMatch: Record<string, unknown> = startDateParam && endDateParam
            ? { activity_at: { $gte: startDate, $lte: endDate } }
            : daysParam !== 'all'
                ? { activity_at: { $gte: startDate } }
                : {};
        const hasRangeMatch = Object.keys(rangeMatch).length > 0;
        const activityMatch: Record<string, unknown> = hasRangeMatch
            ? { $and: [rangeMatch, { activity_at: { $ne: null } }] }
            : { activity_at: { $ne: null } };

        // Aggregate Practice Sessions
        const practiceAgg = await PracticeSession.aggregate<EngagementAggregate>([
            { $addFields: { activity_at: { $ifNull: ["$completed_at", "$started_at"] } } },
            { $match: activityMatch },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$activity_at" } },
                    count: { $sum: 1 },
                    total_time: { $sum: { $ifNull: ["$time_spent_seconds", 0] } }
                }
            },
            { $sort: { "_id": 1 } }
        ]);

        // Aggregate Exam Attempts using their actual timestamp field names.
        const examAgg = await ExamAttempt.aggregate<EngagementAggregate>([
            { $addFields: { activity_at: { $ifNull: ["$end_time", { $ifNull: ["$start_time", "$created_at"] }] } } },
            { $match: activityMatch },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$activity_at" } },
                    count: { $sum: 1 },
                    total_time: { $sum: { $ifNull: ["$time_spent_seconds", 0] } }
                }
            }
        ]);

        // Recover practice activity from MCQ attempts when the parent practice
        // session has already been removed by the old TTL behavior.
        const recoveredPracticeAgg = await MCQAttempt.aggregate<EngagementAggregate>([
            { $addFields: { activity_at: "$created_at" } },
            {
                $match: {
                    ...activityMatch,
                    practice_session_id: { $exists: true, $ne: null }
                }
            },
            {
                $lookup: {
                    from: "practicesessions",
                    localField: "practice_session_id",
                    foreignField: "id",
                    as: "session"
                }
            },
            { $match: { session: { $size: 0 } } },
            {
                $group: {
                    _id: {
                        date: { $dateToString: { format: "%Y-%m-%d", date: "$activity_at" } },
                        session: "$practice_session_id"
                    },
                    total_time: { $sum: { $ifNull: ["$time_spent_seconds", 0] } }
                }
            },
            {
                $group: {
                    _id: "$_id.date",
                    count: { $sum: 1 },
                    total_time: { $sum: "$total_time" }
                }
            }
        ]);

        // Merge both aggregations into a map
        const dateMap = new Map<string, { count: number; total_time: number }>();
        const addToDateMap = (e: EngagementAggregate) => {
            const existing = dateMap.get(e._id);
            if (existing) {
                existing.count += e.count;
                existing.total_time += e.total_time || 0;
            } else {
                dateMap.set(e._id, { count: e.count, total_time: e.total_time || 0 });
            }
        };

        practiceAgg.forEach(addToDateMap);
        recoveredPracticeAgg.forEach(addToDateMap);
        examAgg.forEach(addToDateMap);

        const filledEngagement = [];
        const currentDate = new Date(startDate);
        const endOfRange = startDateParam && endDateParam ? new Date(endDate) : new Date();
        
        while (currentDate <= endOfRange) {
            const dateStr = currentDate.toISOString().split('T')[0];
            const data = dateMap.get(dateStr) || { count: 0, total_time: 0 };
            filledEngagement.push({
                date: dateStr,
                count: data.count,
                total_time: Math.round(data.total_time / 60) // minutes
            });
            currentDate.setDate(currentDate.getDate() + 1);
        }

        return NextResponse.json({ engagement: filledEngagement });

    } catch (error: unknown) {
        console.error("Engagement Analytics Error:", error);
        return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
    }
}
