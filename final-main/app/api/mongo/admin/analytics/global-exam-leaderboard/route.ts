import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb/connection';
import { PracticeSession, Subject, Topic, Subtopic } from '@/lib/mongodb/models';
import TestSection from '@/lib/mongodb/models/TestSection';
import StudentTestSectionEnrollment from '@/lib/mongodb/models/StudentTestSectionEnrollment';

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const daysParam = searchParams.get('days') || '30';

        await connectToDatabase();

        // 1. Fetch ALL active and public test sections
        const testSections = await TestSection.find({ 
            is_active: true,
            is_public: true 
        }).lean();

        if (testSections.length === 0) {
            return NextResponse.json({ leaderboard: [] });
        }

        const validSectionIds = testSections.map(ts => ts.id);
        const sectionMap = new Map(testSections.map(ts => [ts.id, ts.name]));

        // 2. Fetch all subjects belonging to these test sections
        const subjects = await Subject.find({
            test_section_id: { $in: validSectionIds },
            is_active: true
        }).lean();

        // Map subject_id to test_section_id
        const subjectToSectionMap = new Map<number, number>();
        subjects.forEach(sub => {
            subjectToSectionMap.set(sub.id, sub.test_section_id);
        });

        const allSubjectIds = subjects.map(s => s.id);

        let matchStage: any = { 
            is_completed: true, 
            // Ensure we only count global exam attempts (not university specific ones)
            $or: [
                { university_id: null },
                { university_id: { $exists: false } },
                { university_id: 0 }
            ]
        };
        
        if (daysParam !== 'all') {
            const days = parseInt(daysParam);
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - days);
            matchStage.started_at = { $gte: startDate };
        }

        // 3. Aggregate Practice Sessions by test_section_id using a lookup or manual map
        // Since we removed subject_id strict match, let's just fetch all global sessions
        // and map them manually.
        // Map topic_id and subtopic_id to test_section_id as well
        const [topics, subtopics] = await Promise.all([
            connectToDatabase().then(() => Topic.find({ test_section_id: { $in: validSectionIds } }).lean() || []),
            connectToDatabase().then(() => Subtopic.find({ test_section_id: { $in: validSectionIds } }).lean() || [])
        ]);

        const topicToSectionMap = new Map<number, number>();
        topics.forEach((t: any) => topicToSectionMap.set(t.id, t.test_section_id));

        const subtopicToSectionMap = new Map<number, number>();
        subtopics.forEach((s: any) => subtopicToSectionMap.set(s.id, s.test_section_id));

        const stats = await PracticeSession.aggregate([
            { $match: matchStage },
            {
                $group: {
                    _id: {
                        subject_id: "$subject_id",
                        topic_id: "$topic_id",
                        subtopic_id: "$subtopic_id",
                        test_section_id: "$test_section_id"
                    },
                    average_score: { $avg: "$score_percentage" },
                    total_sessions: { $sum: 1 },
                    total_time_spent: { $sum: "$time_spent_seconds" }
                }
            }
        ]);

        // Aggregate subject stats into test section stats
        const sectionStatsMap = new Map<number, { scoreSum: number, scoreCount: number, totalSessions: number, totalTimeSpent: number }>();
        
        validSectionIds.forEach(id => {
            sectionStatsMap.set(id, { scoreSum: 0, scoreCount: 0, totalSessions: 0, totalTimeSpent: 0 });
        });

        stats.forEach(s => {
            const secId = s._id.test_section_id || 
                          subjectToSectionMap.get(s._id.subject_id) || 
                          topicToSectionMap.get(s._id.topic_id) || 
                          subtopicToSectionMap.get(s._id.subtopic_id);
                          
            if (secId !== undefined && sectionStatsMap.has(secId)) {
                const cur = sectionStatsMap.get(secId)!;
                cur.scoreSum += (s.average_score || 0) * s.total_sessions;
                cur.scoreCount += s.total_sessions;
                cur.totalSessions += s.total_sessions;
                cur.totalTimeSpent += s.total_time_spent;
            }
        });
        const enrollmentDocs = await StudentTestSectionEnrollment.find({ test_section_id: { $in: validSectionIds } }).lean();
        console.log('Enrollment docs fetched:', enrollmentDocs.length);
        const enrollmentMap = new Map<number, number>();
        enrollmentDocs.forEach(doc => {
            const cnt = enrollmentMap.get(doc.test_section_id) || 0;
            enrollmentMap.set(doc.test_section_id, cnt + 1);
        });

        // 4. Map over ALL valid test sections to ensure those with 0 sessions are still included
        let leaderboard = validSectionIds.map(id => {
            const s = sectionStatsMap.get(id)!;
            return {
                test_section_id: id,
                test_section_name: sectionMap.get(id) || 'Unknown',
                average_score: s.scoreCount > 0 ? Math.round(s.scoreSum / s.scoreCount) : 0,
                total_sessions: s.totalSessions,
                total_time_spent_minutes: Math.round(s.totalTimeSpent / 60),
                enrollment_count: enrollmentMap.get(id) || 0
            };
        });

        // 5. Sort descending by total time spent, and then by total sessions for ties
        leaderboard.sort((a, b) => {
            if (b.total_time_spent_minutes !== a.total_time_spent_minutes) return b.total_time_spent_minutes - a.total_time_spent_minutes;
            return b.total_sessions - a.total_sessions;
        });

        return NextResponse.json({ leaderboard });

    } catch (error: any) {
        console.error("Global Exam Leaderboard Analytics Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
