import mongoose, { Schema, Document } from 'mongoose';

export interface ICalendarEvent extends Document {
  title: string;
  event_type: 'admission' | 'test_date' | 'mock_test' | 'registration_deadline' | 'event';
  event_date: Date;
  university_id: mongoose.Types.ObjectId;
  description: string;
  priority: 'high' | 'medium' | 'low';
  is_published: boolean;
  created_at: Date;
  updated_at: Date;
}

const CalendarEventSchema: Schema = new Schema({
  title: { type: String, required: true },
  event_type: { 
    type: String, 
    enum: ['admission', 'test_date', 'mock_test', 'registration_deadline', 'event'],
    default: 'event'
  },
  event_date: { type: Date, required: true },
  university_id: { type: Schema.Types.ObjectId, ref: 'University', required: true },
  description: { type: String, default: '' },
  priority: { type: String, enum: ['high', 'medium', 'low'], default: 'medium' },
  is_published: { type: Boolean, default: true },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
});

CalendarEventSchema.pre('save', function () {
  this.updated_at = new Date();
});

export default mongoose.models.CalendarEvent || mongoose.model<ICalendarEvent>('CalendarEvent', CalendarEventSchema);
