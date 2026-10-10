import mongoose, { Schema, Document } from 'mongoose';

// Maps content (topics/subtopics) to a TestSection (same pattern as UniversityContentAccess)
export interface ITestSectionContentAccess extends Document {
    id: number;
    test_section_id: number;
    subject_id: number;
    topic_id?: number | null;
    subtopic_id?: number | null;
    is_active: boolean;
    session_limit: number;
    difficulty_level: string;
    created_at: Date;
    updated_at: Date;
}

const TestSectionContentAccessSchema: Schema = new Schema({
    id: { type: Number, required: true, unique: true },
    test_section_id: { type: Number, required: true },
    subject_id: { type: Number, required: true },
    topic_id: { type: Number, default: null },
    subtopic_id: { type: Number, default: null },
    is_active: { type: Boolean, default: true },
    session_limit: { type: Number, default: 10 },
    difficulty_level: { type: String, default: 'all' },
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

TestSectionContentAccessSchema.index({ test_section_id: 1 });
TestSectionContentAccessSchema.index({ test_section_id: 1, topic_id: 1, subtopic_id: 1 }, { unique: true, sparse: true });

export default mongoose.models.TestSectionContentAccess || mongoose.model<ITestSectionContentAccess>('TestSectionContentAccess', TestSectionContentAccessSchema);
