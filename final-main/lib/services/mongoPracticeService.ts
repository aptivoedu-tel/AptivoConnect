import { SystemSettingsService } from './systemSettingsService';

export class MongoPracticeService {
    /**
     * Fetch MCQs from MongoDB via our new proxy API
     */
    static async generatePracticeSession(
        subtopicId: number | null,
        universityId: number | null,
        subjectId: number,
        studentId?: string,
        topicId?: number | null,
        showAll?: boolean,
        customLimit?: number,
        testSectionId?: number | null
    ): Promise<any[]> {
        try {
            // First get rules to find the session limit
            const rules = await this.getPracticeRules(universityId || 0, subjectId);
            const limit = customLimit || rules?.mcq_count_per_session || 20;

            const params = new URLSearchParams();
            if (subtopicId) params.append('subtopic_id', subtopicId.toString());
            if (topicId) {
                params.append('topic_id', topicId.toString());
                params.append('include_children', 'true');
            }
            if (universityId) params.append('university_id', universityId.toString());
            if (testSectionId) params.append('test_section_id', testSectionId.toString());
            if (studentId) params.append('student_id', studentId);
            if (showAll) params.append('show_all', 'true');
            params.append('limit', limit.toString());
            params.append('shuffle', 'true');
            params.append('t', Date.now().toString());

            const response = await fetch(`/api/mongo/mcqs?${params.toString()}`, {
                cache: 'no-store'
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: 'Unknown server error' }));
                throw new Error(errorData.error || `Server responded with ${response.status}`);
            }

            const data = await response.json();
            if ((!data.mcqs || data.mcqs.length === 0) && data.debug) {
                console.warn('[MongoPracticeService] API returned zero questions with debug info:', data.debug);
            }
            return data.mcqs || [];
        } catch (error: any) {
            console.error('Mongo generatePracticeSession error:', error);
            throw error;
        }
    }

    /**
     * Get practice rules for a university and subject
     */
    static async getPracticeRules(universityId: number, subjectId: number): Promise<any> {
        try {
            // Global setting from system settings
            let globalLimit = 20;
            const settingsData = await SystemSettingsService.getSettings({ ttlMs: 60000 });
            globalLimit = settingsData.settings?.practice_mcqs_limit ?? 20;

            return {
                mcq_count_per_session: globalLimit,
                easy_percentage: 40,
                medium_percentage: 40,
                hard_percentage: 20,
                time_limit_minutes: null
            };
        } catch (error) {
            return {
                mcq_count_per_session: 20,
                easy_percentage: 40,
                medium_percentage: 40,
                hard_percentage: 20,
                time_limit_minutes: null
            };
        }
    }

    static async createSession(
        studentId: string,
        subtopicId: number | null,
        universityId: number | null,
        sessionType: string = 'practice',
        topicId: number | null = null,
        mcqIds: number[] = [],
        subjectId: number | null = null,
        testSectionId: number | null = null
    ): Promise<{ session: any | null; error: string | null }> {
        try {
            const response = await fetch('/api/mongo/practice', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    student_id: studentId,
                    subtopic_id: subtopicId,
                    topic_id: topicId,
                    subject_id: subjectId,
                    university_id: universityId,
                    test_section_id: testSectionId,
                    session_type: sessionType,
                    mcq_ids: mcqIds
                }),
            });

            const data = await response.json();
            if (!response.ok) return { session: null, error: data.error };

            return { session: data.session, error: null };
        } catch (error: any) {
            return { session: null, error: error.message };
        }
    }

    /**
     * Get active session (if user left mid-way)
     */
    static async getActiveSession(
        studentId: string,
        context: { topicId?: number | null, subtopicId?: number | null, universityId?: number | null, testSectionId?: number | null }
    ): Promise<{ session: any | null, mcqs: any[], attempts: any[] }> {
        try {
            const params = new URLSearchParams();
            params.append('student_id', studentId);
            if (context.topicId) params.append('topic_id', context.topicId.toString());
            if (context.subtopicId) params.append('subtopic_id', context.subtopicId.toString());
            if (context.universityId) params.append('university_id', context.universityId.toString());
            if (context.testSectionId) params.append('test_section_id', context.testSectionId.toString());

            const response = await fetch(`/api/mongo/practice/active?${params.toString()}`);
            if (!response.ok) return { session: null, mcqs: [], attempts: [] };

            const data = await response.json();
            return { session: data.session, mcqs: data.mcqs || [], attempts: data.attempts || [] };
        } catch (error) {
            return { session: null, mcqs: [], attempts: [] };
        }
    }

    /**
     * Start a session securely by fetching questions WITHOUT answers
     */
    static async startSecureSession(sessionId: number): Promise<{ practice_session_id: number; questions: any[] } | null> {
        try {
            const response = await fetch(`/api/mongo/practice/session/${sessionId}/start`);
            if (!response.ok) return null;
            return await response.json();
        } catch (error) {
            console.error('Mongo startSecureSession error:', error);
            return null;
        }
    }

    /**
     * Prefetch answer and explanation for a specific question
     */
    static async prefetchQuestionData(mcqId: number, sessionId: number): Promise<{ correct_option: string; explanation: string; explanation_url?: string } | null> {
        try {
            const response = await fetch(`/api/mongo/practice/check?mcq_id=${mcqId}&session_id=${sessionId}`);
            if (!response.ok) return null;
            return await response.json();
        } catch (error) {
            console.error('Mongo prefetchQuestionData error:', error);
            return null;
        }
    }

    /**
     * Submit MCQ attempt to MongoDB
     */
    static async submitAttempt(
        sessionId: number,
        mcqId: number,
        studentId: string,
        selectedOption: 'A' | 'B' | 'C' | 'D' | 'SKIPPED',
        timeSpentSeconds: number
    ): Promise<{ isCorrect: boolean; correctOption: string; explanation?: string; explanation_url?: string }> {
        try {
            const response = await fetch('/api/mongo/practice/attempt', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    practice_session_id: sessionId,
                    mcq_id: mcqId,
                    student_id: studentId,
                    selected_option: selectedOption,
                    time_spent_seconds: timeSpentSeconds
                }),
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error);

            return {
                isCorrect: data.isCorrect,
                correctOption: data.correctOption || 'A',
                explanation: data.explanation,
                explanation_url: data.explanation_url
            } as any;
        } catch (error: any) {
            console.error('Mongo submitAttempt error:', error);
            return { isCorrect: false, correctOption: 'A' };
        }
    }

    /**
     * Complete session and save attempts in MongoDB
     */
    static async completeSession(
        sessionId: number,
        studentId: string,
        totalQuestions: number,
        correctAnswers: number,
        wrongAnswers: number,
        skippedQuestions: number,
        totalTimeSeconds: number,
        attempts: any[] = []
    ): Promise<{ success: boolean; error?: string }> {
        try {
            const response = await fetch('/api/mongo/practice', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    session_id: sessionId,
                    attempts,
                    time_spent_seconds: totalTimeSeconds,
                    total_questions: totalQuestions,
                    correct_answers: correctAnswers,
                    wrong_answers: wrongAnswers,
                    skipped_questions: skippedQuestions,
                    is_completed: true
                }),
            });

            if (!response.ok) {
                const data = await response.json();
                return { success: false, error: data.error };
            }

            // Notify UI that progress may have changed
            if (typeof window !== 'undefined') {
                window.dispatchEvent(new Event('progressUpdated'));
            }

            return { success: true };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    }

    /**
     * Get learning streak from MongoDB analytics API
     */
    static async getLearningStreak(studentId: string): Promise<number> {
        try {
            const response = await fetch(`/api/mongo/analytics?student_id=${studentId}`);
            const data = await response.json();
            return data.analytics?.current_streak || 0;
        } catch (e) {
            return 0;
        }
    }

    /**
     * Get student practice history
     */
    static async getStudentPracticeHistory(studentId: string, limit: number = 10): Promise<any[]> {
        try {
            const response = await fetch(`/api/mongo/practice?student_id=${studentId}&limit=${limit}`);
            const data = await response.json();
            return data.sessions || [];
        } catch (e) {
            return [];
        }
    }
    /**
     * Periodically sync session time/progress without completing it
     */
    static async syncSessionProgress(
        sessionId: number,
        timeSpentSeconds: number,
        stats?: { correct: number, wrong: number, skipped: number, total: number }
    ): Promise<void> {
        try {
            await fetch('/api/mongo/practice', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    session_id: sessionId,
                    time_spent_seconds: timeSpentSeconds,
                    is_completed: false, // Explicitly not complete
                    ...(stats ? {
                        correct_answers: stats.correct,
                        wrong_answers: stats.wrong,
                        skipped_questions: stats.skipped,
                        total_questions: stats.total
                    } : {})
                }),
            });
        } catch (e) {
            console.warn('Sync failed:', e);
        }
    }
}
