import { z } from "zod";

// MongoDB document interfaces
export interface UserDocument {
  _id: string; // MongoDB ObjectId as string, or custom ID
  id?: string; // Alias for _id for compatibility
  username: string;
  password: string;
  level: number;
  points: number;
  streak: number;
  accuracy: number;
  wordsSpelled: number;
  gamesWon: number;
  gamesPlayed: number;
  bestStreak: number;
  totalCorrect: number;
  totalAttempts: number;
  achievements: any[];
  createdAt: Date;
}

export interface GameRoomDocument {
  _id: string;
  id?: string; // Alias for _id for compatibility
  code: string;
  hostId: string;
  gameMode: string;
  difficulty: string;
  maxPlayers: number;
  currentPlayers: number;
  gameState: any;
  isActive: boolean;
  settings: any;
  createdAt: Date;
}

export interface GameSessionDocument {
  _id: string;
  id?: string; // Alias for _id for compatibility
  roomId: string;
  userId: string;
  score: number;
  correctAnswers: number;
  totalAnswers: number;
  currentStreak: number;
  bestStreak: number;
  hintsUsed: number;
  timeElapsed: number;
  isReady: boolean;
  isComplete: boolean;
  isConnected: boolean;
  isEliminated: boolean;
  eliminatedAt: Date | null;
  disconnectedAt: Date | null;
  createdAt: Date;
}

export interface AchievementDocument {
  _id: string;
  id?: string; // Alias for _id for compatibility
  name: string;
  description: string;
  icon: string;
  criteria: any;
}

export interface UserAchievementDocument {
  _id: string;
  id?: string; // Alias for _id for compatibility
  userId: string;
  achievementId: string;
  unlockedAt: Date;
}

// Zod schemas for validation (replacing Drizzle's createInsertSchema)
export const insertUserSchema = z.object({
  username: z.string(),
  password: z.string(),
  level: z.number().optional(),
  points: z.number().optional(),
  streak: z.number().optional(),
  accuracy: z.number().optional(),
  wordsSpelled: z.number().optional(),
  gamesWon: z.number().optional(),
  gamesPlayed: z.number().optional(),
  bestStreak: z.number().optional(),
  totalCorrect: z.number().optional(),
  totalAttempts: z.number().optional(),
  achievements: z.array(z.any()).optional(),
});

export const insertGameRoomSchema = z.object({
  hostId: z.string(),
  gameMode: z.string(),
  difficulty: z.string(),
  maxPlayers: z.number().optional(),
  gameState: z.any().optional(),
  isActive: z.boolean().optional(),
  settings: z.any().optional(),
});

export const insertGameSessionSchema = z.object({
  roomId: z.string(),
  userId: z.string(),
  score: z.number().optional(),
  correctAnswers: z.number().optional(),
  totalAnswers: z.number().optional(),
  currentStreak: z.number().optional(),
  bestStreak: z.number().optional(),
  hintsUsed: z.number().optional(),
  timeElapsed: z.number().optional(),
  isReady: z.boolean().optional(),
  isComplete: z.boolean().optional(),
  isConnected: z.boolean().optional(),
  isEliminated: z.boolean().optional(),
  eliminatedAt: z.date().nullable().optional(),
  disconnectedAt: z.date().nullable().optional(),
});

export const insertAchievementSchema = z.object({
  _id: z.string(),
  name: z.string(),
  description: z.string(),
  icon: z.string(),
  criteria: z.any(),
});

export const insertUserAchievementSchema = z.object({
  userId: z.string(),
  achievementId: z.string(),
});

// Types inferred from schemas
export type User = UserDocument;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type GameRoom = GameRoomDocument;
export type InsertGameRoom = z.infer<typeof insertGameRoomSchema>;
export type GameSession = GameSessionDocument;
export type InsertGameSession = z.infer<typeof insertGameSessionSchema>;
export type Achievement = AchievementDocument;
export type InsertAchievement = z.infer<typeof insertAchievementSchema>;
export type UserAchievement = UserAchievementDocument;
export type InsertUserAchievement = z.infer<typeof insertUserAchievementSchema>;

// Game-specific types (kept from original schema)
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
  competitionType?: "elimination" | "timed" | "team" | "relay";
  globalTimer?: number;
  timerStartedAt?: number;
}

export interface PlayerState {
  userId: string;
  username: string;
  avatar?: string;
  score: number;
  isReady: boolean;
  isActive: boolean;
  isConnected?: boolean;
  isEliminated?: boolean;
  eliminatedAt?: number;
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
