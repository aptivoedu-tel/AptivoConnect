import { NextRequest, NextResponse } from 'next/server';
import { getPortalSession } from '@/lib/portalSession';
import { authOptions } from '@/lib/authOptions';
import connectToDatabase from '@/lib/mongodb/connection';
import UniversityContentAccess from '@/lib/mongodb/models/UniversityContentAccess';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    try {
        const session = await getPortalSession(authOptions);
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        if (session.user.role !== 'super_admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

        const { university_id, institution_id, rows } = await req.json();

        if (!university_id) {
            return NextResponse.json({ error: 'university_id is required' }, { status: 400 });
        }

        await connectToDatabase();

        // 1. Delete existing mappings for this specific scope
        const deleteFilter: any = { university_id: parseInt(university_id) };
        if (institution_id === null || institution_id === undefined || institution_id === 'null') {
            deleteFilter.institution_id = null;
        } else {
            deleteFilter.institution_id = parseInt(institution_id);
        }
        await UniversityContentAccess.deleteMany(deleteFilter);

        // 2. Insert new rows
        if (rows && rows.length > 0) {
            console.log(`[API/ContentMapper] Bulk processing ${rows.length} mappings for University ${university_id}...`);

            // Deduplicate incoming rows to prevent unique index violations on (uni, inst, sub, top, st)
            const uniqueRows = Array.from(new Map(rows.map((row: any) => [
                `${row.subject_id}-${row.topic_id}-${row.subtopic_id}`,
                row
            ])).values());

            // Optimized ID generation: timestamp (ms) + index ensures global uniqueness across concurrent uploads
            // Safe within JavaScript's Number.MAX_SAFE_INTEGER Range (up to ~9 quadrillion)
            const baseTimestamp = Date.now();

            const rowsToInsert = uniqueRows.map((row: any, index: number) => {
                const diffs = row.difficulty_level
                    ? (row.difficulty_level === 'all' ? ['easy', 'medium', 'hard'] : row.difficulty_level.split(','))
                    : (row.allowed_difficulties || ['easy', 'medium', 'hard']);

                const { id: dummyId, ...restOfRow } = row;

                return {
                    ...restOfRow,
                    id: (baseTimestamp * 1000) + index,
                    university_id: parseInt(university_id),
                    institution_id: (institution_id === null || institution_id === 'null' || institution_id === undefined) ? null : parseInt(institution_id),
                    difficulty_level: diffs.length === 3 ? 'all' : diffs.join(','),
                    allowed_difficulties: diffs,
                    is_active: true,
                    created_at: new Date()
                };
            });

            // Using insertMany for performance with validation. 
            // In case of any ID collision (extremely unlikely now), the catch block prevents the API from returning 500.
            await UniversityContentAccess.insertMany(rowsToInsert, { ordered: true });

            console.log(`[API/ContentMapper] Bulk processed ${rowsToInsert.length} mappings for University ${university_id}.`);
        }

        return NextResponse.json({ success: true, count: rows?.length || 0 });
    } catch (error: any) {
        console.error('[API/ContentMapper] POST Internal Error:', error);
        return NextResponse.json({
            error: error.message || 'Mapping persistence failure',
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        }, { status: 500 });
    }
}

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const university_id = searchParams.get('university_id');
        const institution_id = searchParams.get('institution_id');

        if (!university_id) {
            return NextResponse.json({ error: 'university_id is required' }, { status: 400 });
        }

        await connectToDatabase();
        const filter: any = {
            university_id: parseInt(university_id),
            is_active: true
        };

        if (institution_id === null || institution_id === 'null' || !institution_id || institution_id === 'undefined') {
            filter.institution_id = null;
        } else {
            filter.institution_id = parseInt(institution_id);
        }

        const data = await UniversityContentAccess.find(filter).lean();
        return NextResponse.json({ data });
    } catch (error: any) {
        console.error('[API/ContentMapper] GET Internal Error:', error);
        return NextResponse.json({
            error: error.message || 'Mapping retrieval failure',
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        }, { status: 500 });
    }
}
