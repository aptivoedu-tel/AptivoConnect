import { NextRequest, NextResponse } from 'next/server';
import { getPortalSession as getServerSession } from '@/lib/portalSession';
import { authOptions } from '@/lib/authOptions';
import connectToDatabase from '@/lib/mongodb/connection';
import { canReadStudent } from '@/lib/student-access';
import { answerId } from '@/lib/attempt-policy';
import { ExamAnswer, ExamAttempt, ExamQuestion, ExamSection } from '@/lib/mongodb/models';

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { searchParams } = new URL(req.url);
        const attemptId = searchParams.get('attempt_id');

        if (!attemptId) return NextResponse.json({ error: 'Missing attempt_id' }, { status: 400 });

        await connectToDatabase();

        const attempt=await ExamAttempt.findOne({id:attemptId});
        if(!attempt || !await canReadStudent(session.user,attempt.student_id)) return NextResponse.json({error:'Attempt not found'},{status:404});
        const answers = await ExamAnswer.find({ attempt_id: attemptId }).lean();
        return NextResponse.json({ answers });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await req.json();
        const { attempt_id, question_id, answer } = body;

        await connectToDatabase();

        const attempt=await ExamAttempt.findOne({id:attempt_id,student_id:session.user.id});
        if(!attempt) return NextResponse.json({error:'Attempt not found'},{status:404});
        if(attempt.status!=='in_progress') return NextResponse.json({error:'Attempt already completed'},{status:409});
        const question=await ExamQuestion.findOne({id:Number(question_id)});
        if(!question || !await ExamSection.exists({id:question.section_id,exam_id:attempt.exam_id})) return NextResponse.json({error:'Question is not part of this exam'},{status:400});
        const nextId=answerId('exam',attempt_id,Number(question_id));

        let updated;
        try { updated = await ExamAnswer.findOneAndUpdate(
            { attempt_id, question_id: parseInt(question_id) },
            {
                $set: { answer },
                $setOnInsert: { id: nextId }
            },
            { upsert: true, returnDocument: 'after' }
        );

        } catch(error:any) {
          if(error.code!==11000) throw error;
          updated=await ExamAnswer.findOneAndUpdate({attempt_id,question_id:Number(question_id)},{$set:{answer}},{returnDocument:'after'});
          if(!updated) throw error;
        }
        return NextResponse.json({ answer: updated });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
