import mongoose, { Schema, Document } from 'mongoose';

export interface IExamAttempt extends Document {
    id: string;
    exam_id: number;
    student_id: string;
    status: 'in_progress' | 'completed' | 'submitted';
    score: number;
    total_marks: number;
    start_time: Date;
    end_time?: Date;
    time_spent_seconds?: number;
    time_remaining?: number;
    section_scores?: Record<string, { correct: number; total: number; score: number; wrong: number; skipped: number }>;
    university_id?: number;
    created_at: Date;
    xp_earned?: number; // (correct×10) − (wrong×5) + streak_bonus
}

const ExamAttemptSchema: Schema = new Schema({
    id: { type: String, required: true, unique: true },
    exam_id: { type: Number, required: true },
    student_id: { type: String, required: true },
    university_id: { type: Number },
    status: { type: String, enum: ['in_progress', 'completed', 'submitted'], default: 'in_progress' },
    score: { type: Number, default: 0 },
    total_marks: { type: Number, default: 0 },
    start_time: { type: Date, default: Date.now },
    end_time: { type: Date },
    time_spent_seconds: { type: Number, default: 0 },
    time_remaining: { type: Number },
    section_scores: { type: Schema.Types.Mixed },
    xp_earned: { type: Number },
    created_at: { type: Date, default: Date.now },
});

export default mongoose.models.ExamAttempt || mongoose.model<IExamAttempt>('ExamAttempt', ExamAttemptSchema);
