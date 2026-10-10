import mongoose, { Document, Schema } from 'mongoose';

export type OrderStatus = 'pending' | 'paid' | 'failed' | 'cancelled' | 'partially_refunded' | 'refunded';

export interface IOrder extends Document {
    buyer_id: string;
    product_id: string;
    product_version: number;
    status: OrderStatus;
    payment_provider?: string;
    payment_reference?: string;
    idempotency_key?: string;
    amount_paisa: number;
    currency: 'PKR';
    created_at: Date;
    updated_at: Date;
}

const safeInteger = { validator: Number.isSafeInteger, message: 'value must be a safe integer' };
const OrderSchema = new Schema<IOrder>({
    buyer_id: { type: String, required: true, trim: true },
    product_id: { type: String, required: true, trim: true },
    product_version: { type: Number, required: true, min: 1, validate: safeInteger },
    status: { type: String, enum: ['pending', 'paid', 'failed', 'cancelled', 'partially_refunded', 'refunded'], default: 'pending', required: true },
    payment_provider: { type: String, trim: true },
    payment_reference: { type: String, trim: true },
    idempotency_key: { type: String, trim: true },
    amount_paisa: { type: Number, required: true, min: 0, validate: safeInteger },
    currency: { type: String, enum: ['PKR'], default: 'PKR', required: true },
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }, collection: 'connect_orders', autoCreate: false, autoIndex: false });

OrderSchema.index({ buyer_id: 1, created_at: -1 });
OrderSchema.index({ payment_provider: 1, payment_reference: 1 }, { unique: true, partialFilterExpression: { payment_reference: { $type: 'string' } } });
OrderSchema.index({ idempotency_key: 1 }, { unique: true, partialFilterExpression: { idempotency_key: { $type: 'string' } } });

export default mongoose.models.ConnectOrder || mongoose.model<IOrder>('ConnectOrder', OrderSchema);
