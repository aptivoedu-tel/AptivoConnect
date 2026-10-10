// MongoDB API - Content (Subjects, Topics, Subtopics)

import { NextRequest, NextResponse } from 'next/server';
import { getPortalSession } from '@/lib/portalSession';
import { authOptions } from '@/lib/authOptions';
import connectToDatabase from '@/lib/mongodb/connection';
import { Subject, Topic, Subtopic, Passage } from '@/lib/mongodb/models';

export async function GET(req: NextRequest) {
    try {
        await connectToDatabase();
        const { searchParams } = new URL(req.url);
        const type = searchParams.get('type'); // 'subjects', 'topics', 'subtopics', 'passages'
        const subjectId = searchParams.get('subject_id');
        const topicId = searchParams.get('topic_id');
        const q = searchParams.get('q');
        const id = searchParams.get('id');
        const name = searchParams.get('name');
        const ids = searchParams.get('ids');
        const limit = parseInt(searchParams.get('limit') || '100');
        const universityFilter = searchParams.get('university_search');
        const testSectionId = searchParams.get('test_section_id');

        if (universityFilter || (type === 'universities' && q)) {
            const University = (await import('@/lib/mongodb/models/University')).default;
            const filter: any = { is_active: true };
            if (q) filter.name = { $regex: q, $options: 'i' };
            const universities = await University.find(filter).limit(10);
            return NextResponse.json({ universities });
        }

        if (type === 'subjects') {
            const filter: any = { is_active: true };
            if (id) filter.id = parseInt(id);
            if (name) filter.name = { $regex: name, $options: 'i' };
            if (q) filter.name = { $regex: q, $options: 'i' };
            
            // Handle test section filtering for siloed hierarchies
            if (testSectionId === 'all') {
                // Fetch all subjects regardless of test_section_id
            } else if (testSectionId) {
                filter.test_section_id = parseInt(testSectionId);
            } else {
                // If no test_section_id provided, show global subjects (id 0 or null)
                filter.$or = [{ test_section_id: 0 }, { test_section_id: null }, { test_section_id: { $exists: false } }];
            }

            const subjects = await Subject.find(filter).sort({ display_order: 1 });
            return NextResponse.json({ subjects });
        }

        if (type === 'topics') {
            const filter: any = { is_active: true };
            if (id) filter.id = parseInt(id);
            if (subjectId) filter.subject_id = parseInt(subjectId);
            if (name) filter.name = { $regex: name, $options: 'i' };
            if (q) filter.name = { $regex: q, $options: 'i' };
            
            if (testSectionId && testSectionId !== 'all') {
                const subjects = await Subject.find({ test_section_id: parseInt(testSectionId), is_active: true }).select('id').lean();
                filter.subject_id = { $in: subjects.map(s => s.id) };
            }

            const topics = await Topic.find(filter).sort({ sequence_order: 1 });
            return NextResponse.json({ topics });
        }

        if (type === 'subtopics') {
            const filter: any = { is_active: true };
            if (id) filter.id = parseInt(id);
            if (topicId) filter.topic_id = parseInt(topicId);
            if (name) filter.name = { $regex: name, $options: 'i' };
            if (q) {
                filter.$or = [
                    { name: { $regex: q, $options: 'i' } },
                    { content_markdown: { $regex: q, $options: 'i' } }
                ];
            }

            if (testSectionId && testSectionId !== 'all') {
                const subjects = await Subject.find({ test_section_id: parseInt(testSectionId), is_active: true }).select('id').lean();
                const topics = await Topic.find({ subject_id: { $in: subjects.map(s => s.id) }, is_active: true }).select('id').lean();
                filter.topic_id = { $in: topics.map(t => t.id) };
            }

            const subtopics = await Subtopic.find(filter).sort({ sequence_order: 1 });
            return NextResponse.json({ subtopics });
        }

        if (type === 'passages') {
            const filter: any = {};
            if (id) filter.id = parseInt(id);
            if (ids) {
                const idArray = ids.split(',').map(i => parseInt(i)).filter(i => !isNaN(i));
                filter.id = { $in: idArray };
            }
            if (q) filter.content = { $regex: q, $options: 'i' };
            const passages = await Passage.find(filter);
            return NextResponse.json({ passages });
        }

        if (type === 'all' || !type) {
            // If query is provided, search everything
            if (q) {
                const University = (await import('@/lib/mongodb/models/University')).default;
                const [universities, subjects, topics, subtopics] = await Promise.all([
                    University.find({ name: { $regex: q, $options: 'i' }, is_active: true }).limit(10),
                    Subject.find({ name: { $regex: q, $options: 'i' }, is_active: true }).limit(10),
                    Topic.find({ name: { $regex: q, $options: 'i' }, is_active: true }).limit(10),
                    Subtopic.find({
                        $or: [
                            { name: { $regex: q, $options: 'i' } },
                            { content_markdown: { $regex: q, $options: 'i' } }
                        ],
                        is_active: true
                    }).limit(10)
                ]);
                return NextResponse.json({ universities, subjects, topics, subtopics });
            }

            // Return everything (standard)
            const [subjects, topics, subtopics, passages] = await Promise.all([
                Subject.find({ is_active: true }).sort({ display_order: 1 }),
                Topic.find({ is_active: true }).sort({ sequence_order: 1 }),
                Subtopic.find({ is_active: true }).sort({ sequence_order: 1 }),
                Passage.find()
            ]);
            return NextResponse.json({ subjects, topics, subtopics, passages });
        }
    } catch (error: any) {
        console.error('Content Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const session = await getPortalSession(authOptions);
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        if (!['super_admin', 'institution_admin'].includes(session.user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

        await connectToDatabase();
        const body = await req.json();
        const { type, name, subject_id, topic_id, test_section_id } = body;

        if (!type || !name) {
            return NextResponse.json({ error: 'type and name are required' }, { status: 400 });
        }

        let model: any;
        if (type === 'subject') model = Subject;
        else if (type === 'topic') model = Topic;
        else if (type === 'subtopic') model = Subtopic;
        else return NextResponse.json({ error: 'Invalid type' }, { status: 400 });

        // Get next ID
        const lastItem = await model.findOne().sort({ id: -1 });
        const nextId = (lastItem?.id || 0) + 1;

        const payload: any = { id: nextId, name, is_active: true };
        if (type === 'subject' && test_section_id) payload.test_section_id = test_section_id;
        if (type === 'topic') payload.subject_id = subject_id;
        if (type === 'subtopic') payload.topic_id = topic_id;

        const newItem = await model.create(payload);
        return NextResponse.json({ item: newItem });
    } catch (error: any) {
        console.error('Content POST error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PATCH(req: NextRequest) {
    try {
        const session = await getPortalSession(authOptions);
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        if (!['super_admin', 'institution_admin'].includes(session.user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

        await connectToDatabase();
        const body = await req.json();
        const { id, type, ...updates } = body;

        if (!id || !type) {
            return NextResponse.json({ error: 'id and type are required' }, { status: 400 });
        }

        let model: any;
        if (type === 'subject') model = Subject;
        else if (type === 'topic') model = Topic;
        else if (type === 'subtopic') model = Subtopic;
        else return NextResponse.json({ error: 'Invalid type' }, { status: 400 });

        const updated = await model.findOneAndUpdate(
            { id: parseInt(id) },
            { $set: updates },
            { returnDocument: 'after' }
        );

        return NextResponse.json({ item: updated });
    } catch (error: any) {
        console.error('Content PATCH error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    try {
        const session = await getPortalSession(authOptions);
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        if (!['super_admin', 'institution_admin'].includes(session.user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

        await connectToDatabase();
        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');
        const type = searchParams.get('type');

        if (!id || !type) {
            return NextResponse.json({ error: 'id and type are required' }, { status: 400 });
        }

        let model: any;
        if (type === 'subject') model = Subject;
        else if (type === 'topic') model = Topic;
        else if (type === 'subtopic') model = Subtopic;
        else return NextResponse.json({ error: 'Invalid type' }, { status: 400 });

        await model.findOneAndDelete({ id: parseInt(id) });

        // If subject, also delete topics? No, usually handled by business logic or UI warning
        // For simplicity, we just delete the item.

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Content DELETE error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

