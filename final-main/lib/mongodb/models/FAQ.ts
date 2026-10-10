import mongoose, { Schema, Document } from 'mongoose';

export interface IFAQ extends Document {
    id: string;
    question: string;
    answer: string;
    order: number;
    is_published: boolean;
    created_at: Date;
    updated_at: Date;
}

const FAQSchema: Schema = new Schema({
    id: { type: String, required: true, unique: true, index: true },
    question: { type: String, required: true, trim: true },
    answer: { type: String, required: true, trim: true },
    order: { type: Number, default: 0 },
    is_published: { type: Boolean, default: true },
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now },
}, {
    id: false,
    versionKey: false,
    collection: 'faqs',
});

export default mongoose.models.FAQ || mongoose.model<IFAQ>('FAQ', FAQSchema);
