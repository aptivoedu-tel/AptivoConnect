import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb/connection';
import { PracticeSession, Subject } from '@/lib/mongodb/models';
import TestSection from '@/lib/mongodb/models/TestSection';
import StudentTestSectionEnrollment from '@/lib/mongodb/models/StudentTestSectionEnrollment';

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const daysParam = searchParams.get('days') || '30';

        await connectToDatabase();

        // 1. Fetch active test sections
        const testSections = await TestSection.find({ is_active: true, is_public: true }).lean();
        const activeSectionIds = testSections.map(ts => ts.id);
        const sectionMap = new Map(testSections.map(ts => [ts.id, ts.name]));

        // Fetch subjects belonging to active test sections
        const subjects = await Subject.find({
            test_section_id: { $in: activeSectionIds },
            is_active: true
        }).lean();

        const subjectToSectionMap = new Map<number, number>();
        subjects.forEach(s => {
            subjectToSectionMap.set(s.id, s.test_section_id);
        });

        const allSubjectIds = subjects.map(s => s.id);

        let baseMatchStage: any = {
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
            baseMatchStage.started_at = { $gte: startDate };
        }
        
        const { Topic, Subtopic } = await import('@/lib/mongodb/models');
        const [topics, subtopics] = await Promise.all([
            Topic.find({ test_section_id: { $in: activeSectionIds } }).lean(),
            Subtopic.find({ test_section_id: { $in: activeSectionIds } }).lean()
        ]);
        const topicToSectionMap = new Map<number, number>();
        topics.forEach((t: any) => topicToSectionMap.set(t.id, t.test_section_id));
        const subtopicToSectionMap = new Map<number, number>();
        subtopics.forEach((s: any) => subtopicToSectionMap.set(s.id, s.test_section_id));

        // --- Chart 1: Student Enrollment Distribution ---
        // Fetch all approved student enrollments for active test sections
        const enrollments = await StudentTestSectionEnrollment.find({
            test_section_id: { $in: activeSectionIds },
            status: 'approved'
        }).lean();

        const sectionStudentsMap = new Map<number, Set<string>>();
        activeSectionIds.forEach(id => sectionStudentsMap.set(id, new Set<string>()));

        // Add enrolled students to the set
        enrollments.forEach((e: any) => {
            if (sectionStudentsMap.has(e.test_section_id)) {
                sectionStudentsMap.get(e.test_section_id)!.add(e.user_id);
            }
        });

        // Merge with distinct count of student_id from practice sessions
        const enrollmentAgg = await PracticeSession.aggregate([
            { $match: baseMatchStage },
            { $group: { 
                _id: {
                    subject_id: "$subject_id",
                    topic_id: "$topic_id",
                    subtopic_id: "$subtopic_id",
                    test_section_id: "$test_section_id"
                }, 
                active_students: { $addToSet: "$student_id" } 
            }}
        ]);

        // Map subject enrollment to test sections
        enrollmentAgg.forEach(item => {
            const secId = item._id.test_section_id || 
                          subjectToSectionMap.get(item._id.subject_id) || 
                          topicToSectionMap.get(item._id.topic_id) || 
                          subtopicToSectionMap.get(item._id.subtopic_id);
            if (secId !== undefined && sectionStudentsMap.has(secId)) {
                const studentSet = sectionStudentsMap.get(secId)!;
                item.active_students.forEach((sid: string) => studentSet.add(sid));
            }
        });

        const enrollmentChart = activeSectionIds.map(secId => ({
            name: sectionMap.get(secId) || 'Unknown',
            students: sectionStudentsMap.get(secId)?.size || 0
        })).sort((a, b) => b.students - a.students);

        // --- Chart 2: Top Global Exam Readiness (Average Score Trajectory) ---
        const top3Sections = enrollmentChart.slice(0, 3).map(s => s.name); // only track top 3
        const top3SectionIds = activeSectionIds.filter(id => top3Sections.includes(sectionMap.get(id) || ''));

        const readinessAgg = await PracticeSession.aggregate([
            { $match: { 
                ...baseMatchStage,
                is_completed: true,
                started_at: { $ne: null }
            }},
            {
                $group: {
                    _id: {
                        date: { $dateToString: { format: "%Y-%m-%d", date: "$started_at" } },
                        subject_id: "$subject_id",
                        topic_id: "$topic_id",
                        subtopic_id: "$subtopic_id",
                        test_section_id: "$test_section_id"
                    },
                    avg_score: { $avg: "$score_percentage" },
                    total_sessions: { $sum: 1 }
                }
            },
            { $sort: { "_id.date": 1 } }
        ]);

        // Process readiness into Recharts format
        const readinessMap = new Map();
        readinessAgg.forEach(item => {
            const date = item._id.date;
            const secId = item._id.test_section_id || 
                          subjectToSectionMap.get(item._id.subject_id) || 
                          topicToSectionMap.get(item._id.topic_id) || 
                          subtopicToSectionMap.get(item._id.subtopic_id);
                          
            if (secId === undefined || !top3SectionIds.includes(secId)) return;
            const secName = sectionMap.get(secId);
            if (!secName) return;

            if (!readinessMap.has(date)) {
                readinessMap.set(date, { date });
            }
            const existing = readinessMap.get(date);
            
            if (existing[secName] !== undefined) {
                existing[secName] = Math.round((existing[secName] + item.avg_score) / 2);
            } else {
                existing[secName] = Math.round(item.avg_score);
            }
        });
        const readinessChart = Array.from(readinessMap.values()).sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        // --- Chart 3: Global Exam Focus (Subject Breakdown within Global Exams) ---
        const subjectAgg = await PracticeSession.aggregate([
            { $match: { ...baseMatchStage, is_completed: true, subject_id: { $in: allSubjectIds } } },
            { $group: { _id: "$subject_id", value: { $sum: 1 } } }
        ]);

        const subjectMap = new Map(subjects.map(s => [s.id, s.name]));

        const subjectChart = subjectAgg.map(s => ({
            name: subjectMap.get(s._id) || 'General',
            value: s.value
        })).filter(s => s.name !== 'General') // only show global exam subjects
           .sort((a, b) => b.value - a.value).slice(0, 5); // top 5 subjects

        return NextResponse.json({
            enrollmentChart,
            readinessChart,
            subjectChart,
            topUnis: top3Sections // send names of top sections for the line chart keys (using topUnis key to reuse chart mapping logic)
        });

    } catch (error: any) {
        console.error("Global Exam Charts API Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
