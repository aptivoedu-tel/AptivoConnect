/**
 * POST /api/mongo/leagues/process-reset
 *
 * Leaderboard Refresh API
 * - Called automatically every Wednesday and Saturday (via cron/scheduler).
 * - Sorts all students by Lifetime XP (league_xp) descending.
 * - Updates and saves their rank (`league_rank`) and assigned league (`league`).
 * - Top 3 = Gold, 4-8 = Silver, Everyone else = Bronze.
 */

import { NextResponse } from 'next/server';
import { getPortalSession } from '@/lib/portalSession';
import { authOptions } from '@/lib/authOptions';
import connectToDatabase from '@/lib/mongodb/connection';
import { User } from '@/lib/mongodb/models';

function getLeagueForRank(rank: number): 'gold' | 'silver' | 'bronze' {
    if (rank <= 3) return 'gold';
    if (rank <= 8) return 'silver';
    return 'bronze';
}

export async function POST() {
    try {
        const session = await getPortalSession(authOptions);
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        if (session.user.role !== 'super_admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

        await connectToDatabase();

        // 1. Fetch all active students
        const students = await User.find(
            { role: 'student', status: { $ne: 'inactive' } },
            'id league_xp league league_rank'
        ).lean() as any[];

        // 2. Sort by lifetime XP descending
        students.sort((a, b) => (Number(b.league_xp) || 0) - (Number(a.league_xp) || 0));

        // 3. Prepare bulk update
        const bulkOps = students.map((student, idx) => {
            const rank = idx + 1;
            const newLeague = getLeagueForRank(rank);

            return {
                updateOne: {
                    filter: { _id: student._id },
                    update: { 
                        $set: { 
                            league_rank: rank,
                            league: newLeague
                        }
                    }
                }
            };
        });

        // 4. Execute bulk write if there are students
        let updatedCount = 0;
        if (bulkOps.length > 0) {
            const result = await User.bulkWrite(bulkOps);
            updatedCount = result.modifiedCount || 0;
        }

        return NextResponse.json({
            success: true,
            message: 'Leaderboard successfully refreshed.',
            totalProcessed: bulkOps.length,
            updatesProcessed: updatedCount,
        });

    } catch (error: any) {
        console.error('[Process Reset] Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
