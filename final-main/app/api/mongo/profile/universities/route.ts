import { NextRequest, NextResponse } from 'next/server';
import { getPortalSession as getServerSession } from '@/lib/portalSession';
import { authOptions } from '@/lib/authOptions';
import connectToDatabase from '@/lib/mongodb/connection';
import { StudentUniversityEnrollment, University } from '@/lib/mongodb/models';

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { searchParams } = new URL(req.url);
        let studentId = (session.user as any).id;
        const queryId = searchParams.get('student_id');
        if (queryId && ((session.user as any).role === 'super_admin' || (session.user as any).role === 'institution_admin')) {
            studentId = queryId;
        }

        if (!studentId) return NextResponse.json({ error: 'Missing student identifier' }, { status: 400 });

        await connectToDatabase();

        const enrollments = await StudentUniversityEnrollment.find({
            user_id: studentId,
            status: 'approved'
        }).lean();

        const universityIds = enrollments.map((e: any) => e.university_id);
        const universities = await University.find({ id: { $in: universityIds } }).lean();

        const formatted = enrollments.map((e: any) => ({
            id: e.id || e._id,
            university_id: e.university_id,
            enrollment_date: e.created_at,
            is_active: true,
            universities: universities.find((u: any) => u.id === e.university_id)
        })).filter(item => item.universities);

        return NextResponse.json({ universities: formatted });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { searchParams } = new URL(req.url);
        let studentId = (session.user as any).id;
        const universityId = searchParams.get('university_id');
        const queryId = searchParams.get('student_id');

        if (queryId && ((session.user as any).role === 'super_admin' || (session.user as any).role === 'institution_admin')) {
            studentId = queryId;
        }

        if (!studentId || !universityId) {
            return NextResponse.json({ error: 'Missing student identifier or university_id' }, { status: 400 });
        }

        await connectToDatabase();

        await StudentUniversityEnrollment.deleteOne({
            user_id: studentId,
            university_id: parseInt(universityId)
        });

        return NextResponse.json({ success: true });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await req.json();
        let student_id = (session.user as any).id;
        const university_id = body.university_id;

        if (body.student_id && ((session.user as any).role === 'super_admin' || (session.user as any).role === 'institution_admin')) {
            student_id = body.student_id;
        }

        if (!student_id || !university_id) {
            return NextResponse.json({ error: 'Missing student identifier or university_id' }, { status: 400 });
        }

        await connectToDatabase();

        let enrollment = await StudentUniversityEnrollment.findOne({
            user_id: student_id,
            university_id: parseInt(university_id)
        });

        if (enrollment) {
            enrollment.status = 'approved';
            await enrollment.save();
        } else {
            const lastEnrollment = await StudentUniversityEnrollment.findOne().sort({ id: -1 });
            const newId = (lastEnrollment?.id || 0) + 1;
            enrollment = await StudentUniversityEnrollment.create({
                id: newId,
                user_id: student_id,
                university_id: parseInt(university_id),
                status: 'approved'
            });
        }

        return NextResponse.json({ enrollment });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
