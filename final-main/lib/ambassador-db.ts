import mongoose from 'mongoose';

const connectionGlobal = global as typeof globalThis & { ambassadorMongooseConn?: mongoose.Connection };
let cachedConn: mongoose.Connection | null = connectionGlobal.ambassadorMongooseConn || null;

export async function getAmbassadorConnection(): Promise<mongoose.Connection> {
  if (cachedConn && cachedConn.readyState === 1) {
    return cachedConn;
  }

  const uri = process.env.AMBASSADOR_MONGODB_URI;
  if (!uri) throw new Error('AMBASSADOR_MONGODB_URI is not configured');
  const conn = mongoose.createConnection(uri, {
    family: 4,
    serverSelectionTimeoutMS: 15000,
    connectTimeoutMS: 30000,
  });

  await conn.asPromise();
  connectionGlobal.ambassadorMongooseConn = conn;
  cachedConn = conn;
  return conn;
}

export default getAmbassadorConnection;
