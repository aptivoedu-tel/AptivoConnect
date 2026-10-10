import mongoose, { Schema, Document } from 'mongoose';

export interface IQuestionReport extends Document {
    mcq_id: number;
    student_id: string;
    reason?: string;
    status: 'pending' | 'resolved';
    created_at: Date;
}

const QuestionReportSchema: Schema = new Schema({
    mcq_id: { type: Number, required: true },
    student_id: { type: String, required: true },
    reason: { type: String },
    status: { type: String, enum: ['pending', 'resolved'], default: 'pending' },
    created_at: { type: Date, default: Date.now },
});

export default mongoose.models.QuestionReport || mongoose.model<IQuestionReport>('QuestionReport', QuestionReportSchema);
