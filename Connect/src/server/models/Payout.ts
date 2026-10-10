import mongoose, { Document, Schema } from 'mongoose';

export type PayoutStatus = 'requested' | 'under_review' | 'approved' | 'processing' | 'paid' | 'rejected' | 'failed' | 'cancelled';

export interface IPayout extends Document {
    creator_id: string;
    request_key: string;
    amount_paisa: number;
    currency: 'PKR';
    status: PayoutStatus;
    created_at: Date;
    updated_at: Date;
}

const PayoutSchema = new Schema<IPayout>({
    creator_id: { type: String, required: true, trim: true },
    request_key: { type: String, required: true, trim: true },
    amount_paisa: { type: Number, required: true, min: 1, validate: { validator: Number.isSafeInteger, message: 'amount_paisa must be a safe integer' } },
    currency: { type: String, enum: ['PKR'], default: 'PKR', required: true },
    status: { type: String, enum: ['requested', 'under_review', 'approved', 'processing', 'paid', 'rejected', 'failed', 'cancelled'], default: 'requested', required: true },
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }, collection: 'connect_payouts', autoCreate: false, autoIndex: false });

PayoutSchema.index({ creator_id: 1, created_at: -1 });
PayoutSchema.index({ creator_id: 1, request_key: 1 }, { unique: true });

export default mongoose.models.ConnectPayout || mongoose.model<IPayout>('ConnectPayout', PayoutSchema);
