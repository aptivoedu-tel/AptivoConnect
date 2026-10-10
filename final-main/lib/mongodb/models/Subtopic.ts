import mongoose, { Schema, Document } from 'mongoose';

export interface ISubtopic extends Document {
    id: number;
    topic_id: number;
    name: string;
    content_markdown?: string;
    video_url?: string;
    estimated_minutes?: number;
    sequence_order: number;
    is_active: boolean;
    created_at: Date;
    updated_at: Date;
}

const SubtopicSchema: Schema = new Schema({
    id: { type: Number, required: true, unique: true },
    topic_id: { type: Schema.Types.Mixed, required: true },
    name: { type: String, required: true },
    content_markdown: { type: String },
    video_url: { type: String },
    estimated_minutes: { type: Number },
    sequence_order: { type: Number, default: 0 },
    is_active: { type: Boolean, default: true },
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

SubtopicSchema.index({ topic_id: 1 });
SubtopicSchema.index({ is_active: 1 });

export default mongoose.models.Subtopic || mongoose.model<ISubtopic>('Subtopic', SubtopicSchema);
