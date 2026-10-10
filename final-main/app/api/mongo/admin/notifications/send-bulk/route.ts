import { NextRequest, NextResponse } from 'next/server';
import { getPortalSession as getServerSession } from '@/lib/portalSession';
import { authOptions } from '@/lib/authOptions';
import connectToDatabase from '@/lib/mongodb/connection';
import Notification from '@/lib/mongodb/models/Notification';
import NotificationRecipient from '@/lib/mongodb/models/NotificationRecipient';
import { User } from '@/lib/mongodb/models';
import { sendExpoPushToUsers } from '@/lib/services/expoPushService';

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        // Only super_admin or institution_admin can send notifications
        if (!session || !['super_admin','institution_admin'].includes((session.user as any)?.role)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { title, message, category, senderRole, institutionId, imageUrl, recipientType, userIds, target } = body;

        if (!title || !message) {
            return NextResponse.json({ error: 'title and message are required' }, { status: 400 });
        }
        const notificationTarget = typeof target === 'string' && target.startsWith('/') && !target.startsWith('//') && !target.includes('\\')
            ? target
            : '/notifications';

        await connectToDatabase();

        // Use a timestamp-based numeric ID for the notification
        const notificationId = Math.floor(Date.now() / 1000) + Math.floor(Math.random() * 1000);

        await Notification.create({
            id: notificationId,
            title,
            message,
            category: category || 'normal',
            sender_role: senderRole,
            institution_id: institutionId || null,
            image_url: imageUrl || null,
            target: notificationTarget,
            created_at: new Date()
        });

        // 2. Identify recipients based on recipientType
        let recipientsFilter: any = {};

        if (recipientType === 'all') {
            // All active/pending users
            recipientsFilter = { status: { $in: ['active', 'pending'] } };

        } else if (recipientType === 'admins') {
            // Only admins
            recipientsFilter = {
                status: { $in: ['active', 'pending'] },
                role: { $in: ['super_admin', 'institution_admin'] }
            };

        } else if (recipientType === 'students') {
            // All students globally
            recipientsFilter = {
                status: { $in: ['active', 'pending'] },
                role: 'student'
            };

        } else if (recipientType === 'institution') {
            // All users (students) belonging to a specific institution
            if (!institutionId) {
                return NextResponse.json({ error: 'institutionId is required for institution type' }, { status: 400 });
            }
            recipientsFilter = {
                status: { $in: ['active', 'pending'] },
                institution_id: institutionId,
                role: 'student'
            };

        } else if (recipientType === 'individual') {
            // Specific user IDs
            if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
                return NextResponse.json({ error: 'userIds array is required for individual type' }, { status: 400 });
            }
            recipientsFilter = {
                id: { $in: userIds }
            };

        } else {
            return NextResponse.json({ error: `Unknown recipientType: ${recipientType}` }, { status: 400 });
        }

        const users = await User.find(recipientsFilter).select('id');

        if (users.length === 0) {
            // Still return success but note 0 recipients
            return NextResponse.json({ success: true, notificationId, recipientCount: 0, warning: 'No matching recipients found' });
        }

        const recipientsData = users.map((user: any) => ({
            id: Math.floor(Date.now() + Math.random() * 1000000),
            notification_id: notificationId,
            user_id: user.id,
            is_read: false,
            created_at: new Date()
        }));

        // Insert recipients in batches to avoid hitting limits
        const BATCH_SIZE = 500;
        for (let i = 0; i < recipientsData.length; i += BATCH_SIZE) {
            await NotificationRecipient.insertMany(recipientsData.slice(i, i + BATCH_SIZE), { ordered: false });
        }

        // Persisted notification delivery remains successful even when Expo is unavailable.
        await sendExpoPushToUsers({
            userIds: users.map((user: any) => user.id),
            title,
            body: message,
            path: notificationTarget,
            notificationId,
        });

        return NextResponse.json({ success: true, notificationId, recipientCount: users.length });

    } catch (error: any) {
        console.error('Bulk Notification Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
