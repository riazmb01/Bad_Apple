import { type User, type InsertUser, type GameRoom, type InsertGameRoom, type GameSession, type InsertGameSession, type PlayerState, type UserAchievement, users, gameRooms, gameSessions, userAchievements } from "@shared/schema";
import { randomUUID } from "crypto";
import { db } from "./db";
import { eq, desc, sql } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<User | undefined>;
  deleteUser(id: string): Promise<boolean>;

  // Game room operations
  createGameRoom(room: InsertGameRoom): Promise<GameRoom>;
  getGameRoom(id: string): Promise<GameRoom | undefined>;
  getGameRoomByCode(code: string): Promise<GameRoom | undefined>;
  getAllGameRooms(): Promise<GameRoom[]>;
  updateGameRoom(id: string, updates: Partial<GameRoom>): Promise<GameRoom | undefined>;
  deleteGameRoom(id: string): Promise<boolean>;

  // Game session operations
  createGameSession(session: InsertGameSession): Promise<GameSession>;
  getGameSession(id: string): Promise<GameSession | undefined>;
  getGameSessionsByRoom(roomId: string): Promise<GameSession[]>;
  getGameSessionsByUser(userId: string): Promise<GameSession[]>;
  updateGameSession(id: string, updates: Partial<GameSession>): Promise<GameSession | undefined>;
  deleteGameSession(id: string): Promise<boolean>;

  // Achievement operations
  getUserAchievements(userId: string): Promise<UserAchievement[]>;
  unlockAchievement(userId: string, achievementId: string): Promise<UserAchievement>;
  deleteUserAchievement(id: string): Promise<boolean>;

  // Leaderboard operations
  getLeaderboard(limit?: number): Promise<User[]>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private gameRooms: Map<string, GameRoom>;
  private gameSessions: Map<string, GameSession>;

  constructor() {
    this.users = new Map();
    this.gameRooms = new Map();
    this.gameSessions = new Map();
  }

  // User operations
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = {
      id,
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
      lastAccessed: new Date(),
      ...insertUser,
    };
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;

    const updatedUser = { ...user, ...updates };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async deleteUser(id: string): Promise<boolean> {
    return this.users.delete(id);
  }

  // Game room operations
  async createGameRoom(insertRoom: InsertGameRoom): Promise<GameRoom> {
    const id = randomUUID();
    const code = this.generateRoomCode();
    const room: GameRoom = {
      id,
      currentPlayers: 0,
      gameState: {},
      isActive: false,
      settings: {},
      createdAt: new Date(),
      ...insertRoom,
      code,
      maxPlayers: insertRoom.maxPlayers ?? 10,
    };
    this.gameRooms.set(id, room);
    return room;
  }

  async getGameRoom(id: string): Promise<GameRoom | undefined> {
    return this.gameRooms.get(id);
  }

  async getGameRoomByCode(code: string): Promise<GameRoom | undefined> {
    return Array.from(this.gameRooms.values()).find(
      (room) => room.code === code,
    );
  }

  async getAllGameRooms(): Promise<GameRoom[]> {
    return Array.from(this.gameRooms.values());
  }

  async updateGameRoom(id: string, updates: Partial<GameRoom>): Promise<GameRoom | undefined> {
    const room = this.gameRooms.get(id);
    if (!room) return undefined;

    const updatedRoom = { ...room, ...updates };
    this.gameRooms.set(id, updatedRoom);
    return updatedRoom;
  }

  async deleteGameRoom(id: string): Promise<boolean> {
    return this.gameRooms.delete(id);
  }

  // Game session operations
  async createGameSession(insertSession: InsertGameSession): Promise<GameSession> {
    const id = randomUUID();
    const session: GameSession = {
      id,
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
    this.gameSessions.set(id, session);
    return session;
  }

  async getGameSession(id: string): Promise<GameSession | undefined> {
    return this.gameSessions.get(id);
  }

  async getGameSessionsByRoom(roomId: string): Promise<GameSession[]> {
    return Array.from(this.gameSessions.values()).filter(
      (session) => session.roomId === roomId,
    );
  }

  async getGameSessionsByUser(userId: string): Promise<GameSession[]> {
    return Array.from(this.gameSessions.values()).filter(
      (session) => session.userId === userId,
    );
  }

  async updateGameSession(id: string, updates: Partial<GameSession>): Promise<GameSession | undefined> {
    const session = this.gameSessions.get(id);
    if (!session) return undefined;

    const updatedSession = { ...session, ...updates };
    this.gameSessions.set(id, updatedSession);
    return updatedSession;
  }

  async deleteGameSession(id: string): Promise<boolean> {
    return this.gameSessions.delete(id);
  }

  // Achievement operations
  async getUserAchievements(userId: string): Promise<UserAchievement[]> {
    return []; // Not implemented for MemStorage
  }

  async unlockAchievement(userId: string, achievementId: string): Promise<UserAchievement> {
    // Not implemented for MemStorage
    return {
      id: randomUUID(),
      userId,
      achievementId,
      unlockedAt: new Date()
    };
  }

  async deleteUserAchievement(id: string): Promise<boolean> {
    // Not implemented for MemStorage
    return false;
  }

  // Leaderboard operations
  async getLeaderboard(limit: number = 10): Promise<User[]> {
    return Array.from(this.users.values())
      .sort((a, b) => (b.points || 0) - (a.points || 0))
      .slice(0, limit);
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

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values({
        ...insertUser,
        level: 1,
        points: 0,
        streak: 0,
        accuracy: 0,
        wordsSpelled: 0,
        gamesWon: 0,
        gamesPlayed: 0,
        bestStreak: 0,
        achievements: [],
      })
      .returning();
    return user;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, id))
      .returning();
    return user || undefined;
  }

  async deleteUser(id: string): Promise<boolean> {
    const result = await db.delete(users).where(eq(users.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Game room operations
  async createGameRoom(insertRoom: InsertGameRoom): Promise<GameRoom> {
    const code = this.generateRoomCode();
    const [room] = await db
      .insert(gameRooms)
      .values({
        ...insertRoom,
        code,
        currentPlayers: 0,
        gameState: {},
        isActive: false,
        settings: {},
        maxPlayers: insertRoom.maxPlayers ?? 10,
      })
      .returning();
    return room;
  }

  async getGameRoom(id: string): Promise<GameRoom | undefined> {
    const [room] = await db.select().from(gameRooms).where(eq(gameRooms.id, id));
    return room || undefined;
  }

  async getGameRoomByCode(code: string): Promise<GameRoom | undefined> {
    const [room] = await db.select().from(gameRooms).where(eq(gameRooms.code, code));
    return room || undefined;
  }

  async getAllGameRooms(): Promise<GameRoom[]> {
    const rooms = await db.select().from(gameRooms);
    return rooms;
  }

  async updateGameRoom(id: string, updates: Partial<GameRoom>): Promise<GameRoom | undefined> {
    const [room] = await db
      .update(gameRooms)
      .set(updates)
      .where(eq(gameRooms.id, id))
      .returning();
    return room || undefined;
  }

  async deleteGameRoom(id: string): Promise<boolean> {
    const result = await db.delete(gameRooms).where(eq(gameRooms.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Game session operations
  async createGameSession(insertSession: InsertGameSession): Promise<GameSession> {
    const [session] = await db
      .insert(gameSessions)
      .values({
        ...insertSession,
        score: 0,
        correctAnswers: 0,
        totalAnswers: 0,
        hintsUsed: 0,
        timeElapsed: 0,
        isComplete: false,
      })
      .returning();
    return session;
  }

  async getGameSession(id: string): Promise<GameSession | undefined> {
    const [session] = await db.select().from(gameSessions).where(eq(gameSessions.id, id));
    return session || undefined;
  }

  async getGameSessionsByRoom(roomId: string): Promise<GameSession[]> {
    return await db.select().from(gameSessions).where(eq(gameSessions.roomId, roomId));
  }

  async getGameSessionsByUser(userId: string): Promise<GameSession[]> {
    return await db.select().from(gameSessions).where(eq(gameSessions.userId, userId));
  }

  async updateGameSession(id: string, updates: Partial<GameSession>): Promise<GameSession | undefined> {
    const [session] = await db
      .update(gameSessions)
      .set(updates)
      .where(eq(gameSessions.id, id))
      .returning();
    return session || undefined;
  }

  async deleteGameSession(id: string): Promise<boolean> {
    const result = await db.delete(gameSessions).where(eq(gameSessions.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Achievement operations
  async getUserAchievements(userId: string): Promise<UserAchievement[]> {
    return await db.select().from(userAchievements).where(eq(userAchievements.userId, userId));
  }

  async unlockAchievement(userId: string, achievementId: string): Promise<UserAchievement> {
    try {
      const [achievement] = await db
        .insert(userAchievements)
        .values({
          userId,
          achievementId
        })
        .returning();
      return achievement;
    } catch (error: any) {
      // If duplicate, just return the existing record
      if (error?.code === '23505') { // PostgreSQL unique violation error code
        const [existing] = await db
          .select()
          .from(userAchievements)
          .where(sql`${userAchievements.userId} = ${userId} AND ${userAchievements.achievementId} = ${achievementId}`)
          .limit(1);
        return existing;
      }
      throw error;
    }
  }

  async deleteUserAchievement(id: string): Promise<boolean> {
    const result = await db.delete(userAchievements).where(eq(userAchievements.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Leaderboard operations
  async getLeaderboard(limit: number = 10): Promise<User[]> {
    return await db
      .select()
      .from(users)
      .orderBy(desc(users.points))
      .limit(limit);
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

export const storage = new DatabaseStorage();
