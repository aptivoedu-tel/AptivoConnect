// MongoDB API - Single MCQ Attempt
import { getPortalSession } from '@/lib/portalSession';
import { authOptions } from '@/lib/authOptions';
import { canReadStudent } from '@/lib/student-access';
import { answerId, nonnegativeSeconds } from '@/lib/attempt-policy';
import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb/connection';
import { MCQ, MCQAttempt, PracticeSession } from '@/lib/mongodb/models';

export async function GET(req: NextRequest) {
    try {
        const auth = await getPortalSession(authOptions);
        if (!auth) return NextResponse.json({error:"Unauthorized"},{status:401});
        await connectToDatabase();
        const { searchParams } = new URL(req.url);
        const sessionId = searchParams.get('session_id');

        if (!sessionId) {
            return NextResponse.json({ error: 'session_id is required' }, { status: 400 });
        }

        const practice = await PracticeSession.findOne({id:Number(sessionId)});
        if (!practice || !await canReadStudent(auth.user, practice.student_id)) return NextResponse.json({error:'Session not found'},{status:404});
        const attempts = await MCQAttempt.find({ practice_session_id: Number(sessionId) }).lean();
        return NextResponse.json({ attempts });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const auth = await getPortalSession(authOptions);
        if (!auth) return NextResponse.json({error:"Unauthorized"},{status:401});
        await connectToDatabase();
        const body = await req.json();
        const { practice_session_id, mcq_id, student_id, selected_option, time_spent_seconds } = body;

        if (!mcq_id || !student_id) {
            return NextResponse.json({ error: 'mcq_id and student_id are required' }, { status: 400 });
        }

        const practice = await PracticeSession.findOne({id:Number(practice_session_id),student_id:auth.user.id});
        if (!practice || student_id !== auth.user.id) return NextResponse.json({error:'Session not found'},{status:404});
        if (!practice.mcq_ids?.includes(Number(mcq_id))) return NextResponse.json({error:'Question is not part of this session'},{status:400});
        // Check if correct
        const mcq = await MCQ.findOne({ id: mcq_id });
        if (!mcq) return NextResponse.json({ error: 'MCQ not found' }, { status: 404 });

        const isCorrect = selected_option !== 'SKIPPED' && selected_option === mcq.correct_option;

        const previous = await MCQAttempt.findOne({practice_session_id:Number(practice_session_id),mcq_id:Number(mcq_id),student_id:auth.user.id});
        const response = (attempt:any) => NextResponse.json({isCorrect:attempt.is_correct,correctOption:mcq.correct_option,explanation:mcq.explanation,explanation_url:mcq.explanation_url,attempt});
        if (previous) return response(previous);
        if (practice.is_completed) return NextResponse.json({error:'Session is already completed'},{status:409});
        if (!['A','B','C','D','E','SKIPPED'].includes(selected_option)) return NextResponse.json({error:'Invalid answer'},{status:400});
        let attempt;
        try {
          attempt = await MCQAttempt.create({
            id:answerId('practice',practice_session_id,Number(mcq_id)),practice_session_id:Number(practice_session_id),mcq_id:Number(mcq_id),student_id:auth.user.id,
            selected_option,is_correct:isCorrect,time_spent_seconds:nonnegativeSeconds(time_spent_seconds),topic_id:mcq.topic_id,subtopic_id:mcq.subtopic_id,university_id:practice.university_id,created_at:new Date()
          });
        } catch(error:any) {
          if(error.code !== 11000) throw error;
          const saved=await MCQAttempt.findOne({practice_session_id:Number(practice_session_id),mcq_id:Number(mcq_id),student_id:auth.user.id});
          if(!saved) throw error;
          return response(saved);
        }

        // Update MCQ stats
        await MCQ.findOneAndUpdate(
            { id: Number(mcq_id) },
            {
                $inc: {
                    times_attempted: 1,
                    times_correct: isCorrect ? 1 : 0
                }
            }
        );

        // Update session time
        if (practice_session_id) {
            await PracticeSession.findOneAndUpdate(
                { id: Number(practice_session_id) },
                { $inc: { time_spent_seconds: nonnegativeSeconds(time_spent_seconds) } }
            );
        }

        return NextResponse.json({
            isCorrect,
            correctOption: mcq.correct_option,
            explanation: mcq.explanation,
            explanation_url: mcq.explanation_url,
            attempt
        });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
