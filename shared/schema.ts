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
  gamesPlayed: integer("games_played").default(0),
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
  isReady: boolean("is_ready").default(true),
  isComplete: boolean("is_complete").default(false),
  isConnected: boolean("is_connected").default(true),
  disconnectedAt: timestamp("disconnected_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const achievements = pgTable("achievements", {
  id: varchar("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  icon: text("icon").notNull(),
  criteria: jsonb("criteria").notNull(),
});

export const userAchievements = pgTable("user_achievements", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  achievementId: varchar("achievement_id").references(() => achievements.id).notNull(),
  unlockedAt: timestamp("unlocked_at").defaultNow(),
}, (table) => ({
  uniqueUserAchievement: sql`UNIQUE (${table.userId}, ${table.achievementId})`,
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertGameRoomSchema = createInsertSchema(gameRooms).omit({
  id: true,
  code: true,
  createdAt: true,
  currentPlayers: true,
});

export const insertGameSessionSchema = createInsertSchema(gameSessions).omit({
  id: true,
  createdAt: true,
});

export const insertAchievementSchema = createInsertSchema(achievements);

export const insertUserAchievementSchema = createInsertSchema(userAchievements).omit({
  id: true,
  unlockedAt: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type GameRoom = typeof gameRooms.$inferSelect;
export type InsertGameRoom = z.infer<typeof insertGameRoomSchema>;
export type GameSession = typeof gameSessions.$inferSelect;
export type InsertGameSession = z.infer<typeof insertGameSessionSchema>;
export type Achievement = typeof achievements.$inferSelect;
export type InsertAchievement = z.infer<typeof insertAchievementSchema>;
export type UserAchievement = typeof userAchievements.$inferSelect;
export type InsertUserAchievement = z.infer<typeof insertUserAchievementSchema>;

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
  avatar?: string;
  score: number;
  isReady: boolean;
  isActive: boolean;
  isConnected?: boolean;
  currentAnswer?: string;
  hintsUsed: number;
}

export interface AchievementWithStatus extends Achievement {
  unlocked: boolean;
  unlockedAt?: Date;
}

export const ACHIEVEMENT_DEFINITIONS = [
  {
    id: "first_word",
    name: "First Steps",
    description: "Spell your first word correctly",
    icon: "🌟",
    criteria: { type: "words_spelled", count: 1 }
  },
  {
    id: "word_warrior",
    name: "Word Warrior",
    description: "Spell 50 words correctly",
    icon: "⚔️",
    criteria: { type: "words_spelled", count: 50 }
  },
  {
    id: "spelling_master",
    name: "Spelling Master",
    description: "Spell 200 words correctly",
    icon: "👑",
    criteria: { type: "words_spelled", count: 200 }
  },
  {
    id: "perfectionist",
    name: "Perfectionist",
    description: "Achieve 100% accuracy in a game",
    icon: "💯",
    criteria: { type: "perfect_accuracy", count: 1 }
  },
  {
    id: "speedster",
    name: "Speedster",
    description: "Complete a game with more than 30 seconds remaining",
    icon: "⚡",
    criteria: { type: "time_remaining", seconds: 30 }
  },
  {
    id: "streak_starter",
    name: "Streak Starter",
    description: "Get 5 words correct in a row",
    icon: "🔥",
    criteria: { type: "streak", count: 5 }
  },
  {
    id: "hot_streak",
    name: "Hot Streak",
    description: "Get 10 words correct in a row",
    icon: "🔥🔥",
    criteria: { type: "streak", count: 10 }
  },
  {
    id: "on_fire",
    name: "On Fire!",
    description: "Get 20 words correct in a row",
    icon: "🔥🔥🔥",
    criteria: { type: "streak", count: 20 }
  },
  {
    id: "century_club",
    name: "Century Club",
    description: "Score 100 points in a single game",
    icon: "💰",
    criteria: { type: "game_score", points: 100 }
  },
  {
    id: "dedicated",
    name: "Dedicated",
    description: "Play 10 games",
    icon: "🎮",
    criteria: { type: "games_played", count: 10 }
  },
  {
    id: "level_up",
    name: "Level Up",
    description: "Reach level 5",
    icon: "📈",
    criteria: { type: "level", level: 5 }
  },
  {
    id: "scholar",
    name: "Scholar",
    description: "Reach level 10",
    icon: "🎓",
    criteria: { type: "level", level: 10 }
  },
  {
    id: "word_collector",
    name: "Word Collector",
    description: "Spell 100 unique words",
    icon: "📚",
    criteria: { type: "words_spelled", count: 100 }
  },
  {
    id: "time_manager",
    name: "Time Manager",
    description: "Complete 5 games without running out of time",
    icon: "⏱️",
    criteria: { type: "games_completed", count: 5 }
  },
  {
    id: "accuracy_ace",
    name: "Accuracy Ace",
    description: "Maintain 90% accuracy or higher",
    icon: "🎯",
    criteria: { type: "accuracy", percentage: 90 }
  }
] as const;

export interface GameSettings {
  timePerWord: number;
  hintsEnabled: boolean;
  competitionType: "elimination" | "timed" | "team" | "relay";
  maxHints: number;
  pointsPerCorrect: number;
  pointsPerHint: number;
}
