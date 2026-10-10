import { NextResponse } from 'next/server';
import connectToDatabase from '../../../../../lib/mongodb/connection';
import { University } from '../../../../../lib/mongodb/models';
import { AuthService } from '../../../../../lib/services/authService';

export async function GET(request: Request) {
    try {
        await connectToDatabase();

        const { searchParams } = new URL(request.url);
        const includeCounts = searchParams.get('include_counts') === 'true';

        // Fetch all universities, sort by name
        let universities = await University.find({}).sort({ name: 1 }).lean();

        if (includeCounts) {
            const db = University.db;
            const mcqCounts = await db.collection('mcqs').aggregate([
                { $match: { is_active: { $ne: false } } },
                { $group: { _id: "$university_id", count: { $sum: 1 } } }
            ]).toArray();

            const countMap = new Map();
            mcqCounts.forEach(c => {
                countMap.set(String(c._id), c.count);
                if (typeof c._id === 'number') countMap.set(c._id, c.count);
            });

            universities = universities.map((u: any) => ({
                ...u,
                mcqCount: countMap.get(String(u.id)) || countMap.get(u.id) || 0
            }));
        }

        return NextResponse.json({ universities });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PATCH(request: Request) {
    try {
        await connectToDatabase();
        const body = await request.json();
        const { id, show_on_landing } = body;

        if (id === undefined || show_on_landing === undefined) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const university = await University.findOneAndUpdate(
            { id },
            { $set: { show_on_landing } },
            { returnDocument: 'after' }
        );

        if (!university) {
            return NextResponse.json({ error: 'University not found' }, { status: 404 });
        }

        return NextResponse.json({ message: 'Success', university });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
