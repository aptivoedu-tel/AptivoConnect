import { NextRequest, NextResponse } from 'next/server';
import { getPortalSession as getServerSession } from '@/lib/portalSession';
import { authOptions } from '@/lib/authOptions';
import connectToDatabase from '@/lib/mongodb/connection';
import { QuestionReport, User, MCQ } from '@/lib/mongodb/models';

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || (session.user as any).role !== 'super_admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const statusStr = searchParams.get('status') || 'pending';
        const categoryStr = searchParams.get('category') || 'all';

        await connectToDatabase();

        const filter: any = {};
        if (statusStr !== 'all') {
            filter.status = statusStr;
        }
        if (categoryStr !== 'all') {
            filter.reason = categoryStr;
        }

        const reports = await QuestionReport.find(filter)
            .sort({ created_at: -1 })
            .lean();

        // Group by mcq_id
        const groupedReports: Record<number, any> = {};
        for (const report of reports) {
            if (!groupedReports[report.mcq_id]) {
                groupedReports[report.mcq_id] = {
                    ...report,
                    report_count: 1,
                    all_report_ids: [report._id],
                    reasons: [report.reason || 'Unknown']
                };
            } else {
                groupedReports[report.mcq_id].report_count++;
                groupedReports[report.mcq_id].all_report_ids.push(report._id);
                const rsn = report.reason || 'Unknown';
                if (!groupedReports[report.mcq_id].reasons.includes(rsn)) {
                    groupedReports[report.mcq_id].reasons.push(rsn);
                }
            }
        }

        const finalReports = Object.values(groupedReports);

        // Populate student names and mcq details manually to ensure it works cross-collection
        const studentIds = [...new Set(finalReports.map(r => r.student_id))];
        const students = await User.find({ id: { $in: studentIds } }).select('id full_name email').lean();

        const mcqIds = [...new Set(finalReports.map(r => r.mcq_id))];
        const mcqs = await MCQ.find({ id: { $in: mcqIds } }).lean();

        const enrichedReports = finalReports.map(report => ({
            ...report,
            student: students.find(s => s.id === report.student_id),
            mcq: mcqs.find(m => m.id === report.mcq_id)
        }));

        return NextResponse.json({ reports: enrichedReports });

    } catch (error: any) {
        console.error('Error fetching admin reports:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PATCH(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || (session.user as any).role !== 'super_admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { mcq_id, status } = body;

        await connectToDatabase();

        const updated = await QuestionReport.updateMany({ mcq_id: mcq_id }, { status });

        return NextResponse.json({ success: true, updatedCount: updated.modifiedCount });

    } catch (error: any) {
        console.error('Error updating report:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || (session.user as any).role !== 'super_admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const mcq_id = searchParams.get('mcq_id');

        await connectToDatabase();

        await QuestionReport.deleteMany({ mcq_id: Number(mcq_id) });

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error('Error deleting report:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PUT(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || (session.user as any).role !== 'super_admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { id, updates } = body; // MCQ id

        await connectToDatabase();

        const updated = await MCQ.findOneAndUpdate({ id }, { $set: updates }, { returnDocument: 'after' });

        return NextResponse.json({ mcq: updated });

    } catch (error: any) {
        console.error('Error updating MCQ:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
