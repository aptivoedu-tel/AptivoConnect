import { NextRequest, NextResponse } from 'next/server';
import { getPortalSession } from '@/lib/portalSession';
import { authOptions } from '@/lib/authOptions';
import Institution from '@/lib/mongodb/models/Institution';
import { Counter, getNextSequence } from '@/lib/mongodb/counter';

const fields = ['name', 'institution_type', 'domain', 'contact_email', 'contact_phone', 'address', 'logo_url', 'admin_name', 'admin_email', 'is_active', 'status'];

function input(body: unknown) {
    if (!body || typeof body !== 'object' || Array.isArray(body)) return null;
    const data = body as Record<string, unknown>;
    if (Object.keys(data).some(key => key !== 'id' && !fields.includes(key))) return null;
    const update: Record<string, string | boolean> = {};
    for (const field of fields) {
        if (data[field] === undefined) continue;
        if (field === 'is_active') {
            if (typeof data[field] !== 'boolean') return null;
            update[field] = data[field];
        } else {
            if (typeof data[field] !== 'string' || data[field].length > 1000) return null;
            update[field] = data[field].trim();
        }
    }
    if (typeof update.name === 'string' && (!update.name || update.name.length > 200)) return null;
    if (update.status !== undefined && !['pending', 'approved', 'rejected', 'blocked'].includes(String(update.status))) return null;
    return update;
}

export async function GET(req: NextRequest) {
    try {
        const session = await getPortalSession(authOptions);
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        const { user } = session;
        const filter: { id?: number; is_active?: boolean } = {};
        if (user.role !== 'super_admin') {
            if (typeof user.institution_id !== 'number' || !Number.isSafeInteger(user.institution_id) || user.institution_id <= 0) return NextResponse.json({ institutions: [] });
            filter.id = user.institution_id;
        }
        if (req.nextUrl.searchParams.get('active') === 'true') filter.is_active = true;
        const projection = user.role === 'student' ? 'id name institution_type logo_url is_active status' : '';
        const institutions = await Institution.find(filter).select(projection).sort({ name: 1 }).lean();
        return NextResponse.json({ institutions });
    } catch {
        return NextResponse.json({ error: 'Institutions are temporarily unavailable.' }, { status: 503 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const session = await getPortalSession(authOptions);
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        if (session.user.role !== 'super_admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        const body = await req.json().catch(() => null);
        const data = input(body);
        if (!data?.name || body.id !== undefined) return NextResponse.json({ error: 'Valid institution details are required.' }, { status: 400 });
        const last = await Institution.findOne().sort({ id: -1 });
        // Seed the existing atomic counter above legacy IDs without lowering its value.
        await Counter.updateOne({ _id: 'institution' }, { $max: { seq: last?.id || 0 } }, { upsert: true });
        const id = await getNextSequence('institution');
        const institution = await Institution.create({ ...data, id, status: data.status || 'pending', is_active: data.is_active ?? false });
        return NextResponse.json({ institution }, { status: 201 });
    } catch {
        return NextResponse.json({ error: 'Institution could not be created.' }, { status: 503 });
    }
}

export async function PATCH(req: NextRequest) {
    try {
        const session = await getPortalSession(authOptions);
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        if (session.user.role !== 'super_admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        const body = await req.json().catch(() => null);
        const data = input(body);
        if (!data || !Number.isSafeInteger(body.id) || body.id <= 0 || !Object.keys(data).length) return NextResponse.json({ error: 'A valid ID and institution details are required.' }, { status: 400 });
        const institution = await Institution.findOneAndUpdate({ id: body.id }, { $set: data }, { returnDocument: 'after', runValidators: true });
        if (!institution) return NextResponse.json({ error: 'Institution not found' }, { status: 404 });
        return NextResponse.json({ institution });
    } catch {
        return NextResponse.json({ error: 'Institution could not be updated.' }, { status: 503 });
    }
}

export async function DELETE(req: NextRequest) {
    try {
        const session = await getPortalSession(authOptions);
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        if (session.user.role !== 'super_admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        const id = Number(req.nextUrl.searchParams.get('id'));
        if (!Number.isSafeInteger(id) || id <= 0) return NextResponse.json({ error: 'A valid ID is required.' }, { status: 400 });
        const result = await Institution.deleteOne({ id });
        if (!result.deletedCount) return NextResponse.json({ error: 'Institution not found' }, { status: 404 });
        return NextResponse.json({ success: true });
    } catch {
        return NextResponse.json({ error: 'Institution could not be deleted.' }, { status: 503 });
    }
}
