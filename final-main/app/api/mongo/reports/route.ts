import { NextRequest, NextResponse } from 'next/server';
import { getPortalSession as getServerSession } from '@/lib/portalSession';
import { authOptions } from '@/lib/authOptions';
import connectToDatabase from '@/lib/mongodb/connection';
import { QuestionReport } from '@/lib/mongodb/models';

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { mcq_id, reason } = body;
        const studentId = (session.user as any).id;

        if (!mcq_id) {
            return NextResponse.json({ error: 'mcq_id is required' }, { status: 400 });
        }

        await connectToDatabase();

        const report = new QuestionReport({
            mcq_id,
            student_id: studentId,
            reason: reason || 'Reported by user',
            status: 'pending'
        });

        await report.save();

        return NextResponse.json({ message: 'Report submitted successfully' }, { status: 201 });
    } catch (error: any) {
        console.error('Error submitting report:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
