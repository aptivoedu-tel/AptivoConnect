// MongoDB-only analytics tracking service
// Queries MongoDB models directly instead of using Supabase client

import connectToDatabase from '@/lib/mongodb/connection';
import { PracticeSession, MCQAttempt, Topic, Subtopic } from '@/lib/mongodb/models';

export interface WeakTopic {
    topic: string;
    topicId?: number;
    accuracy: number;
    totalQuestions: number;
    weakestSubtopics: { id: number; name: string; accuracy: number }[];
}

export interface PerformanceTrend {
    date: string;
    accuracy: number;
}

export interface BehaviorSummary {
    totalOverthinkCount: number;
    totalRushCount: number;
    averageTimePerQuestion: number;
}

/** Build a Mongo filter based on the universityId mode:
 *  - 'general'    => no university_id filter (all sessions)
 *  - 'standalone' => only sessions WITHOUT a university_id (Direct Practice)
 *  - <id>         => only sessions matching that university_id
 */
function buildAttemptFilter(studentId: string, universityId?: string): any {
    const filter: any = { student_id: studentId };
    if (universityId === 'standalone') {
        filter.university_id = { $exists: false };
    } else if (universityId && universityId !== 'general') {
        filter.university_id = parseInt(universityId);
    }
    return filter;
}

export class AnalyticsTrackingService {
    /**
     * Get weak topics where accuracy < 60%
     */
    static async getWeakTopics(
        _client: any,
        studentId: string,
        universityId?: string
    ): Promise<{ data: WeakTopic[]; error?: string }> {
        try {
            await connectToDatabase();

            const filter = buildAttemptFilter(studentId, universityId);

            const topicStats = await MCQAttempt.aggregate([
                { $match: filter },
                {
                    $group: {
                        _id: '$topic_id',
                        total: { $sum: 1 },
                        correct: { $sum: { $cond: ['$is_correct', 1, 0] } }
                    }
                },
                { $match: { _id: { $ne: null } } }
            ]);

            if (!topicStats || topicStats.length === 0) {
                return { data: [] };
            }

            const topicMap = new Map(topicStats.map((row: any) => [row._id, { total: row.total, correct: row.correct }]));
            const topicIds = topicStats.map((row: any) => row._id);
            const topics = await Topic.find({ id: { $in: topicIds } }).lean() as any[];

            const weakTopics: WeakTopic[] = await Promise.all(
                topics
                    .map((t: any) => {
                        const stats = topicMap.get(t.id) || { total: 0, correct: 0 };
                        const accuracy = stats.total > 0
                            ? Math.round((stats.correct / stats.total) * 100)
                            : 0;
                        return { topic: t.name, topicId: t.id, accuracy, total: stats.total };
                    })
                    .filter(t => t.accuracy < 60)
                    .sort((a, b) => a.accuracy - b.accuracy)
                    .slice(0, 5)
                    .map(async t => {
                        const [subtopics, subStats] = await Promise.all([
                            Subtopic.find({ topic_id: t.topicId, is_active: true }).select('id name').lean() as any,
                            MCQAttempt.aggregate([
                                { $match: { ...filter, topic_id: t.topicId, subtopic_id: { $ne: null } } },
                                {
                                    $group: {
                                        _id: '$subtopic_id',
                                        total: { $sum: 1 },
                                        correct: { $sum: { $cond: ['$is_correct', 1, 0] } }
                                    }
                                }
                            ])
                        ]);

                        const subMap = new Map(subStats.map((row: any) => [row._id, { total: row.total, correct: row.correct }]));

                        const weakestSubtopics = subtopics
                            .filter((s: any) => subMap.has(s.id))
                            .map((s: any) => ({
                                id: s.id,
                                name: s.name,
                                accuracy: (() => {
                                    const stats = subMap.get(s.id) || { total: 0, correct: 0 };
                                    return stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0;
                                })()
                            }))
                            .sort((a: any, b: any) => a.accuracy - b.accuracy)
                            .slice(0, 3);

                        return {
                            topic: t.topic,
                            topicId: t.topicId,
                            accuracy: t.accuracy,
                            totalQuestions: t.total,
                            weakestSubtopics,
                        };
                    })
            );

            return { data: weakTopics };
        } catch (error: any) {
            console.error('Error fetching weak topics:', error);
            return { data: [], error: error.message };
        }
    }

    /**
     * Get performance trend (last 30 sessions)
     */
    static async getPerformanceTrend(
        _client: any,
        studentId: string,
        universityId?: string
    ): Promise<{ data: PerformanceTrend[]; error?: string }> {
        try {
            await connectToDatabase();

            const filter = buildAttemptFilter(studentId, universityId);

            const attempts = await MCQAttempt.aggregate([
                { $match: filter },
                { $sort: { created_at: -1 } },
                { $limit: 1000 },
                {
                    $group: {
                        _id: { $dateToString: { format: '%Y-%m-%d', date: '$created_at' } },
                        total: { $sum: 1 },
                        correct: { $sum: { $cond: ['$is_correct', 1, 0] } }
                    }
                }
            ]);

            const trend: PerformanceTrend[] = attempts.map((s: any) => {
                return {
                    date: new Date(s._id).toLocaleDateString(undefined, { year: 'numeric', month: '2-digit', day: '2-digit' }),
                    accuracy: Math.round((s.correct / s.total) * 100)
                };
            }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).slice(-30);

            return { data: trend };
        } catch (error: any) {
            console.error('Error fetching performance trend:', error);
            return { data: [], error: error.message };
        }
    }

    /**
     * Get behavior summary
     */
    static async getBehaviorSummary(
        _client: any,
        studentId: string,
        universityId?: string
    ): Promise<{ data: BehaviorSummary | null; error?: string }> {
        try {
            await connectToDatabase();

            const filter = buildAttemptFilter(studentId, universityId);

            const rows = await MCQAttempt.aggregate([
                { $match: filter },
                {
                    $group: {
                        _id: null,
                        totalQs: { $sum: 1 },
                        totalTime: { $sum: { $ifNull: ['$time_spent_seconds', 0] } },
                        overthink: {
                            $sum: { $cond: [{ $gt: ['$time_spent_seconds', 120] }, 1, 0] }
                        },
                        rush: {
                            $sum: { $cond: [{ $lt: ['$time_spent_seconds', 10] }, 1, 0] }
                        }
                    }
                }
            ]);

            if (!rows || rows.length === 0) {
                return {
                    data: { totalOverthinkCount: 0, totalRushCount: 0, averageTimePerQuestion: 0 }
                };
            }

            const { totalQs, totalTime, overthink, rush } = rows[0];
            const avgTime = totalQs > 0 ? Number((totalTime / totalQs).toFixed(1)) : 0;

            return {
                data: {
                    totalOverthinkCount: overthink,
                    totalRushCount: rush,
                    averageTimePerQuestion: avgTime
                }
            };
        } catch (error: any) {
            console.error('Error fetching behavior summary:', error);
            return { data: null, error: error.message };
        }
    }

    /**
     * Get topic accuracy distribution
     */
    static async getTopicAccuracyData(
        _client: any,
        studentId: string,
        universityId?: string
    ): Promise<{ data: { topic: string; accuracy: number }[]; error?: string }> {
        const { data: weakTopics, error } = await this.getWeakTopics(_client, studentId, universityId);
        if (error) return { data: [], error };

        return {
            data: weakTopics.map(t => ({ topic: t.topic, accuracy: t.accuracy }))
        };
    }
}
