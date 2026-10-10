// MongoDB-only implementation of AnalyticsService
// Removes all Supabase dependencies. All logic routed via MongoDB API endpoints.

export interface TotalStats {
    totalUsers: number;
    totalStudents: number;
    totalAdmins: number;
    totalSubjects: number;
    totalTopics: number;
    totalSubtopics: number;
    totalMCQs: number;
    totalPracticeSessions: number;
}

export interface GrowthData {
    date: string;
    count: number;
    total_time?: number; // total time in minutes
}

export interface SubjectDistribution {
    name: string;
    value: number;
    color: string;
}

export interface TopPerformer {
    id: string;
    name: string;
    email: string;
    averageScore: number;
    totalSessions: number;
}

export interface WeakTopic {
    topicName: string;
    averageScore: number;
    attemptCount: number;
}

export class AnalyticsService {
    /**
     * Get detailed institutional analytics including university and student breakdowns
     */
    static async getInstitutionDetailedAnalytics(institutionId: number, startDate?: Date, universityId?: string) {
        try {
            const dateStr = startDate ? `&start_date=${startDate.toISOString()}` : '';
            const uniStr = universityId ? `&university_id=${universityId}` : '';
            const res = await fetch(`/api/mongo/admin/analytics/institution?institution_id=${institutionId}${dateStr}${uniStr}`, { cache: 'no-store' });
            if (!res.ok) {
                const errorBody = await res.json().catch(() => ({ error: 'Unknown error' }));
                console.error(`[Analytics API] ${res.status}:`, errorBody);
                throw new Error(errorBody.error || `API error ${res.status}`);
            }
            return res.json();
        } catch (error) {
            console.error('getInstitutionDetailedAnalytics error:', error);
            throw error;
        }
    }

    /**
     * Get granular analytics for a specific student (topic/subject breakdown)
     */
    static async getStudentDrilldownAnalytics(studentId: string, startDate?: Date) {
        try {
            const dateStr = startDate ? `&start_date=${startDate.toISOString()}` : '';
            const res = await fetch(`/api/mongo/admin/analytics/student-drilldown?student_id=${studentId}${dateStr}`, { cache: 'no-store' });
            if (!res.ok) throw new Error('Failed to fetch student drilldown');
            return res.json();
        } catch (error) {
            console.error('getStudentDrilldownAnalytics error:', error);
            throw error;
        }
    }

    /**
     * Get student's performance analytics
     */
    static async getStudentAnalytics(studentId: string) {
        try {
            const response = await fetch(`/api/mongo/analytics?student_id=${studentId}`);
            if (!response.ok) throw new Error('Analytics failed');
            const data = await response.json();
            return data.analytics;
        } catch (error) {
            console.error('getStudentAnalytics error:', error);
            return null;
        }
    }

    /**
     * Get total statistics (Admin)
     */
    static async getTotalStats(): Promise<{ stats: TotalStats; error?: string }> {
        try {
            const res = await fetch('/api/mongo/admin/analytics/total-stats');
            if (!res.ok) throw new Error('Failed to fetch total stats');
            const data = await res.json();
            return { stats: data.stats };
        } catch (error: any) {
            console.error('Error fetching total stats:', error);
            return {
                stats: {
                    totalUsers: 0,
                    totalStudents: 0,
                    totalAdmins: 0,
                    totalSubjects: 0,
                    totalTopics: 0,
                    totalSubtopics: 0,
                    totalMCQs: 0,
                    totalPracticeSessions: 0
                },
                error: error.message
            };
        }
    }

    /**
     * Get student growth data over time
     */
    static async getStudentGrowth(
        period: number | 'week' | 'month' | 'year' | 'all' | 'custom' = 30, 
        customRange?: { start: string; end: string }
    ): Promise<{ data: GrowthData[]; error?: string }> {
        try {
            let query = '';
            if (period === 'custom' && customRange) {
                query = `start_date=${customRange.start}&end_date=${customRange.end}`;
            } else {
                let days: string | number = 30;
                if (period === 'week') days = 7;
                else if (period === 'month') days = 30;
                else if (period === 'year') days = 365;
                else if (period === 'all') days = 'all';
                else if (typeof period === 'number') days = period;
                query = `days=${days}`;
            }

            const res = await fetch(`/api/mongo/admin/analytics/growth?${query}`);
            if (!res.ok) throw new Error('Failed to fetch growth data');
            const data = await res.json();
            return { data: data.growth || [] };
        } catch (error: any) {
            return { data: [], error: error.message };
        }
    }

    /**
     * Get distribution of MCQs by subject
     */
    static async getSubjectDistribution(): Promise<{ data: SubjectDistribution[]; error?: string }> {
        try {
            const res = await fetch('/api/mongo/admin/analytics/subject-distribution');
            if (!res.ok) throw new Error('Failed to fetch subject distribution');
            const data = await res.json();
            return { data: data.distribution || [] };
        } catch (error: any) {
            return { data: [], error: error.message };
        }
    }

    /**
     * Get top performing students
     */
    static async getTopPerformers(limit: number = 5): Promise<{ data: TopPerformer[]; error?: string }> {
        try {
            const res = await fetch(`/api/mongo/admin/analytics/top-performers?limit=${limit}`);
            if (!res.ok) throw new Error('Failed to fetch top performers');
            const data = await res.json();
            return { data: data.performers || [] };
        } catch (error: any) {
            return { data: [], error: error.message };
        }
    }

    /**
     * Get topics with lowest performance
     */
    static async getWeakTopics(limit: number = 5): Promise<{ topics: WeakTopic[]; error?: string }> {
        try {
            const res = await fetch(`/api/mongo/admin/analytics/weak-topics?limit=${limit}`);
            if (!res.ok) throw new Error('Failed to fetch weak topics');
            const data = await res.json();
            return { topics: data.topics || [] };
        } catch (error: any) {
            return { topics: [], error: error.message };
        }
    }

    /**
     * Alias for getWeakTopics (backward compatibility)
     */
    static async getWeakestTopics(limit: number = 5) {
        return this.getWeakTopics(limit);
    }

    /**
     * Get institution-specific statistics
     */
    static async getInstitutionStats(institutionId: number): Promise<{ stats: any; error?: string }> {
        try {
            const res = await fetch(`/api/mongo/admin/stats?institution_id=${institutionId}`);
            if (!res.ok) throw new Error('Failed to fetch institution stats');
            const data = await res.json();
            return { stats: data.stats };
        } catch (error: any) {
            return { stats: null, error: error.message };
        }
    }

    /**
     * Get inventory analytics for MCQs (Universal vs University-specific vs Global Exam)
     */
    static async getInventoryAnalytics(): Promise<{ stats: any; breakdown: any[]; globalBreakdown: any[]; error?: string }> {
        try {
            const res = await fetch('/api/mongo/admin/analytics/inventory');
            if (!res.ok) throw new Error('Failed to fetch inventory analytics');
            const data = await res.json();
            return { stats: data.stats, breakdown: data.breakdown || [], globalBreakdown: data.globalBreakdown || [] };
        } catch (error: any) {
            return { stats: null, breakdown: [], globalBreakdown: [], error: error.message };
        }
    }

    /**
     * Get difficulty distribution of questions
     */
    static async getDifficultyDistribution(): Promise<{ distribution: any[]; error?: string }> {
        try {
            const res = await fetch('/api/mongo/admin/analytics/difficulty-distribution');
            if (!res.ok) throw new Error('Failed to fetch difficulty distribution');
            const data = await res.json();
            return { distribution: data.distribution || [] };
        } catch (error: any) {
            return { distribution: [], error: error.message };
        }
    }

    /**
     * Get student engagement (practice sessions over time)
     */
    static async getStudentEngagement(
        period: number | 'week' | 'month' | 'year' | 'all' | 'custom' = 30, 
        customRange?: { start: string; end: string }
    ): Promise<{ engagement: GrowthData[]; error?: string }> {
        try {
            let query = '';
            if (period === 'custom' && customRange) {
                query = `start_date=${customRange.start}&end_date=${customRange.end}`;
            } else {
                let days: string | number = 30;
                if (period === 'week') days = 7;
                else if (period === 'month') days = 30;
                else if (period === 'year') days = 365;
                else if (period === 'all') days = 'all';
                else if (typeof period === 'number') days = period;
                query = `days=${days}`;
            }

            const res = await fetch(`/api/mongo/admin/analytics/engagement?${query}`);
            if (!res.ok) throw new Error('Failed to fetch engagement data');
            const data = await res.json();
            return { engagement: data.engagement || [] };
        } catch (error: any) {
            return { engagement: [], error: error.message };
        }
    }

    /**
     * Get student performance leaderboard
     */
    static async getStudentLeaderboard(days: string | number = 30, userId?: string): Promise<{ leaderboard: any[]; userRank: any; error?: string }> {
        try {
            let url = `/api/mongo/analytics/student-leaderboard?days=${days}`;
            if (userId) url += `&userId=${userId}`;
            const res = await fetch(url);
            if (!res.ok) throw new Error('Failed to fetch student leaderboard data');
            const data = await res.json();
            return { leaderboard: data.leaderboard || [], userRank: data.userRank || null };
        } catch (error: any) {
            return { leaderboard: [], userRank: null, error: error.message };
        }
    }

    /**
     * Get university performance leaderboard
     */
    static async getUniversityLeaderboard(days: string | number = 30): Promise<{ leaderboard: any[]; error?: string }> {
        try {
            const res = await fetch(`/api/mongo/admin/analytics/leaderboard?days=${days}`);
            if (!res.ok) throw new Error('Failed to fetch leaderboard data');
            const data = await res.json();
            return { leaderboard: data.leaderboard || [] };
        } catch (error: any) {
            return { leaderboard: [], error: error.message };
        }
    }

    /**
     * Get advanced charting data for University Analytics
     */
    static async getUniversityCharts(days: string | number = 30): Promise<any> {
        try {
            const res = await fetch(`/api/mongo/admin/analytics/university-charts?days=${days}`);
            if (!res.ok) throw new Error('Failed to fetch university charts');
            return await res.json();
        } catch (error: any) {
            return { error: error.message };
        }
    }

    /**
     * Get global exam leaderboard data
     */
    static async getGlobalExamLeaderboard(days: string | number = 30): Promise<{ leaderboard: any[]; error?: string }> {
        try {
            const res = await fetch(`/api/mongo/admin/analytics/global-exam-leaderboard?days=${days}`);
            if (!res.ok) throw new Error('Failed to fetch global exam leaderboard');
            const data = await res.json();
            return { leaderboard: data.leaderboard || [] };
        } catch (error: any) {
            return { leaderboard: [], error: error.message };
        }
    }

    /**
     * Get advanced charting data for Global Exam Analytics
     */
    static async getGlobalExamCharts(days: string | number = 30): Promise<any> {
        try {
            const res = await fetch(`/api/mongo/admin/analytics/global-exam-charts?days=${days}`);
            if (!res.ok) throw new Error('Failed to fetch global exam charts');
            return await res.json();
        } catch (error: any) {
            return { error: error.message };
        }
    }

    /**
     * Get 24-Hour Pulse (aggregates sessions by hour)
     */
    static async getPulseData(
        period: number | 'week' | 'month' | 'year' | 'all' | 'custom' = 30, 
        customRange?: { start: string; end: string }
    ): Promise<{ pulse: any[]; error?: string }> {
        try {
            let query = '';
            if (period === 'custom' && customRange) {
                query = `start_date=${customRange.start}&end_date=${customRange.end}`;
            } else {
                let days: string | number = 30;
                if (period === 'week') days = 7;
                else if (period === 'month') days = 30;
                else if (period === 'year') days = 365;
                else if (period === 'all') days = 'all';
                else if (typeof period === 'number') days = period;
                query = `days=${days}`;
            }

            const res = await fetch(`/api/mongo/admin/analytics/pulse?${query}`);
            if (!res.ok) throw new Error('Failed to fetch 24-hour pulse data');
            const data = await res.json();
            return { pulse: data.pulse || [] };
        } catch (error: any) {
            return { pulse: [], error: error.message };
        }
    }

    /**
     * Get leaderboard with rank-based tiers (Top 3 = Gold, 4–8 = Silver, Rest = Bronze).
     */
    static async getLeagueStatus(league: string | null = null): Promise<any> {
        try {
            let url = '/api/mongo/leagues/status';
            if (league) url += `?league=${league}`;
            const res = await fetch(url);
            if (!res.ok) throw new Error('Failed to fetch league status');
            return await res.json();
        } catch (error: any) {
            console.error('getLeagueStatus error:', error);
            throw error;
        }
    }
}


