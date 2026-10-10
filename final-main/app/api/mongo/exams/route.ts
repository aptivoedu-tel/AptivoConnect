// MongoDB API - Exams
// GET: Fetch exams
// POST: Create new exam
// PATCH: Update exam
// DELETE: Delete exam

import { NextRequest, NextResponse } from 'next/server';
import { getPortalSession as getServerSession } from '@/lib/portalSession';
import { authOptions } from '@/lib/authOptions';
import connectToDatabase from '@/lib/mongodb/connection';
import { MCQ, Topic, Subject, University, ExamAttempt, ExamSection, ExamQuestion, UniversityExam, TestSection } from '@/lib/mongodb/models';
import mongoose from 'mongoose';

export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions);
    const isLoggedIn = !!session;
    const isAdmin = (session?.user as any)?.role === 'super_admin';
    const isStudent = (session?.user as any)?.role === 'student';

    try {
        await connectToDatabase();
        const { searchParams } = new URL(req.url);
        const universityId = searchParams.get('university_id');
        const testSectionId = searchParams.get('test_section_id');
        const institutionId = searchParams.get('institution_id'); // 'null' string for global, or numeric id
        const examId = searchParams.get('exam_id');
        const activeOnly = searchParams.get('active') === 'true';

        const filter: any = {};

        // Unauthenticated: ONLY show public active exams — hard lock
        if (!isLoggedIn) {
            filter.is_active = true;
            filter.institution_id = null;
            if (universityId) filter.university_id = parseInt(universityId);
            if (testSectionId) filter.test_section_id = parseInt(testSectionId);
            const publicExams = await UniversityExam.find(filter).sort({ created_at: -1 }).lean();
            return NextResponse.json({ exams: publicExams, count: publicExams.length });
        }

        if (activeOnly) filter.is_active = true;
        if (universityId !== null && universityId !== undefined) filter.university_id = parseInt(universityId);
        if (testSectionId !== null && testSectionId !== undefined) filter.test_section_id = parseInt(testSectionId);
        if (examId !== null && examId !== undefined) filter.id = parseInt(examId);

        if (institutionId === 'all' && isAdmin) {
            // No institution filter - show everything
        } else if (institutionId === 'null') {
            filter.institution_id = null;
        } else if (institutionId === 'mine' || (institutionId && !isNaN(parseInt(institutionId)))) {
            const instId = parseInt(institutionId);
            filter.$or = [
                { institution_id: null },
                { institution_id: instId }
            ];
        } else if (!isAdmin) {
            // Default for non-admins: ONLY public exams to prevent leakage
            filter.institution_id = null;
        }
        // For super_admins, if no specific institution_id is provided, we show all (global + institutional)
        // unless they explicitly asked for 'null' or a specific one.

        const exams = await UniversityExam.find(filter).sort({ created_at: -1 }).lean();

        // --- NEW: Handle hierarchical fetch (with_sections) for Exam Session ---
        const withSections = searchParams.get('with_sections') === 'true';
        if (withSections && exams.length > 0) {
            const { ExamSection, ExamQuestion, Subject, MCQ, Topic } = require('@/lib/mongodb/models');
            
            // Map over exams to attach sections and filled questions
            const detailedExams = await Promise.all(exams.map(async (exam: any) => {
                // Check if the student has a completed/submitted attempt for this exam
                let attemptCompleted = false;
                if (isStudent && session?.user) {
                    const studentId = (session.user as any).id;
                    const completedAttempt = await ExamAttempt.findOne({
                        student_id: studentId,
                        exam_id: exam.id,
                        status: { $in: ['completed', 'submitted'] }
                    }).lean();
                    if (completedAttempt) {
                        attemptCompleted = true;
                    }
                }

                const sections = await ExamSection.find({ exam_id: exam.id }).sort({ order_index: 1 }).lean();
                
                const detailedSections = await Promise.all(sections.map(async (section: any) => {
                    let questions = await ExamQuestion.find({ section_id: section.id }).sort({ order_index: 1 }).lean();
                    
                    // --- SECURITY: Hide answers from students ---
                    const hideCorrect = isStudent && !attemptCompleted;
                    if (hideCorrect) {
                        questions = questions.map((q: any) => {
                            const { correct_answer, explanation, ...rest } = q;
                            return rest;
                        });
                    }
                    
                    // AUTO-FILL logic: If section is incomplete, grab from main Question Bank
                    if (section.num_questions > questions.length) {
                        const needed = section.num_questions - questions.length;
                        console.log(`[API/Exams] Filling section ${section.name} (Uni: ${exam.university_id}) with ${needed} more MCQs...`);
                        
                        // Strategy: Match Section Name to a Subject to get relevant content
                        const subject = await Subject.findOne({ 
                            name: { $regex: new RegExp(section.name.split(' ')[0], 'i') } 
                        }).lean();

                        const baseMcqFilter: any = { is_active: true };
                        if (subject) {
                            const topics = await Topic.find({ subject_id: subject.id }).select('id').lean();
                            const topicIds = topics.map((t: any) => t.id);
                            baseMcqFilter.topic_id = { $in: [...topicIds, ...topicIds.map((id: any) => id.toString())] };
                        }

                        // Heritage logic for auto-fill
                        const targetUniId = exam.university_id ? parseInt(exam.university_id) : null;
                        const targetSectionId = exam.test_section_id ? parseInt(exam.test_section_id) : null;

                        let fallbackUniId: number | null = null;
                        let strictlyNoFallbackUni = false;
                        if (targetUniId) {
                            const uni = await University.findOne({ id: targetUniId }).select('fallback_university_id strictly_no_fallback').lean();
                            fallbackUniId = uni?.fallback_university_id || null;
                            strictlyNoFallbackUni = (uni as any).strictly_no_fallback || false;
                        }

                        let fallbackSectionId: number | null = null;
                        let strictlyNoFallbackSection = false;
                        if (targetSectionId) {
                            const sec = await TestSection.findOne({ id: targetSectionId }).select('fallback_test_section_id strictly_no_fallback').lean();
                            fallbackSectionId = sec?.fallback_test_section_id || null;
                            strictlyNoFallbackSection = (sec as any).strictly_no_fallback || false;
                        }
                        const fillMcqs: any[] = [];
                        const existingIds = () => fillMcqs.map(m => m.id);
                        
                        // Tier 1: Primary Target Scope
                        const match1: any = { ...baseMcqFilter };
                        if (targetUniId !== null) {
                            match1.university_id = targetUniId;
                        }
                        if (targetSectionId !== null) {
                            match1.test_section_id = targetSectionId;
                        }
                        const res1 = await MCQ.aggregate([
                            { $match: match1 },
                            { $sample: { size: needed } }
                        ]);
                        fillMcqs.push(...res1);

                        // Tier 2: Fallback Scope
                        if (fillMcqs.length < needed && (fallbackUniId || fallbackSectionId)) {
                            const match2: any = { ...baseMcqFilter, id: { $nin: existingIds() } };
                            if (fallbackUniId && !strictlyNoFallbackUni) {
                                match2.university_id = fallbackUniId;
                            }
                            if (fallbackSectionId && !strictlyNoFallbackSection) {
                                match2.test_section_id = fallbackSectionId;
                            }
                            // Only query if at least one fallback field was added
                            if (Object.keys(match2).some(k => k === 'university_id' || k === 'test_section_id')) {
                                const res2 = await MCQ.aggregate([
                                    { $match: match2 },
                                    { $sample: { size: needed - fillMcqs.length } }
                                ]);
                                fillMcqs.push(...res2);
                            }
                        }

                        // Tier 3: Universal Bank
                        if (fillMcqs.length < needed && !strictlyNoFallbackUni && !strictlyNoFallbackSection) {
                            const match3: any = {
                                ...baseMcqFilter,
                                university_id: { $in: [null, undefined, '', 'null'] },
                                test_section_id: { $in: [null, undefined, '', 'null'] },
                                id: { $nin: existingIds() }
                            };
                            const res3 = await MCQ.aggregate([
                                { $match: match3 },
                                { $sample: { size: needed - fillMcqs.length } }
                            ]);
                            fillMcqs.push(...res3);
                        }

                        if (fillMcqs.length > 0) {
                            const filledQuestions = fillMcqs.map((m: any, idx: number) => {
                                const qData: any = {
                                    id: 990000 + m.id,
                                    section_id: section.id,
                                    question_text: m.question,
                                    question_type: 'mcq_single',
                                    options: [
                                        { id: '1', text: m.option_a },
                                        { id: '2', text: m.option_b },
                                        { id: '3', text: m.option_c },
                                        { id: '4', text: m.option_d }
                                    ],
                                    marks: section.default_marks_per_question || 1,
                                    order_index: questions.length + idx + 1,
                                    is_automatic_fill: true
                                };

                                // ONLY include answers for admins or if student has completed the attempt
                                if (!isStudent || attemptCompleted) {
                                    qData.correct_answer = m.correct_option === 'A' ? '1' : m.correct_option === 'B' ? '2' : m.correct_option === 'C' ? '3' : '4';
                                    qData.explanation = m.explanation;
                                }

                                return qData;
                            });
                            return { ...section, questions: [...questions, ...filledQuestions] };
                        }
                    }

                    return { ...section, questions };
                }));

                return { ...exam, sections: detailedSections };
            }));

            return NextResponse.json({ exams: detailedExams, count: detailedExams.length });
        }

        return NextResponse.json({ exams, count: exams.length });
    } catch (error: any) {
        console.error('Exams GET Error:', error);
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

        // Auto-increment ID
        const lastExam = await UniversityExam.findOne().sort({ id: -1 });
        const nextId = (lastExam?.id || 0) + 1;

        const newExam = await UniversityExam.create({
            id: nextId,
            ...body,
            created_at: new Date()
        });

        return NextResponse.json({ success: true, exam: newExam }, { status: 201 });
    } catch (error: any) {
        console.error('Exams POST Error:', error);
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

        if (!id) return NextResponse.json({ error: 'Exam ID required' }, { status: 400 });

        const updatedExam = await UniversityExam.findOneAndUpdate(
            { id: parseInt(id) },
            { $set: updates },
            { returnDocument: 'after' }
        ).lean();

        if (!updatedExam) return NextResponse.json({ error: 'Exam not found' }, { status: 404 });

        return NextResponse.json({ success: true, exam: updatedExam });
    } catch (error: any) {
        console.error('Exams PATCH Error:', error);
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

        if (!id) return NextResponse.json({ error: 'Exam ID required' }, { status: 400 });

        const examId = parseInt(id);

        // Optional: Delete related sections and questions? 
        // In Supabase it probably has cascade delete, in Mongo we might need to handle it.
        await Promise.all([
            UniversityExam.deleteOne({ id: examId }),
            ExamSection.deleteMany({ exam_id: examId }),
            // Delete questions for those sections
            (async () => {
                const sections = await ExamSection.find({ exam_id: examId }).select('id');
                const sectionIds = sections.map((s: any) => s.id);
                await ExamQuestion.deleteMany({ section_id: { $in: sectionIds } });
            })()
        ]);

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Exams DELETE Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
