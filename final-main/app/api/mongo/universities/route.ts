import { NextRequest, NextResponse } from 'next/server';
import { getPortalSession as getServerSession } from '@/lib/portalSession';
import { authOptions } from '@/lib/authOptions';
import connectToDatabase from '@/lib/mongodb/connection';
import University from '@/lib/mongodb/models/University';
import { getNextSequence } from '@/lib/mongodb/counter';


export async function GET(req: NextRequest) {
    try {
        await connectToDatabase();

        const { searchParams } = new URL(req.url);
        const isActive = searchParams.get('active');
        const isPublic = searchParams.get('public');
        const limit = parseInt(searchParams.get('limit') || '50');

        const filter: any = {};
        if (isActive === 'true') filter.is_active = true;
        if (isPublic === 'true') filter.is_public = true;

        const universities = await University.find(filter)
            .sort({ name: 1 })
            .limit(limit)
            .lean();

        const includeCounts = searchParams.get('include_counts') === 'true';
        if (includeCounts) {
            const db = University.db;
            const mcqCounts = await db.collection('mcqs').aggregate([
                { $match: { is_active: { $ne: false } } },
                { $group: { _id: "$university_id", count: { $sum: 1 } } }
            ]).toArray();

            const countMap = new Map();
            mcqCounts.forEach(c => {
                countMap.set(String(c._id), c.count);
                if (typeof c._id === 'number') countMap.set(c._id, c.count);
            });

            const unisWithCounts = universities.map((u: any) => ({
                ...u,
                mcqCount: countMap.get(String(u.id)) || countMap.get(u.id) || 0
            }));

            return NextResponse.json({ universities: unisWithCounts, count: universities.length });
        }

        return NextResponse.json({ universities, count: universities.length });
    } catch (error: any) {
        console.error('Universities Error:', error);
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

        // Generate a unique incremental ID using atomic counter
        const newId = await getNextSequence('university');
        const newUniversity = await University.create({
            id: newId,
            ...body,
            created_at: new Date(),
        });

        return NextResponse.json({ success: true, university: newUniversity }, { status: 201 });
    } catch (error: any) {
        console.error('Create University Error:', error);
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

        if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });

        await connectToDatabase();

        const updated = await University.findOneAndUpdate(
            { id: parseInt(id) },
            { $set: updates },
            { returnDocument: 'after' }
        ).lean();

        if (!updated) return NextResponse.json({ error: 'University not found' }, { status: 404 });

        return NextResponse.json({ success: true, university: updated });

    } catch (error: any) {
        console.error('Update University Error:', error);
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

        if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });

        await connectToDatabase();

        await University.findOneAndDelete({ id: parseInt(id) });

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error('Delete University Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
