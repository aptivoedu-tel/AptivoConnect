import mongoose, { Schema, Document } from 'mongoose';

export interface ITestSection extends Document {
    id: number;
    name: string;
    region?: string;
    country?: string;
    description?: string;
    logo_url?: string;
    is_active: boolean;
    is_public: boolean;
    fallback_test_section_id?: number | null;
    strictly_no_fallback: boolean;
    repeat_on_empty: boolean;
    test_pattern_markdown?: string;
    is_independent: boolean;
    created_at: Date;
    updated_at: Date;
}

const TestSectionSchema: Schema = new Schema({
    id: { type: Number, required: true, unique: true },
    name: { type: String, required: true },
    region: { type: String },
    country: { type: String },
    description: { type: String },
    logo_url: { type: String },
    is_active: { type: Boolean, default: true },
    is_public: { type: Boolean, default: true },
    fallback_test_section_id: { type: Number, default: null },
    strictly_no_fallback: { type: Boolean, default: false },
    repeat_on_empty: { type: Boolean, default: false },
    test_pattern_markdown: { type: String },
    is_independent: { type: Boolean, default: false },
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

export default mongoose.models.TestSection || mongoose.model<ITestSection>('TestSection', TestSectionSchema);
