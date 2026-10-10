import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import Subject from '../lib/mongodb/models/Subject';
import TestSection from '../lib/mongodb/models/TestSection';
import MCQ from '../lib/mongodb/models/MCQ';

async function check() {
  await mongoose.connect(process.env.MONGODB_URI as string);
  const ts = await TestSection.findOne({ name: { $regex: /mdcat/i } }).lean();
  console.log('TestSection:', ts);
  if (ts) {
    const mdcatMcqs = await MCQ.countDocuments({ test_section_id: ts.id });
    console.log(`Total MCQs with test_section_id = ${ts.id}: ${mdcatMcqs}`);

    const otherMcqs = await MCQ.aggregate([
      { $group: { _id: "$test_section_id", count: { $sum: 1 } } }
    ]);
    console.log('MCQ count by test_section_id:', otherMcqs);
  }
  process.exit(0);
}
check();
check();
