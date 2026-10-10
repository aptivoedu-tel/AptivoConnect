import { NextRequest, NextResponse } from 'next/server';
import { getPortalSession as getServerSession } from '@/lib/portalSession';
import { authOptions } from '@/lib/authOptions';
import connectToDatabase from '@/lib/mongodb/connection';
import User from '@/lib/mongodb/models/User';
import PracticeSession from '@/lib/mongodb/models/PracticeSession';
import Subject from '@/lib/mongodb/models/Subject';
import Topic from '@/lib/mongodb/models/Topic';
import Subtopic from '@/lib/mongodb/models/Subtopic';
import University from '@/lib/mongodb/models/University';
import StudentUniversityEnrollment from '@/lib/mongodb/models/StudentUniversityEnrollment';
import UniversityContentAccess from '@/lib/mongodb/models/UniversityContentAccess';
import SubtopicProgress from '@/lib/mongodb/models/SubtopicProgress';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { searchParams } = new URL(req.url);
        const studentId = searchParams.get('student_id');
        const startDateStr = searchParams.get('start_date');

        if (!studentId) return NextResponse.json({ error: 'student_id required' }, { status: 400 });

        const userId = (session.user as any).id;
        const userRole = (session.user as any).role;

        await connectToDatabase();

        // Security / Multi-tenancy check
        if (userRole !== 'super_admin') {
            if (userRole === 'institution_admin') {
                const studentUser = await User.findOne({ id: studentId });
                if (!studentUser || Number(studentUser.institution_id) !== Number((session.user as any).institution_id)) {
                    return NextResponse.json({ error: 'Forbidden: Student does not belong to your institution' }, { status: 403 });
                }
            } else {
                // Regular students can only view their own stats
                if (studentId !== userId) {
                    return NextResponse.json({ error: 'Forbidden: You can only view your own statistics' }, { status: 403 });
                }
            }
        }

        // 1. Get Student Data
        const student = await User.findOne({ id: studentId }).select('full_name email').lean() as any;
        if (!student) return NextResponse.json({ error: 'Student not found' }, { status: 404 });

        // 2. Get All Relevant Content Names/Colors
        const [subjects, topics, subtopics] = await Promise.all([
            Subject.find({ is_active: true }).lean(),
            Topic.find({ is_active: true }).lean(),
            Subtopic.find({ is_active: true }).lean()
        ]) as [any[], any[], any[]];

        const subjectMap = new Map(subjects.map((s: any) => [s.id, s]));
        const topicMap = new Map(topics.map((t: any) => [t.id, t]));
        const subtopicMap = new Map(subtopics.map((s: any) => [s.id, s]));

        // 3. Get Student Sessions
        const sessionFilter: any = { student_id: studentId, is_completed: true };
        if (startDateStr) {
            sessionFilter.started_at = { $gte: new Date(startDateStr) };
        }
        const sessions = await PracticeSession.find(sessionFilter).lean() as any[];

        // 4. Calculate Stats by Subject
        const subjStatsMap: Record<number, { sum: number, count: number, name: string, color: string }> = {};
        sessions.forEach((s: any) => {
            // Priority 1: session.subject_id
            // Priority 2: topic.subject_id
            let finalSubjectId = s.subject_id;

            if (!finalSubjectId && s.topic_id) {
                const topic = topicMap.get(s.topic_id);
                if (topic) finalSubjectId = topic.subject_id;
            }
            if (!finalSubjectId && s.subtopic_id) {
                const topId = subtopicMap.get(s.subtopic_id)?.topic_id;
                if (topId) finalSubjectId = topicMap.get(topId)?.subject_id;
            }

            if (!finalSubjectId) return;

            if (!subjStatsMap[finalSubjectId]) {
                const subj = subjectMap.get(Number(finalSubjectId)) as any;
                subjStatsMap[finalSubjectId] = {
                    sum: 0,
                    count: 0,
                    name: subj?.name || 'Unknown',
                    color: subj?.color || '#14b8a6'
                };
            }
            subjStatsMap[finalSubjectId].sum += (s.score_percentage || 0);
            subjStatsMap[finalSubjectId].count++;
        });

        const subjectStats = Object.values(subjStatsMap).map(s => ({
            name: s.name,
            average: Math.round(s.sum / s.count),
            count: s.count,
            color: s.color
        }));

        // 5. Calculate Stats by Topic
        const topStatsMap: Record<number, { sum: number, count: number, name: string, subjectName: string }> = {};
        sessions.forEach((s: any) => {
            if (!s.topic_id) return;
            if (!topStatsMap[s.topic_id]) {
                const top = topicMap.get(s.topic_id) as any;

                let subjId = s.subject_id;
                if (!subjId && top) subjId = top.subject_id;

                const subj = subjectMap.get(Number(subjId)) as any;

                topStatsMap[s.topic_id] = {
                    sum: 0,
                    count: 0,
                    name: top?.name || 'Unknown',
                    subjectName: subj?.name || 'General'
                };
            }
            topStatsMap[s.topic_id].sum += (s.score_percentage || 0);
            topStatsMap[s.topic_id].count++;
        });

        const topicStats = Object.values(topStatsMap).map(t => ({
            name: t.name,
            average: Math.round(t.sum / t.count),
            count: t.count,
            subjectName: t.subjectName
        }));

        // 6. Calculate University Preparation Stats - 3 signals:
        //    a) Test Accuracy  = avg score_percentage of practice sessions covering the university's syllabus
        //    b) Module Completion = % of university's subtopics the student has read OR practiced
        //    c) Overall Preparation Score = weighted(50% accuracy + 50% completion)

        const enrollments = await StudentUniversityEnrollment.find({ user_id: studentId }).lean() as any[];
        const universityIds = enrollments.map((e: any) => e.university_id);
        const universities = await University.find({ id: { $in: universityIds } }).lean() as any[];

        // Pre-fetch all subtopic progress for this student (read modules)
        const studentSubtopicProgress = await SubtopicProgress.find({ student_id: studentId }).lean() as any[];
        const readSubtopicIds = new Set(
            studentSubtopicProgress.filter((p: any) => p.is_completed).map((p: any) => Number(p.subtopic_id))
        );

        // Pre-fetch practiced subtopics across all sessions
        const practicedSubtopicIds = new Set(sessions.filter((s: any) => s.subtopic_id != null).map((s: any) => Number(s.subtopic_id)));
        const practicedTopicIds = new Set(sessions.filter((s: any) => s.topic_id != null).map((s: any) => Number(s.topic_id)));

        const uniStats = await Promise.all(universities.map(async (uni: any) => {
            // Get all subtopics/topics linked to this university via UniversityContentAccess
            const contentAccess = await UniversityContentAccess.find({ university_id: uni.id, is_active: true }).lean() as any[];

            const uniTopicIds = new Set(contentAccess.filter((c: any) => c.topic_id).map((c: any) => Number(c.topic_id)));
            const uniDirectSubtopicIds = contentAccess.filter((c: any) => c.subtopic_id).map((c: any) => Number(c.subtopic_id));

            // Expand syllabus to include subtopics from topics
            let allUniSubtopicIds = [...uniDirectSubtopicIds];
            const uniTopicIdArray = Array.from(uniTopicIds);
            if (uniTopicIdArray.length > 0) {
                const subtopicsFromTopics = subtopics.filter((s: any) => uniTopicIdArray.includes(Number(s.topic_id)));
                allUniSubtopicIds = [...allUniSubtopicIds, ...subtopicsFromTopics.map((s: any) => Number(s.id))];
            }

            const uniqueSubtopicIds = new Set(allUniSubtopicIds);
            const totalModules = uniqueSubtopicIds.size;

            // --- Signal 1: Test Accuracy ---
            // Sessions belonging to this university's syllabus or specifically tagged to this university
            const uniSessions = sessions.filter((s: any) =>
                Number(s.university_id) === Number(uni.id) ||
                uniqueSubtopicIds.has(Number(s.subtopic_id)) ||
                uniTopicIds.has(Number(s.topic_id))
            );

            const totalUniSessions = uniSessions.length;
            const testAccuracy = totalUniSessions > 0
                ? Number((uniSessions.reduce((sum: number, s: any) => sum + (s.score_percentage || 0), 0) / totalUniSessions).toFixed(2))
                : null; // null means no relevant sessions

            const totalCorrect = uniSessions.reduce((s: number, sess: any) => s + (sess.correct_answers || 0), 0);
            const totalQuestions = uniSessions.reduce((s: number, sess: any) => s + (sess.total_questions || 0), 0);

            // --- Signal 2: Module Completion ---
            let completedModules = 0;
            uniqueSubtopicIds.forEach((id: number) => {
                // Done if they read it OR practiced it
                if (readSubtopicIds.has(id) || practicedSubtopicIds.has(id)) {
                    completedModules++;
                } else {
                    // Also check if they practiced the parent topic without specifying subtopic
                    const parentTopicId = subtopicMap.get(id)?.topic_id;
                    if (parentTopicId && practicedTopicIds.has(Number(parentTopicId))) {
                        completedModules++;
                    }
                }
            });

            const moduleCompletionRate = totalModules > 0 ? Number(((completedModules / totalModules) * 100).toFixed(2)) : 0;

            // --- Signal 3: Overall Preparation Score ---
            // Score = Module Coverage % * Test Accuracy %
            // Doing 1 topic perfectly out of 100 means you are only 1% prepared.
            let preparationScore: number;
            if (testAccuracy !== null) {
                // E.g. 50% completed modules * 80% average test accuracy = 40% overall prep
                preparationScore = Number((moduleCompletionRate * (testAccuracy / 100)).toFixed(2));
            } else {
                // If they have no test data to validate their reading, cap their preparation confidence.
                // E.g. they read 100% syllabus but took no tests = roughly 50% prep assumed.
                preparationScore = Number((moduleCompletionRate * 0.5).toFixed(2));
            }

            // --- Subject Breakdown per University ---
            const subjBreakdownMap: Record<number, { sum: number, count: number, name: string, color: string }> = {};
            uniSessions.forEach((s: any) => {
                let subjId = s.subject_id;
                if (!subjId && s.topic_id) subjId = topicMap.get(s.topic_id)?.subject_id;
                if (!subjId && s.subtopic_id) subjId = topicMap.get(subtopicMap.get(s.subtopic_id)?.topic_id)?.subject_id;
                if (!subjId) return;

                if (!subjBreakdownMap[subjId]) {
                    const subj = subjectMap.get(subjId);
                    subjBreakdownMap[subjId] = { sum: 0, count: 0, name: subj?.name || 'General', color: subj?.color || '#0d9488' };
                }
                subjBreakdownMap[subjId].sum += (s.score_percentage || 0);
                subjBreakdownMap[subjId].count++;
            });

            const subjectScores = Object.values(subjBreakdownMap).map(s => ({
                name: s.name,
                average: Number((s.sum / s.count).toFixed(2)),
                color: s.color
            }));

            return {
                name: uni.name,
                average: preparationScore,        // Used by radar chart
                preparationScore,
                testAccuracy: testAccuracy ?? 0,
                hasTestData: testAccuracy !== null,
                moduleCompletionRate,
                completedModules,
                totalModules,
                totalSessions: totalUniSessions,
                totalCorrect,
                totalQuestions,
                subjectScores                    // Specific bar chart data per university
            };
        }));


        // 7. Overall Summary
        const overallAvg = sessions.length > 0
            ? Math.round(sessions.reduce((sum: number, s: any) => sum + (s.score_percentage || 0), 0) / sessions.length)
            : 0;

        return NextResponse.json({
            student,
            stats: {
                averageScore: overallAvg,
                totalSessions: sessions.length,
                universityStats: uniStats,
                subjectStats,
                topicStats
            }
        });

    } catch (error: any) {
        console.error('Student Drilldown Analytics Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
