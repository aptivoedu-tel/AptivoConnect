import connectToAmbassadorDatabase from './ambassador-db';

async function dbConnect() {
  return connectToAmbassadorDatabase();
}

export default dbConnect;
