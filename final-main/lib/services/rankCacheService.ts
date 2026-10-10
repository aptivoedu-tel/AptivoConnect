import User from '@/lib/mongodb/models/User';

type RankCache = {
    expiresAt: number;
    xps: Map<string, number>;
    totalStudents: number;
};

const RANK_CACHE_TTL_MS = 5 * 60 * 1000;
let rankCache: RankCache | null = null;
let rankCachePromise: Promise<RankCache> | null = null;

async function buildRankCache(): Promise<RankCache> {
    // Get all students and their league XP
    const students = await User.find({ role: 'student' }).select('id league_xp').lean();
    
    const xps = new Map<string, number>(
        students.map((s: any) => [String(s.id), s.league_xp || 0])
    );

    return {
        expiresAt: Date.now() + RANK_CACHE_TTL_MS,
        xps,
        totalStudents: students.length
    };
}

async function getRankCache(): Promise<RankCache> {
    if (rankCache && rankCache.expiresAt > Date.now()) return rankCache;
    if (!rankCachePromise) {
        rankCachePromise = buildRankCache().finally(() => {
            rankCachePromise = null;
        });
    }

    rankCache = await rankCachePromise;
    return rankCache;
}

export async function getCachedStudentRank(studentId: string, currentXpOverride?: number) {
    const cache = await getRankCache();
    const studentXp = currentXpOverride ?? cache.xps.get(String(studentId)) ?? 0;

    // Count students with MORE XP
    let higherCount = 0;
    cache.xps.forEach((xp, id) => {
        if (id !== String(studentId) && xp > studentXp) {
            higherCount++;
        }
    });

    return {
        rank: higherCount + 1,
        totalStudents: cache.totalStudents,
        xp: studentXp
    };
}

export function clearRankCache() {
    rankCache = null;
}
