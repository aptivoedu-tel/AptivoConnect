const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI;

async function run() {
    try {
        console.log("Connecting to database...");
        await mongoose.connect(MONGODB_URI);
        console.log("Connected successfully!");

        // Define schemas inline to avoid Next.js module loader issues
        const UserSchema = new mongoose.Schema({
            id: String,
            full_name: String,
            role: String,
            league: String
        }, { collection: 'users' });

        const PracticeSessionSchema = new mongoose.Schema({
            student_id: String,
            is_completed: Boolean,
            started_at: Date,
            xp_earned: Number,
            correct_answers: Number,
            wrong_answers: Number
        }, { collection: 'practicesessions' });

        const ExamAttemptSchema = new mongoose.Schema({
            student_id: String,
            status: String,
            end_time: Date,
            xp_earned: Number,
            score: Number
        }, { collection: 'examattempts' });

        const User = mongoose.models.User || mongoose.model('User', UserSchema);
        const PracticeSession = mongoose.models.PracticeSession || mongoose.model('PracticeSession', PracticeSessionSchema);
        const ExamAttempt = mongoose.models.ExamAttempt || mongoose.model('ExamAttempt', ExamAttemptSchema);

        const now = new Date();
        const startDate = new Date();
        startDate.setDate(now.getDate() - 30);
        startDate.setHours(0, 0, 0, 0);

        console.log("Aggregating Practice Sessions XP...");
        const practiceXP = await PracticeSession.aggregate([
            {
                $match: {
                    is_completed: true,
                    started_at: { $gte: startDate }
                }
            },
            {
                $group: {
                    _id: '$student_id',
                    xp: {
                        $sum: {
                            $ifNull: [
                                '$xp_earned',
                                { $subtract: [{ $multiply: ['$correct_answers', 10] }, { $multiply: ['$wrong_answers', 5] }] }
                            ]
                        }
                    }
                }
            }
        ]);

        console.log("Aggregating Exam Attempts XP...");
        const examXP = await ExamAttempt.aggregate([
            {
                $match: {
                    status: { $in: ['completed', 'submitted'] },
                    end_time: { $gte: startDate }
                }
            },
            {
                $group: {
                    _id: '$student_id',
                    xp: {
                        $sum: {
                            $ifNull: [
                                '$xp_earned',
                                { $subtract: [{ $multiply: ['$score', 10] }, 0] }
                            ]
                        }
                    }
                }
            }
        ]);

        const xpMap = new Map();
        practiceXP.forEach((row) => {
            xpMap.set(row._id, (xpMap.get(row._id) || 0) + (row.xp || 0));
        });
        examXP.forEach((row) => {
            xpMap.set(row._id, (xpMap.get(row._id) || 0) + (row.xp || 0));
        });

        console.log("Fetching all student users...");
        const students = await User.find({ role: 'student' }).lean();
        console.log(`Found ${students.length} students.`);

        const bronzeStudents = [];
        const silverStudents = [];
        const goldStudents = [];

        students.forEach((s) => {
            const xp = xpMap.get(s.id) || 0;
            const entry = { ...s, xp };
            const l = s.league || 'bronze';
            if (l === 'bronze') bronzeStudents.push(entry);
            else if (l === 'silver') silverStudents.push(entry);
            else if (l === 'gold') goldStudents.push(entry);
        });

        bronzeStudents.sort((a, b) => b.xp - a.xp);
        silverStudents.sort((a, b) => b.xp - a.xp);
        goldStudents.sort((a, b) => b.xp - a.xp);

        console.log(`Bronze: ${bronzeStudents.length}, Silver: ${silverStudents.length}, Gold: ${goldStudents.length}`);

        const updates = [];

        // Promote top 5 Bronze to Silver (since it's empty, let's promote the top active students!)
        // If there are at least active students with XP > 0, promote the top 5
        const bronzePromotions = bronzeStudents.slice(0, 5);
        console.log("Top 5 Bronze students (candidates for promotion):");
        bronzePromotions.forEach(s => console.log(`- ${s.full_name} (${s.id}): ${s.xp} XP`));

        bronzePromotions.forEach((s) => {
            if (s.xp > 0) {
                updates.push({ id: s.id, league: 'silver', name: s.full_name });
            } else {
                // If they don't have XP but we want to seed Silver/Gold for testing, let's promote them anyway!
                updates.push({ id: s.id, league: 'silver', name: s.full_name });
            }
        });

        // Let's also promote the next 3 to Gold so we have users in Gold to test
        const goldPromotions = bronzeStudents.slice(5, 8);
        goldPromotions.forEach((s) => {
            updates.push({ id: s.id, league: 'gold', name: s.full_name });
        });

        console.log("Applying updates to DB:", updates);

        for (const up of updates) {
            await User.updateOne({ id: up.id }, { $set: { league: up.league } });
            console.log(`Promoted ${up.name} to ${up.league}`);
        }

        console.log("Manual reset run successfully!");
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

run();
