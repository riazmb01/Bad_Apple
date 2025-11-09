import { MongoClient, Db, Collection } from 'mongodb';
import type { UserDocument, GameRoomDocument, GameSessionDocument, AchievementDocument, UserAchievementDocument } from '@shared/mongodb-schema';

// MongoDB connection URI from environment
const MONGODB_URI = process.env.MONGODB_URI!;

let client: MongoClient;
let db: Db;

// Initialize MongoDB connection
export async function connectToMongoDB(): Promise<Db> {
  if (db) {
    return db;
  }

  client = new MongoClient(MONGODB_URI);
  await client.connect();
  console.log('Connected to MongoDB successfully');
  
  // Use the 'test' database (same as where words and grammar are stored)
  db = client.db('test');
  
  return db;
}

// Get individual collections
export async function getUsersCollection(): Promise<Collection<UserDocument>> {
  const database = await connectToMongoDB();
  return database.collection<UserDocument>('users');
}

export async function getGameRoomsCollection(): Promise<Collection<GameRoomDocument>> {
  const database = await connectToMongoDB();
  return database.collection<GameRoomDocument>('game_rooms');
}

export async function getGameSessionsCollection(): Promise<Collection<GameSessionDocument>> {
  const database = await connectToMongoDB();
  return database.collection<GameSessionDocument>('game_sessions');
}

export async function getAchievementsCollection(): Promise<Collection<AchievementDocument>> {
  const database = await connectToMongoDB();
  return database.collection<AchievementDocument>('achievements');
}

export async function getUserAchievementsCollection(): Promise<Collection<UserAchievementDocument>> {
  const database = await connectToMongoDB();
  return database.collection<UserAchievementDocument>('user_achievements');
}

// Initialize indexes and seed data
export async function initializeCollections() {
  try {
    // Create indexes for better query performance
    const usersCol = await getUsersCollection();
    await usersCol.createIndex({ username: 1 }, { unique: true });
    
    const gameRoomsCol = await getGameRoomsCollection();
    await gameRoomsCol.createIndex({ code: 1 }, { unique: true });
    
    const userAchievementsCol = await getUserAchievementsCollection();
    await userAchievementsCol.createIndex(
      { userId: 1, achievementId: 1 }, 
      { unique: true }
    );
    
    console.log('MongoDB collections initialized with indexes');
  } catch (error) {
    console.error('Error initializing MongoDB collections:', error);
  }
}

// Close MongoDB connection (useful for graceful shutdown)
export async function closeMongoDB() {
  if (client) {
    await client.close();
    console.log('MongoDB connection closed');
  }
}
