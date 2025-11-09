import { useState, useEffect } from "react";
import { GameState, PlayerState, Word, Achievement, User } from "@shared/schema";
import { useWebSocket } from "./useWebSocket";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";

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

  // Fetch user data from database to get actual points, streak, etc.
  const { data: dbUserData } = useQuery<User>({
    queryKey: ['/api/users', dbUserId],
    enabled: !!dbUserId,
  });

  // Update currentUser with actual database values when data is fetched
  useEffect(() => {
    if (dbUserData) {
      // Calculate level from points (1000 points per level)
      const calculatedLevel = Math.floor((dbUserData.points || 0) / 1000) + 1;
      
      setCurrentUser(prev => ({
        ...prev,
        points: dbUserData.points || 0,
        streak: dbUserData.streak || 0,
        accuracy: dbUserData.accuracy || 0,
        wordsSpelled: dbUserData.wordsSpelled || 0,
        gamesWon: dbUserData.gamesWon || 0,
        gamesPlayed: dbUserData.gamesPlayed || 0,
        bestStreak: dbUserData.bestStreak || 0,
        level: calculatedLevel
      }));
    }
  }, [dbUserData]);

  const [roomCode, setRoomCode] = useState<string>("");
  const [isInRoom, setIsInRoom] = useState(false);
  const [connectedPlayers, setConnectedPlayers] = useState<PlayerState[]>([]);
  const [gameResults, setGameResults] = useState<any>(null);
  const [roomSettings, setRoomSettings] = useState<any>(null);
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
    if (connectionState === 'connected' && !isInRoom && dbUserId) {
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
  }, [connectionState, isInRoom, dbUserId]);

  const handleWebSocketMessage = (message: any) => {
    switch (message.type) {
      case 'room_created':
        setIsInRoom(true);
        setRoomCode(message.payload.room.code);
        setRoomSettings({
          ...message.payload.room.settings,
          gameMode: message.payload.room.gameMode
        });
        setGameResults(null);
        if (message.payload.players) {
          setConnectedPlayers(message.payload.players);
        }
        // Store room info for reconnection (use dbUserId)
        if (dbUserId) {
          localStorage.setItem('currentRoom', JSON.stringify({
            roomCode: message.payload.room.code,
            userId: dbUserId,
            username: currentUser.username
          }));
        }
        toast({
          title: "Room Created!",
          description: `Room code: ${message.payload.room.code}`,
          variant: "default"
        });
        break;
      case 'room_joined':
        setIsInRoom(true);
        setRoomCode(message.payload.room.code);
        setRoomSettings({
          ...message.payload.room.settings,
          gameMode: message.payload.room.gameMode
        });
        setGameResults(null);
        if (message.payload.players) {
          setConnectedPlayers(message.payload.players);
        }
        // Store room info for reconnection (use dbUserId)
        if (dbUserId) {
          localStorage.setItem('currentRoom', JSON.stringify({
            roomCode: message.payload.room.code,
            userId: dbUserId,
            username: currentUser.username
          }));
        }
        toast({
          title: "Joined Room!",
          description: `You're in room ${message.payload.room.code}`,
          variant: "default"
        });
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
        setRoomSettings(message.payload.settings || {});
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
        // Handle answer feedback - compare against currentUser.id (localStorage UUID) since server sends localStorage UUIDs
        if (message.payload.userId === currentUser.id) {
          // Update player's own score
          setPlayerState(prev => prev ? {
            ...prev,
            score: message.payload.updatedScore || (prev.score + message.payload.points)
          } : null);
          
          // Show feedback toast for the current user's answer
          if (message.payload.isCorrect) {
            toast({
              title: "Correct! ✓",
              description: `The word was "${message.payload.correctWord}". You earned ${message.payload.points} points!`,
              variant: "default",
              duration: 2000,
            });
          } else {
            toast({
              title: "Incorrect ✗",
              description: `The correct spelling was "${message.payload.correctWord}".`,
              variant: "destructive",
              duration: 3000,
            });
          }
        }
        // Update the player's score in connectedPlayers for live leaderboard
        if (message.payload.updatedScore !== undefined) {
          setConnectedPlayers(prev => 
            prev.map(p => 
              p.userId === message.payload.userId 
                ? { ...p, score: message.payload.updatedScore }
                : p
            )
          );
        }
        break;
      case 'player_eliminated':
        // Update players list to mark player as eliminated
        if (message.payload.players) {
          setConnectedPlayers(message.payload.players);
        }
        // Show toast if the current user was eliminated
        if (message.payload.userId === currentUser.id) {
          toast({
            title: "You've Been Eliminated!",
            description: "You got a word wrong and have been eliminated from this round. You can spectate the remaining players.",
            variant: "destructive"
          });
        } else {
          toast({
            title: "Player Eliminated",
            description: `${message.payload.username} has been eliminated!`,
            variant: "default"
          });
        }
        break;
      case 'hint_revealed':
        // Handle hint reveal
        break;
      case 'score_updated':
        // Update player score when they use a hint
        if (message.payload.userId === currentUser.id) {
          // Update own score
          setPlayerState(prev => prev ? {
            ...prev,
            score: message.payload.score
          } : null);
        }
        // Update the player's score in connectedPlayers for live leaderboard
        setConnectedPlayers(prev => 
          prev.map(p => 
            p.userId === message.payload.userId 
              ? { ...p, score: message.payload.score }
              : p
          )
        );
        break;
      case 'timer_update':
        // Update global timer for timed challenge mode
        setGameState(prev => prev ? {
          ...prev,
          globalTimer: message.payload.timeRemaining
        } : null);
        break;
      case 'word_timer_update':
        // Update per-word timer
        setGameState(prev => prev ? {
          ...prev,
          timeLeft: message.payload.timeLeft
        } : null);
        break;
      case 'game_restarted':
        // Clear game results to show lobby again
        setGameResults(null);
        setGameState(null);
        toast({
          title: "Game Restarted",
          description: "Get ready for another round!",
          variant: "default"
        });
        break;
      case 'error':
        console.error('Game error:', message.payload.message);
        
        // Provide user-friendly error messages
        let errorTitle = "Error";
        let errorDescription = message.payload.message;
        
        if (message.payload.message.includes('Room not found')) {
          errorTitle = "Room Not Found";
          errorDescription = "This room doesn't exist or has expired. Please check the room code and try again.";
        } else if (message.payload.message.includes('Room is full')) {
          errorTitle = "Room Full";
          errorDescription = "This room has reached its maximum capacity. Try creating a new room.";
        } else if (message.payload.message.includes('already in progress')) {
          errorTitle = "Game In Progress";
          errorDescription = "This game has already started. Please join another room.";
        } else if (message.payload.message.includes('Failed to create room')) {
          errorTitle = "Creation Failed";
          errorDescription = "Unable to create room. Please try again.";
        }
        
        toast({
          title: errorTitle,
          description: errorDescription,
          variant: "destructive"
        });
        break;
    }
  };

  const createRoom = (gameMode: string, difficulty: string, settings?: any) => {
    if (!isUserReady || !dbUserId) {
      toast({
        title: "Please Wait",
        description: "Setting up your account...",
        variant: "default"
      });
      return;
    }
    
    const message = {
      type: 'create_room',
      payload: {
        hostId: dbUserId, // Use database user ID
        username: currentUser.username,
        gameMode,
        difficulty,
        settings: settings || {}
      }
    };
    
    toast({
      title: "Creating Room",
      description: "Setting up your classroom battle...",
      variant: "default"
    });
    
    sendMessage(message);
  };

  const joinRoom = (code: string) => {
    if (!isUserReady || !dbUserId) {
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
        userId: dbUserId, // Use database user ID
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

  const skipWord = () => {
    sendMessage({
      type: 'skip_word',
      payload: {}
    });
  };
  
  const restartGame = () => {
    sendMessage({
      type: 'restart_game',
      payload: {}
    });
    
    // Clear game results to show lobby again
    setGameResults(null);
    setGameState(null);
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
    roomSettings,
    connectionState,
    createRoom,
    joinRoom,
    leaveRoom,
    startGame,
    submitAnswer,
    useHint,
    skipWord,
    markPlayerReady,
    updateSettings,
    restartGame,
    isUserReady
  };
}
