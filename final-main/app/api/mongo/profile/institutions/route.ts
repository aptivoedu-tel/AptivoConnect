import { NextRequest, NextResponse } from 'next/server';
import { getPortalSession as getServerSession } from '@/lib/portalSession';
import { authOptions } from '@/lib/authOptions';
import connectToDatabase from '@/lib/mongodb/connection';
import { InstitutionAdmin, Institution } from '@/lib/mongodb/models';

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { searchParams } = new URL(req.url);
        let adminId = (session.user as any).id;
        const queryId = searchParams.get('admin_id');
        if (queryId && (session.user as any).role === 'super_admin') {
            adminId = queryId;
        }

        if (!adminId) return NextResponse.json({ error: 'Missing admin identifier' }, { status: 400 });

        await connectToDatabase();

        const adminAccess = await InstitutionAdmin.find({ user_id: adminId }).lean();
        const institutionIds = adminAccess.map((a: any) => a.institution_id);
        const institutions = await Institution.find({ id: { $in: institutionIds } }).lean();

        const formatted = adminAccess.map((a: any) => ({
            assigned_at: a.assigned_at,
            institutions: institutions.find((i: any) => i.id === a.institution_id)
        })).filter(item => item.institutions);

        return NextResponse.json({ institutions: formatted });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
