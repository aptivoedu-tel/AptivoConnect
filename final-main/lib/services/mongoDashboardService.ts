import { StudentStats, PerformanceData, ProgressData, ContinueLearningItem } from './dashboardService';

export class MongoDashboardService {
    /**
     * Get student's main statistics from MongoDB analytics API
     */
    static async getStudentStats(studentId: string): Promise<{ stats: StudentStats; error?: string }> {
        try {
            const response = await fetch(`/api/mongo/analytics?student_id=${studentId}`);
            if (!response.ok) throw new Error('Failed to fetch stats');

            const data = await response.json();
            const a = data.analytics;

            return {
                stats: {
                    totalXP: a.total_xp || a.league_xp || 0,
                    questionsSolved: a.questionsSolved || a.total_attempts || 0,
                    currentStreak: a.current_streak || 0,
                    overallAccuracy: a.overall_accuracy || a.avg_score || 0,
                    totalStudyTime: a.totalStudyTime || (a.total_study_minutes || 0) * 60
                }
            };
        } catch (error: any) {
            return {
                stats: {
                    totalXP: 0,
                    questionsSolved: 0,
                    currentStreak: 0,
                    overallAccuracy: 0,
                    totalStudyTime: 0
                },
                error: error.message
            };
        }
    }

    /**
     * Get performance data by subject from MongoDB analytics API
     */
    static async getPerformanceBySubject(studentId: string): Promise<{ data: PerformanceData[]; error?: string }> {
        try {
            const response = await fetch(`/api/mongo/analytics?student_id=${studentId}&type=subject_performance`);
            const data = await response.json();
            return { data: data.performance || [] };
        } catch (e: any) {
            return { data: [], error: e.message };
        }
    }

    /**
     * Get progress by subtopic from MongoDB analytics API
     */
    static async getProgressBySubtopic(studentId: string, limit: number = 5): Promise<{ data: ProgressData[]; error?: string }> {
        try {
            const response = await fetch(`/api/mongo/practice?student_id=${studentId}&limit=${limit}`);
            const data = await response.json();

            const progress = (data.sessions || []).map((s: any) => ({
                name: s.subtopic_name || s.topic_name || 'Practice Session',
                score: s.score_percentage || 0,
                subtopicId: s.subtopic_id || 0
            }));

            return { data: progress };
        } catch (e: any) {
            return { data: [], error: e.message };
        }
    }

    /**
     * Get continue learning items from MongoDB
     */
    static async getContinueLearningItems(studentId: string, limit: number = 3): Promise<{ data: ContinueLearningItem[]; error?: string }> {
        try {
            const response = await fetch(`/api/mongo/practice?student_id=${studentId}&limit=${limit}`);
            const data = await response.json();

            const colors = ['text-teal-600', 'text-orange-600', 'text-teal-600', 'text-purple-600'];
            const items = (data.sessions || []).map((s: any, i: number) => ({
                title: s.subtopic_name || s.topic_name || 'Continue Session',
                progress: s.score_percentage || 0,
                subtopicId: s.subtopic_id || 0,
                topicId: s.topic_id || 0,
                color: colors[i % colors.length]
            }));

            return { data: items };
        } catch (e: any) {
            return { data: [], error: e.message };
        }
    }

    /**
     * Get study activity data from MongoDB
     */
    static async getStudyActivity(studentId: string, timeframe: 'week' | 'month' | 'overall'): Promise<{ data: any[]; error?: string }> {
        try {
            const days = timeframe === 'week' ? 7 : timeframe === 'month' ? 30 : 90;
            const response = await fetch(`/api/mongo/analytics?student_id=${studentId}&type=study_activity&days=${days}`);
            const data = await response.json();
            return { data: data.activity || [] };
        } catch (e: any) {
            return { data: [], error: e.message };
        }
    }

    /**
     * Get real-time rank for the student from global analytics
     */
    static async getStudentRank(studentId: string) {
        try {
            const response = await fetch(`/api/mongo/analytics?student_id=${studentId}&type=rank`);
            if (!response.ok) throw new Error('Rank fetch failed');
            const data = await response.json();
            return {
                rank: data.rank || '--',
                change: data.change || 'Global Rank'
            };
        } catch (error) {
            console.error('Error fetching rank:', error);
            return {
                rank: '--',
                change: 'Rank Unavailable'
            };
        }
    }

    /**
     * Get consolidated dashboard summary from single API call
     */
    static async getDashboardSummary(studentId: string): Promise<any> {
        try {
            const response = await fetch(`/api/mongo/dashboard/summary?student_id=${studentId}`);
            if (!response.ok) throw new Error('Summary fetch failed');
            return await response.json();
        } catch (error: any) {
            console.error('Error fetching dashboard summary:', error);
            return {
                stats: {
                    totalXP: 0,
                    questionsSolved: 0,
                    currentStreak: 0,
                    overallAccuracy: 0,
                    totalStudyTime: 0
                },
                performance: [],
                continueLearning: [],
                rankData: { rank: '--', total: 0 },
                recommended: null,
                error: error.message
            };
        }
    }

    /**
     * Get milestones based on performance
     */
    static async getRecentMilestones(studentId: string) {
        const { stats } = await this.getStudentStats(studentId);
        const milestones = [];

        // Milestone 1: Always show Starter if they have at least one session
        if (stats.totalXP > 0) {
            milestones.push({
                id: 'starter',
                title: 'Academic Starter',
                desc: 'Started your first practice session!',
                iconType: 'Award',
                color: 'text-teal-600',
                bg: 'bg-teal-50'
            });
        }

        // Milestone 2: Accuracy
        if (stats.overallAccuracy >= 70) {
            milestones.push({
                id: 'sharp_mind',
                title: 'Sharp Mind',
                desc: 'Maintained an accuracy of 70% or more!',
                iconType: 'Zap',
                color: 'text-teal-600',
                bg: 'bg-teal-50'
            });
        }

        // Milestone 3: Streak
        if (stats.currentStreak >= 3) {
            milestones.push({
                id: 'unstoppable',
                title: 'Unstoppable',
                desc: 'Kept a learning streak for 3 days!',
                iconType: 'TrendingUp',
                color: 'text-orange-600',
                bg: 'bg-orange-50'
            });
        }

        if (milestones.length === 0) {
            milestones.push({
                id: 'newbie',
                title: 'Early Bird',
                desc: 'Your learning journey starts today!',
                iconType: 'Target',
                color: 'text-slate-400',
                bg: 'bg-slate-50'
            });
        }

        return milestones;
    }
}
