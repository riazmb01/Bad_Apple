import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  level: integer("level").default(1),
  points: integer("points").default(0),
  streak: integer("streak").default(0),
  accuracy: integer("accuracy").default(0),
  wordsSpelled: integer("words_spelled").default(0),
  gamesWon: integer("games_won").default(0),
  bestStreak: integer("best_streak").default(0),
  achievements: jsonb("achievements").default([]),
  createdAt: timestamp("created_at").defaultNow(),
});

export const gameRooms = pgTable("game_rooms", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  code: varchar("code", { length: 10 }).notNull().unique(),
  hostId: varchar("host_id").references(() => users.id).notNull(),
  gameMode: varchar("game_mode").notNull(), // "spelling", "grammar", "competition"
  difficulty: varchar("difficulty").notNull(), // "beginner", "intermediate", "advanced", "expert"
  maxPlayers: integer("max_players").default(10),
  currentPlayers: integer("current_players").default(0),
  gameState: jsonb("game_state").default({}),
  isActive: boolean("is_active").default(false),
  settings: jsonb("settings").default({}),
  createdAt: timestamp("created_at").defaultNow(),
});

export const gameSessions = pgTable("game_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  roomId: varchar("room_id").references(() => gameRooms.id).notNull(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  score: integer("score").default(0),
  correctAnswers: integer("correct_answers").default(0),
  totalAnswers: integer("total_answers").default(0),
  hintsUsed: integer("hints_used").default(0),
  timeElapsed: integer("time_elapsed").default(0),
  isComplete: boolean("is_complete").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertGameRoomSchema = createInsertSchema(gameRooms).omit({
  id: true,
  createdAt: true,
  currentPlayers: true,
});

export const insertGameSessionSchema = createInsertSchema(gameSessions).omit({
  id: true,
  createdAt: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type GameRoom = typeof gameRooms.$inferSelect;
export type InsertGameRoom = z.infer<typeof insertGameRoomSchema>;
export type GameSession = typeof gameSessions.$inferSelect;
export type InsertGameSession = z.infer<typeof insertGameSessionSchema>;

// Game-specific types
export interface Word {
  id: string;
  word: string;
  definition: string;
  partOfSpeech: string;
  difficulty: "beginner" | "intermediate" | "advanced" | "expert";
  exampleSentence: string;
  pronunciation: string;
  syllables: number;
}

export interface GameState {
  currentRound: number;
  totalRounds: number;
  currentWord?: Word;
  timeLeft: number;
  isActive: boolean;
  players: PlayerState[];
  gameMode: "spelling" | "grammar" | "competition";
  difficulty: "beginner" | "intermediate" | "advanced" | "expert";
}

export interface PlayerState {
  userId: string;
  username: string;
  score: number;
  isReady: boolean;
  isActive: boolean;
  currentAnswer?: string;
  hintsUsed: number;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  points: number;
  unlockedAt?: Date;
}

export interface GameSettings {
  timePerWord: number;
  hintsEnabled: boolean;
  competitionType: "elimination" | "timed" | "team" | "relay";
  maxHints: number;
  pointsPerCorrect: number;
  pointsPerHint: number;
}
