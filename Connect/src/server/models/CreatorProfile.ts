import mongoose, { Document, Schema } from 'mongoose';

export type CreatorApplicationStatus = 'draft' | 'submitted' | 'needs_information' | 'approved' | 'rejected' | 'suspended';

export interface ICreatorProfile extends Document {
    user_id: string;
    display_name: string;
    bio?: string;
    application_status: CreatorApplicationStatus;
    moderation_reason?: string;
    created_at: Date;
    updated_at: Date;
}

const CreatorProfileSchema = new Schema<ICreatorProfile>({
    user_id: { type: String, required: true, trim: true },
    display_name: { type: String, required: true, trim: true, maxlength: 120 },
    bio: { type: String, trim: true, maxlength: 2000 },
    moderation_reason: { type: String, trim: true, maxlength: 1000 },
    application_status: {
        type: String,
        enum: ['draft', 'submitted', 'needs_information', 'approved', 'rejected', 'suspended'],
        default: 'draft',
        required: true,
    },
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }, collection: 'connect_creator_profiles', autoCreate: false, autoIndex: false });

CreatorProfileSchema.index({ user_id: 1 }, { unique: true });

export default mongoose.models.ConnectCreatorProfile || mongoose.model<ICreatorProfile>('ConnectCreatorProfile', CreatorProfileSchema);
