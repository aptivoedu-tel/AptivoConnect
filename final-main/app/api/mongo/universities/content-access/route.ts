import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb/connection';
import { Subject, Topic, Subtopic } from '@/lib/mongodb/models';
import UniversityContentAccess from '@/lib/mongodb/models/UniversityContentAccess';
import { getPortalSession as getServerSession } from '@/lib/portalSession';
import { authOptions } from '@/lib/authOptions';

export async function GET(req: NextRequest) {
    try {
        await connectToDatabase();
        const { searchParams } = new URL(req.url);
        const universityId = searchParams.get('university_id');
        const institutionId = searchParams.get('institution_id');

        if (!universityId) {
            return NextResponse.json({ error: 'university_id is required' }, { status: 400 });
        }

        // Authenticate session
        const session = await getServerSession(authOptions);
        if (!session || !['super_admin','institution_admin','student'].includes((session.user as any).role)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const userInstitutionId = (session.user as any).institution_id;

        // Base filter for content access
        const filter: any = {
            university_id: parseInt(universityId),
            is_active: true,
        };

        // If institutionId query param provided, ensure it matches user's institution
        if (institutionId && institutionId !== 'null') {
            const parsedInstId = parseInt(institutionId);
            if (userInstitutionId && parsedInstId !== userInstitutionId) {
                return NextResponse.json({ error: 'Forbidden: institution mismatch' }, { status: 403 });
            }
            filter.$or = [
                { institution_id: parsedInstId },
                { institution_id: null }
            ];
        } else {
            // No institution filter supplied – restrict to user’s institution or public only
            if (userInstitutionId) {
                filter.$or = [
                    { institution_id: userInstitutionId },
                    { institution_id: null }
                ];
            } else {
                filter.institution_id = null;
            }
        }
        
        const mappings = await UniversityContentAccess.find(filter).lean();

        // 1. Identify specific subject access
        const subjectIds = [...new Set(mappings.map((m: any) => m.subject_id).filter(Boolean))];

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
        // to stay compatible with the frontend's expected .find() logic but richer.
        // Actually, the frontend expects an array of mappings where each has .subject, .topic, .subtopic
        // To fix correctly without breaking frontend, we return a row for each subtopic
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
        console.error('Content Access Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
