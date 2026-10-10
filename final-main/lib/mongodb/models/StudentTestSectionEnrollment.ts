import mongoose, { Schema, Document } from 'mongoose';

export interface IStudentTestSectionEnrollment extends Document {
    id: number;
    user_id: string; // Clerk/Supabase UUID or mapped ID
    test_section_id: number;
    enrollment_date: Date;
    status: 'pending' | 'approved' | 'rejected';
    created_at: Date;
}

const StudentTestSectionEnrollmentSchema: Schema = new Schema({
    id: { type: Number, required: true, unique: true },
    user_id: { type: String, required: true },
    test_section_id: { type: Number, required: true },
    enrollment_date: { type: Date, default: Date.now },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'approved' },
    created_at: { type: Date, default: Date.now }
});

export default mongoose.models.StudentTestSectionEnrollment || mongoose.model<IStudentTestSectionEnrollment>('StudentTestSectionEnrollment', StudentTestSectionEnrollmentSchema);
