import mongoose, { Schema, Document } from 'mongoose';

export interface ILearningStreak extends Document {
    student_id: string;
    streak_date: string; // ISO date string YYYY-MM-DD
    created_at: Date;
}

const LearningStreakSchema: Schema = new Schema({
    student_id: { type: String, required: true, ref: 'User' },
    streak_date: { type: String, required: true },
    created_at: { type: Date, default: Date.now }
});

// Prevent duplicate streak entries for the same student on the same day
LearningStreakSchema.index({ student_id: 1, streak_date: 1 }, { unique: true });

export default mongoose.models.LearningStreak || mongoose.model<ILearningStreak>('LearningStreak', LearningStreakSchema);
