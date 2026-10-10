import mongoose, { Document, Schema } from 'mongoose';

export type ProductStatus = 'draft' | 'submitted' | 'under_review' | 'changes_requested' | 'approved' | 'published' | 'rejected' | 'suspended' | 'archived';
export type ProductType = 'practice' | 'mock_test' | 'course' | 'study_material';

export interface IProduct extends Document {
    creator_id: string;
    slug: string;
    title: string;
    description?: string;
    exam_name: string;
    duration_minutes: number;
    questions: Array<{
        prompt: string;
        options: string[];
        correct_option_index: number;
        explanation?: string;
    }>;
    moderation_reason?: string;
    type: ProductType;
    status: ProductStatus;
    version: number;
    price_paisa: number;
    currency: 'PKR';
    created_at: Date;
    updated_at: Date;
}

const ProductSchema = new Schema<IProduct>({
    creator_id: { type: String, required: true, trim: true },
    slug: { type: String, required: true, trim: true, lowercase: true },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, trim: true, maxlength: 10000 },
    exam_name: { type: String, required: true, trim: true, maxlength: 120 },
    duration_minutes: { type: Number, required: true, min: 1, max: 300, validate: { validator: Number.isSafeInteger, message: 'duration_minutes must be a safe integer' } },
    questions: {
        type: [{
            prompt: { type: String, required: true, trim: true, maxlength: 1000 },
            options: { type: [{ type: String, required: true, trim: true, maxlength: 500 }], required: true },
            correct_option_index: { type: Number, required: true, min: 0, validate: { validator: Number.isSafeInteger, message: 'correct_option_index must be a safe integer' } },
            explanation: { type: String, trim: true, maxlength: 2000 },
        }],
        required: true,
        validate: { validator: (questions: unknown[]) => questions.length >= 1 && questions.length <= 100, message: 'products must contain 1 to 100 questions' },
    },
    moderation_reason: { type: String, trim: true, maxlength: 1000 },
    type: { type: String, enum: ['practice', 'mock_test', 'course', 'study_material'], required: true },
    status: { type: String, enum: ['draft', 'submitted', 'under_review', 'changes_requested', 'approved', 'published', 'rejected', 'suspended', 'archived'], default: 'draft', required: true },
    version: { type: Number, required: true, default: 1, min: 1, validate: { validator: Number.isSafeInteger, message: 'version must be a safe integer' } },
    price_paisa: { type: Number, required: true, min: 0, validate: { validator: Number.isSafeInteger, message: 'price_paisa must be a safe integer' } },
    currency: { type: String, enum: ['PKR'], default: 'PKR', required: true },
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }, collection: 'connect_products', autoCreate: false, autoIndex: false });

ProductSchema.index({ creator_id: 1 });
ProductSchema.index({ creator_id: 1, slug: 1 }, { unique: true });
ProductSchema.index({ status: 1, type: 1 });

export default mongoose.models.ConnectProduct || mongoose.model<IProduct>('ConnectProduct', ProductSchema);
