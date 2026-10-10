import { NextResponse } from 'next/server';
import { getPortalSession as getServerSession } from '@/lib/portalSession';
import { authOptions } from '@/lib/authOptions';
import connectToDatabase from '@/lib/mongodb/connection';
import { User } from '@/lib/mongodb/models';
import { AnalyticsTrackingService } from '@/lib/services/analyticsTrackingService';

export async function GET(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await connectToDatabase();
        const user = await User.findOne({ email: session.user.email }).select('id').lean() as any;
        if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

        const { searchParams } = new URL(request.url);
        const universityId = searchParams.get('university_id') || undefined;

        const [weakTopics, performanceTrend, behaviorSummary] = await Promise.all([
            AnalyticsTrackingService.getWeakTopics(null, user.id, universityId),
            AnalyticsTrackingService.getPerformanceTrend(null, user.id, universityId),
            AnalyticsTrackingService.getBehaviorSummary(null, user.id, universityId)
        ]);

        const firstError = weakTopics.error || performanceTrend.error || behaviorSummary.error;
        if (firstError) return NextResponse.json({ error: firstError }, { status: 500 });

        return NextResponse.json({
            weakTopics: weakTopics.data,
            performanceTrend: performanceTrend.data,
            behaviorSummary: behaviorSummary.data
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
