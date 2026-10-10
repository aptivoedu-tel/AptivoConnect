import { NextRequest, NextResponse } from 'next/server';
import { getPortalSession as getServerSession } from '@/lib/portalSession';
import { authOptions } from '@/lib/authOptions';
import connectToDatabase from '@/lib/mongodb/connection';
import ExamQuestion from '@/lib/mongodb/models/ExamQuestion';

export async function GET(req: NextRequest) {
    try {
        await connectToDatabase();
  const session = await getServerSession(authOptions);
        const { searchParams } = new URL(req.url);
        const section_id = searchParams.get('section_id');
        const passage_id = searchParams.get('passage_id');

        if (!section_id && !passage_id) {
            return NextResponse.json({ error: 'Section ID or Passage ID required' }, { status: 400 });
        }

        const query: any = {};
        if (section_id) query.section_id = parseInt(section_id);
        if (passage_id) query.passage_id = parseInt(passage_id);

        const questions = await ExamQuestion.find(query).sort({ order_index: 1 }).lean();

        // --- NEW: Fill incomplete sections from University Question Bank ---
        if (section_id && !passage_id) {
            const numSectionId = parseInt(section_id);
            const { ExamSection, UniversityExam, Subject, MCQ } = require('@/lib/mongodb/models');
            
            const section = await ExamSection.findOne({ id: numSectionId }).lean();
            if (section && section.num_questions > questions.length) {
                const needed = section.num_questions - questions.length;
                console.log(`[API/Exams] Section ${section.name} is incomplete (${questions.length}/${section.num_questions}). Filling ${needed} from Question Bank...`);
                
                // 1. Get Exam to find university_id
                const exam = await UniversityExam.findOne({ id: section.exam_id }).lean();
                const uniId = exam?.university_id;

                // 2. Try to find a matching Subject or Topic by name to pull relevant questions
                // Strategy: Find subject that contains the section name
                const subject = await Subject.findOne({ 
                    name: { $regex: new RegExp(section.name.split(' ')[0], 'i') } 
                }).lean();

                if (subject || uniId) {
                    const mcqFilter: any = { is_active: true };
                    if (uniId) mcqFilter.university_id = uniId;
                    
                    if (subject) {
                        const { Topic } = require('@/lib/mongodb/models');
                        const topics = await Topic.find({ subject_id: subject.id }).select('id').lean();
                        const topicIds = topics.map((t: any) => t.id);
                        mcqFilter.topic_id = { $in: [...topicIds, ...topicIds.map((id: any) => id.toString())] };
                    }

                    // Exclude questions already in the exam (if they were pulled from MCQ bank originally)
                    // (ExamQuestions don't have mcq_id directly, but we can match by text if needed)
                    
                    const fillMcqs = await MCQ.aggregate([
                        { $match: mcqFilter },
                        { $sample: { size: needed } }
                    ]);

                    if (fillMcqs.length > 0) {
                        const filledQuestions = fillMcqs.map((m: any, idx: number) => ({
                            id: 990000 + m.id, // Virtual ID to avoid conflict
                            section_id: numSectionId,
                            question_text: m.question,
                            question_type: 'mcq_single',
                            options: [
                                { id: '1', text: m.option_a },
                                { id: '2', text: m.option_b },
                                { id: '3', text: m.option_c },
                                { id: '4', text: m.option_d }
                            ],
                            correct_answer: m.correct_option === 'A' ? '1' : m.correct_option === 'B' ? '2' : m.correct_option === 'C' ? '3' : '4',
                            marks: section.default_marks_per_question || 1,
                            explanation: m.explanation,
                            order_index: questions.length + idx + 1,
                            is_automatic_fill: true // Tag to identify source
                        }));
                        
                        let finalQuestions = [...questions, ...filledQuestions];
if (!['super_admin','institution_admin'].includes((session?.user as any)?.role)) {
  finalQuestions = finalQuestions.map(q => {
    const { correct_answer, explanation, ...rest } = q;
    return rest;
  });
}
return NextResponse.json({ questions: finalQuestions });
                    }
                }
            }
        }

        let finalQuestions = questions;
if (!['super_admin','institution_admin'].includes((session?.user as any)?.role)) {
  finalQuestions = finalQuestions.map(q => {
    const { correct_answer, explanation, ...rest } = q;
    return rest;
  });
}
return NextResponse.json({ questions: finalQuestions });
    } catch (error: any) {
        console.error('[API/Exams/Questions] Fatal GET:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !['super_admin','institution_admin'].includes((session.user as any)?.role)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await connectToDatabase();
        const body = await req.json();

        // Handle bulk or single
        if (Array.isArray(body)) {
            const lastQ = await ExamQuestion.findOne({}, { id: 1 }).sort({ id: -1 });
            let nextId = (lastQ?.id || 0) + 1;

            const questions = body.map(q => {
                // Strip incoming ID to prevent collisions
                const { id: dummyId, ...rest } = q;
                return {
                    ...rest,
                    id: nextId++,
                    created_at: new Date()
                };
            });

            await ExamQuestion.insertMany(questions);
            return NextResponse.json({ success: true, count: questions.length });
        }

        const lastQ = await ExamQuestion.findOne({}, { id: 1 }).sort({ id: -1 });
        const nextId = (lastQ?.id || 0) + 1;

        // Strip incoming ID to prevent collisions
        const { id: dummyId, ...rest } = body;

        const question = await ExamQuestion.create({
            id: nextId,
            ...rest,
            created_at: new Date()
        });

        return NextResponse.json({ success: true, question });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PATCH(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !['super_admin','institution_admin'].includes((session.user as any)?.role)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await connectToDatabase();
        const body = await req.json();
        const { id, ...updates } = body;

        const question = await ExamQuestion.findOneAndUpdate({ id: parseInt(id) }, { $set: updates }, { returnDocument: 'after' }).lean();
        return NextResponse.json({ success: true, question });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !['super_admin','institution_admin'].includes((session.user as any)?.role)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await connectToDatabase();
        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');

        await ExamQuestion.deleteOne({ id: parseInt(id!) });
        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
