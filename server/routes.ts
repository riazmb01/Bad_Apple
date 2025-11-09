import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { insertUserSchema, insertGameRoomSchema, insertGameSessionSchema, type GameState, type PlayerState, type Word, type GameSession, ACHIEVEMENT_DEFINITIONS, type AchievementWithStatus } from "@shared/schema";
import { getWordsCollection, getGrammarCollection } from "./mongodb";

interface WebSocketClient extends WebSocket {
  userId?: string;
  roomId?: string;
  username?: string;
}

interface GameMessage {
  type: string;
  payload: any;
  roomId?: string;
  userId?: string;
}

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  // Periodic cleanup for old/inactive rooms (every 5 minutes)
  const ROOM_EXPIRY_TIME = 60 * 60 * 1000; // 1 hour in milliseconds
  const CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 minutes
  const INACTIVE_USER_THRESHOLD = 90 * 24 * 60 * 60 * 1000; // 90 days in milliseconds
  const USER_CLEANUP_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours

  async function cleanupOldRooms() {
    try {
      // Get all rooms
      const allRooms = await storage.getAllGameRooms();
      
      // Check each room for expiry
      for (const room of allRooms) {
        if (room.createdAt) {
          const roomAge = Date.now() - new Date(room.createdAt).getTime();
          const roomSessions = await storage.getGameSessionsByRoom(room.id);
          
          // Delete room if it's old AND (empty OR never started)
          if (roomAge > ROOM_EXPIRY_TIME && (roomSessions.length === 0 || !room.isActive)) {
            console.log(`Cleaning up old room ${room.id}, age: ${Math.floor(roomAge / 60000)} minutes`);
            
            // Clean up all sessions first
            for (const session of roomSessions) {
              await storage.deleteGameSession(session.id);
            }
            
            // Clean up hint tracking before deleting room
            resetRoomHints(room.id);
            
            // Then delete the room
            await storage.deleteGameRoom(room.id);
          }
        }
      }
    } catch (error) {
      console.error('Error during room cleanup:', error);
    }
  }

  // Cleanup inactive users function
  async function cleanupInactiveUsers() {
    try {
      const allUsers = await storage.getAllUsers();
      const now = Date.now();
      let deletedCount = 0;
      
      for (const user of allUsers) {
        // Skip users with null/undefined lastAccessed timestamp
        if (!user.lastAccessed) continue;
        
        const inactiveDuration = now - new Date(user.lastAccessed).getTime();
        
        // Delete user if inactive for more than 90 days
        if (inactiveDuration > INACTIVE_USER_THRESHOLD) {
          console.log(`Cleaning up inactive user ${user.username}, last accessed: ${Math.floor(inactiveDuration / (24 * 60 * 60 * 1000))} days ago`);
          
          // Clean up user's achievements first
          const achievements = await storage.getUserAchievements(user.id);
          for (const achievement of achievements) {
            await storage.deleteUserAchievement(achievement.id);
          }
          
          // Clean up user's game sessions
          const sessions = await storage.getGameSessionsByUser(user.id);
          for (const session of sessions) {
            await storage.deleteGameSession(session.id);
          }
          
          // Delete the user
          await storage.deleteUser(user.id);
          deletedCount++;
        }
      }
      
      if (deletedCount > 0) {
        console.log(`Cleaned up ${deletedCount} inactive user(s)`);
      }
    } catch (error) {
      console.error('Error during inactive user cleanup:', error);
    }
  }

  // Start periodic cleanup
  setInterval(cleanupOldRooms, CLEANUP_INTERVAL);
  console.log('Room cleanup job started (runs every 5 minutes)');
  
  // Start inactive user cleanup (runs once a day)
  setInterval(cleanupInactiveUsers, USER_CLEANUP_INTERVAL);
  // Run immediately on startup to clean up any existing inactive users
  cleanupInactiveUsers();
  console.log('Inactive user cleanup job started (runs every 24 hours)');

  // Track active timers for global game timer (3-minute countdown)
  const activeTimers = new Map<string, NodeJS.Timeout>();
  
  // Track per-word timers for each room
  const perWordTimers = new Map<string, NodeJS.Timeout>();
  
  // Track which players have answered the current word: Map<roomId, Set<userId>>
  const playersWhoAnswered = new Map<string, Set<string>>();

  // Track hints used per word per player: Map<roomId, Map<userId, HintUsage>>
  interface HintUsage {
    firstLetter: boolean;
    definition: boolean;
    sentence: boolean;
  }
  const currentWordHints = new Map<string, Map<string, HintUsage>>();

  // Helper to get or create hint tracking for a room
  function getHintTracking(roomId: string): Map<string, HintUsage> {
    if (!currentWordHints.has(roomId)) {
      currentWordHints.set(roomId, new Map());
    }
    return currentWordHints.get(roomId)!;
  }

  // Helper to get or create hint usage for a player
  function getPlayerHints(roomId: string, userId: string): HintUsage {
    const roomHints = getHintTracking(roomId);
    if (!roomHints.has(userId)) {
      roomHints.set(userId, { firstLetter: false, definition: false, sentence: false });
    }
    return roomHints.get(userId)!;
  }

  // Helper to reset hints for all players in a room (when moving to next word)
  function resetRoomHints(roomId: string) {
    currentWordHints.delete(roomId);
  }
  
  // Helper to reset answered tracking when moving to next word
  function resetAnsweredTracking(roomId: string) {
    playersWhoAnswered.delete(roomId);
  }
  
  // Helper to mark a player as having answered the current word
  function markPlayerAnswered(roomId: string, userId: string) {
    if (!playersWhoAnswered.has(roomId)) {
      playersWhoAnswered.set(roomId, new Set());
    }
    playersWhoAnswered.get(roomId)!.add(userId);
  }
  
  // Helper to check if a player has answered the current word
  function hasPlayerAnswered(roomId: string, userId: string): boolean {
    return playersWhoAnswered.get(roomId)?.has(userId) || false;
  }

  // Start a countdown timer for global 3-minute game timer
  function startTimedChallengeTimer(roomId: string, duration: number) {
    // Clear any existing timer for this room
    if (activeTimers.has(roomId)) {
      clearInterval(activeTimers.get(roomId)!);
    }

    let timeRemaining = duration;
    
    const timerInterval = setInterval(async () => {
      timeRemaining--;

      // Update game state with new timer value
      const room = await storage.getGameRoom(roomId);
      if (!room || !room.gameState) {
        clearInterval(timerInterval);
        activeTimers.delete(roomId);
        return;
      }

      const gameState = room.gameState as GameState;
      gameState.globalTimer = timeRemaining;

      await storage.updateGameRoom(roomId, {
        gameState: gameState
      });

      // Broadcast timer update to all players
      broadcastToRoom(roomId, {
        type: 'timer_update',
        payload: { timeRemaining }
      });

      // End game when timer reaches 0
      if (timeRemaining <= 0) {
        clearInterval(timerInterval);
        activeTimers.delete(roomId);
        await endGame(roomId);
      }
    }, 1000); // Update every second

    activeTimers.set(roomId, timerInterval);
  }
  
  // Start per-word timer that counts down for each question
  function startPerWordTimer(roomId: string) {
    // Clear any existing per-word timer for this room
    if (perWordTimers.has(roomId)) {
      clearInterval(perWordTimers.get(roomId)!);
    }
    
    const timerInterval = setInterval(async () => {
      const room = await storage.getGameRoom(roomId);
      if (!room || !room.gameState) {
        clearInterval(timerInterval);
        perWordTimers.delete(roomId);
        return;
      }

      const gameState = room.gameState as GameState;
      gameState.timeLeft = (gameState.timeLeft || 0) - 1;

      await storage.updateGameRoom(roomId, {
        gameState: gameState
      });

      // Broadcast per-word timer update
      broadcastToRoom(roomId, {
        type: 'word_timer_update',
        payload: { timeLeft: gameState.timeLeft }
      });

      // When per-word timer reaches 0
      if (gameState.timeLeft <= 0) {
        clearInterval(timerInterval);
        perWordTimers.delete(roomId);
        
        const isEliminationMode = gameState.competitionType === 'elimination';
        
        if (isEliminationMode) {
          // In elimination mode, eliminate only players who haven't answered yet
          const sessions = await storage.getGameSessionsByRoom(roomId);
          for (const session of sessions) {
            // Only eliminate if player hasn't answered AND is not already eliminated
            if (!session.isEliminated && !hasPlayerAnswered(roomId, session.userId)) {
              // Mark player as eliminated
              await storage.updateGameSession(session.id, {
                isEliminated: true
              });
              
              // Broadcast elimination
              broadcastToRoom(roomId, {
                type: 'player_eliminated',
                payload: {
                  userId: session.userId,
                  reason: 'Time ran out'
                }
              });
            }
          }
          
          // Check if only one player remains
          const updatedSessions = await storage.getGameSessionsByRoom(roomId);
          const activePlayers = updatedSessions.filter(s => !s.isEliminated);
          if (activePlayers.length <= 1) {
            await endGame(roomId);
            return;
          }
        }
        
        // Move to next round after a brief delay
        setTimeout(() => {
          nextRound(roomId);
        }, 2000);
      }
    }, 1000); // Update every second

    perWordTimers.set(roomId, timerInterval);
  }

  // WebSocket connection handling
  wss.on('connection', (ws: WebSocketClient) => {
    console.log('New WebSocket connection');

    ws.on('message', async (data) => {
      try {
        const message: GameMessage = JSON.parse(data.toString());
        await handleWebSocketMessage(ws, message);
      } catch (error) {
        console.error('WebSocket message error:', error);
        ws.send(JSON.stringify({
          type: 'error',
          payload: { message: 'Invalid message format' }
        }));
      }
    });

    ws.on('close', () => {
      console.log('WebSocket connection closed');
      if (ws.roomId && ws.userId) {
        handlePlayerLeave(ws.roomId, ws.userId);
      }
    });
  });

  // Helper function to generate avatar initials from username
  function getAvatarInitials(name: string): string {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  }

  async function handleWebSocketMessage(ws: WebSocketClient, message: GameMessage) {
    console.log('[WS_MESSAGE] Received:', message.type, message.payload);
    
    switch (message.type) {
      case 'create_room':
        console.log('[CREATE_ROOM_HANDLER] Processing create_room request');
        await handleCreateRoom(ws, message.payload);
        break;
      case 'join_room':
        await handleJoinRoom(ws, message.payload);
        break;
      case 'leave_room':
        await handleLeaveRoom(ws, message.payload);
        break;
      case 'restart_game':
        await handleRestartGame(ws, message.payload);
        break;
      case 'start_game':
        await handleStartGame(ws, message.payload);
        break;
      case 'submit_answer':
        await handleSubmitAnswer(ws, message.payload);
        break;
      case 'skip_word':
        await handleSkipWord(ws, message.payload);
        break;
      case 'use_hint':
        await handleUseHint(ws, message.payload);
        break;
      case 'player_ready':
        await handlePlayerReady(ws, message.payload);
        break;
      case 'update_settings':
        await handleUpdateSettings(ws, message.payload);
        break;
      default:
        ws.send(JSON.stringify({
          type: 'error',
          payload: { message: 'Unknown message type' }
        }));
    }
  }

  async function handleCreateRoom(ws: WebSocketClient, payload: any) {
    console.log('[HANDLE_CREATE_ROOM] Starting with payload:', payload);
    
    const { hostId, username, gameMode, difficulty, settings } = payload;
    
    console.log('[HANDLE_CREATE_ROOM] Extracted values:', { hostId, username, gameMode, difficulty, settings });
    
    try {
      console.log('[HANDLE_CREATE_ROOM] Creating game room in storage...');
      const room = await storage.createGameRoom({
        hostId,
        gameMode,
        difficulty,
        maxPlayers: settings?.maxPlayers || 10,
        settings: settings || {}
      });
      
      console.log('[HANDLE_CREATE_ROOM] Room created successfully:', room);

      ws.userId = hostId;
      ws.roomId = room.id;
      ws.username = username;

      // Host automatically joins their own room
      await storage.updateGameRoom(room.id, {
        currentPlayers: 1
      });

      // Create game session for host
      await storage.createGameSession({
        roomId: room.id,
        userId: hostId
      });

      // Build host player data with avatar
      const players = [{
        userId: hostId,
        username: username,
        avatar: getAvatarInitials(username),
        score: 0,
        isReady: true,
        isActive: true,
        isConnected: true,
        hintsUsed: 0
      }];

      ws.send(JSON.stringify({
        type: 'room_created',
        payload: { 
          room,
          isHost: true,
          players
        }
      }));
    } catch (error) {
      console.error('[HANDLE_CREATE_ROOM] Error creating room:', error);
      ws.send(JSON.stringify({
        type: 'error',
        payload: { message: 'Failed to create room' }
      }));
    }
  }

  async function handleUpdateSettings(ws: WebSocketClient, payload: any) {
    if (!ws.roomId) return;

    const room = await storage.getGameRoom(ws.roomId);
    if (!room || room.hostId !== ws.userId) {
      ws.send(JSON.stringify({
        type: 'error',
        payload: { message: 'Not authorized to update settings' }
      }));
      return;
    }

    await storage.updateGameRoom(room.id, {
      settings: payload.settings
    });

    broadcastToRoom(room.id, {
      type: 'settings_updated',
      payload: { settings: payload.settings }
    });
  }

  async function handleJoinRoom(ws: WebSocketClient, payload: any) {
    const { roomCode, userId, username } = payload;
    
    const room = await storage.getGameRoomByCode(roomCode);
    if (!room) {
      ws.send(JSON.stringify({
        type: 'error',
        payload: { message: 'Room not found' }
      }));
      return;
    }

    ws.userId = userId;
    ws.roomId = room.id;
    ws.username = username;

    // Check if player has existing session (reconnection)
    const sessions = await storage.getGameSessionsByRoom(room.id);
    const existingSession = sessions.find(s => s.userId === userId);
    
    if (existingSession && !existingSession.isConnected) {
      // Reconnection - restore player's session
      await storage.updateGameSession(existingSession.id, {
        isConnected: true,
        disconnectedAt: null
      });

      // Get updated player list
      const updatedSessions = await storage.getGameSessionsByRoom(room.id);
      const players = await getPlayerList(updatedSessions);

      // Broadcast reconnection
      broadcastToRoom(room.id, {
        type: 'player_reconnected',
        payload: { userId, username, players }
      });

      // Send room info to reconnecting player
      ws.send(JSON.stringify({
        type: 'room_joined',
        payload: { 
          room,
          isHost: room.hostId === userId,
          players,
          gameState: room.gameState
        }
      }));
      return;
    }

    // New player joining
    // Check if player already has a session (e.g., host auto-joining after room creation)
    const existingActiveSession = sessions.find(s => s.userId === userId);
    if (existingActiveSession) {
      // Player already has a session, just send room info back (no broadcast needed)
      const players = await getPlayerList(sessions);
      ws.send(JSON.stringify({
        type: 'room_joined',
        payload: { 
          room,
          isHost: room.hostId === userId,
          players,
          gameState: room.gameState
        }
      }));
      return;
    }
    
    if ((room.currentPlayers || 0) >= (room.maxPlayers || 10)) {
      ws.send(JSON.stringify({
        type: 'error',
        payload: { message: 'Room is full' }
      }));
      return;
    }

    if (room.isActive) {
      ws.send(JSON.stringify({
        type: 'error',
        payload: { message: 'Game already in progress' }
      }));
      return;
    }

    // Update room player count
    await storage.updateGameRoom(room.id, {
      currentPlayers: (room.currentPlayers || 0) + 1
    });

    // Create game session for player
    await storage.createGameSession({
      roomId: room.id,
      userId: userId
    });

    // Get all current players in the room
    const updatedSessions = await storage.getGameSessionsByRoom(room.id);
    const players = await getPlayerList(updatedSessions);

    // Broadcast to room that new player joined
    broadcastToRoom(room.id, {
      type: 'player_joined',
      payload: { userId, username, players }
    });

    // Send room info to joining player
    ws.send(JSON.stringify({
      type: 'room_joined',
      payload: { 
        room,
        isHost: room.hostId === userId,
        players
      }
    }));
  }

  async function handleLeaveRoom(ws: WebSocketClient, payload: any) {
    if (!ws.roomId || !ws.userId) return;
    
    const roomId = ws.roomId;
    const userId = ws.userId;
    const room = await storage.getGameRoom(roomId);
    if (!room) return;

    // Find and delete the player's game session (explicit leave, not disconnect)
    const sessions = await storage.getGameSessionsByRoom(roomId);
    const userSession = sessions.find(s => s.userId === userId);
    if (userSession) {
      await storage.deleteGameSession(userSession.id);
    }

    // Update room player count
    const newPlayerCount = Math.max(0, (room.currentPlayers || 0) - 1);
    await storage.updateGameRoom(roomId, {
      currentPlayers: newPlayerCount
    });

    // Check if room is now empty and clean it up
    const remainingSessions = await storage.getGameSessionsByRoom(roomId);
    if (remainingSessions.length === 0) {
      console.log(`Room ${roomId} is empty after player left, cleaning up...`);
      resetRoomHints(roomId);
      await storage.deleteGameRoom(roomId);
    } else {
      // Get updated player list and broadcast
      const players = await getPlayerList(remainingSessions);
      broadcastToRoom(roomId, {
        type: 'player_left',
        payload: { userId, players }
      });
    }
  }

  async function handleRestartGame(ws: WebSocketClient, payload: any) {
    if (!ws.roomId) return;

    const room = await storage.getGameRoom(ws.roomId);
    if (!room) return;

    // Reset room to inactive state
    await storage.updateGameRoom(room.id, {
      isActive: false,
      gameState: null
    });

    // Delete all game sessions
    const sessions = await storage.getGameSessionsByRoom(room.id);
    for (const session of sessions) {
      await storage.deleteGameSession(session.id);
    }

    // Clean up timers and tracking
    resetRoomHints(room.id);
    resetAnsweredTracking(room.id);
    if (activeTimers.has(room.id)) {
      clearInterval(activeTimers.get(room.id)!);
      activeTimers.delete(room.id);
    }
    if (perWordTimers.has(room.id)) {
      clearInterval(perWordTimers.get(room.id)!);
      perWordTimers.delete(room.id);
    }

    // Broadcast restart to all players
    broadcastToRoom(room.id, {
      type: 'game_restarted',
      payload: { roomCode: room.code }
    });
  }

  async function handlePlayerLeave(roomId: string, userId: string) {
    const room = await storage.getGameRoom(roomId);
    if (!room) return;

    // Find and mark the player as disconnected
    const sessions = await storage.getGameSessionsByRoom(roomId);
    const userSession = sessions.find(s => s.userId === userId);
    if (userSession) {
      await storage.updateGameSession(userSession.id, {
        isConnected: false,
        disconnectedAt: new Date()
      });

      // Set timeout to remove player after 2 minutes if they don't reconnect
      setTimeout(async () => {
        const session = await storage.getGameSession(userSession.id);
        if (session && !session.isConnected) {
          await storage.deleteGameSession(userSession.id);
          
          // Update room player count
          const newPlayerCount = Math.max(0, (room.currentPlayers || 0) - 1);
          await storage.updateGameRoom(roomId, {
            currentPlayers: newPlayerCount
          });

          // Check if room is now empty and clean it up
          const remainingSessions = await storage.getGameSessionsByRoom(roomId);
          if (remainingSessions.length === 0) {
            console.log(`Room ${roomId} is empty, cleaning up...`);
            resetRoomHints(roomId);
            await storage.deleteGameRoom(roomId);
          } else {
            // Broadcast player removed
            const players = await getPlayerList(remainingSessions);
            broadcastToRoom(roomId, {
              type: 'player_removed',
              payload: { userId, players }
            });
          }
        }
      }, 120000); // 2 minutes
    }

    // Get updated player list including disconnected players
    const updatedSessions = await storage.getGameSessionsByRoom(roomId);
    const players = await getPlayerList(updatedSessions);

    // Broadcast disconnection
    broadcastToRoom(roomId, {
      type: 'player_disconnected',
      payload: { userId, players }
    });
  }

  async function getPlayerList(sessions: GameSession[]) {
    return Promise.all(
      sessions.map(async (session) => {
        const client = Array.from(wss.clients).find(
          (c) => (c as WebSocketClient).userId === session.userId
        ) as WebSocketClient | undefined;
        
        return {
          userId: session.userId,
          username: client?.username || 'Player',
          avatar: getAvatarInitials(client?.username || 'Player'),
          score: session.score || 0,
          isReady: session.isReady ?? true,
          isActive: session.isConnected || false,
          isConnected: session.isConnected || false,
          isEliminated: session.isEliminated || false,
          eliminatedAt: session.eliminatedAt ? session.eliminatedAt.getTime() : undefined,
          hintsUsed: session.hintsUsed || 0
        };
      })
    );
  }

  async function handleStartGame(ws: WebSocketClient, payload: any) {
    if (!ws.roomId) return;

    const room = await storage.getGameRoomByCode(payload.roomCode);
    if (!room || room.hostId !== ws.userId) {
      ws.send(JSON.stringify({
        type: 'error',
        payload: { message: 'Not authorized to start game' }
      }));
      return;
    }

    try {
      // Reset hints for new game to prevent stale data from previous games
      resetRoomHints(room.id);
      
      const settings = room.settings as any || {};
      const competitionType = settings.competitionType || 'elimination';
      const timePerWord = parseInt(settings.timeLimit) || 45;
      
      // All multiplayer games have a 3-minute total time limit
      const globalTimerDuration = 180; // 3 minutes in seconds
      
      const gameState: GameState = {
        currentRound: 1,
        totalRounds: 999, // Unlimited rounds - game ends on timer expiry or elimination only
        timeLeft: timePerWord,
        isActive: true,
        players: [],
        gameMode: room.gameMode as any,
        difficulty: room.difficulty as any,
        competitionType: competitionType,
        currentWord: await getRandomWord(room.difficulty as any),
        globalTimer: globalTimerDuration,
        timerStartedAt: Date.now()
      };

      await storage.updateGameRoom(room.id, {
        isActive: true,
        gameState: gameState
      });

      // Start global 3-minute timer for all multiplayer games
      startTimedChallengeTimer(room.id, globalTimerDuration);
      
      // Start per-word timer
      startPerWordTimer(room.id);

      broadcastToRoom(room.id, {
        type: 'game_started',
        payload: { gameState }
      });
    } catch (error) {
      console.error('Failed to start game - words unavailable:', error);
      broadcastToRoom(room.id, {
        type: 'error',
        payload: { message: 'Game mode unavailable - words cannot be fetched from database. Please try again later.' }
      });
    }
  }

  async function handleSubmitAnswer(ws: WebSocketClient, payload: any) {
    if (!ws.roomId || !ws.userId) return;

    const { answer } = payload;
    const room = await storage.getGameRoom(ws.roomId);
    if (!room || !room.gameState) return;

    const gameState = room.gameState as GameState;
    const currentWord = gameState.currentWord;
    const isEliminationMode = gameState.competitionType === 'elimination';
    
    if (!currentWord) return;

    // Update game session
    const sessions = await storage.getGameSessionsByRoom(room.id);
    const userSession = sessions.find(s => s.userId === ws.userId);
    
    console.log('[SESSION_CHECK]', {
      totalSessions: sessions.length,
      userSessionFound: !!userSession,
      userId: ws.userId,
      sessionUserIds: sessions.map(s => s.userId)
    });
    
    // Reject submissions from already-eliminated players
    if (userSession?.isEliminated) {
      ws.send(JSON.stringify({
        type: 'error',
        payload: { message: 'You have been eliminated and cannot submit answers' }
      }));
      return;
    }
    
    // Mark player as having answered this word
    markPlayerAnswered(room.id, ws.userId);

    const isCorrect = answer.toLowerCase() === currentWord.word.toLowerCase();
    
    // Calculate points based on hints used for this word
    let points = 0;
    if (isCorrect) {
      points = 10; // Base points for correct answer
      
      // Get hints used for this word
      const playerHints = getPlayerHints(room.id, ws.userId);
      
      // Deduct points for each hint used
      if (playerHints.firstLetter) points -= 2;
      if (playerHints.definition) points -= 3;
      if (playerHints.sentence) points -= 4;
      
      // Ensure minimum of 1 point for correct answer
      points = Math.max(points, 1);
    }
    
    // Debug logging for answer checking
    console.log('[ANSWER_CHECK]', {
      submittedAnswer: answer,
      correctWord: currentWord.word,
      submittedLower: answer.toLowerCase(),
      correctLower: currentWord.word.toLowerCase(),
      isCorrect,
      points,
      isEliminationMode,
      userId: ws.userId,
      username: ws.username
    });
    
    if (userSession) {
      // Update streak tracking
      let newCurrentStreak = userSession.currentStreak || 0;
      let newBestStreak = userSession.bestStreak || 0;
      
      if (isCorrect) {
        newCurrentStreak += 1;
        newBestStreak = Math.max(newBestStreak, newCurrentStreak);
      } else {
        newCurrentStreak = 0; // Reset streak on incorrect answer
      }
      
      const updates: Partial<GameSession> = {
        score: (userSession.score || 0) + points,
        correctAnswers: (userSession.correctAnswers || 0) + (isCorrect ? 1 : 0),
        totalAnswers: (userSession.totalAnswers || 0) + 1,
        currentStreak: newCurrentStreak,
        bestStreak: newBestStreak
      };

      // In elimination mode, eliminate player if they get it wrong
      if (isEliminationMode && !isCorrect && !userSession.isEliminated) {
        console.log('[ELIMINATION]', {
          userId: ws.userId,
          username: ws.username,
          reason: 'incorrect answer in elimination mode'
        });
        updates.isEliminated = true;
        updates.eliminatedAt = new Date();
      }

      await storage.updateGameSession(userSession.id, updates);

      // Get updated session to get the new score
      const updatedSession = await storage.getGameSession(userSession.id);
      const newScore = updatedSession?.score || 0;

      console.log('[BROADCASTING_SCORE]', {
        userId: ws.userId,
        username: ws.username,
        isCorrect,
        points,
        newScore
      });

      // Broadcast answer result with updated score
      broadcastToRoom(room.id, {
        type: 'answer_submitted',
        payload: {
          userId: ws.userId,
          username: ws.username,
          answer,
          isCorrect,
          correctWord: currentWord.word,
          points,
          updatedScore: newScore
        }
      });

      // In elimination mode, if player was just eliminated, broadcast it
      if (isEliminationMode && updates.isEliminated) {
        const updatedSessions = await storage.getGameSessionsByRoom(room.id);
        const players = await getPlayerList(updatedSessions);
        
        broadcastToRoom(room.id, {
          type: 'player_eliminated',
          payload: {
            userId: ws.userId,
            username: ws.username,
            players
          }
        });

        // Check if game should end (only one player left or all eliminated)
        const activePlayers = updatedSessions.filter(s => !s.isEliminated);
        if (activePlayers.length <= 1) {
          // End game after a short delay to show elimination message
          setTimeout(() => {
            endGame(room.id);
          }, 3000);
          return;
        }
      }
    }

    // Move to next round if needed
    if (isCorrect || gameState.timeLeft <= 0) {
      // Stop the per-word timer immediately to prevent race condition
      if (perWordTimers.has(room.id)) {
        clearInterval(perWordTimers.get(room.id)!);
        perWordTimers.delete(room.id);
      }
      
      setTimeout(() => {
        nextRound(room.id);
      }, 2000);
    }
  }

  async function handleSkipWord(ws: WebSocketClient, payload: any) {
    if (!ws.roomId || !ws.userId) return;

    const room = await storage.getGameRoom(ws.roomId);
    if (!room || !room.gameState) return;

    const gameState = room.gameState as GameState;
    const currentWord = gameState.currentWord;
    const isEliminationMode = gameState.competitionType === 'elimination';
    
    if (!currentWord) return;

    // Update game session
    const sessions = await storage.getGameSessionsByRoom(room.id);
    const userSession = sessions.find(s => s.userId === ws.userId);
    
    // Reject skips from already-eliminated players
    if (userSession?.isEliminated) {
      ws.send(JSON.stringify({
        type: 'error',
        payload: { message: 'You have been eliminated and cannot skip words' }
      }));
      return;
    }
    
    // Mark player as having answered (skipped) this word
    markPlayerAnswered(room.id, ws.userId);

    // Skip is treated as no action (0 points, no elimination)
    const points = 0;
    
    if (userSession) {
      const updates: Partial<GameSession> = {
        score: userSession.score || 0, // No points for skipping
        totalAnswers: (userSession.totalAnswers || 0) + 1,
        currentStreak: 0 // Reset streak on skip
      };

      await storage.updateGameSession(userSession.id, updates);

      // Get updated session to get the current score
      const updatedSession = await storage.getGameSession(userSession.id);
      const newScore = updatedSession?.score || 0;

      // Broadcast skip result
      broadcastToRoom(room.id, {
        type: 'answer_submitted',
        payload: {
          userId: ws.userId,
          username: ws.username,
          answer: '[skipped]',
          isCorrect: false,
          correctWord: currentWord.word,
          points,
          updatedScore: newScore
        }
      });
    }

    // Move to next round after skip
    // Stop the per-word timer immediately to prevent race condition
    if (perWordTimers.has(room.id)) {
      clearInterval(perWordTimers.get(room.id)!);
      perWordTimers.delete(room.id);
    }
    
    setTimeout(() => {
      nextRound(room.id);
    }, 2000);
  }

  async function handleUseHint(ws: WebSocketClient, payload: any) {
    if (!ws.roomId || !ws.userId) return;

    const { hintType } = payload; // "firstLetter", "definition", "sentence"
    const room = await storage.getGameRoom(ws.roomId);
    if (!room || !room.gameState) return;

    // Check if hints are enabled in room settings
    const roomSettings = room.settings as any || {};
    if (roomSettings.hintsEnabled === false) {
      ws.send(JSON.stringify({
        type: 'error',
        payload: { message: 'Hints are disabled for this game' }
      }));
      return;
    }

    const gameState = room.gameState as GameState;
    const currentWord = gameState.currentWord;
    
    if (!currentWord) return;

    // Check game session
    const sessions = await storage.getGameSessionsByRoom(room.id);
    const userSession = sessions.find(s => s.userId === ws.userId);
    
    // Reject hints from already-eliminated players
    if (userSession?.isEliminated) {
      ws.send(JSON.stringify({
        type: 'error',
        payload: { message: 'You have been eliminated and cannot use hints' }
      }));
      return;
    }

    // Track hint usage for this word
    const playerHints = getPlayerHints(room.id, ws.userId);
    
    let hintContent = '';
    let pointsDeducted = 0;

    switch (hintType) {
      case 'firstLetter':
        playerHints.firstLetter = true;
        hintContent = currentWord.word.charAt(0).toUpperCase();
        pointsDeducted = 2;
        break;
      case 'definition':
        playerHints.definition = true;
        hintContent = currentWord.definition;
        pointsDeducted = 3;
        break;
      case 'sentence':
        playerHints.sentence = true;
        hintContent = currentWord.exampleSentence;
        pointsDeducted = 4;
        break;
    }
    
    // Update total hints used counter for stats (not score)
    if (userSession) {
      await storage.updateGameSession(userSession.id, {
        hintsUsed: (userSession.hintsUsed || 0) + 1
      });
    }

    // Send hint content to the requesting player
    ws.send(JSON.stringify({
      type: 'hint_revealed',
      payload: {
        hintType,
        hintContent,
        pointsDeducted
      }
    }));
  }

  async function handlePlayerReady(ws: WebSocketClient, payload: any) {
    if (!ws.roomId) return;

    broadcastToRoom(ws.roomId, {
      type: 'player_ready',
      payload: {
        userId: ws.userId,
        username: ws.username
      }
    });
  }

  async function nextRound(roomId: string) {
    const room = await storage.getGameRoom(roomId);
    if (!room || !room.gameState) return;

    const gameState = room.gameState as GameState;
    
    // Check if global timer expired (all multiplayer games have 3-minute limit)
    if (gameState.globalTimer && gameState.globalTimer <= 0) {
      await endGame(roomId);
      return;
    }

    try {
      // Reset hints for all players when moving to next word
      resetRoomHints(roomId);
      
      // Reset answered tracking for new word
      resetAnsweredTracking(roomId);
      
      // Get settings for time per word
      const settings = room.settings as any || {};
      const timePerWord = parseInt(settings.timeLimit) || 45;
      
      // Increment round counter
      gameState.currentRound++;
      gameState.currentWord = await getRandomWord(gameState.difficulty);
      gameState.timeLeft = timePerWord;

      await storage.updateGameRoom(roomId, {
        gameState: gameState
      });

      // Restart per-word timer for the new word
      startPerWordTimer(roomId);

      broadcastToRoom(roomId, {
        type: 'next_round',
        payload: { gameState }
      });
    } catch (error) {
      console.error('Failed to get next word - words unavailable:', error);
      broadcastToRoom(roomId, {
        type: 'error',
        payload: { message: 'Game mode unavailable - words cannot be fetched from database. Please try again later.' }
      });
      // End the game gracefully if we can't fetch more words
      await endGame(roomId);
    }
  }

  async function endGame(roomId: string) {
    const room = await storage.getGameRoom(roomId);
    if (!room) return;

    // Clean up hint tracking for this room
    resetRoomHints(roomId);
    
    // Clean up answered tracking for this room
    resetAnsweredTracking(roomId);
    
    // Clear the global timer if it exists
    if (activeTimers.has(roomId)) {
      clearInterval(activeTimers.get(roomId)!);
      activeTimers.delete(roomId);
    }
    
    // Clear the per-word timer if it exists
    if (perWordTimers.has(roomId)) {
      clearInterval(perWordTimers.get(roomId)!);
      perWordTimers.delete(roomId);
    }

    const sessions = await storage.getGameSessionsByRoom(roomId);
    
    // Mark sessions as complete
    for (const session of sessions) {
      await storage.updateGameSession(session.id, {
        isComplete: true
      });

      // Update user stats
      const user = await storage.getUser(session.userId);
      if (user) {
        // Update cumulative correct answers and attempts
        const newTotalCorrect = (user.totalCorrect || 0) + (session.correctAnswers || 0);
        const newTotalAttempts = (user.totalAttempts || 0) + (session.totalAnswers || 0);

        // Calculate overall accuracy from cumulative totals
        const newAccuracy = newTotalAttempts > 0 
          ? Math.round((newTotalCorrect / newTotalAttempts) * 100)
          : 0;

        const newPoints = (user.points || 0) + (session.score || 0);
        const newLevel = Math.floor(newPoints / 1000) + 1;
        
        // Update best streak if session's best streak is higher
        const newBestStreak = Math.max(user.bestStreak || 0, session.bestStreak || 0);
        
        await storage.updateUser(user.id, {
          points: newPoints,
          level: newLevel,
          wordsSpelled: (user.wordsSpelled || 0) + (session.correctAnswers || 0),
          totalCorrect: newTotalCorrect,
          totalAttempts: newTotalAttempts,
          accuracy: newAccuracy,
          bestStreak: newBestStreak,
          gamesPlayed: (user.gamesPlayed || 0) + 1,
          lastAccessed: new Date(), // Update activity timestamp
        });
      }
    }

    await storage.updateGameRoom(roomId, {
      isActive: false
    });

    broadcastToRoom(roomId, {
      type: 'game_ended',
      payload: { sessions }
    });
  }

  async function getRandomWord(difficulty: string): Promise<Word> {
    try {
      const wordsCollection = await getWordsCollection();
      // ex1DB doesn't have difficulty field, fetch a random word
      const rawWords = await wordsCollection
        .aggregate([
          { $sample: { size: 5 } } // Fetch extra to find one with example
        ])
        .toArray();
      
      if (rawWords.length > 0) {
        // Transform using same logic as batch endpoint
        for (const doc of rawWords) {
          if (!doc.data?.[0]?.meanings?.[0]?.definitions) continue;
          
          let selectedDef = null;
          let selectedPartOfSpeech = '';
          
          for (const meaning of doc.data[0].meanings) {
            const defWithExample = meaning.definitions.find((def: any) => def.example);
            if (defWithExample) {
              selectedDef = defWithExample;
              selectedPartOfSpeech = meaning.partOfSpeech || 'word';
              break;
            }
          }
          
          if (!selectedDef) {
            selectedDef = doc.data[0].meanings[0].definitions[0];
            selectedPartOfSpeech = doc.data[0].meanings[0].partOfSpeech || 'word';
          }
          
          if (selectedDef.definition) {
            return {
              id: doc._id?.toString() || doc.word,
              word: doc.word,
              definition: selectedDef.definition || '',
              exampleSentence: selectedDef.example || '',
              partOfSpeech: selectedPartOfSpeech,
              difficulty: 'intermediate' as const,
              pronunciation: '',
              syllables: 0
            } as Word;
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch word from MongoDB:', error);
      throw new Error('Words database unavailable. Please try again later.');
    }
    
    // No words found in MongoDB
    throw new Error('Words database unavailable. Please try again later.');
  }

  function broadcastToRoom(roomId: string, message: any) {
    wss.clients.forEach((client) => {
      const wsClient = client as WebSocketClient;
      if (wsClient.roomId === roomId && wsClient.readyState === WebSocket.OPEN) {
        wsClient.send(JSON.stringify(message));
      }
    });
  }

  // REST API Routes
  app.post("/api/users", async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      const existingUser = await storage.getUserByUsername(userData.username);
      
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }

      const user = await storage.createUser(userData);
      res.json(user);
    } catch (error) {
      res.status(400).json({ message: "Invalid user data" });
    }
  });

  app.get("/api/users/by-username/:username", async (req, res) => {
    const user = await storage.getUserByUsername(req.params.username);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    // Update lastAccessed timestamp when user is fetched
    await storage.updateUser(user.id, { lastAccessed: new Date() });
    
    res.json(user);
  });

  app.get("/api/users/:id", async (req, res) => {
    const user = await storage.getUser(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json(user);
  });

  app.patch("/api/users/:id/activity", async (req, res) => {
    try {
      const user = await storage.updateUser(req.params.id, { 
        lastAccessed: new Date() 
      });
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json({ success: true, lastAccessed: user.lastAccessed });
    } catch (error) {
      res.status(500).json({ message: "Failed to update user activity" });
    }
  });

  app.post("/api/rooms", async (req, res) => {
    try {
      const roomData = insertGameRoomSchema.parse(req.body);
      const room = await storage.createGameRoom(roomData);
      res.json(room);
    } catch (error) {
      res.status(400).json({ message: "Invalid room data" });
    }
  });

  app.get("/api/rooms/:code", async (req, res) => {
    const room = await storage.getGameRoomByCode(req.params.code);
    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }
    res.json(room);
  });

  app.get("/api/users/:id/achievements", async (req, res) => {
    try {
      const userId = req.params.id;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Get user's unlocked achievements
      const unlockedAchievements = await storage.getUserAchievements(userId);
      const unlockedIds = new Set(unlockedAchievements.map(ua => ua.achievementId));

      // Combine all achievements with unlock status
      const achievementsWithStatus: AchievementWithStatus[] = ACHIEVEMENT_DEFINITIONS.map(def => {
        const userAch = unlockedAchievements.find(ua => ua.achievementId === def.id);
        return {
          id: def.id,
          name: def.name,
          description: def.description,
          icon: def.icon,
          criteria: def.criteria,
          unlocked: unlockedIds.has(def.id),
          unlockedAt: userAch?.unlockedAt || undefined
        };
      });

      res.json(achievementsWithStatus);
    } catch (error) {
      console.error('Failed to fetch achievements:', error);
      res.status(500).json({ message: "Failed to fetch achievements" });
    }
  });

  // Check and unlock achievements for a user
  app.post("/api/achievements/check", async (req, res) => {
    try {
      const { userId, gameData } = req.body;
      
      if (!userId) {
        return res.status(400).json({ message: "userId is required" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Get currently unlocked achievements
      const unlockedAchievements = await storage.getUserAchievements(userId);
      const unlockedIds = new Set(unlockedAchievements.map(ua => ua.achievementId));
      
      const newlyUnlocked: string[] = [];

      // Check each achievement
      for (const achievement of ACHIEVEMENT_DEFINITIONS) {
        // Skip if already unlocked
        if (unlockedIds.has(achievement.id)) continue;

        let shouldUnlock = false;
        const criteria = achievement.criteria as any;

        switch (criteria.type) {
          case "words_spelled":
            shouldUnlock = (user.wordsSpelled || 0) >= criteria.count;
            break;
          case "perfect_accuracy":
            shouldUnlock = gameData?.accuracy === 100;
            break;
          case "time_remaining":
            shouldUnlock = (gameData?.timeRemaining || 0) >= criteria.seconds;
            break;
          case "streak":
            shouldUnlock = (gameData?.currentStreak || user.bestStreak || 0) >= criteria.count;
            break;
          case "game_score":
            shouldUnlock = (gameData?.score || 0) >= criteria.points;
            break;
          case "games_played":
            shouldUnlock = (user.gamesPlayed || 0) >= criteria.count;
            break;
          case "level":
            shouldUnlock = (user.level || 1) >= criteria.level;
            break;
          case "accuracy":
            shouldUnlock = (user.accuracy || 0) >= criteria.percentage;
            break;
          case "games_completed":
            shouldUnlock = (user.gamesWon || 0) >= criteria.count;
            break;
        }

        if (shouldUnlock) {
          await storage.unlockAchievement(userId, achievement.id);
          newlyUnlocked.push(achievement.id);
        }
      }

      res.json({ newlyUnlocked });
    } catch (error) {
      console.error('Failed to check achievements:', error);
      res.status(500).json({ message: "Failed to check achievements" });
    }
  });

  app.get("/api/leaderboard", async (req, res) => {
    const limit = parseInt(req.query.limit as string) || 10;
    const leaderboard = await storage.getLeaderboard(limit);
    res.json(leaderboard);
  });

  app.get("/api/words/random", async (req, res) => {
    try {
      const difficulty = req.query.difficulty as string || "intermediate";
      const word = await getRandomWord(difficulty);
      res.json(word);
    } catch (error) {
      console.error('Failed to get random word:', error);
      res.status(503).json({ 
        message: "Game mode unavailable - words cannot be fetched from database. Please try again later." 
      });
    }
  });

  app.get("/api/words/batch", async (req, res) => {
    try {
      const count = parseInt(req.query.count as string) || 5;
      const difficulty = req.query.difficulty as string;
      
      const wordsCollection = await getWordsCollection();
      
      // ex1DB doesn't have difficulty field, so we fetch random words
      const rawWords = await wordsCollection
        .aggregate([
          { $sample: { size: count * 2 } } // Fetch extra to ensure we have enough with examples
        ])
        .toArray();
      
      // Transform ex1DB structure to game format
      const transformedWords = rawWords
        .map((doc: any) => {
          if (!doc.data?.[0]?.meanings?.[0]?.definitions) return null;
          
          // Find first definition with an example
          let selectedDef = null;
          let selectedPartOfSpeech = '';
          
          for (const meaning of doc.data[0].meanings) {
            const defWithExample = meaning.definitions.find((def: any) => def.example);
            if (defWithExample) {
              selectedDef = defWithExample;
              selectedPartOfSpeech = meaning.partOfSpeech || 'word';
              break;
            }
          }
          
          // If no definition with example, use first definition
          if (!selectedDef) {
            selectedDef = doc.data[0].meanings[0].definitions[0];
            selectedPartOfSpeech = doc.data[0].meanings[0].partOfSpeech || 'word';
          }
          
          return {
            id: doc._id?.toString() || doc.word,
            word: doc.word,
            definition: selectedDef.definition || '',
            exampleSentence: selectedDef.example || '',
            partOfSpeech: selectedPartOfSpeech,
            difficulty: 'intermediate' as const,
            pronunciation: '',
            syllables: 0
          };
        })
        .filter((word: any) => word && word.definition) // Only include words with definitions
        .slice(0, count); // Limit to requested count
      
      if (transformedWords.length > 0) {
        return res.json(transformedWords);
      }
      
      // No words found in MongoDB
      res.status(503).json({ 
        message: "Game mode unavailable - words cannot be fetched from database. Please try again later." 
      });
    } catch (error) {
      console.error('Failed to fetch words from MongoDB:', error);
      res.status(503).json({ 
        message: "Game mode unavailable - words cannot be fetched from database. Please try again later." 
      });
    }
  });

  app.get("/api/grammar/batch", async (req, res) => {
    try {
      const count = parseInt(req.query.count as string) || 5;
      
      const grammarCollection = await getGrammarCollection();
      
      const rawQuestions = await grammarCollection
        .aggregate([
          { $sample: { size: count } }
        ])
        .toArray();
      
      const transformedQuestions = rawQuestions
        .map((doc: any) => {
          if (!doc.sentence || !doc.question || !doc.answer || !doc.options) {
            return null;
          }
          
          return {
            id: doc._id?.toString() || '',
            sentence: doc.sentence,
            question: doc.question,
            options: doc.options,
            answer: doc.answer,
            maskedWord: doc.masked_word || ''
          };
        })
        .filter((question: any) => question !== null);
      
      if (transformedQuestions.length > 0) {
        return res.json(transformedQuestions);
      }
      
      res.status(503).json({ 
        message: "Game mode unavailable - grammar questions cannot be fetched from database. Please try again later." 
      });
    } catch (error) {
      console.error('Failed to fetch grammar questions from MongoDB:', error);
      res.status(503).json({ 
        message: "Game mode unavailable - grammar questions cannot be fetched from database. Please try again later." 
      });
    }
  });

  // Save solo spelling bee game results
  app.post("/api/game-results", async (req, res) => {
    try {
      const { userId, score, correctAnswers, totalAttempts, bestStreak } = req.body;
      
      if (!userId || score === undefined || correctAnswers === undefined || totalAttempts === undefined) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Update cumulative correct answers and attempts
      const newTotalCorrect = (user.totalCorrect || 0) + correctAnswers;
      const newTotalAttempts = (user.totalAttempts || 0) + totalAttempts;

      // Calculate overall accuracy from cumulative totals
      const newAccuracy = newTotalAttempts > 0 
        ? Math.round((newTotalCorrect / newTotalAttempts) * 100)
        : 0;

      // Calculate new level based on points (1000 points per level)
      const newPoints = (user.points || 0) + score;
      const newLevel = Math.floor(newPoints / 1000) + 1;

      // Update best streak if game's best streak is higher
      const newBestStreak = Math.max(user.bestStreak || 0, bestStreak || 0);

      // Update user stats
      const updatedUser = await storage.updateUser(userId, {
        points: newPoints,
        level: newLevel,
        wordsSpelled: (user.wordsSpelled || 0) + correctAnswers,
        totalCorrect: newTotalCorrect,
        totalAttempts: newTotalAttempts,
        accuracy: newAccuracy,
        bestStreak: newBestStreak,
        gamesWon: (user.gamesWon || 0) + 1, // Count each completed game
        gamesPlayed: (user.gamesPlayed || 0) + 1, // Increment games played
        lastAccessed: new Date(), // Update activity timestamp
      });

      res.json(updatedUser);
    } catch (error) {
      console.error('Failed to save game results:', error);
      res.status(500).json({ message: "Failed to save game results" });
    }
  });

  return httpServer;
}
