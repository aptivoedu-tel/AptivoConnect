import { NextRequest, NextResponse } from 'next/server';
import { getPortalSession as getServerSession } from '@/lib/portalSession';
import { authOptions } from '@/lib/authOptions';
import connectToDatabase from '@/lib/mongodb/connection';
import { ActivityLog, User } from '@/lib/mongodb/models';

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const userRole = (session.user as any).role;
        if (userRole !== 'super_admin' && userRole !== 'institution_admin') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const { searchParams } = new URL(req.url);
        const limit = parseInt(searchParams.get('limit') || '10');

        await connectToDatabase();

        const filter: any = {};
        if (userRole === 'institution_admin') {
            const adminInstId = Number((session.user as any).institution_id);
            const usersInInstitution = await User.find({ institution_id: adminInstId }).select('id').lean();
            const userIds = usersInInstitution.map(u => u.id);
            filter.user_id = { $in: userIds };
        }

        const logs = await ActivityLog.find(filter)
            .sort({ created_at: -1 })
            .limit(limit)
            .lean();

        // Populate user info manually since we might not have refs set up perfectly
        const userIds = logs.map((l: any) => l.user_id);
        const users = await User.find({ id: { $in: userIds } }).select('id full_name role').lean();
        const userMap = new Map(users.map((u: any) => [u.id, u]));

        const activities = logs.map((log: any) => {
            const user = userMap.get(log.user_id);
            return {
                ...log,
                users: user ? { full_name: user.full_name, role: user.role } : null
            };
        });

        return NextResponse.json({ activities });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { activity_type, activity_data } = await req.json();
        const userId = session.user.id; // Corrected to use ID from session

        await connectToDatabase();
        await ActivityLog.create({
            user_id: userId,
            activity_type,
            activity_data,
            created_at: new Date()
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
