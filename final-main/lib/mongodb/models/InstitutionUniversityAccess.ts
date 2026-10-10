import mongoose, { Schema, Document } from 'mongoose';

export interface IInstitutionUniversityAccess extends Document {
    id: number;
    institution_id: number;
    university_id: number;
    is_active: boolean;
    created_at: Date;
}

const InstitutionUniversityAccessSchema: Schema = new Schema({
    id: { type: Number, unique: false }, // Relaxing single unique index
    institution_id: { type: Number, required: true },
    university_id: { type: Number, required: true },
    is_locked: { type: Boolean, default: false }, // Added missing field
    is_active: { type: Boolean, default: true },
    created_at: { type: Date, default: Date.now },
});

InstitutionUniversityAccessSchema.index({ institution_id: 1, university_id: 1 }, { unique: true });

export default mongoose.models.InstitutionUniversityAccess || mongoose.model<IInstitutionUniversityAccess>('InstitutionUniversityAccess', InstitutionUniversityAccessSchema);
