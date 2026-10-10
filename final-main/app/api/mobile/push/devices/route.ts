import { NextRequest, NextResponse } from 'next/server';
import { authOptions } from '@/lib/authOptions';
import connectToDatabase from '@/lib/mongodb/connection';
import MobilePushDevice from '@/lib/mongodb/models/MobilePushDevice';
import { getPortalSession } from '@/lib/portalSession';

const INSTALLATION_PATTERN = /^[a-zA-Z0-9_-]{16,128}$/;
const EXPO_TOKEN_PATTERN = /^ExponentPushToken\[[^\]]+\]$|^ExpoPushToken\[[^\]]+\]$/;

async function authenticatedUserId() {
    const session = await getPortalSession(authOptions);
    return typeof session?.user?.id === 'string' ? session.user.id : null;
}

export async function POST(request: NextRequest) {
    const userId = await authenticatedUserId();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json().catch(() => null);
    const { installationId, expoPushToken, platform } = body ?? {};
    if (!INSTALLATION_PATTERN.test(installationId) || !EXPO_TOKEN_PATTERN.test(expoPushToken) || !['android', 'ios'].includes(platform)) {
        return NextResponse.json({ error: 'Invalid device registration' }, { status: 400 });
    }

    await connectToDatabase();
    await MobilePushDevice.findOneAndUpdate(
        { $or: [{ installation_id: installationId }, { expo_push_token: expoPushToken }] },
        {
            $set: {
                user_id: userId,
                expo_push_token: expoPushToken,
                platform,
                enabled: true,
                last_used_at: new Date(),
            },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true },
    );
    return NextResponse.json({ success: true });
}

export async function DELETE(request: NextRequest) {
    const userId = await authenticatedUserId();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json().catch(() => null);
    if (!INSTALLATION_PATTERN.test(body?.installationId)) {
        return NextResponse.json({ error: 'Invalid installation' }, { status: 400 });
    }

    await connectToDatabase();
    await MobilePushDevice.updateOne(
        { installation_id: body.installationId, user_id: userId },
        { $set: { enabled: false, last_used_at: new Date() } },
    );
    return NextResponse.json({ success: true });
}
