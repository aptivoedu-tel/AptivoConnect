import mongoose, { Document, Schema } from 'mongoose';

export interface IEntitlement extends Document {
    buyer_id: string;
    product_id: string;
    order_id: string;
    product_version: number;
    access_status: 'active' | 'revoked';
    created_at: Date;
    updated_at: Date;
}

const EntitlementSchema = new Schema<IEntitlement>({
    buyer_id: { type: String, required: true, trim: true },
    product_id: { type: String, required: true, trim: true },
    order_id: { type: String, required: true, trim: true },
    product_version: { type: Number, required: true, min: 1, validate: { validator: Number.isSafeInteger, message: 'product_version must be a safe integer' } },
    access_status: { type: String, enum: ['active', 'revoked'], default: 'active', required: true },
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }, collection: 'connect_entitlements', autoCreate: false, autoIndex: false });

EntitlementSchema.index({ buyer_id: 1, product_id: 1 }, { unique: true });
EntitlementSchema.index({ order_id: 1 });

export default mongoose.models.ConnectEntitlement || mongoose.model<IEntitlement>('ConnectEntitlement', EntitlementSchema);
