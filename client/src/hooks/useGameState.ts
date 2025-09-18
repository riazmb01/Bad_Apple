import { useState, useEffect } from "react";
import { GameState, PlayerState, Word, Achievement } from "@shared/schema";
import { useWebSocket } from "./useWebSocket";

export function useGameState() {
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
  const [roomCode, setRoomCode] = useState<string>("");
  const [isInRoom, setIsInRoom] = useState(false);
  const [connectedPlayers, setConnectedPlayers] = useState<PlayerState[]>([]);

  const { connectionState, lastMessage, sendMessage } = useWebSocket("/ws");

  useEffect(() => {
    if (lastMessage) {
      handleWebSocketMessage(lastMessage);
    }
  }, [lastMessage]);

  const handleWebSocketMessage = (message: any) => {
    switch (message.type) {
      case 'room_joined':
        setIsInRoom(true);
        setRoomCode(message.payload.room.code);
        break;
      case 'player_joined':
        const newPlayer: PlayerState = {
          userId: message.payload.userId,
          username: message.payload.username,
          score: 0,
          isReady: false,
          isActive: true,
          hintsUsed: 0
        };
        setConnectedPlayers(prev => [...prev, newPlayer]);
        break;
      case 'player_left':
        setConnectedPlayers(prev => 
          prev.filter(p => p.userId !== message.payload.userId)
        );
        break;
      case 'game_started':
        setGameState(message.payload.gameState);
        break;
      case 'next_round':
        setGameState(message.payload.gameState);
        break;
      case 'game_ended':
        setGameState(null);
        // Handle game end logic
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
        break;
    }
  };

  const joinRoom = (code: string) => {
    sendMessage({
      type: 'join_room',
      payload: {
        roomCode: code,
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
  };

  const startGame = () => {
    sendMessage({
      type: 'start_game',
      payload: { roomCode }
    });
  };

  const submitAnswer = (answer: string) => {
    sendMessage({
      type: 'submit_answer',
      payload: { answer }
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
    connectionState,
    joinRoom,
    leaveRoom,
    startGame,
    submitAnswer,
    useHint,
    markPlayerReady
  };
}
