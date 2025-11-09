import { randomUUID } from "crypto";
import type { 
  User, 
  InsertUser, 
  GameRoom, 
  InsertGameRoom, 
  GameSession, 
  InsertGameSession, 
  UserAchievement, 
  InsertUserAchievement 
} from "@shared/mongodb-schema";
import type { IStorage } from "./storage";
import { 
  getUsersCollection, 
  getGameRoomsCollection, 
  getGameSessionsCollection, 
  getUserAchievementsCollection 
} from "./mongodb-collections";

export class MongoDBStorage implements IStorage {
  // Helper to map MongoDB _id to id for compatibility
  private mapMongoUser(doc: any): User {
    if (!doc) return doc;
    const { _id, ...rest } = doc;
    return { id: _id, _id, ...rest } as User;
  }

  private mapMongoGameRoom(doc: any): GameRoom {
    if (!doc) return doc;
    const { _id, ...rest } = doc;
    return { id: _id, _id, ...rest } as GameRoom;
  }

  private mapMongoGameSession(doc: any): GameSession {
    if (!doc) return doc;
    const { _id, ...rest } = doc;
    return { id: _id, _id, ...rest } as GameSession;
  }

  private mapMongoUserAchievement(doc: any): UserAchievement {
    if (!doc) return doc;
    const { _id, ...rest } = doc;
    return { id: _id, _id, ...rest } as UserAchievement;
  }

  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const collection = await getUsersCollection();
    const user = await collection.findOne({ _id: id });
    return user ? this.mapMongoUser(user) : undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const collection = await getUsersCollection();
    const user = await collection.findOne({ username });
    return user ? this.mapMongoUser(user) : undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const collection = await getUsersCollection();
    const id = randomUUID();
    const user: User = {
      _id: id,
      level: 1,
      points: 0,
      streak: 0,
      accuracy: 0,
      wordsSpelled: 0,
      gamesWon: 0,
      gamesPlayed: 0,
      bestStreak: 0,
      totalCorrect: 0,
      totalAttempts: 0,
      achievements: [],
      createdAt: new Date(),
      ...insertUser,
    };
    await collection.insertOne(user as any);
    return this.mapMongoUser(user);
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    const collection = await getUsersCollection();
    
    // Remove _id and id from updates if they exist
    const { _id, id: ignoreId, ...updateFields } = updates as any;
    
    const result = await collection.findOneAndUpdate(
      { _id: id },
      { $set: updateFields },
      { returnDocument: 'after' }
    );
    
    return result && result.value ? this.mapMongoUser(result.value) : undefined;
  }

  // Game room operations
  async createGameRoom(insertRoom: InsertGameRoom): Promise<GameRoom> {
    const collection = await getGameRoomsCollection();
    const id = randomUUID();
    const code = this.generateRoomCode();
    const room: GameRoom = {
      _id: id,
      currentPlayers: 0,
      gameState: {},
      isActive: false,
      settings: {},
      createdAt: new Date(),
      ...insertRoom,
      code,
      maxPlayers: insertRoom.maxPlayers ?? 10,
    };
    await collection.insertOne(room as any);
    return this.mapMongoGameRoom(room);
  }

  async getGameRoom(id: string): Promise<GameRoom | undefined> {
    const collection = await getGameRoomsCollection();
    const room = await collection.findOne({ _id: id });
    return room ? this.mapMongoGameRoom(room) : undefined;
  }

  async getGameRoomByCode(code: string): Promise<GameRoom | undefined> {
    const collection = await getGameRoomsCollection();
    const room = await collection.findOne({ code });
    return room ? this.mapMongoGameRoom(room) : undefined;
  }

  async getAllGameRooms(): Promise<GameRoom[]> {
    const collection = await getGameRoomsCollection();
    const rooms = await collection.find({}).toArray();
    return rooms.map(room => this.mapMongoGameRoom(room));
  }

  async updateGameRoom(id: string, updates: Partial<GameRoom>): Promise<GameRoom | undefined> {
    const collection = await getGameRoomsCollection();
    
    // Remove _id and id from updates if they exist
    const { _id, id: ignoreId, ...updateFields } = updates as any;
    
    const result = await collection.findOneAndUpdate(
      { _id: id },
      { $set: updateFields },
      { returnDocument: 'after' }
    );
    
    return result && result.value ? this.mapMongoGameRoom(result.value) : undefined;
  }

  async deleteGameRoom(id: string): Promise<boolean> {
    const collection = await getGameRoomsCollection();
    const result = await collection.deleteOne({ _id: id });
    return result.deletedCount > 0;
  }

  // Game session operations
  async createGameSession(insertSession: InsertGameSession): Promise<GameSession> {
    const collection = await getGameSessionsCollection();
    const id = randomUUID();
    const session: GameSession = {
      _id: id,
      score: 0,
      correctAnswers: 0,
      totalAnswers: 0,
      currentStreak: 0,
      bestStreak: 0,
      hintsUsed: 0,
      timeElapsed: 0,
      isReady: true,
      isComplete: false,
      isConnected: true,
      isEliminated: false,
      eliminatedAt: null,
      disconnectedAt: null,
      createdAt: new Date(),
      ...insertSession,
    };
    await collection.insertOne(session as any);
    return this.mapMongoGameSession(session);
  }

  async getGameSession(id: string): Promise<GameSession | undefined> {
    const collection = await getGameSessionsCollection();
    const session = await collection.findOne({ _id: id });
    return session ? this.mapMongoGameSession(session) : undefined;
  }

  async getGameSessionsByRoom(roomId: string): Promise<GameSession[]> {
    const collection = await getGameSessionsCollection();
    const sessions = await collection.find({ roomId }).toArray();
    return sessions.map(session => this.mapMongoGameSession(session));
  }

  async updateGameSession(id: string, updates: Partial<GameSession>): Promise<GameSession | undefined> {
    const collection = await getGameSessionsCollection();
    
    // Remove _id and id from updates if they exist
    const { _id, id: ignoreId, ...updateFields } = updates as any;
    
    const result = await collection.findOneAndUpdate(
      { _id: id },
      { $set: updateFields },
      { returnDocument: 'after' }
    );
    
    return result && result.value ? this.mapMongoGameSession(result.value) : undefined;
  }

  async deleteGameSession(id: string): Promise<boolean> {
    const collection = await getGameSessionsCollection();
    const result = await collection.deleteOne({ _id: id });
    return result.deletedCount > 0;
  }

  // Achievement operations
  async getUserAchievements(userId: string): Promise<UserAchievement[]> {
    const collection = await getUserAchievementsCollection();
    const achievements = await collection.find({ userId }).toArray();
    return achievements.map(ach => this.mapMongoUserAchievement(ach));
  }

  async unlockAchievement(userId: string, achievementId: string): Promise<UserAchievement> {
    const collection = await getUserAchievementsCollection();
    
    try {
      const id = randomUUID();
      const achievement: UserAchievement = {
        _id: id,
        userId,
        achievementId,
        unlockedAt: new Date()
      };
      
      await collection.insertOne(achievement as any);
      return this.mapMongoUserAchievement(achievement);
    } catch (error: any) {
      // MongoDB duplicate key error code is 11000
      if (error?.code === 11000) {
        // Return existing achievement
        const existing = await collection.findOne({ userId, achievementId });
        if (existing) {
          return this.mapMongoUserAchievement(existing);
        }
      }
      throw error;
    }
  }

  // Leaderboard operations
  async getLeaderboard(limit: number = 10): Promise<User[]> {
    const collection = await getUsersCollection();
    const users = await collection
      .find({})
      .sort({ points: -1 })
      .limit(limit)
      .toArray();
    return users.map(user => this.mapMongoUser(user));
  }

  private generateRoomCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = 'SPELL-';
    for (let i = 0; i < 4; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
}

export const storage = new MongoDBStorage();
