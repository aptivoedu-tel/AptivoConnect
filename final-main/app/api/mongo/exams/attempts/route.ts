import { canReadStudent } from '@/lib/student-access';
import { answersMatch,nonnegativeSeconds } from '@/lib/attempt-policy';
import { NextRequest, NextResponse } from 'next/server';
import { getPortalSession as getServerSession } from '@/lib/portalSession';
import { authOptions } from '@/lib/authOptions';
import connectToDatabase from '@/lib/mongodb/connection';
import { ExamAttempt, ExamAnswer, User, ExamSection, ExamQuestion, UniversityExam, LearningStreak } from '@/lib/mongodb/models';
import { v4 as uuidv4 } from 'uuid';
import { computeCurrentStreak, calculateXP } from '@/lib/services/xpService';

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { searchParams } = new URL(req.url);
        const studentId = searchParams.get('student_id');
        const examId = searchParams.get('exam_id');
        const attemptId = searchParams.get('attempt_id');
        const institutionId = searchParams.get('institution_id'); // Filter by institution

        await connectToDatabase();

        // If attempt_id is provided, fetch specific attempt and return early
        if (attemptId) {
            const attempt = await ExamAttempt.findOne({ id: attemptId }).lean();
            if (!attempt || !await canReadStudent(session.user,attempt.student_id)) return NextResponse.json({ error: 'Attempt not found' }, { status: 404 });
            return NextResponse.json({ attempt });
        }

        if (!examId) return NextResponse.json({ error: 'Exam ID required' }, { status: 400 });

        const query: any = { exam_id: parseInt(examId) };
        if (studentId) query.student_id = studentId;

        // If institution_id is provided, filter to only that institution's students
        if (institutionId && institutionId !== 'null') {
            const instIdNum = parseInt(institutionId);
            const institutionStudents = await User.find({
                institution_id: instIdNum,
                role: 'student'
            }).select('id').lean();
            const studentIdList = institutionStudents.map((s: any) => s.id);
            query.student_id = { $in: studentIdList };
        }

        if(session.user.role==='student') query.student_id=session.user.id;
        else if(session.user.role==='institution_admin') {
          if(studentId && !await canReadStudent(session.user,studentId)) return NextResponse.json({error:'Forbidden'},{status:403});
          if(!studentId) query.student_id={$in:(await User.find({institution_id:session.user.institution_id,role:'student'}).select('id').lean()).map((u:any)=>u.id)};
        } else if(session.user.role!=='super_admin') return NextResponse.json({error:'Forbidden'},{status:403});
        const attempts = await ExamAttempt.find(query).sort({ created_at: -1 }).lean();

        return NextResponse.json({ attempts });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await req.json();
        const { exam_id } = body;
        const student_id=session.user.id;

        await connectToDatabase();

        const exam=await UniversityExam.findOne({id:Number(exam_id),is_active:true});
        if(!exam || (exam.institution_id && Number(exam.institution_id)!==Number(session.user.institution_id))) return NextResponse.json({error:'Exam unavailable'},{status:404});
        if((exam.start_time && new Date(exam.start_time)>new Date()) || (exam.end_time && new Date(exam.end_time)<new Date())) return NextResponse.json({error:'Exam is outside its scheduled window'},{status:403});
        const ongoing=await ExamAttempt.findOne({student_id,exam_id:Number(exam_id),status:'in_progress'});
        if(ongoing) return NextResponse.json({attempt:ongoing});
        if(!exam.allow_reattempt && await ExamAttempt.exists({student_id,exam_id:Number(exam_id),status:{$in:['completed','submitted']}})) return NextResponse.json({error:'Reattempts are disabled for this exam'},{status:409});
        const university_id=exam.university_id;
        const newAttempt = await ExamAttempt.create({
            id: uuidv4(),
            student_id,
            exam_id: parseInt(exam_id),
            university_id,
            status: 'in_progress',
            start_time: new Date(),
            score: 0,
            total_marks: 0
        });

        return NextResponse.json({ attempt: newAttempt });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PATCH(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await req.json();
        const { attempt_id, score: clientScore, total_marks: clientTotal, status, time_spent_seconds, section_scores: clientSectionScores } = body;

        await connectToDatabase();

        const existing=await ExamAttempt.findOne({id:attempt_id,student_id:session.user.id});
        if(!existing) return NextResponse.json({error:'Attempt not found'},{status:404});
        if(existing.status!=='in_progress') return NextResponse.json({attempt:existing});
        if(status!=='completed' && status!=='submitted') return NextResponse.json({error:'Invalid completion status'},{status:400});
        let finalScore = 0;
        let finalTotal = clientTotal || 0;
        let finalSectionScores = clientSectionScores;
        let finalCorrect = 0;
        let finalWrong = 0;
        let attemptStudentId = '';

        if (status === 'completed' || status === 'submitted') {
            const attempt = await ExamAttempt.findOne({ id: attempt_id });
            if (attempt) {
                attemptStudentId = attempt.student_id;
                const examId = attempt.exam_id;
                const exam = await UniversityExam.findOne({ id: examId }).lean();
                const sections = await ExamSection.find({ exam_id: examId }).lean();
                const sectionIds = sections.map((s: any) => s.id);
                
                // Fetch all questions for this exam
                const questions = await ExamQuestion.find({ section_id: { $in: sectionIds } }).lean();
                
                // Fetch all submitted answers
                const answers = await ExamAnswer.find({ attempt_id }).lean();
                const answersMap: Record<number, any> = {};
                answers.forEach((a: any) => {
                    answersMap[a.question_id] = a.answer;
                });

                let calculatedScore = 0;
                let calculatedTotal = 0;
                const sectionScores: Record<number, { correct: number, total: number, score: number, wrong: number, skipped: number }> = {};

                sections.forEach((s: any) => {
                    sectionScores[s.id] = { correct: 0, total: 0, score: 0, wrong: 0, skipped: 0 };
                });

                questions.forEach((q: any) => {
                    const sect = sections.find((s: any) => s.id === q.section_id);
                    if (!sect) return;

                    const qMarks = q.marks || sect.default_marks_per_question || 1;
                    const qNeg = sect.negative_marking !== undefined ? sect.negative_marking : (exam?.negative_marking || 0);

                    const studentAns = answersMap[q.id];
                    if (studentAns !== undefined && studentAns !== null && studentAns !== '' && (Array.isArray(studentAns) ? studentAns.length > 0 : true)) {
                        const isCorrect = answersMatch(studentAns, q.correct_answer, q.question_type);
                        if (isCorrect) {
                            calculatedScore += qMarks;
                            sectionScores[sect.id].correct++;
                            sectionScores[sect.id].score += qMarks;
                            finalCorrect++;
                        } else {
                            calculatedScore -= qNeg;
                            sectionScores[sect.id].wrong++;
                            sectionScores[sect.id].score -= qNeg;
                            finalWrong++;
                        }
                    } else {
                        sectionScores[sect.id].skipped++;
                    }
                    calculatedTotal += qMarks;
                    sectionScores[sect.id].total++;
                });

                finalScore = Math.max(0, calculatedScore);
                finalTotal = calculatedTotal;
                Object.keys(sectionScores).forEach((sid: any) => {
                    sectionScores[sid].score = Math.max(0, sectionScores[sid].score);
                });
                finalSectionScores = sectionScores;
            }
        } else {
            // Fetch student_id even if not completing
            const attempt = await ExamAttempt.findOne({ id: attempt_id }).lean() as any;
            if (attempt) attemptStudentId = attempt.student_id;
        }

        const updatePayload: any = {
            score: finalScore,
            total_marks: finalTotal,
            status: status || 'completed',
            time_spent_seconds: nonnegativeSeconds(time_spent_seconds, existing.time_spent_seconds || 0),
            end_time: new Date()
        };

        if (finalSectionScores) {
            updatePayload.section_scores = finalSectionScores;
        }

        // ── XP Calculation for completed exams ──────────────────────────
        if ((status === 'completed' || status === 'submitted') && attemptStudentId) {
            try {
                const streak = await computeCurrentStreak(attemptStudentId);
                const xp = calculateXP(finalCorrect, finalWrong, streak);
                updatePayload.xp_earned = xp;

                // Also record streak for exam day
                const today = new Date().toISOString().split('T')[0];
                await LearningStreak.findOneAndUpdate(
                    { student_id: attemptStudentId, streak_date: today },
                    { $setOnInsert: { student_id: attemptStudentId, streak_date: today } },
                    { upsert: true }
                );
            } catch (xpErr) {
                console.error('[PATCH ExamAttempt] XP calc failed:', xpErr);
            }
        }

        const updated = await ExamAttempt.findOneAndUpdate(
            { id: attempt_id, status: 'in_progress' },
            { $set: updatePayload },
            { returnDocument: 'after' }
        );

        if(!updated) return NextResponse.json({attempt:await ExamAttempt.findOne({id:attempt_id})});
        if(updatePayload.xp_earned !== undefined) {
          await User.updateOne({id:attemptStudentId},{$inc:{league_xp:updatePayload.xp_earned}});
        }
        return NextResponse.json({ attempt: updated });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
