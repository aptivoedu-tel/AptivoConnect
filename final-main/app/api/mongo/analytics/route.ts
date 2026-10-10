import { NextRequest, NextResponse } from 'next/server';
import { getPortalSession as getServerSession } from '@/lib/portalSession';
import { authOptions } from '@/lib/authOptions';
import connectToDatabase from '@/lib/mongodb/connection';
import { PracticeSession, MCQAttempt, LearningStreak, Subject, Topic, Subtopic, ExamAttempt } from '@/lib/mongodb/models';
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
            studentId = queryId;
        }

        const type = searchParams.get('type');

        if (!studentId) {
            return NextResponse.json({ error: 'Missing student identifier' }, { status: 400 });
        }

        if (type === 'rank') {
            const { rank, totalStudents } = await getCachedStudentRank(studentId);

            return NextResponse.json({
                rank,
                change: 'Overall Portal Ranking', // Explicit label as requested
                total_students: totalStudents
            });
        }

        if (type === 'subject_performance') {
            const [subjects, subjectScores] = await Promise.all([
                Subject.find({ is_active: true }).select('id name').lean(),
                PracticeSession.aggregate([
                    {
                        $match: {
                            student_id: studentId,
                            is_completed: true,
                            score_percentage: { $ne: null }
                        }
                    },
                    {
                        $lookup: {
                            from: 'topics',
                            localField: 'topic_id',
                            foreignField: 'id',
                            as: 'topic'
                        }
                    },
                    {
                        $addFields: {
                            resolvedSubjectId: {
                                $ifNull: ['$subject_id', { $arrayElemAt: ['$topic.subject_id', 0] }]
                            }
                        }
                    },
                    { $match: { resolvedSubjectId: { $ne: null } } },
                    {
                        $group: {
                            _id: '$resolvedSubjectId',
                            score: { $avg: '$score_percentage' }
                        }
                    }
                ])
            ]);

            const scoreMap = new Map(subjectScores.map((row: any) => [row._id, Math.round(row.score || 0)]));

            const performance: any[] = subjects.map((s: any) => {
                return {
                    subject: s.name,
                    score: scoreMap.get(s.id) || 0,
                    fullMark: 100
                };
            }).filter((p: any) => p.score > 0 || subjects.length < 5); // Keep at least some or those with scores

            return NextResponse.json({ performance });
        }

        if (type === 'study_activity') {
            const days = parseInt(searchParams.get('days') || '7');
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - (days - 1));
            startDate.setHours(0, 0, 0, 0);

            const sessions = await PracticeSession.aggregate([
                {
                    $match: {
                        student_id: studentId,
                        started_at: { $gte: startDate }
                    }
                },
                {
                    $group: {
                        _id: { $dateToString: { format: '%Y-%m-%d', date: '$started_at' } },
                        totalSeconds: { $sum: { $ifNull: ['$time_spent_seconds', 0] } }
                    }
                }
            ]);

            const activityMap: Record<string, number> = {};
            const labels: string[] = [];
            const dateKeyMap: Record<string, string> = {};

            for (let i = 0; i < days; i++) {
                const date = new Date(startDate);
                date.setDate(startDate.getDate() + i);
                const dateStr = timeframeLabel(date, days <= 7 ? 'week' : 'month');
                activityMap[dateStr] = 0;
                dateKeyMap[date.toISOString().split('T')[0]] = dateStr;
                labels.push(dateStr);
            }

            sessions.forEach((s: any) => {
                const dateStr = dateKeyMap[s._id];
                if (activityMap[dateStr] !== undefined) {
                    activityMap[dateStr] += (s.totalSeconds || 0) / 3600;
                }
            });

            const activity = labels.map((label: string) => ({
                name: label,
                hours: parseFloat(activityMap[label].toFixed(2))
            }));

            return NextResponse.json({ activity });
        }

        // 1. Calculate Global Summary (Top 3 Boxes)
        const [globalSessionStats] = await Promise.all([
            PracticeSession.aggregate([
                { $match: { student_id: studentId, is_completed: true } },
                { $sort: { started_at: -1 } },
                {
                    $group: {
                        _id: null,
                        totalSessions: { $sum: 1 },
                        totalTimeSeconds: { $sum: { $ifNull: ['$time_spent_seconds', 0] } },
                        recentScores: { $push: '$score_percentage' }
                    }
                },
                {
                    $project: {
                        totalSessions: 1,
                        totalTimeSeconds: 1,
                        recentScores: { $slice: ['$recentScores', 10] }
                    }
                }
            ])
        ]);

        const sessionStats = globalSessionStats[0] || { totalSessions: 0, totalTimeSeconds: 0, recentScores: [] };
        const totalSessions = sessionStats.totalSessions || 0;
        const recentScores = (sessionStats.recentScores || []).filter((score: number | null | undefined) => score !== null && score !== undefined);
        const avgScore = recentScores.length > 0
            ? Math.round(recentScores.reduce((sum: number, score: number) => sum + (score || 0), 0) / recentScores.length)
            : 0;
        const totalTimeMinutes = Math.round((sessionStats.totalTimeSeconds || 0) / 60);

        // 2. Section-Specific Data (Activity Feed)
        const uniId = searchParams.get('university_id');
        const testSectionId = searchParams.get('test_section_id');
        let uniFilter: any = { student_id: studentId };
        
        if (uniId) {
            const idNum = parseInt(uniId);
            // Get all topics/subtopics for this university to be robust
            const [uniTopics, uniSubtopics] = await Promise.all([
                Topic.find({ university_id: idNum }).select('id').lean(),
                Subtopic.find({ university_id: idNum }).select('id').lean()
            ]);
            
            const topicIds = uniTopics.map(t => t.id);
            const subtopicIds = uniSubtopics.map(s => s.id);

            uniFilter.$or = [
                { university_id: idNum },
                { topic_id: { $in: topicIds } },
                { subtopic_id: { $in: subtopicIds } }
            ];
        } else if (testSectionId) {
            const idNum = parseInt(testSectionId);
            // test_section_id directly in practice session is not always available, filter by test section content
            const [secTopics, secSubtopics] = await Promise.all([
                Topic.find({ test_section_id: idNum }).select('id').lean(),
                Subtopic.find({ test_section_id: idNum }).select('id').lean()
            ]);
            
            const topicIds = secTopics.map(t => t.id);
            const subtopicIds = secSubtopics.map(s => s.id);

            uniFilter.$or = [
                { test_section_id: idNum },
                { topic_id: { $in: topicIds } },
                { subtopic_id: { $in: subtopicIds } }
            ];
        }

        const [sessions, attempts, exams] = await Promise.all([
            PracticeSession.find({ ...uniFilter, is_completed: true }).sort({ started_at: -1 }).limit(10),
            MCQAttempt.aggregate([
                { $match: uniFilter },
                {
                    $group: {
                        _id: null,
                        totalAttempts: { $sum: 1 },
                        totalCorrect: { $sum: { $cond: ['$is_correct', 1, 0] } },
                        totalIncorrect: {
                            $sum: {
                                $cond: [
                                    {
                                        $and: [
                                            { $eq: ['$is_correct', false] },
                                            { $ne: ['$selected_option', 'SKIPPED'] },
                                            { $ne: ['$selected_option', null] }
                                        ]
                                    },
                                    1,
                                    0
                                ]
                            }
                        }
                    }
                }
            ]),
            ExamAttempt.find({ ...uniFilter, status: { $in: ['submitted', 'completed'] } }).sort({ created_at: -1 }).limit(10)
        ]);

        const attemptStats = attempts[0] || { totalAttempts: 0, totalCorrect: 0, totalIncorrect: 0 };
        const totalAttempts = attemptStats.totalAttempts || 0;
        const totalCorrect = attemptStats.totalCorrect || 0;
        const totalIncorrect = attemptStats.totalIncorrect || 0;
        const totalSkipped = totalAttempts - totalCorrect - totalIncorrect;

        // Merge sessions and exams for recent activity
        const recentActivity = [
            ...sessions.map((s: any) => ({
                id: s.id || s._id,
                type: 'practice',
                title: s.topic_name || 'Practice Session',
                date: s.started_at,
                score: s.score_percentage || 0,
                correct: s.correct_answers || 0,
                incorrect: s.wrong_answers || 0,
                total: s.total_questions || 0
            })),
            ...exams.map((e: any) => ({
                id: e.id,
                type: 'exam',
                title: `Exam #${e.exam_id}`,
                date: e.created_at || e.start_time,
                score: Math.round((e.score / (e.total_marks || 1)) * 100),
                correct: e.score || 0,
                incorrect: (e.total_marks || 0) - (e.score || 0),
                total: e.total_marks || 0
            }))
        ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 10);

        return NextResponse.json({
            analytics: {
                total_sessions: totalSessions,
                total_attempts: totalAttempts,
                total_correct: totalCorrect,
                total_incorrect: totalIncorrect,
                total_skipped: totalSkipped,
                avg_score: avgScore,
                total_study_minutes: totalTimeMinutes,
                recent_activity: recentActivity
            }
        });
    } catch (error: any) {
        console.error('Analytics Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

function timeframeLabel(date: Date, timeframe: 'week' | 'month') {
    if (timeframe === 'week') {
        return date.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
    }
    return date.toLocaleDateString('en-US', { day: '2-digit', month: 'short' });
}
