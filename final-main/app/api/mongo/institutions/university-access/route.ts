import { NextRequest, NextResponse } from 'next/server';
import { getPortalSession as getServerSession } from '@/lib/portalSession';
import { authOptions } from '@/lib/authOptions';
import connectToDatabase from '@/lib/mongodb/connection';
import { InstitutionUniversityAccess } from '@/lib/mongodb/models';

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        await connectToDatabase();
        const { searchParams } = new URL(req.url);
        const institutionId = searchParams.get('institution_id');

        if (!institutionId) {
            return NextResponse.json({ error: 'institution_id is required' }, { status: 400 });
        }

        const rules = await InstitutionUniversityAccess.find({
            institution_id: parseInt(institutionId)
        }).lean();

        return NextResponse.json({ rules });
    } catch (error: any) {
        console.error('Institution University Access error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !['super_admin','institution_admin'].includes((session.user as any)?.role)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await connectToDatabase();
        const body = await req.json();
        const { institution_id, university_id, is_locked } = body;

        if (!institution_id || !university_id) {
            return NextResponse.json({ error: 'institution_id and university_id are required' }, { status: 400 });
        }

        const rule = await InstitutionUniversityAccess.findOneAndUpdate(
            { institution_id: parseInt(institution_id), university_id: parseInt(university_id) },
            {
                $set: { is_locked: !!is_locked, updated_at: new Date() },
                $setOnInsert: { id: Date.now() }
            },
            { upsert: true, returnDocument: 'after' }
        ).lean();

        return NextResponse.json({ success: true, rule });
    } catch (error: any) {
        console.error('Institution University Access update error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
