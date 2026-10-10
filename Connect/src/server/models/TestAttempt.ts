import mongoose, { Document, Schema } from 'mongoose';

export interface ITestAttempt extends Document {
    buyer_id: string;
    product_id: string;
    product_version: number;
    status: 'in_progress' | 'submitted';
    selected_answers: Array<{ question_index: number; selected_option_index: number }>;
    score?: number;
    total?: number;
    result?: Array<{
        question_index: number;
        prompt: string;
        selected_option_index: number;
        correct_option_index: number;
        is_correct: boolean;
        explanation?: string;
    }>;
    started_at: Date;
    submitted_at?: Date;
    created_at: Date;
    updated_at: Date;
}

const TestAttemptSchema = new Schema<ITestAttempt>({
    buyer_id: { type: String, required: true, trim: true },
    product_id: { type: String, required: true, trim: true },
    product_version: { type: Number, required: true, min: 1, validate: { validator: Number.isSafeInteger, message: 'product_version must be a safe integer' } },
    status: { type: String, enum: ['in_progress', 'submitted'], default: 'in_progress', required: true },
    selected_answers: { type: [{ question_index: { type: Number, required: true }, selected_option_index: { type: Number, required: true } }], default: [] },
    score: { type: Number, min: 0, validate: { validator: Number.isSafeInteger, message: 'score must be a safe integer' } },
    total: { type: Number, min: 1, validate: { validator: Number.isSafeInteger, message: 'total must be a safe integer' } },
    result: { type: [{ question_index: Number, prompt: String, selected_option_index: Number, correct_option_index: Number, is_correct: Boolean, explanation: String }] },
    started_at: { type: Date, default: Date.now, immutable: true },
    submitted_at: { type: Date },
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }, collection: 'connect_test_attempts', autoCreate: false, autoIndex: false });

TestAttemptSchema.index({ buyer_id: 1, created_at: -1 });
TestAttemptSchema.index({ buyer_id: 1, _id: 1 });

export default mongoose.models.ConnectTestAttempt || mongoose.model<ITestAttempt>('ConnectTestAttempt', TestAttemptSchema);
