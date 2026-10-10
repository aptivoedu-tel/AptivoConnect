import { NextRequest, NextResponse } from 'next/server';
import { getPortalSession } from '@/lib/portalSession';
import { authOptions } from '@/lib/authOptions';
import connectToDatabase from '../../../../lib/mongodb/connection';
import { FAQ } from '../../../../lib/mongodb/models';
import { v4 as uuidv4 } from 'uuid';

// GET – public + admin list (admin=true query param skips is_published filter)
export async function GET(req: NextRequest) {
    try {
        await connectToDatabase();
        const { searchParams } = new URL(req.url);
        const adminMode = searchParams.get('admin') === 'true';

        const filter = adminMode ? {} : { is_published: true };
        const faqs = await FAQ.find(filter).sort({ order: 1, created_at: 1 }).lean();

        return NextResponse.json({ faqs });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// POST – create new FAQ
export async function POST(req: NextRequest) {
    try {
        const session = await getPortalSession(authOptions);
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        if (!['super_admin', 'institution_admin'].includes(session.user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

        await connectToDatabase();
        const body = await req.json();
        const { question, answer, order, is_published } = body;

        if (!question?.trim() || !answer?.trim()) {
            return NextResponse.json({ error: 'Question and answer are required' }, { status: 400 });
        }

        const faq = await FAQ.create({
            id: uuidv4(),
            question: question.trim(),
            answer: answer.trim(),
            order: order ?? 0,
            is_published: is_published !== false,
            created_at: new Date(),
            updated_at: new Date(),
        });

        return NextResponse.json({ faq }, { status: 201 });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// PATCH – update (toggle publish, edit question/answer/order)
export async function PATCH(req: NextRequest) {
    try {
        const session = await getPortalSession(authOptions);
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        if (!['super_admin', 'institution_admin'].includes(session.user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

        await connectToDatabase();
        const body = await req.json();
        const { id, ...updates } = body;

        if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

        updates.updated_at = new Date();
        const faq = await FAQ.findOneAndUpdate({ id }, { $set: updates }, { returnDocument: 'after' }).lean();
        if (!faq) return NextResponse.json({ error: 'FAQ not found' }, { status: 404 });

        return NextResponse.json({ faq });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// DELETE – remove a FAQ
export async function DELETE(req: NextRequest) {
    try {
        const session = await getPortalSession(authOptions);
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        if (!['super_admin', 'institution_admin'].includes(session.user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

        await connectToDatabase();
        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');
        if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

        await FAQ.findOneAndDelete({ id });
        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
