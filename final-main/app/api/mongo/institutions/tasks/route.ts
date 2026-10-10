import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb/connection';
import { University, Topic, Subtopic, InstitutionTask, MCQAttempt, Notification, NotificationRecipient, User } from '@/lib/mongodb/models';
import { sendExpoPushToUsers } from '@/lib/services/expoPushService';

export async function GET(req: Request) {
    try {
        await connectToDatabase();
        const { searchParams } = new URL(req.url);
        const institution_id = searchParams.get('institution_id');
        const university_id = searchParams.get('university_id');
        const student_id = searchParams.get('student_id');

        const now = new Date();
        const query: any = { 
            institution_id: Number(institution_id),
            status: { $in: ['active', 'scheduled'] } 
        };
        
        if (university_id) query.university_id = Number(university_id);

        console.log('Task Query:', JSON.stringify(query));
        const tasks = await InstitutionTask.find(query).lean();
        console.log(`Found ${tasks.length} tasks for institution ${institution_id}`);
        
        let mcqAttempts: any[] = [];
        if (student_id) {
            mcqAttempts = await MCQAttempt.find({ student_id }).select('topic_id subtopic_id created_at is_correct').lean();
        }

        // Enrich tasks with names
        const enrichedTasks = await Promise.all(tasks.map(async (task: any) => {
            const uni = await University.findOne({ id: task.university_id }).select('name').lean();
            let targetName = 'Unknown';
            if (task.type === 'topic') {
                const topic = await Topic.findOne({ id: task.target_id }).select('name').lean();
                targetName = topic?.name || 'Topic';
            } else {
                const subtopic = await Subtopic.findOne({ id: task.target_id }).select('name').lean();
                targetName = subtopic?.name || 'Subtopic';
            }
            let studentMcqCount = 0;
            if (student_id) {
                // If the task hasn't been active yet (scheduled), we count from its scheduled date or task creation
                const assignedDate = new Date(task.assigned_at || task.scheduled_at || task.created_at || new Date());
                
                // Safety check: if Date is invalid, use something far in the past or far in the future
                const compareDate = isNaN(assignedDate.getTime()) ? new Date() : assignedDate;

                const filteredAttempts = mcqAttempts.filter((a: any) => {
                    const isCorrectTarget = task.type === 'topic' ? a.topic_id === task.target_id : a.subtopic_id === task.target_id;
                    const isAfterAssignment = new Date(a.created_at) > compareDate;
                    return isCorrectTarget && isAfterAssignment;
                });
                
                studentMcqCount = filteredAttempts.length;
                const studentCorrectCount = filteredAttempts.filter((a: any) => a.is_correct).length;
                
                return {
                    ...task,
                    university_name: uni?.name || 'Academic Institution',
                    target_name: targetName,
                    mcq_count: studentMcqCount,
                    correct_mcqs: studentCorrectCount
                };
            }

            return {
                ...task,
                university_name: uni?.name || 'Academic Institution',
                target_name: targetName,
                mcq_count: 0,
                correct_mcqs: 0
            };
        }));

        return NextResponse.json({ tasks: enrichedTasks });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        await connectToDatabase();
        const body = await req.json();
        const { institution_id, university_id, type, target_id, due_date, required_mcqs, scheduled_at } = body;

        if (!institution_id || !university_id || !type || !target_id) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const now = new Date();
        const scheduledDate = scheduled_at ? new Date(scheduled_at) : null;
        const status = (scheduledDate && scheduledDate > now) ? 'scheduled' : 'active';

        const task = await InstitutionTask.findOneAndUpdate(
            { institution_id: Number(institution_id), university_id: Number(university_id), type, target_id: Number(target_id) },
            { 
                status, 
                assigned_at: status === 'active' ? now : undefined,
                scheduled_at: scheduledDate || undefined,
                due_date: due_date ? new Date(due_date) : undefined,
                required_mcqs: required_mcqs ? Number(required_mcqs) : undefined
            },
            { upsert: true, returnDocument: 'after' }
        );

        // Send a notification ONLY IF it's active immediately
        if (status === 'active') {
            try {
            // Find target names
            const uni = await University.findOne({ id: Number(university_id) }).select('name').lean();
            let targetName = 'Content';
            if (type === 'topic') {
                const topicItem = await Topic.findOne({ id: Number(target_id) }).select('name').lean();
                if (topicItem) targetName = topicItem.name;
            } else {
                const subtopicItem = await Subtopic.findOne({ id: Number(target_id) }).select('name').lean();
                if (subtopicItem) targetName = subtopicItem.name;
            }

            const universityName = uni?.name || 'Academic Institution';

            // Use a timestamp-based numeric ID for the notification
            const notificationId = Math.floor(Date.now() / 1000) + Math.floor(Math.random() * 1000);

            let messageStr = `You have been assigned the ${type === 'topic' ? 'chapter' : 'topic'} "${targetName}" under "${universityName}".`;
            if (required_mcqs && due_date) {
                messageStr += ` Please complete at least ${required_mcqs} MCQs by ${new Date(due_date).toLocaleDateString()}.`;
            } else if (required_mcqs) {
                messageStr += ` Please complete at least ${required_mcqs} MCQs.`;
            } else if (due_date) {
                messageStr += ` Please complete this by ${new Date(due_date).toLocaleDateString()}.`;
            }

            await Notification.create({
                id: notificationId,
                title: `New Assignment from your Institution`,
                message: messageStr,
                category: 'info',
                sender_role: 'institution_admin',
                institution_id: Number(institution_id),
                created_at: new Date()
            });

            // Identify all students in this institution
            const users = await User.find({
                status: { $in: ['active', 'pending'] },
                institution_id: Number(institution_id),
                role: 'student'
            }).select('id').lean();

            if (users.length > 0) {
                const recipientsData = users.map((user: any, index: number) => ({
                    id: Math.floor(Date.now() * 10) + Math.floor(Math.random() * 10000) + index,
                    notification_id: notificationId,
                    user_id: user.id,
                    is_read: false,
                    created_at: new Date()
                }));

                const BATCH_SIZE = 500;
                for (let i = 0; i < recipientsData.length; i += BATCH_SIZE) {
                    await NotificationRecipient.insertMany(recipientsData.slice(i, i + BATCH_SIZE), { ordered: false });
                }
                await sendExpoPushToUsers({
                    userIds: users.map((user: any) => user.id),
                    title: 'New Assignment from your Institution',
                    body: messageStr,
                    path: '/dashboard/tasks',
                    notificationId,
                });
                }
            } catch (notifErr: any) {
                console.error('Failed to send assignment notification:', notifErr);
                // We do not fail the endpoint, we swallow the error to not block task assignment
            }
        }

        return NextResponse.json({ task });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(req: Request) {
    try {
        await connectToDatabase();
        const { searchParams } = new URL(req.url);
        const institution_id = searchParams.get('institution_id');
        const university_id = searchParams.get('university_id');
        const type = searchParams.get('type');
        const target_id = searchParams.get('target_id');

        if (!institution_id || !university_id || !type || !target_id) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        await InstitutionTask.findOneAndDelete({
            institution_id: Number(institution_id),
            university_id: Number(university_id),
            type,
            target_id: Number(target_id)
        });

        return NextResponse.json({ message: 'Task unassigned' });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
