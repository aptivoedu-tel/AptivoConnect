import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb/connection';
import { Subject, Topic, Subtopic, TestSectionContentAccess, TestSection } from '@/lib/mongodb/models';

export async function GET(req: NextRequest) {
    try {
        await connectToDatabase();
        const { searchParams } = new URL(req.url);
        const testSectionId = searchParams.get('test_section_id');

        if (!testSectionId) {
            return NextResponse.json({ error: 'test_section_id is required' }, { status: 400 });
        }

        const TestSection = (await import('@/lib/mongodb/models/TestSection')).default;
        const section = await TestSection.findOne({ id: parseInt(testSectionId) }).lean();
        
        let subjectIds: number[] = [];
        let mappings: any[] = [];

        if (section?.is_independent) {
            // For independent sections, we just get all subjects tagged with this section_id
            const subjects = await Subject.find({ test_section_id: parseInt(testSectionId), is_active: true }).lean();
            subjectIds = subjects.map(s => s.id);
            // Simulate mappings where everything in these subjects is accessible
            mappings = subjects.map(s => ({ subject_id: s.id, test_section_id: parseInt(testSectionId) }));
        } else {
            const filter: any = {
                test_section_id: parseInt(testSectionId),
                is_active: true
            };
            mappings = await TestSectionContentAccess.find(filter).lean();
            subjectIds = [...new Set(mappings.map((m: any) => m.subject_id).filter(Boolean))];
        }

        // 2. Fetch all subjects first
        const subjects = await Subject.find({ id: { $in: subjectIds }, is_active: true }).lean();

        // 3. For each mapping, if topic_id/subtopic_id is null, it means ALL for that parent
        const topics = await Topic.find({ subject_id: { $in: subjectIds }, is_active: true }).lean();
        const topicIds = topics.map(t => t.id);
        const subtopics = await Subtopic.find({ topic_id: { $in: topicIds }, is_active: true }).lean();

        const accessibleTopics = topics.filter(t => {
            const hasSubjectAccess = mappings.some(m => m.subject_id === t.subject_id && !m.topic_id);
            const hasTopicAccess = mappings.some(m => m.topic_id === t.id);
            return hasSubjectAccess || hasTopicAccess;
        });

        const accessibleSubtopics = subtopics.filter(st => {
            const topic = topics.find(t => t.id === st.topic_id);
            if (!topic) return false;
            // Access if the whole topic is granted, or if this specific subtopic is granted
            const hasTopicAccess = accessibleTopics.some(t => t.id === st.topic_id && !mappings.some(m => m.topic_id === t.id && m.subtopic_id));
            const hasSubtopicAccess = mappings.some(m => m.subtopic_id === st.id);
            return hasTopicAccess || hasSubtopicAccess;
        });

        // Format for frontend: Each mapping row now becomes an exploded hierarchy 
        const result: any[] = [];
        subjects.forEach(s => {
            const sTopics = accessibleTopics.filter(t => t.subject_id === s.id);
            sTopics.forEach(t => {
                const sSubtopics = accessibleSubtopics.filter(st => st.topic_id === t.id);
                if (sSubtopics.length > 0) {
                    sSubtopics.forEach(st => {
                        result.push({ subject: s, topic: t, subtopic: st });
                    });
                } else {
                    result.push({ subject: s, topic: t, subtopic: null });
                }
            });
            if (sTopics.length === 0) {
                result.push({ subject: s, topic: null, subtopic: null });
            }
        });

        return NextResponse.json({ mappings: result });
    } catch (error: any) {
        console.error('Test Section Content Access Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
