import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// Import model
import MCQ from '../lib/mongodb/models/MCQ';
import Subtopic from '../lib/mongodb/models/Subtopic';
import Topic from '../lib/mongodb/models/Topic';
import Subject from '../lib/mongodb/models/Subject';
import TestSection from '../lib/mongodb/models/TestSection';

async function pullAllMcqs() {
  try {
    const MONGODB_URI = process.env.MONGODB_URI;
    if (!MONGODB_URI) {
      throw new Error('Please define the MONGODB_URI environment variable inside .env.local');
    }

    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected successfully!');

    console.log('Fetching MDCAT TestSection...');
    const mdcatSection = await TestSection.findOne({ name: { $regex: /mdcat/i } }).lean();
    if (!mdcatSection) {
      throw new Error('Could not find a TestSection matching "MDCAT"');
    }
    console.log(`Found MDCAT TestSection with ID: ${mdcatSection.id}`);

    console.log('Fetching all Reference Data...');
    const subtopics = await Subtopic.find({}).lean();
    const topics = await Topic.find({}).lean();
    const subjects = await Subject.find({}).lean();

    const subtopicMap = new Map(subtopics.map((s: any) => [Number(s.id), s]));
    const topicMap = new Map(topics.map((t: any) => [Number(t.id), t]));
    const subjectMap = new Map(subjects.map((s: any) => [Number(s.id), s]));

    console.log('Fetching all MDCAT MCQs from the database...');
    // Only pull MCQs that explicitly belong to the MDCAT test section
    const mcqs = await MCQ.find({ test_section_id: mdcatSection.id }).lean(); 

    console.log(`Successfully fetched ${mcqs.length} MCQs.`);
    console.log('Mapping names to questions...');

    const enrichedMcqs = mcqs.map((mcq: any) => {
      let subtopic_name = null;
      let topic_name = null;
      let subject_name = null;

      // Map from subtopic
      if (mcq.subtopic_id) {
        const subtopic = subtopicMap.get(Number(mcq.subtopic_id));
        if (subtopic) {
          subtopic_name = subtopic.name;
          if (!mcq.topic_id) {
             mcq.topic_id = subtopic.topic_id;
          }
        }
      }

      // Map from topic
      if (mcq.topic_id) {
        const topic = topicMap.get(Number(mcq.topic_id));
        if (topic) {
          topic_name = topic.name;
          const subject = subjectMap.get(Number(topic.subject_id));
          if (subject) {
            subject_name = subject.name;
          }
        }
      }

      return {
        ...mcq,
        subtopic_name,
        topic_name,
        subject_name
      };
    });

    // Save the results to a JSON file
    const outputPath = path.resolve(process.cwd(), 'mdcat_mcqs_output.json');
    fs.writeFileSync(outputPath, JSON.stringify(enrichedMcqs, null, 2));
    
    console.log(`\nSuccessfully saved ${enrichedMcqs.length} MDCAT MCQs to: ${outputPath}`);

  } catch (error) {
    console.error('Error pulling MCQs:', error);
  } finally {
    // Always close the connection when done
    await mongoose.disconnect();
    console.log('MongoDB connection closed.');
  }
}

pullAllMcqs();
