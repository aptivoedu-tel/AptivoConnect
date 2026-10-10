import { NextRequest, NextResponse } from 'next/server';
import { getPortalSession } from '@/lib/portalSession';
import { authOptions } from '@/lib/authOptions';
import connectToDatabase from '@/lib/mongodb/connection';
import TestSectionContentAccess from '@/lib/mongodb/models/TestSectionContentAccess';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    try {
        const session = await getPortalSession(authOptions);
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        if (session.user.role !== 'super_admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

        const { test_section_id, rows } = await req.json();

        if (!test_section_id) {
            return NextResponse.json({ error: 'test_section_id is required' }, { status: 400 });
        }

        await connectToDatabase();

        // Delete all existing mappings for this section
        await TestSectionContentAccess.deleteMany({ test_section_id: parseInt(test_section_id) });

        if (rows && rows.length > 0) {
            const uniqueRows = Array.from(new Map(rows.map((row: any) => [
                `${row.subject_id}-${row.topic_id}-${row.subtopic_id}`,
                row
            ])).values());

            const baseTimestamp = Date.now();

            const rowsToInsert = uniqueRows.map((row: any, index: number) => {
                const diffs = row.difficulty_level
                    ? (row.difficulty_level === 'all' ? ['easy', 'medium', 'hard'] : row.difficulty_level.split(','))
                    : ['easy', 'medium', 'hard'];

                const { id: _id, ...restOfRow } = row;

                return {
                    ...restOfRow,
                    id: (baseTimestamp * 1000) + index,
                    test_section_id: parseInt(test_section_id),
                    difficulty_level: diffs.length === 3 ? 'all' : diffs.join(','),
                    is_active: true,
                    created_at: new Date()
                };
            });

            await TestSectionContentAccess.insertMany(rowsToInsert, { ordered: true });
        }

        return NextResponse.json({ success: true, count: rows?.length || 0 });
    } catch (error: any) {
        console.error('[API/TestSectionMapper] POST Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const test_section_id = searchParams.get('test_section_id');

        if (!test_section_id) {
            return NextResponse.json({ error: 'test_section_id is required' }, { status: 400 });
        }

        await connectToDatabase();

        const data = await TestSectionContentAccess.find({
            test_section_id: parseInt(test_section_id),
            is_active: true
        }).lean();

        return NextResponse.json({ data });
    } catch (error: any) {
        console.error('[API/TestSectionMapper] GET Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
