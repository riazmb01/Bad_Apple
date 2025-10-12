import { MongoClient, Db, Collection } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/';
const DB_NAME = 'wordDB';

let client: MongoClient | null = null;
let db: Db | null = null;
let connectionFailed = false;
let lastConnectionAttempt = 0;
const RETRY_DELAY = 60000; // 1 minute before retrying

export async function connectToMongoDB(): Promise<Db> {
  if (db) {
    return db;
  }

  // If connection failed recently, don't retry immediately
  const now = Date.now();
  if (connectionFailed && (now - lastConnectionAttempt) < RETRY_DELAY) {
    throw new Error('MongoDB connection failed recently, using fallback');
  }

  try {
    lastConnectionAttempt = now;
    client = new MongoClient(MONGODB_URI, {
      serverSelectionTimeoutMS: 2000, // Fail fast after 2 seconds
      connectTimeoutMS: 2000
    });
    await client.connect();
    db = client.db(DB_NAME);
    connectionFailed = false;
    console.log('Connected to MongoDB successfully');
    return db;
  } catch (error) {
    connectionFailed = true;
    console.error('Failed to connect to MongoDB:', error);
    throw error;
  }
}

export async function getWordsCollection(): Promise<Collection> {
  const database = await connectToMongoDB();
  return database.collection('ex1DB');
}

export async function closeMongoDB(): Promise<void> {
  if (client) {
    await client.close();
    client = null;
    db = null;
  }
}
