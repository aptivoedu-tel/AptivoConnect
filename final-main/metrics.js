const { MongoClient } = require('mongodb');

async function main() {
    const uri = process.env.MONGODB_URI;
    const client = new MongoClient(uri);

    try {
        await client.connect();
        const db = client.db('aptivo_db');
        const practiceSessions = db.collection('practicesessions');

        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        const dauPipeline = [
            { $match: { started_at: { $gte: startOfDay } } },
            { $group: { _id: "$student_id" } },
            { $count: "dau" }
        ];

        const wauPipeline = [
            { $match: { started_at: { $gte: startOfWeek } } },
            { $group: { _id: "$student_id" } },
            { $count: "wau" }
        ];

        const mauPipeline = [
            { $match: { started_at: { $gte: startOfMonth } } },
            { $group: { _id: "$student_id" } },
            { $count: "mau" }
        ];

        const [dauResult] = await practiceSessions.aggregate(dauPipeline).toArray();
        const [wauResult] = await practiceSessions.aggregate(wauPipeline).toArray();
        const [mauResult] = await practiceSessions.aggregate(mauPipeline).toArray();

        // Let's also look at average daily returning users for the last 30 days
        const thirtyDaysAgo = new Date(now);
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const dailyActiveUsersLast30Days = await practiceSessions.aggregate([
            { $match: { started_at: { $gte: thirtyDaysAgo } } },
            { $group: { 
                _id: { 
                    date: { $dateToString: { format: "%Y-%m-%d", date: "$started_at" } },
                    student: "$student_id"
                }
            }},
            { $group: {
                _id: "$_id.date",
                users: { $sum: 1 }
            }},
            { $group: {
                _id: null,
                averageDau: { $avg: "$users" }
            }}
        ]).toArray();

        const weeklyActiveUsersLast12Weeks = await practiceSessions.aggregate([
            { $match: { started_at: { $gte: new Date(now.getTime() - 12 * 7 * 24 * 60 * 60 * 1000) } } },
            { $group: { 
                _id: { 
                    week: { $isoWeek: "$started_at" },
                    year: { $isoWeekYear: "$started_at" },
                    student: "$student_id"
                }
            }},
            { $group: {
                _id: { week: "$_id.week", year: "$_id.year" },
                users: { $sum: 1 }
            }},
            { $group: {
                _id: null,
                averageWau: { $avg: "$users" }
            }}
        ]).toArray();
        
        const monthlyActiveUsersLast12Months = await practiceSessions.aggregate([
            { $match: { started_at: { $gte: new Date(now.getFullYear() - 1, now.getMonth(), 1) } } },
            { $group: { 
                _id: { 
                    month: { $month: "$started_at" },
                    year: { $year: "$started_at" },
                    student: "$student_id"
                }
            }},
            { $group: {
                _id: { month: "$_id.month", year: "$_id.year" },
                users: { $sum: 1 }
            }},
            { $group: {
                _id: null,
                averageMau: { $avg: "$users" }
            }}
        ]).toArray();

        console.log("=== Aptivo Practice Users Analysis ===");
        console.log(`Current DAU (Today): ${dauResult ? dauResult.dau : 0}`);
        console.log(`Current WAU (This Week): ${wauResult ? wauResult.wau : 0}`);
        console.log(`Current MAU (This Month): ${mauResult ? mauResult.mau : 0}`);
        console.log("--------------------------------------");
        console.log(`Average DAU (Last 30 Days): ${dailyActiveUsersLast30Days[0]?.averageDau?.toFixed(2) || 0}`);
        console.log(`Average WAU (Last 12 Weeks): ${weeklyActiveUsersLast12Weeks[0]?.averageWau?.toFixed(2) || 0}`);
        console.log(`Average MAU (Last 12 Months): ${monthlyActiveUsersLast12Months[0]?.averageMau?.toFixed(2) || 0}`);
        
    } finally {
        await client.close();
    }
}

main().catch(console.error);
