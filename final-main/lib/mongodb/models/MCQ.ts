import mongoose, { Schema, Document } from 'mongoose';

export interface IMCQ extends Document {
    id: number;
    subtopic_id?: number;
    topic_id?: number;
    passage_id?: number;
    question: string;
    option_a: string;
    option_b: string;
    option_c: string;
    option_d: string;
    correct_option: string;
    explanation?: string;
    difficulty: 'easy' | 'medium' | 'hard';
    upload_id?: number;
    university_id?: number;
    test_section_id?: number;
    is_active: boolean;
    question_image_url?: string;
    explanation_url?: string;
    option_a_image_url?: string;
    option_b_image_url?: string;
    option_c_image_url?: string;
    option_d_image_url?: string;
    question_hash?: string;
    created_at: Date;
}

const MCQSchema: Schema = new Schema({
    id: { type: Number, required: true, unique: true },
    subtopic_id: { type: Schema.Types.Mixed },
    topic_id: { type: Schema.Types.Mixed },
    passage_id: { type: Schema.Types.Mixed },
    question: { type: String, required: true },
    option_a: { type: String, required: false, default: '' },
    option_b: { type: String, required: false, default: '' },
    option_c: { type: String, required: false, default: '' },
    option_d: { type: String, required: false, default: '' },
    option_a_image_url: { type: String },
    option_b_image_url: { type: String },
    option_c_image_url: { type: String },
    option_d_image_url: { type: String },
    correct_option: { type: String, required: true },
    explanation: { type: String },
    difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'medium' },
    upload_id: { type: Number },
    university_id: { type: Schema.Types.Mixed },
    test_section_id: { type: Schema.Types.Mixed },
    is_active: { type: Boolean, default: true },
    question_image_url: { type: String },
    explanation_url: { type: String },
    question_hash: { type: String },
    created_at: { type: Date, default: Date.now },
});

MCQSchema.index({ subtopic_id: 1 });
MCQSchema.index({ topic_id: 1 });
MCQSchema.index({ university_id: 1 });
MCQSchema.index({ test_section_id: 1 });
MCQSchema.index({ is_active: 1 });
MCQSchema.index({ difficulty: 1 });

export default mongoose.models.MCQ || mongoose.model<IMCQ>('MCQ', MCQSchema);
