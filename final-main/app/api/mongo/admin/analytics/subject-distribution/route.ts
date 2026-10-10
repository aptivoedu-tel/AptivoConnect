import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb/connection';
import { MCQ, Subject, Topic } from '@/lib/mongodb/models';

export async function GET(req: NextRequest) {
    try {
        await connectToDatabase();

        const subjects = await Subject.find({ is_active: true }).lean();
        
        const distribution = await Promise.all(subjects.map(async (subj: any, index) => {
            const topics = await Topic.find({ 
                is_active: { $ne: false },
                $or: [{ subject_id: subj.id }, { subject_id: subj.id.toString() }]
            }).lean();
            
            const topicIds = topics.map(t => t.id).concat(topics.map(t => t.id.toString()));
            
            const count = await MCQ.countDocuments({ 
                is_active: { $ne: false },
                topic_id: { $in: topicIds.length > 0 ? topicIds : ["___none___"] }
            });
            
            const colors = ['#14b8a6', '#6366f1', '#f43f5e', '#f59e0b', '#8b5cf6', '#ec4899'];
            
            return {
                name: subj.name,
                value: count,
                color: colors[index % colors.length]
            };
        }));

        return NextResponse.json({ distribution: distribution.filter(d => d.value > 0) });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
