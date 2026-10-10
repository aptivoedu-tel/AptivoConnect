import mongoose, { Document, Schema } from 'mongoose';

export interface IReview extends Document {
    buyer_id: string;
    product_id: string;
    rating: number;
    body?: string;
    status: 'visible' | 'hidden' | 'removed';
    created_at: Date;
    updated_at: Date;
}

const ReviewSchema = new Schema<IReview>({
    buyer_id: { type: String, required: true, trim: true },
    product_id: { type: String, required: true, trim: true },
    rating: { type: Number, required: true, min: 1, max: 5, validate: { validator: Number.isSafeInteger, message: 'rating must be an integer' } },
    body: { type: String, trim: true, maxlength: 4000 },
    status: { type: String, enum: ['visible', 'hidden', 'removed'], default: 'visible', required: true },
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }, collection: 'connect_reviews', autoCreate: false, autoIndex: false });

ReviewSchema.index({ buyer_id: 1, product_id: 1 }, { unique: true });
ReviewSchema.index({ product_id: 1, status: 1, created_at: -1 });

export default mongoose.models.ConnectReview || mongoose.model<IReview>('ConnectReview', ReviewSchema);
