import { NextRequest, NextResponse } from 'next/server';
import { getPortalSession as getServerSession } from '@/lib/portalSession';
import { authOptions } from '@/lib/authOptions';
import connectToDatabase from '@/lib/mongodb/connection';
import { StudentTestSectionEnrollment, TestSection } from '@/lib/mongodb/models';

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

        const enrollments = await StudentTestSectionEnrollment.find({
            user_id: studentId,
            status: 'approved'
        }).lean();

        const sectionIds = enrollments.map((e: any) => e.test_section_id);
        const testSections = await TestSection.find({ id: { $in: sectionIds } }).lean();

        const formatted = enrollments.map((e: any) => ({
            id: e.id || e._id,
            test_section_id: e.test_section_id,
            enrollment_date: e.created_at,
            is_active: true,
            testSection: testSections.find((ts: any) => ts.id === e.test_section_id)
        })).filter(item => item.testSection);

        return NextResponse.json({ testSections: formatted });

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
        const sectionId = searchParams.get('test_section_id');
        const queryId = searchParams.get('student_id');

        if (queryId && ((session.user as any).role === 'super_admin' || (session.user as any).role === 'institution_admin')) {
            studentId = queryId;
        }

        if (!studentId || !sectionId) {
            return NextResponse.json({ error: 'Missing student identifier or test_section_id' }, { status: 400 });
        }

        await connectToDatabase();

        await StudentTestSectionEnrollment.deleteOne({
            user_id: studentId,
            test_section_id: parseInt(sectionId)
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
        const section_id = body.test_section_id;

        if (body.student_id && ((session.user as any).role === 'super_admin' || (session.user as any).role === 'institution_admin')) {
            student_id = body.student_id;
        }

        if (!student_id || !section_id) {
            return NextResponse.json({ error: 'Missing student identifier or test_section_id' }, { status: 400 });
        }

        await connectToDatabase();

        let enrollment = await StudentTestSectionEnrollment.findOne({
            user_id: student_id,
            test_section_id: parseInt(section_id)
        });

        if (enrollment) {
            enrollment.status = 'approved';
            await enrollment.save();
        } else {
            const lastEnrollment = await StudentTestSectionEnrollment.findOne().sort({ id: -1 });
            const newId = (lastEnrollment?.id || 0) + 1;
            enrollment = await StudentTestSectionEnrollment.create({
                id: newId,
                user_id: student_id,
                test_section_id: parseInt(section_id),
                status: 'approved'
            });
        }

        return NextResponse.json({ enrollment });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
