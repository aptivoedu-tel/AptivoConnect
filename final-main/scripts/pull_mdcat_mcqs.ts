import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// Import models
import TestSection from '../lib/mongodb/models/TestSection';
import Subject from '../lib/mongodb/models/Subject';
import Topic from '../lib/mongodb/models/Topic';
import MCQ from '../lib/mongodb/models/MCQ';

async function pullAllMdcatMcqs() {
  try {
    const MONGODB_URI = process.env.MONGODB_URI;
    if (!MONGODB_URI) {
      throw new Error('Please define the MONGODB_URI environment variable inside .env.local');
    }

    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected successfully!');

    // 1. Find the MDCAT Test Section
    const mdcatSection = await TestSection.findOne({ name: /mdcat/i });
    if (!mdcatSection) {
      throw new Error('MDCAT test section not found in the database');
    }
    
    console.log(`Found MDCAT Test Section ID: ${mdcatSection.id}`);

    // 2. Fetch all MCQs that belong to the MDCAT test section ID
    // Note: The MCQ model has a test_section_id field based on our schema review.
    console.log('Fetching all MDCAT MCQs...');
    const mcqs = await MCQ.find({ 
      test_section_id: mdcatSection.id,
      is_active: true // optional: only get active questions
    }).lean(); // .lean() makes the query faster by returning plain JS objects

    console.log(`Successfully fetched ${mcqs.length} MDCAT MCQs.`);

    // 3. Save the results to a JSON file for easy viewing
    const outputPath = path.resolve(process.cwd(), 'mdcat_mcqs_output.json');
    fs.writeFileSync(outputPath, JSON.stringify(mcqs, null, 2));
    
    console.log(`\nData has been saved to: ${outputPath}`);

  } catch (error) {
    console.error('Error pulling MDCAT MCQs:', error);
  } finally {
    // Always close the connection when done
    await mongoose.disconnect();
    console.log('MongoDB connection closed.');
  }
}

pullAllMdcatMcqs();
