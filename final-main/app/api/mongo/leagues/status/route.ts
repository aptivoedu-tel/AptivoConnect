/**
 * GET /api/mongo/leagues/status
 *
 * Leaderboard Status API
 * Returns the simplified Lifetime XP leaderboard, grouped by the requested league.
 * Tiers (Gold, Silver, Bronze) are purely rank-based (Top 3, 4-8, 9+).
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPortalSession as getServerSession } from '@/lib/portalSession';
import { authOptions } from '@/lib/authOptions';
import connectToDatabase from '@/lib/mongodb/connection';
import { User } from '@/lib/mongodb/models';

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        await connectToDatabase();
        const { searchParams } = new URL(req.url);
        const userId = (session.user as any).id;
        const leagueFilter = searchParams.get('league') || 'bronze';

        // Fetch all active students
        const users = await User.find(
            { role: 'student', status: { $ne: 'inactive' } },
            'id full_name avatar_url league_xp league league_rank'
        ).lean() as any[];

        // Sort by league_rank ascending. 
        // If league_rank is 0 (cron hasn't run yet), sort by league_xp descending as a fallback.
        const ranked = users
            .map((user) => ({
                student_id: String(user.id),
                student_name: user.full_name || 'Unknown',
                avatar_url: user.avatar_url || null,
                weekly_xp: Number(user.league_xp || 0),
                rank: Number(user.league_rank || 0), // 0 means not processed yet
                league: user.league || 'bronze',
            }))
            .sort((a, b) => {
                if (a.rank > 0 && b.rank > 0) return a.rank - b.rank; // Both processed by cron
                if (a.rank > 0) return -1; // A processed, B not
                if (b.rank > 0) return 1;  // B processed, A not
                return b.weekly_xp - a.weekly_xp; // Neither processed: fallback to XP sorting
            });

        // Now dynamically re-assign rank numbers to the array so the frontend displays 1, 2, 3...
        // and assign temporary league if cron hasn't run
        ranked.forEach((item, index) => {
            if (item.rank === 0) {
                item.rank = index + 1;
                if (item.rank <= 3) item.league = 'gold';
                else if (item.rank <= 8) item.league = 'silver';
                else item.league = 'bronze';
            }
        });

        // Filter for the requested tab (Gold/Silver/Bronze)
        const leagueLeaderboard = ranked.filter((student) => student.league === leagueFilter);

        const myEntry = ranked.find((s) => s.student_id === String(userId));
        const myLeague = myEntry?.league ?? 'bronze';
        const myRank = myEntry?.rank ?? null;
        const myXP = myEntry?.weekly_xp ?? 0;

        const leagueCounts = { bronze: 0, silver: 0, gold: 0 };
        ranked.forEach((s) => { 
            if (s.league in leagueCounts) {
                leagueCounts[s.league as keyof typeof leagueCounts] += 1; 
            }
        });

        return NextResponse.json({
            myLeague,
            myXP,
            myRank,
            leagueLeaderboard, // filtered to the requested tab
            leagueCounts,
        });

    } catch (error: any) {
        console.error('[Leagues Status] Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
