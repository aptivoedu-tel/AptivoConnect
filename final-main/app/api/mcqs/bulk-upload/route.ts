import { NextRequest, NextResponse } from 'next/server';
import { getPortalSession as getServerSession } from '@/lib/portalSession';
import { authOptions } from '@/lib/authOptions';
import connectToDatabase from '@/lib/mongodb/connection';
import { MCQ, Subject, Topic, Subtopic, Upload, University, TestSection, TestSectionContentAccess, Passage } from '@/lib/mongodb/models';
import UniversityContentAccess from '@/lib/mongodb/models/UniversityContentAccess';
import { computeMCQHash, normalizeText } from '@/lib/mongodb/mcq-utils';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        if (!['super_admin', 'institution_admin'].includes(session.user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

        const body = await req.json();
        const { mcqs, subtopicId, fileName, uploadType } = body; // uploadType: 'mcq_excel' or 'mcq_excel_auto'

        await connectToDatabase();

        // 1. Create Upload record
        const uploadId = Date.now(); // Using full timestamp to avoid collisions
        const uploadRecord = await Upload.create({
            id: uploadId,
            upload_type: uploadType || 'mcq_excel',
            file_name: fileName,
            status: 'processing',
            total_rows: mcqs.length,
            processed_rows: 0,
            failed_rows: 0,
            created_by: session.user.id,
            created_at: new Date()
        });

        let insertedCount = 0;
        let skippedInFile = 0;
        let skippedExact = 0;
        const errors: any[] = [];

        // 2. Process MCQs
        const seenNormalized = new Set<string>();
        const toInsert: any[] = [];
        
        // Find the highest existing passage ID to increment from
        const passageCache = new Map<string, number>();
        const lastPassage = await Passage.findOne({}, { id: 1 }).sort({ id: -1 });
        let nextPassageId = (lastPassage?.id || 0) + 1;

        for (const mcq of mcqs) {
            const hash = computeMCQHash(mcq);

            if (seenNormalized.has(hash)) {
                skippedInFile++;
                continue;
            }
            seenNormalized.add(hash);

            // Check if exists in DB (Global check ignoring university)
            const existing = await MCQ.findOne({ question_hash: hash });
            
            if (existing) {
                skippedExact++;
                continue;
            }

            let resolvedPassageId = null;
            if (mcq.passage_content && mcq.passage_content.trim() !== '') {
                const normalizedPassageContent = mcq.passage_content.trim();
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
                            title: mcq.passage_title || '',
                            content: normalizedPassageContent,
                            created_at: new Date()
                        });
                        resolvedPassageId = nextPassageId;
                        passageCache.set(normalizedPassageContent, resolvedPassageId);
                        nextPassageId++;
                    }
                }
            }

            toInsert.push({
                subtopic_id: subtopicId || mcq.subtopicId,
                topic_id: mcq.topicId,
                passage_id: resolvedPassageId || mcq.passageId || mcq.passage_id || null,
                question: mcq.question,
                question_hash: hash,
                question_image_url: mcq.image_url,
                option_a: mcq.option_a,
                option_b: mcq.option_b,
                option_c: mcq.option_c,
                option_d: mcq.option_d,
                correct_option: mcq.correct_option,
                explanation: mcq.explanation,
                explanation_url: mcq.explanation_url,
                difficulty: mcq.difficulty || 'medium',
                upload_id: uploadId,
                university_id: mcq.universityId || mcq.university_id || null,
                test_section_id: mcq.testSectionId || mcq.test_section_id || null,
                is_active: true,
                created_at: new Date()
            });
        }

        if (toInsert.length > 0) {
            // Find the highest existing ID to increment from
            const lastMCQ = await MCQ.findOne({}, { id: 1 }).sort({ id: -1 });
            let currentId = (lastMCQ?.id || 0) + 1;

            for (const item of toInsert) {
                item.id = currentId++;
            }

            await MCQ.insertMany(toInsert);
            insertedCount = toInsert.length;
        }

        // 3. Update Upload record
        uploadRecord.status = 'completed';
        uploadRecord.processed_rows = insertedCount;
        uploadRecord.completed_at = new Date();
        await uploadRecord.save();

        // 4. Scoped Auto-linking logic
        const targetUniIds = [...new Set(toInsert.map(m => m.university_id).filter(Boolean))];
        const targetTsIds = [...new Set(toInsert.map(m => m.test_section_id).filter(Boolean))];
        
        const uniMappingsToCreate: any[] = [];
        const tsMappingsToCreate: any[] = [];
        
        if (targetUniIds.length > 0 || targetTsIds.length > 0 || subtopicId) {
            
            if (subtopicId) {
                const subtopic = await Subtopic.findOne({ id: subtopicId });
                if (subtopic) {
                    const topic = await Topic.findOne({ id: subtopic.topic_id });
                    if (topic) {
                        // University Mappings
                        targetUniIds.forEach(uniId => {
                            uniMappingsToCreate.push({
                                university_id: uniId,
                                subject_id: topic.subject_id,
                                topic_id: topic.id,
                                subtopic_id: subtopicId,
                                is_active: true
                            });
                        });
                        // Test Section Mappings
                        targetTsIds.forEach(tsId => {
                            tsMappingsToCreate.push({
                                test_section_id: tsId,
                                subject_id: topic.subject_id,
                                topic_id: topic.id,
                                subtopic_id: subtopicId,
                                is_active: true
                            });
                        });
                    }
                }
            } else {
                // Auto-detect mode
                const uniqueUniCombos = new Set<string>();
                const uniqueTsCombos = new Set<string>();

                toInsert.forEach((item: any) => {
                    if (item.university_id && item.topic_id) {
                        uniqueUniCombos.add(JSON.stringify({
                            university_id: item.university_id,
                            topic_id: item.topic_id,
                            subtopic_id: item.subtopic_id || null
                        }));
                    }
                    if (item.test_section_id && item.topic_id) {
                        uniqueTsCombos.add(JSON.stringify({
                            test_section_id: item.test_section_id,
                            topic_id: item.topic_id,
                            subtopic_id: item.subtopic_id || null
                        }));
                    }
                });

                for (const comboStr of uniqueUniCombos) {
                    const { university_id, topic_id, subtopic_id } = JSON.parse(comboStr);
                    const topic = await Topic.findOne({ id: topic_id });
                    if (topic) {
                        uniMappingsToCreate.push({ university_id, subject_id: topic.subject_id, topic_id, subtopic_id, is_active: true });
                    }
                }
                for (const comboStr of uniqueTsCombos) {
                    const { test_section_id, topic_id, subtopic_id } = JSON.parse(comboStr);
                    const topic = await Topic.findOne({ id: topic_id });
                    if (topic) {
                        tsMappingsToCreate.push({ test_section_id, subject_id: topic.subject_id, topic_id, subtopic_id, is_active: true });
                    }
                }
            }
        }

        // Apply University Mappings
        if (uniMappingsToCreate.length > 0) {
            const uniqueTopicIds = [...new Set(uniMappingsToCreate.map(m => m.topic_id))];
            const existingMappings = await UniversityContentAccess.find({ topic_id: { $in: uniqueTopicIds } }).lean();
            const existingSet = new Set(existingMappings.map(m => `${m.university_id}-${m.topic_id}-${m.subtopic_id || 'null'}`));
            const toCreate = uniMappingsToCreate.filter(m => !existingSet.has(`${m.university_id}-${m.topic_id}-${m.subtopic_id || 'null'}`));

            if (toCreate.length > 0) {
                const lastMapping = await UniversityContentAccess.findOne({}, { id: 1 }).sort({ id: -1 });
                let currentMappingId = (lastMapping?.id || 0) + 1;
                const mappingsWithIds = toCreate.map(m => ({ ...m, id: currentMappingId++ }));
                await UniversityContentAccess.insertMany(mappingsWithIds, { ordered: false }).catch(err => console.warn('[BulkUpload] Uni mapping error:', err.message));
            }
        }

        // Apply Test Section Mappings
        if (tsMappingsToCreate.length > 0) {
            const uniqueTopicIds = [...new Set(tsMappingsToCreate.map(m => m.topic_id))];
            const existingMappings = await TestSectionContentAccess.find({ topic_id: { $in: uniqueTopicIds } }).lean();
            const existingSet = new Set(existingMappings.map(m => `${m.test_section_id}-${m.topic_id}-${m.subtopic_id || 'null'}`));
            const toCreate = tsMappingsToCreate.filter(m => !existingSet.has(`${m.test_section_id}-${m.topic_id}-${m.subtopic_id || 'null'}`));

            if (toCreate.length > 0) {
                const lastMapping = await TestSectionContentAccess.findOne({}, { id: 1 }).sort({ id: -1 });
                let currentMappingId = (lastMapping?.id || 0) + 1;
                const mappingsWithIds = toCreate.map(m => ({ ...m, id: currentMappingId++ }));
                await TestSectionContentAccess.insertMany(mappingsWithIds, { ordered: false }).catch(err => console.warn('[BulkUpload] TS mapping error:', err.message));
            }
        }

        return NextResponse.json({
            success: true,
            totalRows: mcqs.length,
            inserted: insertedCount,
            skipped_in_file: skippedInFile,
            skipped_exact: skippedExact,
            uploadId
        });

    } catch (error: any) {
        console.error('MCQ Bulk Upload CRITICAL Error:', error);
        return NextResponse.json({ error: error.message || 'System error during ingestion' }, { status: 500 });
    }
}
