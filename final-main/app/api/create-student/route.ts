// MongoDB-only: Create Student API
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
        if (!session || ((session.user as any)?.role !== 'super_admin' && (session.user as any)?.role !== 'institution_admin')) {
            return NextResponse.json({ error: 'Unauthorized: Only admins can create students.' }, { status: 401 });
        }

        const body = await request.json();
        // action: undefined | 'resume' | 'new'
        const { studentId, name, password, institutionId, action } = body;

        if (!studentId || !name || !password || !institutionId) {
            return NextResponse.json(
                { error: 'Missing required fields (studentId, name, password, institutionId)' },
                { status: 400 }
            );
        }

        const numericInstId = Number(institutionId);
        if (!numericInstId || isNaN(numericInstId)) {
            return NextResponse.json(
                { error: `Invalid Institution ID: ${institutionId}` },
                { status: 400 }
            );
        }

        // Multi-tenancy check: institution_admin can only create students in their own institution
        if ((session.user as any).role === 'institution_admin' && Number((session.user as any).institution_id) !== numericInstId) {
            return NextResponse.json(
                { error: 'Forbidden: You can only create students for your own institution.' },
                { status: 403 }
            );
        }

        await connectToDatabase();

        // Fetch institution domain from MongoDB
        const institution = await Institution.findOne({ id: numericInstId });

        if (!institution) {
            return NextResponse.json(
                { error: `Institution with ID ${numericInstId} not found.` },
                { status: 404 }
            );
        }

        if (!institution.domain) {
            return NextResponse.json(
                { error: `Institution "${institution.name}" has no domain assigned. Please assign one in the Institutions manager.` },
                { status: 400 }
            );
        }

        const email = `${studentId}@${institution.domain.toLowerCase()}`;

        // Check if a user record already exists with this email
        const existing = await MongoUser.findOne({ email });

        if (existing) {
            // ── Case 1: Soft-deleted student ──────────────────────────────────
            if (existing.status === 'deleted') {
                // No action yet — ask the frontend what to do
                if (!action) {
                    return NextResponse.json(
                        {
                            code: 'STUDENT_DELETED',
                            message: 'This student account was previously deleted.',
                            previousName: existing.full_name,
                        },
                        { status: 409 }
                    );
                }

                const hashedPassword = await bcrypt.hash(password, 12);

                if (action === 'resume') {
                    // Restore the account — keep all existing progress/history
                    existing.full_name = name;
                    existing.password = hashedPassword;
                    existing.initial_password = password;
                    existing.status = 'active';
                    existing.email_verified = true;
                    existing.institution_id = numericInstId;
                    existing.student_id_code = studentId;
                    existing.updated_at = new Date();
                    await existing.save();
                    console.log(`[CreateStudent] Resumed soft-deleted student: ${email}`);
                    return NextResponse.json({ success: true, user: { name }, resumed: true });
                }

                if (action === 'new') {
                    // Permanently wipe the old document so a clean record is created below
                    await MongoUser.deleteOne({ _id: existing._id });
                    console.log(`[CreateStudent] Wiped old deleted record for: ${email} — creating fresh account`);
                    // Falls through to creation logic below
                }
            } else {
                // ── Case 2: Active / suspended — genuinely a duplicate ────────
                return NextResponse.json(
                    { error: 'A student with this ID already exists.' },
                    { status: 409 }
                );
            }
        }

        // ── Create brand-new student record ───────────────────────────────────
        const hashedPassword = await bcrypt.hash(password, 12);
        const userId = `mongo_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;

        await MongoUser.create({
            id: userId,
            email,
            password: hashedPassword,
            full_name: name,
            role: 'student',
            status: 'active',
            email_verified: true,
            is_solo: false,
            institution_id: numericInstId,
            student_id_code: studentId,
            initial_password: password,
            created_at: new Date(),
            updated_at: new Date(),
        });

        console.log(`[CreateStudent] Created student ${email} in MongoDB`);

        return NextResponse.json({
            success: true,
            user: { name }
        });

    } catch (error: any) {
        console.error('[CreateStudent] Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
