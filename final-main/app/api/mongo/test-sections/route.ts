import { NextRequest, NextResponse } from 'next/server';
import { getPortalSession as getServerSession } from '@/lib/portalSession';
import { authOptions } from '@/lib/authOptions';
import connectToDatabase from '@/lib/mongodb/connection';
import TestSection from '@/lib/mongodb/models/TestSection';
import MCQ from '@/lib/mongodb/models/MCQ';
import UniversityExam from '@/lib/mongodb/models/UniversityExam';

export async function GET(req: NextRequest) {
    try {
        await connectToDatabase();
        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');
        const isActive = searchParams.get('active');
        const isPublic = searchParams.get('public');
        const limitStr = searchParams.get('limit');
        const limit = limitStr ? (parseInt(limitStr) || 100) : 100;

        const filter: any = {};
        if (id) filter.id = parseInt(id);
        if (isActive === 'true') filter.is_active = true;
        if (isPublic === 'true') filter.is_public = true;

        const sections = await TestSection.find(filter).sort({ name: 1 }).limit(limit).lean();

        const includeCounts = searchParams.get('include_counts') === 'true';
        if (includeCounts) {
            let mcqCounts: any[] = [];
            let examCounts: any[] = [];

            try { mcqCounts = await MCQ.aggregate([{ $match: { is_active: { $ne: false } } }, { $group: { _id: '$test_section_id', count: { $sum: 1 } } }]); } 
            catch (e: any) { console.error('[TestSections] MCQ count error:', e.message); }

            try { examCounts = await UniversityExam.aggregate([{ $group: { _id: '$test_section_id', count: { $sum: 1 } } }]); } 
            catch (e: any) { console.error('[TestSections] Exam count error:', e.message); }

            const countMap = new Map<string, { mcqs: number; exams: number }>();
            mcqCounts.forEach((c: any) => {
                if (c._id !== null && c._id !== undefined) countMap.set(String(c._id), { mcqs: c.count || 0, exams: 0 });
            });
            examCounts.forEach((c: any) => {
                if (c._id !== null && c._id !== undefined) {
                    const ex = countMap.get(String(c._id)) || { mcqs: 0, exams: 0 };
                    countMap.set(String(c._id), { ...ex, exams: c.count || 0 });
                }
            });

            const withCounts = (sections as any[]).map((s: any) => {
                const counts = countMap.get(String(s.id)) || { mcqs: 0, exams: 0 };
                return { ...s, mcqCount: counts.mcqs, examCount: counts.exams };
            });

            return NextResponse.json({ sections: withCounts, count: sections.length });
        }

        return NextResponse.json({ sections, count: sections.length });
    } catch (error: any) {
        console.error('TestSections GET Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || (session.user as any)?.role !== 'super_admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await connectToDatabase();
        const body = await req.json();

        const lastSection = await TestSection.findOne().sort({ id: -1 });
        const nextId = (lastSection?.id || 0) + 1;

        const newSection = await TestSection.create({
            id: nextId,
            ...body,
            created_at: new Date(),
        });

        return NextResponse.json({ success: true, section: newSection }, { status: 201 });
    } catch (error: any) {
        console.error('TestSections POST Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PATCH(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || (session.user as any)?.role !== 'super_admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { id, ...updates } = body;
        if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

        await connectToDatabase();

        const updated = await TestSection.findOneAndUpdate(
            { id: parseInt(id) },
            { $set: updates },
            { returnDocument: 'after' }
        ).lean();

        if (!updated) return NextResponse.json({ error: 'Test section not found' }, { status: 404 });

        return NextResponse.json({ success: true, section: updated });
    } catch (error: any) {
        console.error('TestSections PATCH Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || (session.user as any)?.role !== 'super_admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');
        if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

        await connectToDatabase();
        await TestSection.findOneAndDelete({ id: parseInt(id) });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('TestSections DELETE Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
