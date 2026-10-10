// MongoDB API - Notifications
// GET: Fetch notifications for a user (with read status merged from NotificationRecipient)
// PATCH: Mark notifications as read
// POST: Send a notification (via this endpoint — delegates to send-bulk logic for single sends)

import { getPortalSession } from '@/lib/portalSession';
import { authOptions } from '@/lib/authOptions';
import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb/connection';
import Notification from '@/lib/mongodb/models/Notification';
import NotificationRecipient from '@/lib/mongodb/models/NotificationRecipient';

export async function GET(req: NextRequest) {
    try {
        const auth=await getPortalSession(authOptions);
        if(!auth) return NextResponse.json({error:"Unauthorized"},{status:401});
        await connectToDatabase();
        const { searchParams } = new URL(req.url);
        const userId = auth.user.id;
        const limit = parseInt(searchParams.get('limit') || '50');
        const offset = parseInt(searchParams.get('offset') || '0');

        if (!userId) {
            return NextResponse.json({ error: 'user_id is required' }, { status: 400 });
        }

        const [unreadCount, recipients] = await Promise.all([
            NotificationRecipient.countDocuments({ user_id: userId, is_read: false }),
            NotificationRecipient.find({ user_id: userId })
            .select('notification_id is_read read_at')
            .sort({ created_at: -1 })
            .skip(offset)
            .limit(limit)
            .lean()
        ]);
        const notificationIds = recipients.map((r: any) => r.notification_id);

        if (notificationIds.length === 0) {
            return NextResponse.json({ notifications: [], unread_count: unreadCount });
        }

        const notifications = await Notification.find({ id: { $in: notificationIds } })
            .sort({ created_at: -1 })
            .lean();

        // Build a lookup map by notification_id -> recipient record
        const recipientMap = new Map(recipients.map((r: any) => [r.notification_id, r]));

        const notificationsWithStatus = notifications.map((n: any) => {
            const recipientRecord = recipientMap.get(n.id);
            const isRead = recipientRecord?.is_read ?? false;
            const readAt = recipientRecord?.read_at ? recipientRecord.read_at.toISOString?.() ?? recipientRecord.read_at : null;

            return {
                ...n,
                // Provide BOTH is_read and read_at so all UI components work
                is_read: isRead,
                read_at: isRead ? (readAt || new Date(0).toISOString()) : null,
            };
        });

        return NextResponse.json({ notifications: notificationsWithStatus, unread_count: unreadCount }, {
            headers: {
                'Cache-Control': 'private, max-age=20'
            }
        });
    } catch (error: any) {
        console.error('Notifications GET Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PATCH(req: NextRequest) {
    try {
        const auth=await getPortalSession(authOptions);
        if(!auth) return NextResponse.json({error:"Unauthorized"},{status:401});
        await connectToDatabase();
        const body = await req.json();
        const { notification_id, mark_all = false } = body;
        const user_id=auth.user.id;
        if(!mark_all && !notification_id) return NextResponse.json({error:"notification_id is required"},{status:400});

        if (!user_id) {
            return NextResponse.json({ error: 'user_id is required' }, { status: 400 });
        }

        const filter: any = { user_id };
        if (!mark_all && notification_id) {
            filter.notification_id = notification_id;
        }

        await NotificationRecipient.updateMany(filter, {
            $set: { is_read: true, read_at: new Date() }
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Notifications PATCH Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
