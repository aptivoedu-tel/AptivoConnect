import { NextRequest, NextResponse } from 'next/server';
import { getPortalSession } from '@/lib/portalSession';
import { authOptions } from '@/lib/authOptions';
import connectToDatabase from '@/lib/mongodb/connection';
import User from '@/lib/mongodb/models/User';
import { CreatorProfile, Entitlement, Product } from '@aptivo/connect/models';

type Envelope<T> = { ok: true; data: T } | { ok: false; error: string };

function json<T>(body: Envelope<T>, status = 200) {
    return NextResponse.json(body, { status });
}

const fail = (error: string, status: number) => json({ ok: false, error }, status);

const text = (value: unknown, max: number) => (typeof value === 'string' ? value.trim().slice(0, max) : '');

async function account() {
    const session = await getPortalSession(authOptions);
    const id = typeof session?.user?.id === 'string' ? session.user.id : '';
    if (!id) return { error: fail('Sign in to use Connect.', 401) };
    await connectToDatabase();
    const user = await User.findOne({ id }).lean();
    if (!user || user.status !== 'active' || !user.email_verified) return { error: fail('This account cannot use Connect.', 403) };
    return { user: user as { id: string; role: string; full_name: string } };
}

export async function GET(req: NextRequest) {
    try {
        const action = req.nextUrl.searchParams.get('action') || 'catalog';
        const auth = await account();
        if (auth.error) return auth.error;
        const user = auth.user;
        if (action !== 'moderation' && user.role !== 'student') return fail('This section is for student accounts.', 403);

        if (action === 'catalog') {
            const rows = await Product.find({ status: 'published' }).sort({ updated_at: -1 }).limit(60).lean();
            const creatorIds = [...new Set(rows.map((row) => row.creator_id))];
            const creators = creatorIds.length ? await CreatorProfile.find({ user_id: { $in: creatorIds } }).lean() : [];
            const nameOf = new Map(creators.map((c) => [String(c.user_id), String(c.display_name)]));
            return json({ ok: true, data: {
                products: rows.map((row) => ({
                    id: String(row._id), title: row.title, exam: row.exam_name, subject: row.type,
                    kind: row.type === 'study_material' ? 'Study guide' : 'Practice test',
                    description: row.description ?? '', creatorName: nameOf.get(String(row.creator_id)) ?? 'Connect creator',
                    rating: 0, downloads: 0, tags: [`${row.duration_minutes} min`],
                })),
            } });
        }

        if (action === 'library') {
            const rows = await Entitlement.find({ buyer_id: user.id, access_status: 'active' }).sort({ created_at: -1 }).limit(100).lean();
            const products = rows.length ? await Product.find({ _id: { $in: rows.map((row) => row.product_id) } }).lean() : [];
            const byId = new Map(products.map((row) => [String(row._id), row]));
            return json({ ok: true, data: {
                items: rows.map((row) => {
                    const product = byId.get(String(row.product_id));
                    return { id: String(row._id), title: product?.title ?? 'Connect resource', status: 'Active' };
                }),
            } });
        }

        if (action === 'studio') {
            const profile = await CreatorProfile.findOne({ user_id: user.id }).lean();
            const rows = await Product.find({ creator_id: user.id }).sort({ updated_at: -1 }).limit(100).lean();
            return json({ ok: true, data: {
                profile: profile ? { displayName: profile.display_name, status: profile.application_status } : null,
                items: rows.map((row) => ({ id: String(row._id), title: row.title, status: row.status })),
            } });
        }

        if (action === 'moderation') {
            if (user.role !== 'super_admin') return fail('Review requires an admin account.', 403);
            const products = await Product.find({ status: { $in: ['submitted', 'under_review'] } }).sort({ updated_at: -1 }).limit(100).lean();
            const profiles = await CreatorProfile.find({ application_status: 'submitted' }).sort({ updated_at: -1 }).limit(100).lean();
            const creatorIds = [...new Set(products.map((row) => row.creator_id))];
            const creators = creatorIds.length ? await CreatorProfile.find({ user_id: { $in: creatorIds } }).lean() : [];
            const nameOf = new Map(creators.map((c) => [String(c.user_id), String(c.display_name)]));
            return json({ ok: true, data: {
                queue: [
                    ...products.map((row) => ({ id: String(row._id), title: row.title, type: 'Resource', status: row.status, creatorName: nameOf.get(String(row.creator_id)) ?? row.creator_id })),
                    ...profiles.map((row) => ({ id: String(row._id), title: row.display_name, type: 'Creator application', status: row.application_status, creatorName: row.display_name })),
                ],
            } });
        }

        return fail('Unknown section.', 400);
    } catch (error) {
        console.error('[Connect] GET error:', error);
        return fail('We could not load this section. Please try again.', 500);
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json().catch(() => null) as Record<string, unknown> | null;
        const action = text(body?.action, 40);
        const auth = await account();
        if (auth.error) return auth.error;
        const user = auth.user;

        if (action === 'creatorApply') {
            if (user.role !== 'student') return fail('Only student accounts can apply as creators.', 403);
            const displayName = text(body?.displayName, 120);
            const bio = text(body?.bio, 2000);
            if (displayName.length < 2) return fail('Display name must be at least 2 characters.', 400);
            if (bio.length < 20) return fail('Please write a short introduction of at least 20 characters.', 400);
            const existing = await CreatorProfile.findOne({ user_id: user.id });
            if (existing && ['approved', 'suspended'].includes(existing.application_status)) return fail('Your creator status cannot be changed from this form. Contact Aptivo support.', 403);
            if (existing) {
                existing.display_name = displayName;
                existing.bio = bio;
                existing.application_status = 'submitted';
                await existing.save();
            } else {
                await CreatorProfile.create({ user_id: user.id, display_name: displayName, bio, application_status: 'submitted' });
            }
            return json({ ok: true, data: { status: 'submitted' } });
        }

        if (action === 'productSubmit') {
            const title = text(body?.title, 200);
            if (title.length < 3) return fail('Resource title must be at least 3 characters.', 400);
            return fail('The full resource builder is opening soon, so submissions are not accepted yet. Your creator application still works.', 501);
        }

        if (action === 'adminApprove') {
            if (user.role !== 'super_admin') return fail('Approval requires an admin account.', 403);
            const itemId = text(body?.itemId, 64);
            if (!/^[0-9a-fA-F]{24}$/.test(itemId)) return fail('Unknown item.', 400);
            const product = await Product.updateOne({ _id: itemId, status: { $in: ['submitted', 'under_review'] } }, { $set: { status: 'approved' } });
            if (product.modifiedCount === 1) return json({ ok: true, data: { approved: 'product' } });
            const profile = await CreatorProfile.updateOne({ _id: itemId, application_status: 'submitted' }, { $set: { application_status: 'approved' } });
            if (profile.modifiedCount === 1) return json({ ok: true, data: { approved: 'creator' } });
            return fail('That item is no longer waiting for review.', 409);
        }

        return fail('Unknown action.', 400);
    } catch (error) {
        console.error('[Connect] POST error:', error);
        return fail('We could not save your request. Please try again.', 500);
    }
}
