import { useState, useEffect } from "react";
import { GameState, PlayerState, Word, Achievement } from "@shared/schema";
import { useWebSocket } from "./useWebSocket";
import { useToast } from "@/hooks/use-toast";

export function useGameState() {
  const { toast } = useToast();
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [playerState, setPlayerState] = useState<PlayerState | null>(null);
  const [currentUser, setCurrentUser] = useState({
    id: "user-1",
    username: "John Doe",
    level: 7,
    points: 2450,
    streak: 12,
    accuracy: 92,
    wordsSpelled: 487,
    gamesWon: 23,
    bestStreak: 18
  });

  // Auto-create user in database if they don't exist
  useEffect(() => {
    const createUserIfNeeded = async () => {
      try {
        // Check if user exists
        const response = await fetch(`/api/users/${currentUser.id}`);
        if (response.status === 404) {
          // User doesn't exist, create them
          await fetch('/api/users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: currentUser.id,
              username: currentUser.username,
              level: currentUser.level,
              points: currentUser.points,
              streak: currentUser.streak,
              accuracy: currentUser.accuracy,
              wordsSpelled: currentUser.wordsSpelled,
              gamesWon: currentUser.gamesWon,
              bestStreak: currentUser.bestStreak
            })
          });
          console.log('[USER] Created user in database:', currentUser.id);
        }
      } catch (error) {
        console.error('[USER] Error creating user:', error);
      }
    };
    
    createUserIfNeeded();
  }, []);
  const [roomCode, setRoomCode] = useState<string>("");
  const [isInRoom, setIsInRoom] = useState(false);
  const [connectedPlayers, setConnectedPlayers] = useState<PlayerState[]>([]);
  const [gameResults, setGameResults] = useState<any>(null);

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
    console.log('[CREATE_ROOM] Connection state:', connectionState);
    
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
    updateSettings
  };
}
