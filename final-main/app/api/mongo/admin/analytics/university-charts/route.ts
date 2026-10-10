import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb/connection';
import { PracticeSession, University, Subject } from '@/lib/mongodb/models';

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const daysParam = searchParams.get('days') || '30';

        await connectToDatabase();

        // 1. Fetch active universities
        const universities = await University.find({ is_active: true, is_public: true }).lean();
        const activeUniIds = universities.map(u => u.id);
        const uniMap = new Map(universities.map(u => [u.id, u.name]));

        let baseMatchStage: any = {};
        if (daysParam !== 'all') {
            const days = parseInt(daysParam);
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - days);
            baseMatchStage.started_at = { $gte: startDate };
        }

        // --- Chart 1: Student Enrollment Distribution ---
        // Distinct count of student_id per university_id
        const enrollmentAgg = await PracticeSession.aggregate([
            { $match: { ...baseMatchStage, university_id: { $in: activeUniIds } } },
            { $group: { _id: "$university_id", active_students: { $addToSet: "$student_id" } } },
            { $project: { _id: 1, student_count: { $size: "$active_students" } } }
        ]);

        const enrollmentChart = activeUniIds.map(uniId => {
            const data = enrollmentAgg.find(e => e._id === uniId);
            return {
                name: uniMap.get(uniId) || 'Unknown',
                students: data ? data.student_count : 0
            };
        }).sort((a, b) => b.students - a.students);

        // --- Chart 2: Top University Exam Readiness (Average Score Trajectory) ---
        const top3Unis = enrollmentChart.slice(0, 3).map(u => u.name); // only track top 3
        const top3UniIds = activeUniIds.filter(id => top3Unis.includes(uniMap.get(id) || ''));

        const readinessAgg = await PracticeSession.aggregate([
            { $match: { 
                ...baseMatchStage,
                university_id: { $in: top3UniIds }, 
                is_completed: true,
                started_at: { $ne: null }
            }},
            {
                $group: {
                    _id: {
                        date: { $dateToString: { format: "%Y-%m-%d", date: "$started_at" } },
                        uni: "$university_id"
                    },
                    avg_score: { $avg: "$score_percentage" }
                }
            },
            { $sort: { "_id.date": 1 } }
        ]);

        // Process into Recharts format { date, "Uni A": 65, "Uni B": 70 }
        const readinessMap = new Map();
        readinessAgg.forEach(item => {
            const date = item._id.date;
            const uniName = uniMap.get(item._id.uni);
            if (!readinessMap.has(date)) readinessMap.set(date, { date });
            const existing = readinessMap.get(date);
            existing[uniName] = Math.round(item.avg_score);
        });
        const readinessChart = Array.from(readinessMap.values()).sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        // --- Chart 3: Global Subject Focus ---
        const subjectAgg = await PracticeSession.aggregate([
            { $match: { ...baseMatchStage, subject_id: { $exists: true, $ne: null }, is_completed: true } },
            { $group: { _id: "$subject_id", value: { $sum: 1 } } }
        ]);

        const subjectIds = subjectAgg.map(s => s._id);
        const subjects = await Subject.find({ id: { $in: subjectIds } }).lean();
        const subjectMap = new Map(subjects.map(s => [s.id, s.name]));

        const subjectChart = subjectAgg.map(s => ({
            name: subjectMap.get(s._id) || 'General',
            value: s.value
        })).sort((a, b) => b.value - a.value).slice(0, 5); // top 5 subjects

        return NextResponse.json({
            enrollmentChart,
            readinessChart,
            subjectChart,
            topUnis: top3Unis // send names of top unis for the line chart keys
        });

    } catch (error: any) {
        console.error("University Charts API Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
