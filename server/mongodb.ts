import { MongoClient, Db, Collection } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/';

let client: MongoClient | null = null;
const dbCache = new Map<string, Db>();
let connectionFailed = false;
let lastConnectionAttempt = 0;
const RETRY_DELAY = 60000; // 1 minute before retrying

async function connectToMongoClient(): Promise<MongoClient> {
  if (client) {
    return client;
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
    connectionFailed = false;
    console.log('Connected to MongoDB successfully');
    return client;
  } catch (error) {
    connectionFailed = true;
    console.error('Failed to connect to MongoDB:', error);
    throw error;
  }
}

export async function getMongoCollection(dbName: string, collectionName: string): Promise<Collection> {
  const mongoClient = await connectToMongoClient();
  
  // Cache database connections
  if (!dbCache.has(dbName)) {
    dbCache.set(dbName, mongoClient.db(dbName));
  }
  
  const db = dbCache.get(dbName)!;
  return db.collection(collectionName);
}

export async function getWordsCollection(): Promise<Collection> {
  return getMongoCollection('wordDB', 'ex1DB');
}

export async function getGrammarCollection(): Promise<Collection> {
  return getMongoCollection('test', 'grammarGame');
}

export async function closeMongoDB(): Promise<void> {
  if (client) {
    await client.close();
    client = null;
    dbCache.clear();
  }
}
