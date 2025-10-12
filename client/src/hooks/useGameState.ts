import { useState, useEffect } from "react";
import { GameState, PlayerState, Word, Achievement } from "@shared/schema";
import { useWebSocket } from "./useWebSocket";
import { useToast } from "@/hooks/use-toast";

export function useGameState() {
  const { toast } = useToast();
  
  // Generate or retrieve unique player ID from localStorage
  const getOrCreatePlayerId = () => {
    let playerId = localStorage.getItem('playerId');
    if (!playerId) {
      playerId = crypto.randomUUID();
      localStorage.setItem('playerId', playerId);
    }
    return playerId;
  };

  const generateDisplayName = (playerId: string) => {
    // Create a readable display name from the player ID
    // Format: "Player-ABC123" where ABC123 is first 6 chars of UUID
    const shortId = playerId.slice(0, 6).toUpperCase();
    return `Player-${shortId}`;
  };

  const playerId = getOrCreatePlayerId();
  const displayName = generateDisplayName(playerId);
  
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [playerState, setPlayerState] = useState<PlayerState | null>(null);
  const [dbUserId, setDbUserId] = useState<string | null>(null); // Database user ID
  const [currentUser, setCurrentUser] = useState({
    id: playerId, // Use the unique player ID instead of "user-1"
    username: displayName,
    level: 1,
    points: 0,
    streak: 0,
    accuracy: 0,
    wordsSpelled: 0,
    gamesWon: 0,
    bestStreak: 0
  });

  // Auto-create user in database if they don't exist
  useEffect(() => {
    const createUserIfNeeded = async () => {
      try {
        // Try to create the user
        const createResponse = await fetch('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: currentUser.username,
            password: 'mock-password', // Required field, not used in this demo
            level: currentUser.level,
            points: currentUser.points,
            streak: currentUser.streak,
            accuracy: currentUser.accuracy,
            wordsSpelled: currentUser.wordsSpelled,
            gamesWon: currentUser.gamesWon,
            bestStreak: currentUser.bestStreak
          })
        });
        
        if (createResponse.ok) {
          // User created successfully
          const createdUser = await createResponse.json();
          console.log('[USER] Created user in database:', createdUser.id);
          // Don't overwrite currentUser.id - keep it as the stable localStorage UUID
          setDbUserId(createdUser.id);
          setIsUserReady(true);
        } else {
          const errorData = await createResponse.json();
          if (errorData.message === "Username already exists") {
            // Username exists, fetch the user by username
            console.log('[USER] Username exists, fetching user...');
            const getUserResponse = await fetch(`/api/users/by-username/${encodeURIComponent(currentUser.username)}`);
            
            if (getUserResponse.ok) {
              const existingUser = await getUserResponse.json();
              console.log('[USER] Fetched existing user:', existingUser.id);
              // Don't overwrite currentUser.id - keep it as the stable localStorage UUID
              setDbUserId(existingUser.id);
              setIsUserReady(true);
            } else {
              console.error('[USER] Failed to fetch existing user');
              setIsUserReady(true); // Still set ready to unblock UI
            }
          } else {
            console.error('[USER] Failed to create user:', errorData);
            setIsUserReady(true); // Still set ready to unblock UI
          }
        }
      } catch (error) {
        console.error('[USER] Error managing user:', error);
        setIsUserReady(true); // Still set ready to unblock UI
      }
    };
    
    createUserIfNeeded();
  }, []);
  const [roomCode, setRoomCode] = useState<string>("");
  const [isInRoom, setIsInRoom] = useState(false);
  const [connectedPlayers, setConnectedPlayers] = useState<PlayerState[]>([]);
  const [gameResults, setGameResults] = useState<any>(null);
  const [isUserReady, setIsUserReady] = useState(false);

  const { connectionState, lastMessage, sendMessage } = useWebSocket("/ws");

  useEffect(() => {
    if (lastMessage) {
      handleWebSocketMessage(lastMessage);
    }
  }, [lastMessage]);

  // Reset room state on disconnect
  useEffect(() => {
    if (connectionState === 'disconnected') {
      setIsInRoom(false);
    }
  }, [connectionState]);

  // Auto-rejoin on reconnection
  useEffect(() => {
    if (connectionState === 'connected' && !isInRoom) {
      const storedRoom = localStorage.getItem('currentRoom');
      if (storedRoom) {
        try {
          const roomData = JSON.parse(storedRoom);
          // Auto-rejoin the room
          sendMessage({
            type: 'join_room',
            payload: {
              roomCode: roomData.roomCode,
              userId: roomData.userId,
              username: roomData.username
            }
          });
        } catch (error) {
          console.error('Error parsing stored room data:', error);
          localStorage.removeItem('currentRoom');
          toast({
            title: "Reconnection Failed",
            description: "Stored room data was invalid. Please rejoin manually.",
            variant: "destructive"
          });
        }
      }
    }
  }, [connectionState, isInRoom]);

  const handleWebSocketMessage = (message: any) => {
    switch (message.type) {
      case 'room_created':
        setIsInRoom(true);
        setRoomCode(message.payload.room.code);
        setGameResults(null);
        if (message.payload.players) {
          setConnectedPlayers(message.payload.players);
        }
        break;
      case 'room_joined':
        setIsInRoom(true);
        setRoomCode(message.payload.room.code);
        setGameResults(null);
        if (message.payload.players) {
          setConnectedPlayers(message.payload.players);
        }
        // Store room info for reconnection
        localStorage.setItem('currentRoom', JSON.stringify({
          roomCode: message.payload.room.code,
          userId: currentUser.id,
          username: currentUser.username
        }));
        break;
      case 'player_joined':
        if (message.payload.players) {
          setConnectedPlayers(message.payload.players);
        } else {
          const newPlayer: PlayerState = {
            userId: message.payload.userId,
            username: message.payload.username,
            score: 0,
            isReady: false,
            isActive: true,
            hintsUsed: 0
          };
          setConnectedPlayers(prev => [...prev, newPlayer]);
        }
        break;
      case 'player_left':
        if (message.payload.players) {
          setConnectedPlayers(message.payload.players);
        } else {
          setConnectedPlayers(prev => 
            prev.filter(p => p.userId !== message.payload.userId)
          );
        }
        break;
      case 'player_disconnected':
        if (message.payload.players) {
          setConnectedPlayers(message.payload.players);
        }
        break;
      case 'player_reconnected':
        if (message.payload.players) {
          setConnectedPlayers(message.payload.players);
        }
        break;
      case 'player_removed':
        if (message.payload.players) {
          setConnectedPlayers(message.payload.players);
        }
        break;
      case 'settings_updated':
        // Settings updated by host
        break;
      case 'game_started':
        setGameState(message.payload.gameState);
        setGameResults(null);
        break;
      case 'next_round':
        setGameState(message.payload.gameState);
        break;
      case 'game_ended':
        setGameState(null);
        if (message.payload.sessions) {
          setGameResults(message.payload.sessions);
        }
        break;
      case 'answer_submitted':
        // Handle answer feedback
        if (message.payload.userId === currentUser.id) {
          // Update player's own score
          setPlayerState(prev => prev ? {
            ...prev,
            score: prev.score + message.payload.points
          } : null);
        }
        break;
      case 'hint_revealed':
        // Handle hint reveal
        break;
      case 'error':
        console.error('Game error:', message.payload.message);
        toast({
          title: "Error",
          description: message.payload.message,
          variant: "destructive"
        });
        break;
    }
  };

  const createRoom = (gameMode: string, difficulty: string, settings?: any) => {
    console.log('[CREATE_ROOM] Called with:', { gameMode, difficulty, settings });
    console.log('[CREATE_ROOM] Current user:', currentUser);
    console.log('[CREATE_ROOM] User ready:', isUserReady);
    console.log('[CREATE_ROOM] Connection state:', connectionState);
    
    if (!isUserReady) {
      toast({
        title: "Please wait",
        description: "Loading user data...",
        variant: "default"
      });
      return;
    }
    
    const message = {
      type: 'create_room',
      payload: {
        hostId: currentUser.id,
        username: currentUser.username,
        gameMode,
        difficulty,
        settings: settings || {}
      }
    };
    
    console.log('[CREATE_ROOM] Sending message:', message);
    sendMessage(message);
  };

  const joinRoom = (code: string) => {
    if (!isUserReady) {
      toast({
        title: "Please wait",
        description: "Loading user data...",
        variant: "default"
      });
      return;
    }
    
    // Validate room code format (SPELL-XXXX)
    const roomCodePattern = /^SPELL-[A-Z0-9]{4}$/;
    if (!code.trim()) {
      toast({
        title: "Invalid Room Code",
        description: "Please enter a room code.",
        variant: "destructive"
      });
      return;
    }
    
    if (!roomCodePattern.test(code.toUpperCase())) {
      toast({
        title: "Invalid Room Code",
        description: "Room code must be in format SPELL-XXXX (e.g., SPELL-A1B2)",
        variant: "destructive"
      });
      return;
    }

    sendMessage({
      type: 'join_room',
      payload: {
        roomCode: code.toUpperCase(),
        userId: currentUser.id,
        username: currentUser.username
      }
    });
  };

  const leaveRoom = () => {
    sendMessage({
      type: 'leave_room',
      payload: {}
    });
    setIsInRoom(false);
    setRoomCode("");
    setConnectedPlayers([]);
    setGameState(null);
    setGameResults(null);
    localStorage.removeItem('currentRoom');
  };

  const startGame = () => {
    sendMessage({
      type: 'start_game',
      payload: { roomCode }
    });
  };

  const updateSettings = (settings: any) => {
    sendMessage({
      type: 'update_settings',
      payload: { settings }
    });
  };

  const submitAnswer = (answer: string) => {
    if (!answer || !answer.trim()) {
      toast({
        title: "Invalid Answer",
        description: "Please enter an answer before submitting.",
        variant: "destructive"
      });
      return;
    }

    sendMessage({
      type: 'submit_answer',
      payload: { answer: answer.trim() }
    });
  };

  const useHint = (hintType: 'firstLetter' | 'definition' | 'sentence') => {
    sendMessage({
      type: 'use_hint',
      payload: { hintType }
    });
  };

  const markPlayerReady = () => {
    sendMessage({
      type: 'player_ready',
      payload: {}
    });
  };

  return {
    gameState,
    playerState,
    currentUser,
    dbUserId,
    roomCode,
    isInRoom,
    connectedPlayers,
    gameResults,
    connectionState,
    createRoom,
    joinRoom,
    leaveRoom,
    startGame,
    submitAnswer,
    useHint,
    markPlayerReady,
    updateSettings,
    isUserReady
  };
}
