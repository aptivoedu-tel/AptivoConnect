import mongoose, { Schema, Document } from 'mongoose';

export interface IInstitutionTask extends Document {
    institution_id: number;
    university_id: number;
    type: 'topic' | 'subtopic';
    target_id: number;
    assigned_at: Date;
    due_date?: Date;
    status: 'active' | 'archived' | 'scheduled';
    required_mcqs?: number;
    scheduled_at?: Date;
}

const InstitutionTaskSchema: Schema = new Schema({
    institution_id: { type: Number, required: true },
    university_id: { type: Number, required: true },
    type: { type: String, enum: ['topic', 'subtopic'], required: true },
    target_id: { type: Number, required: true },
    assigned_at: { type: Date, default: Date.now },
    due_date: { type: Date },
    status: { type: String, enum: ['active', 'archived', 'scheduled'], default: 'active' },
    required_mcqs: { type: Number },
    scheduled_at: { type: Date },
});

// Compound index to quickly find tasks for an institution/university/topic/subtopic
InstitutionTaskSchema.index({ institution_id: 1, university_id: 1, type: 1, target_id: 1 }, { unique: true });

export default mongoose.models.InstitutionTask || mongoose.model<IInstitutionTask>('InstitutionTask', InstitutionTaskSchema);
