import { NextRequest, NextResponse } from 'next/server';
import { getPortalSession as getServerSession } from '@/lib/portalSession';
import { authOptions } from '@/lib/authOptions';
import connectToDatabase from '@/lib/mongodb/connection';
import { ActivityLog } from '@/lib/mongodb/models';

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { searchParams } = new URL(req.url);
        
        let userId = (session.user as any).id;
        const queryId = searchParams.get('user_id');
        if (queryId && ((session.user as any).role === 'super_admin' || (session.user as any).role === 'institution_admin')) {
            userId = queryId;
        }

        if (!userId) return NextResponse.json({ error: 'Missing user identifier' }, { status: 400 });
        const limit = parseInt(searchParams.get('limit') || '10');

        await connectToDatabase();

        const activities = await ActivityLog.find({ user_id: userId })
            .sort({ created_at: -1 })
            .limit(limit)
            .lean();

        return NextResponse.json({ activities });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
