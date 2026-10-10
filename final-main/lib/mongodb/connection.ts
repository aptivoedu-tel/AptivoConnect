import mongoose from 'mongoose';
import dns from 'dns';

// Prefer IPv4 for socket connections; SRV discovery uses the configured resolver.
dns.setDefaultResultOrder('ipv4first');

/**
 * Global is used here to maintain a cached connection across hot reloads
 * in development. This prevents connections growing exponentially
 * during API Route usage.
 */
type ConnectionCache = { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null };
const connectionGlobal = global as typeof globalThis & { mongoose?: ConnectionCache };
const cached: ConnectionCache = connectionGlobal.mongoose ?? { conn: null, promise: null };

connectionGlobal.mongoose = cached;

const DB_OPTS = {
    bufferCommands: true,              // queue ops during reconnect instead of failing instantly
    family: 4,                         // Force IPv4
    serverSelectionTimeoutMS: 15000,   // 15s — enough for cold DNS + Atlas handshake
    connectTimeoutMS: 30000,           // 30s — full TCP connect budget
    socketTimeoutMS: 90000,            // 90s — prevent mid-query socket drops
    maxPoolSize: 10,
    minPoolSize: 5,                    // keep more connections warm in pool
    maxIdleTimeMS: 270000,             // 4.5 min — just under Atlas M0 5-min idle limit
    heartbeatFrequencyMS: 5000,        // ping Atlas every 5s to keep pool alive
};

async function connectToDatabase() {
    const uri=process.env.MONGODB_URI;
    if(!uri) throw new Error('MONGODB_URI is not configured');
    if(cached.conn && mongoose.connection.readyState===1) return cached.conn;
    if(cached.conn && mongoose.connection.readyState===0){cached.conn=null;cached.promise=null;}
    if(!cached.promise) {
        const servers = process.env.MONGODB_DNS_SERVERS?.split(',').map(server => server.trim()).filter(Boolean);
        if (servers?.length) dns.promises.setServers(servers);
        cached.promise=mongoose.connect(uri,DB_OPTS).then(connection=>{cached.conn=connection;return connection;}).catch(error=>{cached.promise=null;cached.conn=null;throw error;});
    }
    return cached.promise;
}
export default connectToDatabase;
