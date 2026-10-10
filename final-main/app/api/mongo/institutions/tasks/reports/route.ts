import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb/connection';
import { 
    InstitutionTask, 
    TopicProgress, 
    SubtopicProgress, 
    User, 
    MCQAttempt,
    University,
    Topic,
    Subtopic 
} from '@/lib/mongodb/models';

export async function GET(req: Request) {
    try {
        await connectToDatabase();
        const { searchParams } = new URL(req.url);
        const institution_id = searchParams.get('institution_id');

        if (!institution_id) {
            return NextResponse.json({ error: 'Institution ID required' }, { status: 400 });
        }

        // 1. Get all students of this institution
        const students = await User.find({ institution_id: Number(institution_id), role: 'student' }).select('id full_name email').lean();
        const studentIds = students.map((s: any) => s.id);

        // 2. Get all assigned tasks for this institution (include scheduled ones if they are active in practice)
        const tasks = await InstitutionTask.find({ 
            institution_id: Number(institution_id), 
            status: { $in: ['active', 'scheduled'] } 
        }).lean();

        // 3. Get progress and MCQ attempts for these students
        const [topicProgress, subtopicProgress, mcqAttempts] = await Promise.all([
            TopicProgress.find({ student_id: { $in: studentIds } }).lean(),
            SubtopicProgress.find({ student_id: { $in: studentIds } }).lean(),
            MCQAttempt.find({ student_id: { $in: studentIds } }).select('student_id topic_id subtopic_id created_at is_correct').lean()
        ]);

        // 4. Map everything together
        const reports = await Promise.all(tasks.map(async (task: any) => {
            const uni = await University.findOne({ id: task.university_id }).select('name').lean();
            let targetName = 'Unknown';
            if (task.type === 'topic') {
                const topic = await Topic.findOne({ id: task.target_id }).select('name').lean();
                targetName = topic?.name || 'Topic';
            } else {
                const subtopic = await Subtopic.findOne({ id: task.target_id }).select('name').lean();
                targetName = subtopic?.name || 'Subtopic';
            }

            const completions = students.map((student: any) => {
                const assignedDate = new Date(task.assigned_at);
                let dueDate = task.due_date ? new Date(task.due_date) : null;
                
                if (dueDate) {
                    dueDate.setHours(23, 59, 59, 999);
                }

                // Find MCQ attempts AFTER assignment
                const attemptsAfterAssignment = mcqAttempts
                    .filter((a: any) => {
                        const isCorrectTarget = task.type === 'topic' ? a.topic_id === task.target_id : a.subtopic_id === task.target_id;
                        
                        // Use assigned_at or scheduled_at or created_at
                        const startDate = task.assigned_at || task.scheduled_at || task.created_at;
                        const isAfterStart = new Date(a.created_at) >= new Date(startDate);
                        
                        return a.student_id === student.id && isCorrectTarget && isAfterStart;
                    })
                    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

                const mcqCount = attemptsAfterAssignment.length;
                const correctCount = attemptsAfterAssignment.filter((a: any) => a.is_correct).length;
                
                // Usually completion is based on CORRECT answers
                const requiredToComplete = task.required_mcqs || 1;
                const isCompleted = correctCount >= requiredToComplete;
                
                let status = 'Pending';
                let completionDate: Date | null = null;

                if (isCompleted) {
                    // Completion date is the date of the requisite CORRECT attempt
                    const correctAttempts = attemptsAfterAssignment.filter((a: any) => a.is_correct);
                    if (correctCount > 0) {
                        completionDate = new Date(correctAttempts[requiredToComplete - 1]?.created_at || correctAttempts[correctCount - 1].created_at);
                    } else {
                        completionDate = new Date(); // Fallback
                    }
                    if (dueDate && completionDate > dueDate) {
                        status = 'Late';
                    } else {
                        status = 'Completed';
                    }
                } else if (dueDate && new Date() > dueDate) {
                    status = 'Missing';
                }

                return {
                    student_id: student.id,
                    student_name: student.full_name,
                    student_email: student.email,
                    is_completed: isCompleted,
                    mcq_count: mcqCount,
                    correct_mcqs: correctCount,
                    status,
                    completion_date: completionDate
                };
            });

            return {
                task_id: task._id,
                type: task.type,
                target_id: task.target_id,
                target_name: targetName,
                university_name: uni?.name || 'Academic Institution',
                assigned_at: task.assigned_at,
                due_date: task.due_date,
                required_mcqs: task.required_mcqs,
                completions
            };
        }));

        return NextResponse.json({ reports, students });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
