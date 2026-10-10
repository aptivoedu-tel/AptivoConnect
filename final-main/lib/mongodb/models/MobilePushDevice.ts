import mongoose, { Document, Schema } from 'mongoose';

export interface IMobilePushDevice extends Document {
    installation_id: string;
    user_id: string;
    expo_push_token: string;
    platform: 'android' | 'ios';
    enabled: boolean;
    last_used_at: Date;
    created_at: Date;
    updated_at: Date;
}

const MobilePushDeviceSchema = new Schema<IMobilePushDevice>({
    installation_id: { type: String, required: true, unique: true, index: true },
    user_id: { type: String, required: true, index: true },
    expo_push_token: { type: String, required: true, index: true },
    platform: { type: String, enum: ['android', 'ios'], required: true },
    enabled: { type: Boolean, default: true, index: true },
    last_used_at: { type: Date, default: Date.now },
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

MobilePushDeviceSchema.index({ user_id: 1, enabled: 1 });
MobilePushDeviceSchema.index({ expo_push_token: 1 }, { unique: true });

export default mongoose.models.MobilePushDevice || mongoose.model<IMobilePushDevice>('MobilePushDevice', MobilePushDeviceSchema);
