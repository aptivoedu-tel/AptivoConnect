import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb/connection';
import MCQ from '@/lib/mongodb/models/MCQ';
import Subtopic from '@/lib/mongodb/models/Subtopic';
import Topic from '@/lib/mongodb/models/Topic';
import University from '@/lib/mongodb/models/University';
import TestSection from '@/lib/mongodb/models/TestSection';
import Passage from '@/lib/mongodb/models/Passage';
import { getPortalSession as getServerSession } from '@/lib/portalSession';
import { authOptions } from '@/lib/authOptions';
import { shuffleGrouped } from '@/lib/utils';

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const conn = await connectToDatabase();
        const db = conn.connection.db;
        if (!db) throw new Error('Database connection failed');

        // 1. Meta / Aggregation Queries
        const counts_only = searchParams.get('counts_only') === 'true';
        if (counts_only) {
            const mcqsCol = db.collection('mcqs');

            // Optionally scope counts to a specific university or test section
            const countUniIdRaw = searchParams.get('university_id');
            const countSectionIdRaw = searchParams.get('test_section_id');
            const countMatchStage: any = { is_active: { $ne: false } };
            if (countUniIdRaw && !['undefined', 'null', '', 'NaN'].includes(countUniIdRaw)) {
                const uniNum = parseInt(countUniIdRaw);
                countMatchStage.$or = [{ university_id: uniNum }, { university_id: countUniIdRaw }];
            }
            if (countSectionIdRaw && !['undefined', 'null', '', 'NaN'].includes(countSectionIdRaw)) {
                const secNum = parseInt(countSectionIdRaw);
                countMatchStage.test_section_id = { $in: [secNum, countSectionIdRaw] };
            }

            const [subtopicCounts, topicCounts, universityCounts, subjects, topics, subtopics, universities] = await Promise.all([
                mcqsCol.aggregate([{ $match: countMatchStage }, { $group: { _id: '$subtopic_id', count: { $sum: 1 } } }]).toArray(),
                mcqsCol.aggregate([{ $match: countMatchStage }, { $group: { _id: '$topic_id', count: { $sum: 1 } } }]).toArray(),
                mcqsCol.aggregate([{ $match: {} }, { $group: { _id: '$university_id', count: { $sum: 1 } } }]).toArray(),
                db.collection('subjects')
                    .find({ is_active: { $ne: false } })
                    .project({ _id: 0, id: 1, name: 1, display_order: 1, test_section_id: 1 })
                    .sort({ display_order: 1 })
                    .toArray(),
                db.collection('topics')
                    .find({ is_active: { $ne: false } })
                    .project({ _id: 0, id: 1, name: 1, subject_id: 1, sequence_order: 1, university_id: 1, test_section_id: 1 })
                    .sort({ sequence_order: 1 })
                    .toArray(),
                db.collection('subtopics')
                    .find({ is_active: { $ne: false } })
                    .project({ _id: 0, id: 1, name: 1, topic_id: 1, sequence_order: 1, university_id: 1, test_section_id: 1 })
                    .sort({ sequence_order: 1 })
                    .toArray(),
                db.collection('universities')
                    .find({ is_active: { $ne: false } })
                    .project({ _id: 0, id: 1, name: 1, short_name: 1, is_public: 1, show_on_landing: 1 })
                    .toArray()
            ]);
            return NextResponse.json({
                subjects,
                topics,
                subtopics,
                universities,
                counts: {
                    subtopics: Object.fromEntries(subtopicCounts.map((c: any) => [c._id, c.count])),
                    topics: Object.fromEntries(topicCounts.map((c: any) => [c._id, c.count])),
                    universities: Object.fromEntries(universityCounts.map((c: any) => [c._id, c.count]))
                }
            });
        }

        const admin_stats = searchParams.get('admin_stats') === 'true';
        if (admin_stats) {
            const mcqsCol = db.collection('mcqs');
            const stats = await Promise.all([
                mcqsCol.countDocuments({ is_active: { $ne: false } }),
                db.collection('universities').find().toArray(),
                db.collection('testsections').find().toArray(),
                mcqsCol.aggregate([{ $group: { _id: '$subtopic_id', count: { $sum: 1 } } }]).toArray(),
                mcqsCol.aggregate([{ $group: { _id: '$topic_id', count: { $sum: 1 } } }]).toArray(),
                mcqsCol.aggregate([{ $group: { _id: '$university_id', count: { $sum: 1 } } }]).toArray()
            ]);
            return NextResponse.json({
                totalMcqs: stats[0],
                universities: stats[1],
                testSections: stats[2],
                counts: {
                    subtopics: Object.fromEntries(stats[3].map((c: any) => [c._id, c.count])),
                    topics: Object.fromEntries(stats[4].map((c: any) => [c._id, c.count])),
                    universities: Object.fromEntries(stats[5].map((c: any) => [c._id, c.count]))
                }
            });
        }

        // 2. MCQ Fetching Logic
        const session = await getServerSession(authOptions);
        const isStudent = session?.user?.role === 'student';
        const subject_id_raw = searchParams.get('subject_id');
        const topic_id_raw = searchParams.get('topic_id');
        const subtopic_id_raw = searchParams.get('subtopic_id');
        const university_id_raw = searchParams.get('university_id');
        const test_section_id_raw = searchParams.get('test_section_id');
        const difficulty_raw = searchParams.get('difficulty');
        const include_children = searchParams.get('include_children') === 'true';

        const strict_university = searchParams.get('strict_university') === 'true';
        const strict_test_section = searchParams.get('strict_test_section') === 'true';

        const filter: any = { is_active: { $ne: false } };
        const hierarchyOr: any[] = [];

        // Build Hierarchy
        if (subtopic_id_raw && !['undefined', 'null', '', 'NaN'].includes(subtopic_id_raw)) {
            const num = parseInt(subtopic_id_raw);
            hierarchyOr.push({ subtopic_id: num }, { subtopic_id: subtopic_id_raw });
        } else if (topic_id_raw && !['undefined', 'null', '', 'NaN'].includes(topic_id_raw)) {
            const num = parseInt(topic_id_raw);
            if (include_children) {
                const subtopics = await Subtopic.find({ $or: [{ topic_id: num }, { topic_id: topic_id_raw }] }).select('id').lean();
                const sIds = subtopics.map(s => s.id);
                hierarchyOr.push(
                    { topic_id: num }, { topic_id: topic_id_raw },
                    { subtopic_id: { $in: [...sIds, ...sIds.map(id => id.toString())] } }
                );
            } else {
                hierarchyOr.push({ topic_id: num }, { topic_id: topic_id_raw });
            }
        } else if (subject_id_raw && !['undefined', 'null', '', 'NaN'].includes(subject_id_raw)) {
            const num = parseInt(subject_id_raw);
            const topics = await Topic.find({ $or: [{ subject_id: num }, { subject_id: subject_id_raw }] }).select('id').lean();
            const tIds = topics.map(t => t.id);
            const subtopics = await Subtopic.find({ topic_id: { $in: tIds } }).select('id').lean();
            const sIds = subtopics.map(s => s.id);
            hierarchyOr.push(
                { subject_id: num }, { subject_id: subject_id_raw },
                { topic_id: { $in: [...tIds, ...tIds.map(id => id.toString())] } },
                { subtopic_id: { $in: [...sIds, ...sIds.map(id => id.toString())] } }
            );
        }

        const targetUniId = (university_id_raw && !['undefined', 'null', '', 'NaN'].includes(university_id_raw)) ? parseInt(university_id_raw) : null;
        const targetSectionId = (test_section_id_raw && !['undefined', 'null', '', 'NaN'].includes(test_section_id_raw)) ? parseInt(test_section_id_raw) : null;

        let student_id = searchParams.get('student_id');
        const limitStr = searchParams.get('limit');
        const show_all = searchParams.get('show_all') === 'true';
        const shuffle = searchParams.get('shuffle') === 'true';

        // Student practice is always scoped to the authenticated student. A caller
        // cannot ask the practice engine to use another student's solved history.
        if (isStudent && student_id && student_id !== (session?.user as any).id) {
            return NextResponse.json({ error: 'Forbidden: student mismatch' }, { status: 403 });
        }
        if (isStudent && !student_id) {
            student_id = (session?.user as any).id;
        }

        // Admin / direct views: bypass the tiered practice engine entirely
        const isAdminView = !student_id || strict_university || strict_test_section;
        const adminLimit = (limitStr && limitStr !== 'null') ? parseInt(limitStr) : 2000;
        const practiceLimit = (limitStr && limitStr !== 'null') ? parseInt(limitStr) : 10;
        const limit = isAdminView ? adminLimit : practiceLimit;

        let rawMcqs: any[];

        if (isAdminView) {
            // ── Admin direct query ──────────────────────────────────────────
            const filter: any = { is_active: { $ne: false } };
            const andFilters: any[] = [];
            if (hierarchyOr.length > 0) {
                andFilters.push({ $or: hierarchyOr });
            }
            if (targetSectionId !== null) {
                andFilters.push({ $or: [{ test_section_id: targetSectionId }, { test_section_id: test_section_id_raw }] });
            }
            if (targetUniId !== null) {
                andFilters.push({ university_id: { $in: [targetUniId, targetUniId.toString()] } });
            }
            if (difficulty_raw && difficulty_raw !== 'all') {
                andFilters.push({ difficulty: difficulty_raw });
            }
            if (andFilters.length > 0) {
                filter.$and = andFilters;
            }
            rawMcqs = await db.collection('mcqs').find(filter).limit(adminLimit).toArray();
        } else {
            // ── Student practice tiered engine ─────────────────────────────
            let fallbackUniId: number | null = null;
            let strictlyNoFallbackUni = false;
            let repeatOnEmptyUni = false;
            if (targetUniId) {
                const uni = await University.findOne({ id: targetUniId }).select('fallback_university_id strictly_no_fallback repeat_on_empty').lean();
                if (uni) {
                    fallbackUniId = (uni as any).fallback_university_id;
                    strictlyNoFallbackUni = (uni as any).strictly_no_fallback || false;
                    repeatOnEmptyUni = (uni as any).repeat_on_empty || false;
                }
            }

            let fallbackSectionId: number | null = null;
            let strictlyNoFallbackSection = false;
            let repeatOnEmptySection = false;
            if (targetSectionId) {
                const sec = await TestSection.findOne({ id: targetSectionId }).select('fallback_test_section_id strictly_no_fallback repeat_on_empty').lean();
                if (sec) {
                    fallbackSectionId = (sec as any).fallback_test_section_id;
                    strictlyNoFallbackSection = (sec as any).strictly_no_fallback || false;
                    repeatOnEmptySection = (sec as any).repeat_on_empty || false;
                }
            }

            let solvedIds: number[] = [];
            if (student_id && !show_all) {
                // Exclude any MCQ the student has already attempted (correct or incorrect)
                solvedIds = await db.collection('mcqattempts').distinct('mcq_id', { student_id });
            }

            const mcqsCol = db.collection('mcqs');
            const results: any[] = [];
            const existingIds = () => results.map(r => r.id);

            // Base filter containing active status and subject/topic hierarchy
            const baseFilter: any = { is_active: { $ne: false } };
            if (hierarchyOr.length > 0) {
                baseFilter.$or = hierarchyOr;
            }

            // Tier A: Target Scope (Unsolved)
            // Can be Uni, Test Section, or both
            const queryA: any = { ...baseFilter, id: { $nin: solvedIds } };
            const andFiltersA: any[] = [];
            if (targetUniId !== null) {
                andFiltersA.push({ university_id: { $in: [targetUniId, targetUniId.toString()] } });
            }
            if (targetSectionId !== null) {
                andFiltersA.push({ test_section_id: { $in: [targetSectionId, test_section_id_raw] } });
            }
            if (andFiltersA.length > 0) {
                queryA.$and = andFiltersA;
            }
            results.push(...await mcqsCol.find(queryA).limit(practiceLimit).toArray());

            // Tier B: Fallback Scope (Unsolved)
            if (results.length < practiceLimit && (fallbackUniId || fallbackSectionId)) {
                const queryB: any = { ...baseFilter, id: { $nin: [...solvedIds, ...existingIds()] } };
                const andFiltersB: any[] = [];
                // If university fallback is defined and not strictly prohibited
                if (fallbackUniId && !strictlyNoFallbackUni) {
                    andFiltersB.push({ university_id: { $in: [fallbackUniId, fallbackUniId.toString()] } });
                }
                // If section fallback is defined and not strictly prohibited
                if (fallbackSectionId && !strictlyNoFallbackSection) {
                    andFiltersB.push({ test_section_id: { $in: [fallbackSectionId, fallbackSectionId.toString()] } });
                }
                if (andFiltersB.length > 0) {
                    queryB.$and = andFiltersB;
                    results.push(...await mcqsCol.find(queryB).limit(practiceLimit - results.length).toArray());
                }
            }

            // Tier C: General / Universal Bank (Unsolved)
            // Only allowed if strictlyNoFallback is false for both University and Section
            if (results.length < practiceLimit && !strictlyNoFallbackUni && !strictlyNoFallbackSection) {
                const queryC: any = { 
                    ...baseFilter, 
                    university_id: { $in: [null, undefined, '', 'null'] }, 
                    test_section_id: { $in: [null, undefined, '', 'null'] }, 
                    id: { $nin: [...solvedIds, ...existingIds()] } 
                };
                results.push(...await mcqsCol.find(queryC).limit(practiceLimit - results.length).toArray());
            }

            // Tier D: Repeat Mode (Solved)
            if (results.length < practiceLimit) {
                // Determine which scopes are allowed for repeat mode
                const repeatQueries: any[] = [];

                // 1. Target scope
                const targetRepeat: any = {};
                const andFiltersT: any[] = [];
                if (targetUniId !== null) {
                    andFiltersT.push({ university_id: { $in: [targetUniId, targetUniId.toString()] } });
                }
                if (targetSectionId !== null) {
                    andFiltersT.push({ test_section_id: { $in: [targetSectionId, test_section_id_raw] } });
                }
                if (andFiltersT.length > 0) {
                    targetRepeat.$and = andFiltersT;
                }
                repeatQueries.push(targetRepeat);

                // 2. Fallback scope (if repeat allowed or general fallback allowed)
                if (fallbackUniId && (repeatOnEmptyUni || !strictlyNoFallbackUni)) {
                    repeatQueries.push({ university_id: { $in: [fallbackUniId, fallbackUniId.toString()] } });
                }
                if (fallbackSectionId && (repeatOnEmptySection || !strictlyNoFallbackSection)) {
                    repeatQueries.push({ test_section_id: { $in: [fallbackSectionId, fallbackSectionId.toString()] } });
                }

                // 3. Universal scope (if fallback allowed)
                if (!strictlyNoFallbackUni && !strictlyNoFallbackSection) {
                    repeatQueries.push({
                        university_id: { $in: [null, undefined, '', 'null'] },
                        test_section_id: { $in: [null, undefined, '', 'null'] }
                    });
                }

                if (repeatQueries.length > 0) {
                    const queryD: any = {
                        is_active: { $ne: false },
                        id: { $in: solvedIds, $nin: existingIds() },
                    };
                    if (hierarchyOr.length > 0) {
                        queryD.$and = [
                            { $or: hierarchyOr },
                            { $or: repeatQueries }
                        ];
                    } else {
                        queryD.$or = repeatQueries;
                    }
                    results.push(...await mcqsCol.find(queryD).limit(practiceLimit - results.length).toArray());
                }
            }

            rawMcqs = results;
        }

        let finalMcqs = rawMcqs.map(m => {
            const { _id, ...rest } = m;
            const item = { ...rest, _id: _id.toString() };
            // For practice mode, we leave the correct_option and explanation intact
            // so the frontend can provide 0ms instant feedback without extra API calls.
            if (isStudent && searchParams.get('is_exam') === 'true') {
                delete item.correct_option;
                delete item.correct_answer;
                delete item.explanation;
            }
            return item;
        });

        // Passages
        const passageIds = [...new Set(finalMcqs.filter(m => m.passage_id).map(m => m.passage_id))];
        if (passageIds.length > 0) {
            const passages = await db.collection('passages').find({ id: { $in: passageIds.map(id => parseInt(id.toString())) } }).toArray();
            const pMap = new Map(passages.map((p: any) => [p.id, p]));
            finalMcqs = finalMcqs.map(m => m.passage_id ? { ...m, passage: pMap.get(parseInt(m.passage_id.toString())) } : m);
        }

        const groupedMcqs = shuffle
            ? shuffleGrouped(finalMcqs, (m: any) => m.passage_id ? `passage:${m.passage_id}` : null)
            : finalMcqs;

        const limitedMcqs: any[] = [];
        for (let i = 0; i < groupedMcqs.length && limitedMcqs.length < limit; i++) {
            const mcq = groupedMcqs[i];
            limitedMcqs.push(mcq);

            if (mcq.passage_id) {
                const passageId = mcq.passage_id;
                let nextIndex = i + 1;
                while (
                    nextIndex < groupedMcqs.length &&
                    groupedMcqs[nextIndex].passage_id === passageId
                ) {
                    limitedMcqs.push(groupedMcqs[nextIndex]);
                    nextIndex++;
                }
                i = nextIndex - 1;
            }
        }

        return NextResponse.json({ mcqs: limitedMcqs });

    } catch (error: any) {
        console.error('[API/MCQs] Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        await connectToDatabase();
        const body = await req.json();
        if (Array.isArray(body)) {
            // Find the highest existing passage ID to increment from
            const passageCache = new Map<string, number>();
            const lastPassage = await Passage.findOne({}, { id: 1 }).sort({ id: -1 });
            let nextPassageId = (lastPassage?.id || 0) + 1;

            const processedBody = [];
            for (const q of body) {
                let resolvedPassageId = q.passage_id;
                
                if (q.passage_content && q.passage_content.trim() !== '') {
                    const normalizedPassageContent = q.passage_content.trim();
                    if (passageCache.has(normalizedPassageContent)) {
                        resolvedPassageId = passageCache.get(normalizedPassageContent);
                    } else {
                        const existingPassage = await Passage.findOne({ content: normalizedPassageContent });
                        if (existingPassage) {
                            resolvedPassageId = existingPassage.id;
                            passageCache.set(normalizedPassageContent, resolvedPassageId);
                        } else {
                            await Passage.create({
                                id: nextPassageId,
                                title: q.passage_title || '',
                                content: normalizedPassageContent,
                                created_at: new Date()
                            });
                            resolvedPassageId = nextPassageId;
                            passageCache.set(normalizedPassageContent, resolvedPassageId);
                            nextPassageId++;
                        }
                    }
                }

                const { passage_content, passage_title, ...rest } = q;
                processedBody.push({
                    ...rest,
                    passage_id: resolvedPassageId || null
                });
            }

            const last = await MCQ.findOne().sort({ id: -1 });
            let nextId = (last?.id || 0) + 1;
            const mcqs = await MCQ.insertMany(processedBody.map(q => ({ ...q, id: nextId++ })));
            return NextResponse.json({ count: mcqs.length }, { status: 201 });
        }
        
        let resolvedPassageId = body.passage_id;
        if (body.passage_content && body.passage_content.trim() !== '') {
            const normalizedPassageContent = body.passage_content.trim();
            const existingPassage = await Passage.findOne({ content: normalizedPassageContent });
            if (existingPassage) {
                resolvedPassageId = existingPassage.id;
            } else {
                const lastPassage = await Passage.findOne({}, { id: 1 }).sort({ id: -1 });
                const nextPassageId = (lastPassage?.id || 0) + 1;
                await Passage.create({
                    id: nextPassageId,
                    title: body.passage_title || '',
                    content: normalizedPassageContent,
                    created_at: new Date()
                });
                resolvedPassageId = nextPassageId;
            }
        }

        const { passage_content, passage_title, ...rest } = body;
        const last = await MCQ.findOne().sort({ id: -1 });
        const nextId = (last?.id || 0) + 1;
        const mcq = await MCQ.create({ ...rest, id: nextId, passage_id: resolvedPassageId || null });
        return NextResponse.json({ mcq }, { status: 201 });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PATCH(req: NextRequest) {
    try {
        await connectToDatabase();
        const body = await req.json();
        const { id, ids, ...update } = body;
        if (ids && Array.isArray(ids)) {
            const result = await MCQ.updateMany({ id: { $in: ids } }, { $set: update });
            return NextResponse.json({ count: result.modifiedCount });
        }
        const mcq = await MCQ.findOneAndUpdate({ id: parseInt(id) }, update, { returnDocument: 'after' });
        return NextResponse.json({ mcq });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    try {
        await connectToDatabase();
        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');
        const ids = searchParams.get('ids');
        if (ids) {
            const idArray = ids.split(',').map(Number);
            await MCQ.deleteMany({ id: { $in: idArray } });
            return NextResponse.json({ success: true });
        }
        await MCQ.deleteOne({ id: parseInt(id!) });
        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
