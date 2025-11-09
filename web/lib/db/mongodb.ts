import { MongoClient, Db, Document } from 'mongodb';

if (!process.env.MONGODB_URI) {
  throw new Error('Please add your MONGODB_URI to .env.local');
}

if (!process.env.MONGODB_DB) {
  throw new Error('Please add your MONGODB_DB to .env.local');
}

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB;

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

if (process.env.NODE_ENV === 'development') {
  // In development mode, use a global variable so that the value
  // is preserved across module reloads caused by HMR (Hot Module Replacement).
  let globalWithMongo = global as typeof globalThis & {
    _mongoClientPromise?: Promise<MongoClient>;
  };

  if (!globalWithMongo._mongoClientPromise) {
    client = new MongoClient(uri);
    globalWithMongo._mongoClientPromise = client.connect();
  }
  clientPromise = globalWithMongo._mongoClientPromise;
} else {
  // In production mode, it's best to not use a global variable.
  client = new MongoClient(uri);
  clientPromise = client.connect();
}

/**
 * Get MongoDB client
 */
export async function getClient(): Promise<MongoClient> {
  return clientPromise;
}

/**
 * Get MongoDB database
 */
export async function getDatabase(): Promise<Db> {
  const client = await getClient();
  return client.db(dbName);
}

/**
 * Get a specific collection from the database
 */
export async function getCollection<T extends Document = Document>(collectionName: string) {
  const db = await getDatabase();
  return db.collection<T>(collectionName);
}

// Export the clientPromise for Next.js compatibility
export default clientPromise;
