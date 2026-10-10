const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Force stdout unbuffered
if (process.stdout._handle && process.stdout._handle.setBlocking) {
  process.stdout._handle.setBlocking(true);
}

const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const envConfig = fs.readFileSync(envPath, 'utf8');
  envConfig.split('\n').forEach((line) => {
    const parts = line.split('=');
    if (parts.length >= 2) {
      const key = parts[0].trim();
      const value = parts.slice(1).join('=').trim();
      if (key && !process.env[key]) {
        process.env[key] = value;
      }
    }
  });
}

function ask(question) {
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

async function main() {
  console.log('\n=== Aptivo Admin Credential Setup ===\n');

  let args = process.argv.slice(2).filter((arg) => arg !== '--');
  let email = args[0];
  let password = args[1];

  if (!email) {
    email = await ask('Enter Admin Email (e.g. admin@aptivo.com): ');
  }
  if (!password) {
    password = await ask('Enter Admin Password: ');
  }

  email = (email || '').trim().toLowerCase();
  password = (password || '').trim();

  if (!email || !password) {
    console.error('Error: Both email and password are required.');
    process.exit(1);
  }

  console.log(`Setting up admin account for: ${email}...`);

  // 1. Update .env.local file
  let envContent = '';
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf8');
  }

  function setEnvVar(content, key, value) {
    const regex = new RegExp(`^${key}=.*$`, 'm');
    if (regex.test(content)) {
      return content.replace(regex, `${key}=${value}`);
    } else {
      return content ? `${content.trim()}\n${key}=${value}\n` : `${key}=${value}\n`;
    }
  }

  envContent = setEnvVar(envContent, 'ADMIN_EMAIL', email);
  envContent = setEnvVar(envContent, 'ADMIN_PASSWORD', password);

  if (!envContent.includes('JWT_SECRET=')) {
    const crypto = require('crypto');
    const secret = crypto.randomBytes(32).toString('hex');
    envContent = setEnvVar(envContent, 'JWT_SECRET', secret);
  }

  fs.writeFileSync(envPath, envContent, 'utf8');
  console.log('✓ Updated .env.local with ADMIN_EMAIL and ADMIN_PASSWORD');

  // 2. Insert/Update in MongoDB database if MONGODB_URI exists
  const mongoUri = process.env.MONGODB_URI;
  if (mongoUri) {
    try {
      console.log('Connecting to MongoDB Atlas...');
      await mongoose.connect(mongoUri, {
        serverSelectionTimeoutMS: 6000,
        connectTimeoutMS: 6000,
      });

      const AdminSchema = new mongoose.Schema(
        {
          email: { type: String, required: true, unique: true, lowercase: true, trim: true },
          passwordHash: { type: String, required: true },
        },
        { timestamps: true }
      );

      const Admin = mongoose.models.Admin || mongoose.model('Admin', AdminSchema);
      const passwordHash = await bcrypt.hash(password, 10);

      await Admin.findOneAndUpdate(
        { email },
        { email, passwordHash },
        { upsert: true, new: true }
      );

      console.log('✓ Successfully created/updated Admin user in MongoDB Atlas database!');
      await mongoose.disconnect();
    } catch (err) {
      console.warn('⚠️ Could not connect to MongoDB Atlas, but .env.local was updated successfully.');
      console.warn('Error details:', err.message);
    }
  } else {
    console.log('ℹ️ MONGODB_URI not found, skipping database insertion (credentials saved in .env.local).');
  }

  console.log('\n========================================');
  console.log('SUCCESS! Admin Credentials Configured:');
  console.log(`Email:    ${email}`);
  console.log(`Password: ${password}`);
  console.log('========================================\n');

  process.exit(0);
}

main().catch((err) => {
  console.error('An error occurred:', err);
  process.exit(1);
});
