import mongoose, { Schema, Document } from 'mongoose';

export interface ITopic extends Document {
    id: number;
    subject_id: number;
    name: string;
    description?: string;
    sequence_order: number;
    estimated_hours?: number;
    prerequisites?: string[];
    difficulty_level?: 'beginner' | 'intermediate' | 'advanced';
    is_active: boolean;
    content_markdown?: string;
    created_at: Date;
    updated_at: Date;
}

const TopicSchema: Schema = new Schema({
    id: { type: Number, required: true, unique: true },
    subject_id: { type: Schema.Types.Mixed, required: true },
    name: { type: String, required: true },
    description: { type: String },
    sequence_order: { type: Number, default: 0 },
    estimated_hours: { type: Number },
    prerequisites: { type: [String] },
    difficulty_level: { type: String, enum: ['beginner', 'intermediate', 'advanced'] },
    is_active: { type: Boolean, default: true },
    content_markdown: { type: String },
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

TopicSchema.index({ subject_id: 1 });
TopicSchema.index({ is_active: 1 });

export default mongoose.models.Topic || mongoose.model<ITopic>('Topic', TopicSchema);
