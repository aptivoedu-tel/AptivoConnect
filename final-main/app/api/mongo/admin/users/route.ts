import { NextRequest, NextResponse } from 'next/server';
import { getPortalSession as getServerSession } from '@/lib/portalSession';
import { authOptions } from '@/lib/authOptions';
import bcrypt from 'bcryptjs';
import connectToDatabase from '@/lib/mongodb/connection';
import { User, Institution } from '@/lib/mongodb/models';

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !['super_admin','institution_admin'].includes((session.user as any)?.role)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await connectToDatabase();

        const searchParams = new URL(req.url).searchParams;
        const role = searchParams.get('role');
        const institutionId = searchParams.get('institution_id');
        const query = searchParams.get('q');
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '100');
        const skip = (page - 1) * limit;

        const userRole = (session.user as any).role;
        const filter: any = { status: { $ne: 'deleted' } };
        if (role && role !== 'all') {
            if (role === 'admin') {
                filter.role = { $in: ['super_admin', 'institution_admin'] };
            } else {
                filter.role = role;
            }
        }
        
        if (userRole === 'institution_admin') {
            if (institutionId && Number(institutionId) !== Number((session.user as any).institution_id)) {
                return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
            }
            filter.institution_id = Number((session.user as any).institution_id);
        } else if (institutionId) {
            filter.institution_id = parseInt(institutionId);
        }
        if (query) {
            filter.$or = [
                { full_name: { $regex: query, $options: 'i' } },
                { email: { $regex: query, $options: 'i' } }
            ];
        }

        const total = await User.countDocuments(filter);

        const users = await User.find(filter)
            .sort({ created_at: -1 })
            .skip(skip)
            .limit(limit)
            .lean();

        // Get institutions for these users
        // Collect all related institution IDs
        const instIds = Array.from(new Set(users.map(u => u.institution_id!).filter(Boolean)));

        const institutions = await Institution.find({ id: { $in: instIds } }).lean();
        const instMap = new Map(institutions.map(i => [i.id, i]));

        const usersWithInst = users.map(u => ({
            ...u,
            institution: u.institution_id ? instMap.get(u.institution_id) : null
        }));

        return NextResponse.json({ 
            users: usersWithInst,
            total,
            page,
            totalPages: Math.ceil(total / limit)
        });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PATCH(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !['super_admin','institution_admin'].includes((session.user as any)?.role)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { userId, ...updates } = body;

        if (!userId) return NextResponse.json({ error: 'userId is required' }, { status: 400 });

        await connectToDatabase();

        const targetUser = await User.findOne({ id: userId });
        if (!targetUser) return NextResponse.json({ error: 'User not found' }, { status: 404 });

        const userRole = (session.user as any).role;
        if (userRole === 'institution_admin' && Number(targetUser.institution_id) !== Number((session.user as any).institution_id)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // Handle password hashing if provided
        if (updates.password) {
            updates.password = await bcrypt.hash(updates.password, 12);
            updates.initial_password = body.password; // Store the readable initial password if requested (similar to create-student)
        }

        // Prevent changing institution of user for institution admin
        if (updates.institution_id !== undefined && userRole === 'institution_admin') {
            updates.institution_id = Number((session.user as any).institution_id);
        }

        const updatedUser = await User.findOneAndUpdate(
            { id: userId },
            { $set: updates },
            { returnDocument: 'after' }
        ).lean();

        if (!updatedUser) return NextResponse.json({ error: 'User not found' }, { status: 404 });

        return NextResponse.json({ success: true, user: updatedUser });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
