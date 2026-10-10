import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb/connection';
import { CalendarEvent, User, InstitutionTask, Topic, Subtopic, Notification, NotificationRecipient, University } from '@/lib/mongodb/models';
import { sendExpoPushToUsers } from '@/lib/services/expoPushService';

/**
 * GET /api/mongo/admin/calendar/reminders
 * Trigger logic to check for upcoming events and publish scheduled institutional tasks.
 */
export async function GET(req: NextRequest) {
    try {
        await connectToDatabase();
        
        const now = new Date();
        
        // --- 1. PUBLISH SCHEDULED INSTITUTIONAL TASKS ---
        const scheduledTasks = await InstitutionTask.find({
            status: 'scheduled',
            scheduled_at: { $lte: now }
        });

        const scheduledStats = { published: 0 };

        for (const task of scheduledTasks) {
            task.status = 'active';
            task.assigned_at = now;
            await task.save();

            // Send notification
            try {
                const uni = await University.findOne({ id: task.university_id }).select('name').lean();
                let targetName = 'Content';
                if (task.type === 'topic') {
                    const topicItem = await Topic.findOne({ id: task.target_id }).select('name').lean();
                    if (topicItem) targetName = topicItem.name;
                } else {
                    const subtopicItem = await Subtopic.findOne({ id: task.target_id }).select('name').lean();
                    if (subtopicItem) targetName = subtopicItem.name;
                }

                const universityName = uni?.name || 'Academic Institution';
                const notificationId = Math.floor(Date.now() / 1000) + Math.floor(Math.random() * 1000);

                let messageStr = `Today's Scheduled Assignment: The ${task.type === 'topic' ? 'chapter' : 'topic'} "${targetName}" under "${universityName}" is now active.`;
                if (task.required_mcqs && task.due_date) {
                    messageStr += ` Please complete at least ${task.required_mcqs} MCQs by ${new Date(task.due_date).toLocaleDateString()}.`;
                }

                await Notification.create({
                    id: notificationId,
                    title: `Scheduled Assignment Now Active`,
                    message: messageStr,
                    category: 'info',
                    sender_role: 'system',
                    institution_id: task.institution_id,
                    created_at: now
                });

                const students = await User.find({
                    status: { $in: ['active', 'pending'] },
                    institution_id: task.institution_id,
                    role: 'student'
                }).select('id').lean();

                if (students.length > 0) {
                    const recipientsData = students.map((user: any, index: number) => ({
                        id: Math.floor(Date.now() * 10) + Math.floor(Math.random() * 10000) + index,
                        notification_id: notificationId,
                        user_id: user.id,
                        is_read: false,
                        created_at: now
                    }));

                    const BATCH_SIZE = 500;
                    for (let i = 0; i < recipientsData.length; i += BATCH_SIZE) {
                        await NotificationRecipient.insertMany(recipientsData.slice(i, i + BATCH_SIZE), { ordered: false });
                    }
                    await sendExpoPushToUsers({
                        userIds: students.map((student: any) => student.id),
                        title: 'Scheduled Assignment Now Active',
                        body: messageStr,
                        path: '/dashboard/tasks',
                        notificationId,
                    });
                }
                scheduledStats.published++;
            } catch (err) {
                console.error(`Failed to send notification for scheduled task ${task._id}:`, err);
            }
        }

        // --- 2. CALENDAR REMINDERS (ORIGINAL LOGIC) ---
        // Target is something scheduled 36 hours from this moment.
        const targetMoment = new Date(now.getTime() + 36 * 60 * 60 * 1000);
        
        // Let's broaden the check to look for events on a specific Target Date 
        // if today's check hasn't run yet.
        const dayString = targetMoment.toISOString().split('T')[0];
        const dayStart = new Date(dayString);
        const dayEnd = new Date(dayString);
        dayEnd.setHours(23, 59, 59, 999);

        // Find events on that day
        const upcomingEvents = await CalendarEvent.find({
            event_type: { $in: ['registration_deadline', 'test_date'] },
            event_date: {
                $gte: dayStart,
                $lte: dayEnd
            },
            is_published: true
        });

        if (upcomingEvents.length === 0) {
            return NextResponse.json({ success: true, message: `No critical events found for target date ${dayString}.` });
        }

        const stats = { sent: 0, skipped: 0 };

        for (const event of upcomingEvents) {
            const uniqueKey = `CAL_REM_${event._id}_${dayString}`; // Unique for this event/day
            
            // Check if reminder already sent today/recently
            // Using a title + message check to verify
            const title = `🚨 Upcoming: ${event.title}`;
            
            const exists = await Notification.findOne({
                title: title,
                created_at: { $gte: new Date(now.getTime() - 48 * 60 * 60 * 1000) } // Sent in last 48h
            });

            if (exists) {
                stats.skipped++;
                continue;
            }

            // Create global notification
            const notificationId = Math.floor(Date.now() / 1000) + Math.floor(Math.random() * 1000);
            const message = `Friendly Reminder: The **${event.event_type.replace(/_/g, ' ')}** is scheduled for **${new Date(event.event_date).toLocaleDateString()}**. Prepare accordingly!`;
            
            await Notification.create({
                id: notificationId,
                title,
                message,
                category: 'important',
                sender_role: 'system',
                created_at: new Date()
            });

            // Identify all students
            const students = await User.find({ role: 'student', status: { $in: ['active', 'pending'] } }).select('id');
            
            if (students.length > 0) {
                const recipientsData = students.map((s: any) => ({
                    id: Math.floor(Date.now() + Math.random() * 1000000),
                    notification_id: notificationId,
                    user_id: s.id,
                    is_read: false,
                    created_at: new Date()
                }));

                const BATCH_SIZE = 500;
                for (let i = 0; i < recipientsData.length; i += BATCH_SIZE) {
                    await NotificationRecipient.insertMany(recipientsData.slice(i, i + BATCH_SIZE), { ordered: false });
                }
                await sendExpoPushToUsers({
                    userIds: students.map((student: any) => student.id),
                    title,
                    body: message,
                    path: '/calendar',
                    notificationId,
                });
            }
            stats.sent++;
        }

        return NextResponse.json({ success: true, stats, scheduledStats, targetDate: dayString });

    } catch (error: any) {
        console.error('Calendar Reminder Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
