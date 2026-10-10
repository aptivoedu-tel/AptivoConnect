// MongoDB-only: Create User API
// Completely removes all Supabase dependencies

import { NextResponse } from 'next/server';
import { getPortalSession as getServerSession } from '@/lib/portalSession';
import { authOptions } from '@/lib/authOptions';
import bcrypt from 'bcryptjs';
import connectToDatabase from '@/lib/mongodb/connection';
import { User as MongoUser, Institution } from '@/lib/mongodb/models';

export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || (session.user as any)?.role !== 'super_admin') {
            return NextResponse.json({ error: 'Unauthorized: Only super_admin can create users.' }, { status: 401 });
        }

        const body = await request.json();
        const { email, password, fullName, role, institutionId, studentId } = body;

        if (!email || !password || !fullName || !role) {
            return NextResponse.json(
                { error: 'Missing required fields (email, password, fullName, role)' },
                { status: 400 }
            );
        }

        await connectToDatabase();

        // Check for existing user
        let existing = await MongoUser.findOne({ email: email.toLowerCase() });
        if (existing) {
            if (existing.status === 'deleted') {
                // Resurrect instead of complaining
            } else {
                return NextResponse.json({ error: 'User already exists with this email.' }, { status: 409 });
            }
        }

        const hashedPassword = await bcrypt.hash(password, 12);
        let newUser;
        if (existing && existing.status === 'deleted') {
            existing.full_name = fullName;
            existing.role = role;
            existing.status = 'active';
            existing.email_verified = true;
            existing.is_solo = !institutionId;
            existing.password = hashedPassword;
            existing.updated_at = new Date();
            
            if (institutionId) existing.institution_id = parseInt(institutionId);
            if (studentId) existing.student_id_code = studentId;

            await existing.save();
            newUser = existing;
            console.log(`[CreateUser] Resurrected soft-deleted user ${email} in MongoDB`);
        } else {
            const userId = `mongo_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
            const userPayload: any = {
                id: userId,
                email: email.toLowerCase(),
                password: hashedPassword,
                full_name: fullName,
                role,
                status: 'active',
                email_verified: true,
                is_solo: !institutionId,
                created_at: new Date(),
                updated_at: new Date(),
            };

            if (institutionId) userPayload.institution_id = parseInt(institutionId);
            if (studentId) userPayload.student_id_code = studentId;

            newUser = await MongoUser.create(userPayload);
            console.log(`[CreateUser] Created new user ${email} in MongoDB`);
        }

        console.log(`[CreateUser] Created user ${email} in MongoDB`);

        return NextResponse.json({
            success: true,
            user: { name: fullName, role }
        });

    } catch (error: any) {
        console.error('[CreateUser] Error:', error);
        return NextResponse.json(
            { error: 'Internal Server Error: ' + error.message },
            { status: 500 }
        );
    }
}
