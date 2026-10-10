import { NextRequest, NextResponse } from 'next/server';
import { getPortalSession as getServerSession } from '@/lib/portalSession';
import { authOptions } from '@/lib/authOptions';
import connectToDatabase from '@/lib/mongodb/connection';
import { User } from '@/lib/mongodb/models';

export async function GET() {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await connectToDatabase();
        const user = await User.findOne({ email: session.user.email }).lean();

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Enforce email verification for student role
        if (user.role === 'student' && !user.email_verified) {
            return NextResponse.json({ error: 'Email not verified' }, { status: 403 });
        }

        return NextResponse.json({
            user: {
                id: user.id || user._id.toString(),
                email: user.email,
                name: user.full_name,
                role: user.role,
                status: user.status,
                email_verified: user.email_verified,
                avatar_url: user.avatar_url,
                institution_id: user.institution_id,
                tour_completed: user.tour_completed || false
            }
        });
    } catch (error: any) {
        console.error('API /auth/me Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PATCH(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();

        // Extract fields that can be updated securely
        const updateData: any = {};
        if (body.full_name !== undefined) updateData.full_name = body.full_name;
        if (body.avatar_url !== undefined) updateData.avatar_url = body.avatar_url;
        if (body.tour_completed !== undefined) updateData.tour_completed = body.tour_completed;

        if (Object.keys(updateData).length === 0) {
            return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
        }

        await connectToDatabase();
        const updatedUser = await User.findOneAndUpdate(
            { email: session.user.email },
            { $set: updateData },
            { returnDocument: 'after', strict: false }
        ).lean();

        if (!updatedUser) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        return NextResponse.json({
            success: true,
            user: {
                id: updatedUser.id || updatedUser._id.toString(),
                email: updatedUser.email,
                name: updatedUser.full_name,
                role: updatedUser.role,
                status: updatedUser.status,
                email_verified: updatedUser.email_verified,
                avatar_url: updatedUser.avatar_url,
                institution_id: updatedUser.institution_id,
                tour_completed: updatedUser.tour_completed || false
            }
        });
    } catch (error: any) {
        console.error('API /auth/me PATCH Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
