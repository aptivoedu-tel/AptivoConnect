const { MongoClient } = require('mongodb');
const dotenv = require('dotenv');

dotenv.config({ path: '.env.local' });

async function run() {
    if (!process.env.MONGODB_URI) {
        throw new Error('MONGODB_URI is missing from .env.local');
    }

    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();

    try {
        const db = client.db();
        const result = await db.collection('practicesessions').updateMany(
            { is_completed: true, expiresAt: { $exists: true } },
            { $unset: { expiresAt: "" } }
        );

        console.log(`Cleared expiresAt from ${result.modifiedCount} completed practice sessions.`);
    } finally {
        await client.close();
    }
}

run().catch((error) => {
    console.error(error);
    process.exit(1);
});
