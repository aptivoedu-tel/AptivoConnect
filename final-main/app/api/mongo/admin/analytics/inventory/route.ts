import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb/connection';
import { MCQ, University } from '@/lib/mongodb/models';
import TestSection from '@/lib/mongodb/models/TestSection';

export async function GET(req: NextRequest) {
    try {
        await connectToDatabase();

        // 1. Total Counts
        const totalCount = await MCQ.countDocuments({ is_active: { $ne: false } });
        
        // Universal MCQs: no university_id AND no test_section_id
        const universalQuery = {
            $and: [
                { $or: [{ university_id: null }, { university_id: { $exists: false } }, { university_id: "" }, { university_id: "universal" }, { university_id: 0 }] },
                { $or: [{ test_section_id: null }, { test_section_id: { $exists: false } }, { test_section_id: "" }, { test_section_id: 0 }] }
            ]
        };

        const universalCount = await MCQ.countDocuments({ 
            is_active: { $ne: false }, 
            ...universalQuery
        });

        // University MCQs: has university_id
        const universitySpecificCount = await MCQ.countDocuments({
            is_active: { $ne: false },
            $and: [
                { university_id: { $exists: true } },
                { university_id: { $nin: [null, "", "universal", 0] } }
            ]
        });

        // Global Exam MCQs: has test_section_id, but NO university_id
        const globalExamSpecificCount = await MCQ.countDocuments({
            is_active: { $ne: false },
            $and: [
                { test_section_id: { $exists: true } },
                { test_section_id: { $nin: [null, "", 0] } },
                { $or: [{ university_id: null }, { university_id: { $exists: false } }, { university_id: "" }, { university_id: "universal" }, { university_id: 0 }] }
            ]
        });

        // 2. Breakdown per University
        const universities = await University.find({}).lean();
        const breakdown = await Promise.all(universities.map(async (uni: any) => {
            const count = await MCQ.countDocuments({ 
                is_active: { $ne: false }, 
                $or: [
                    { university_id: uni.id },
                    { university_id: uni.id.toString() }
                ]
            });
            return {
                id: uni.id,
                name: uni.name,
                count: count
            };
        }));
        breakdown.sort((a, b) => b.count - a.count);

        // 3. Breakdown per Global Exam (TestSection)
        const testSections = await TestSection.find({}).lean();
        const globalBreakdown = await Promise.all(testSections.map(async (ts: any) => {
            const count = await MCQ.countDocuments({
                is_active: { $ne: false },
                $or: [
                    { test_section_id: ts.id },
                    { test_section_id: ts.id.toString() }
                ]
            });
            return {
                id: ts.id,
                name: ts.name,
                count: count
            };
        }));
        globalBreakdown.sort((a, b) => b.count - a.count);

        return NextResponse.json({
            stats: {
                totalCount,
                universalCount,
                universitySpecificCount,
                globalExamSpecificCount
            },
            breakdown: breakdown.filter(b => b.count > 0),
            globalBreakdown: globalBreakdown.filter(b => b.count > 0)
        });

    } catch (error: any) {
        console.error("Inventory Analytics Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
