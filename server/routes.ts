import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { insertUserSchema, insertGameRoomSchema, insertGameSessionSchema, type GameState, type PlayerState, type Word } from "@shared/schema";
import { wordBank } from "../client/src/data/wordBank";
import { getWordsCollection } from "./mongodb";

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
    switch (message.type) {
      case 'create_room':
        await handleCreateRoom(ws, message.payload);
        break;
      case 'join_room':
        await handleJoinRoom(ws, message.payload);
        break;
      case 'leave_room':
        await handleLeaveRoom(ws, message.payload);
        break;
      case 'start_game':
        await handleStartGame(ws, message.payload);
        break;
      case 'submit_answer':
        await handleSubmitAnswer(ws, message.payload);
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
    const { hostId, username, gameMode, difficulty, settings } = payload;
    
    try {
      const room = await storage.createGameRoom({
        hostId,
        gameMode,
        difficulty,
        maxPlayers: settings?.maxPlayers || 10,
        settings: settings || {}
      });

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
        isReady: false,
        isActive: true,
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

    ws.userId = userId;
    ws.roomId = room.id;
    ws.username = username;

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
    const sessions = await storage.getGameSessionsByRoom(room.id);
    const players = await Promise.all(
      sessions.map(async (session) => {
        const client = Array.from(wss.clients).find(
          (c) => (c as WebSocketClient).userId === session.userId
        ) as WebSocketClient | undefined;
        
        return {
          userId: session.userId,
          username: client?.username || 'Player',
          avatar: getAvatarInitials(client?.username || 'Player'),
          score: session.score || 0,
          isReady: false,
          isActive: true,
          hintsUsed: session.hintsUsed || 0
        };
      })
    );

    // Broadcast to room that new player joined
    broadcastToRoom(room.id, {
      type: 'player_joined',
      payload: { 
        userId, 
        username,
        players 
      }
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
    
    await handlePlayerLeave(ws.roomId, ws.userId);
  }

  async function handlePlayerLeave(roomId: string, userId: string) {
    const room = await storage.getGameRoom(roomId);
    if (!room) return;

    // Find and delete the player's game session
    const sessions = await storage.getGameSessionsByRoom(roomId);
    const userSession = sessions.find(s => s.userId === userId);
    if (userSession) {
      await storage.deleteGameSession(userSession.id);
    }

    // Update room player count
    await storage.updateGameRoom(roomId, {
      currentPlayers: Math.max(0, (room.currentPlayers || 0) - 1)
    });

    // Get updated player list after removal
    const updatedSessions = await storage.getGameSessionsByRoom(roomId);
    const players = await Promise.all(
      updatedSessions.map(async (session) => {
        const client = Array.from(wss.clients).find(
          (c) => (c as WebSocketClient).userId === session.userId
        ) as WebSocketClient | undefined;
        
        return {
          userId: session.userId,
          username: client?.username || 'Player',
          avatar: getAvatarInitials(client?.username || 'Player'),
          score: session.score || 0,
          isReady: false,
          isActive: true,
          hintsUsed: session.hintsUsed || 0
        };
      })
    );

    // Broadcast to room with updated player list
    broadcastToRoom(roomId, {
      type: 'player_left',
      payload: { userId, players }
    });
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

    const gameState: GameState = {
      currentRound: 1,
      totalRounds: 10,
      timeLeft: 45,
      isActive: true,
      players: [],
      gameMode: room.gameMode as any,
      difficulty: room.difficulty as any,
      currentWord: await getRandomWord(room.difficulty as any)
    };

    await storage.updateGameRoom(room.id, {
      isActive: true,
      gameState: gameState
    });

    broadcastToRoom(room.id, {
      type: 'game_started',
      payload: { gameState }
    });
  }

  async function handleSubmitAnswer(ws: WebSocketClient, payload: any) {
    if (!ws.roomId || !ws.userId) return;

    const { answer } = payload;
    const room = await storage.getGameRoom(ws.roomId);
    if (!room || !room.gameState) return;

    const gameState = room.gameState as GameState;
    const currentWord = gameState.currentWord;
    
    if (!currentWord) return;

    const isCorrect = answer.toLowerCase() === currentWord.word.toLowerCase();
    const points = isCorrect ? 100 : 0;

    // Update game session
    const sessions = await storage.getGameSessionsByRoom(room.id);
    const userSession = sessions.find(s => s.userId === ws.userId);
    
    if (userSession) {
      await storage.updateGameSession(userSession.id, {
        score: (userSession.score || 0) + points,
        correctAnswers: (userSession.correctAnswers || 0) + (isCorrect ? 1 : 0),
        totalAnswers: (userSession.totalAnswers || 0) + 1
      });
    }

    // Broadcast answer result
    broadcastToRoom(room.id, {
      type: 'answer_submitted',
      payload: {
        userId: ws.userId,
        username: ws.username,
        answer,
        isCorrect,
        correctWord: currentWord.word,
        points
      }
    });

    // Move to next round if needed
    if (isCorrect || gameState.timeLeft <= 0) {
      setTimeout(() => {
        nextRound(room.id);
      }, 2000);
    }
  }

  async function handleUseHint(ws: WebSocketClient, payload: any) {
    if (!ws.roomId || !ws.userId) return;

    const { hintType } = payload; // "firstLetter", "definition", "sentence"
    const room = await storage.getGameRoom(ws.roomId);
    if (!room || !room.gameState) return;

    const gameState = room.gameState as GameState;
    const currentWord = gameState.currentWord;
    
    if (!currentWord) return;

    let hintContent = '';
    let pointsDeducted = 0;

    switch (hintType) {
      case 'firstLetter':
        hintContent = currentWord.word.charAt(0).toUpperCase();
        pointsDeducted = 5;
        break;
      case 'definition':
        hintContent = currentWord.definition;
        pointsDeducted = 10;
        break;
      case 'sentence':
        hintContent = currentWord.exampleSentence;
        pointsDeducted = 15;
        break;
    }

    // Update game session
    const sessions = await storage.getGameSessionsByRoom(room.id);
    const userSession = sessions.find(s => s.userId === ws.userId);
    
    if (userSession) {
      await storage.updateGameSession(userSession.id, {
        score: Math.max(0, (userSession.score || 0) - pointsDeducted),
        hintsUsed: (userSession.hintsUsed || 0) + 1
      });
    }

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
    
    if (gameState.currentRound >= gameState.totalRounds) {
      // Game finished
      await endGame(roomId);
      return;
    }

    // Next round
    gameState.currentRound++;
    gameState.currentWord = await getRandomWord(gameState.difficulty);
    gameState.timeLeft = 45;

    await storage.updateGameRoom(roomId, {
      gameState: gameState
    });

    broadcastToRoom(roomId, {
      type: 'next_round',
      payload: { gameState }
    });
  }

  async function endGame(roomId: string) {
    const room = await storage.getGameRoom(roomId);
    if (!room) return;

    const sessions = await storage.getGameSessionsByRoom(roomId);
    
    // Mark sessions as complete
    for (const session of sessions) {
      await storage.updateGameSession(session.id, {
        isComplete: true
      });

      // Update user stats
      const user = await storage.getUser(session.userId);
      if (user) {
        const accuracy = (session.totalAnswers || 0) > 0 
          ? Math.round(((session.correctAnswers || 0) / (session.totalAnswers || 0)) * 100)
          : 0;

        await storage.updateUser(user.id, {
          points: (user.points || 0) + (session.score || 0),
          wordsSpelled: (user.wordsSpelled || 0) + (session.correctAnswers || 0),
          accuracy: Math.round(((user.accuracy || 0) + accuracy) / 2)
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
      console.error('Failed to fetch word from MongoDB, using fallback:', error);
    }
    
    // Fallback to static word bank if MongoDB fails
    const wordsForDifficulty = wordBank.filter(word => word.difficulty === difficulty);
    return wordsForDifficulty[Math.floor(Math.random() * wordsForDifficulty.length)];
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

  app.get("/api/users/:id", async (req, res) => {
    const user = await storage.getUser(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json(user);
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
    const user = await storage.getUser(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json(user.achievements || []);
  });

  app.get("/api/leaderboard", async (req, res) => {
    const limit = parseInt(req.query.limit as string) || 10;
    const leaderboard = await storage.getLeaderboard(limit);
    res.json(leaderboard);
  });

  app.get("/api/words/random", async (req, res) => {
    const difficulty = req.query.difficulty as string || "intermediate";
    const word = await getRandomWord(difficulty);
    res.json(word);
  });

  app.get("/api/words/batch", async (req, res) => {
    try {
      const count = parseInt(req.query.count as string) || 5;
      const difficulty = req.query.difficulty as string;
      
      try {
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
      } catch (mongoError) {
        console.error('Failed to fetch words from MongoDB, using fallback:', mongoError);
      }
      
      // Fallback to static word bank if MongoDB fails or returns no words
      const filtered = difficulty 
        ? wordBank.filter(word => word.difficulty === difficulty)
        : wordBank;
      
      const shuffled = filtered.sort(() => Math.random() - 0.5);
      const selected = shuffled.slice(0, count);
      
      res.json(selected);
    } catch (error) {
      console.error('Error in batch endpoint:', error);
      res.status(500).json({ message: "Failed to fetch words" });
    }
  });

  return httpServer;
}
