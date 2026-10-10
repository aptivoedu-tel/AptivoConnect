// lib/mongodb/counter.ts
import mongoose from 'mongoose';

const CounterSchema = new mongoose.Schema({
  _id: { type: String, required: true }, // name of the sequence, e.g., 'practiceSession'
  seq: { type: Number, default: 0 },
});

export const Counter = mongoose.models.Counter || mongoose.model('Counter', CounterSchema);

/**
 * Get the next incremental number for a given entity.
 * Uses findOneAndUpdate with $inc atomically.
 */
export async function getNextSequence(name: string): Promise<number> {
  const result = await Counter.findOneAndUpdate(
    { _id: name },
    { $inc: { seq: 1 } },
    { returnDocument: 'after', upsert: true }
  ).lean();
  return (result?.seq ?? 0);
}
