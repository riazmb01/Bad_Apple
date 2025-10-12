import { useState } from "react";
import AppHeader from "@/components/AppHeader";
import GameModeSelector from "@/components/GameModeSelector";
import SpellingBeeGame from "@/components/SpellingBeeGame";
import GrammarGame from "@/components/GrammarGame";
import MultiplayerLobby from "@/components/MultiplayerLobby";
import GameStats from "@/components/GameStats";
import Leaderboard from "@/components/Leaderboard";
import { useGameState } from "@/hooks/useGameState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";

type GameMode = 'menu' | 'spelling' | 'grammar' | 'multiplayer' | 'join_room';

export default function Home() {
  const [currentMode, setCurrentMode] = useState<GameMode>('menu');
  const [joinCode, setJoinCode] = useState("");
  
  const {
    gameState,
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
  } = useGameState();

  const handleSelectMode = (mode: 'spelling' | 'grammar' | 'multiplayer') => {
    if (mode === 'multiplayer') {
      setCurrentMode('join_room');
    } else {
      setCurrentMode(mode);
    }
  };

  const handleJoinRoom = () => {
    if (joinCode.trim()) {
      joinRoom(joinCode.trim());
      setCurrentMode('multiplayer');
    }
  };

  const handleBackToMenu = () => {
    if (isInRoom) {
      leaveRoom();
    }
    setCurrentMode('menu');
  };

  const handleSkipWord = () => {
    console.log('Skip word');
    // Implement skip logic
  };

  const handlePauseGame = () => {
    console.log('Pause game');
    // Implement pause logic
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader user={currentUser} />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back to Menu Button */}
        {currentMode !== 'menu' && (
          <div className="mb-6">
            <Button 
              variant="outline" 
              onClick={handleBackToMenu}
              data-testid="button-back-to-menu"
            >
              ← Back to Menu
            </Button>
          </div>
        )}

        {/* Game Mode Selection */}
        {currentMode === 'menu' && (
          <>
            <GameModeSelector onSelectMode={handleSelectMode} />
            <GameStats userId={currentUser.id} />
            <Leaderboard currentUserId={currentUser.id} />
          </>
        )}

        {/* Join Room Interface */}
        {currentMode === 'join_room' && (
          <section className="mb-12">
            <Card className="max-w-md mx-auto">
              <CardContent className="p-8 text-center">
                <h2 className="text-2xl font-bold text-foreground mb-6">Join Classroom Battle</h2>
                <div className="space-y-4">
                  <Input
                    type="text"
                    placeholder="Enter room code (e.g., SPELL-1234)"
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    className="text-center font-mono"
                    data-testid="input-join-room-code"
                  />
                  <Button 
                    onClick={handleJoinRoom}
                    disabled={!joinCode.trim() || connectionState !== 'connected'}
                    className="w-full"
                    data-testid="button-join-room"
                  >
                    {connectionState === 'connecting' ? 'Connecting...' : 'Join Room'}
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground mt-4">
                  Ask your teacher for the room code
                </p>
              </CardContent>
            </Card>
          </section>
        )}

        {/* Spelling Bee Game */}
        {currentMode === 'spelling' && !gameState && (
          <SpellingBeeGame
            gameState={gameState}
            onSubmitAnswer={submitAnswer}
            onUseHint={(hintType: string) => useHint(hintType as 'firstLetter' | 'definition' | 'sentence')}
            onSkipWord={handleSkipWord}
            onPauseGame={handlePauseGame}
          />
        )}

        {/* Grammar Game */}
        {currentMode === 'grammar' && (
          <GrammarGame
            gameState={gameState || undefined}
            onSubmitAnswer={submitAnswer}
            onSkipWord={handleSkipWord}
            onPauseGame={handlePauseGame}
          />
        )}

        {/* Multiplayer Lobby */}
        {currentMode === 'multiplayer' && isInRoom && !gameState?.isActive && (
          <MultiplayerLobby
            roomCode={roomCode}
            connectedPlayers={connectedPlayers}
            isHost={false} // For now, assume not host
            onStartGame={startGame}
            onLeaveRoom={handleBackToMenu}
          />
        )}

        {/* Active Multiplayer Game */}
        {currentMode === 'multiplayer' && gameState?.isActive && (
          <>
            {gameState.gameMode === 'spelling' && (
              <SpellingBeeGame
                gameState={gameState}
                onSubmitAnswer={submitAnswer}
                onUseHint={(hintType: string) => useHint(hintType as 'firstLetter' | 'definition' | 'sentence')}
                onSkipWord={handleSkipWord}
                onPauseGame={handlePauseGame}
              />
            )}
            {gameState.gameMode === 'grammar' && (
              <GrammarGame
                gameState={gameState}
                onSubmitAnswer={submitAnswer}
                onSkipWord={handleSkipWord}
                onPauseGame={handlePauseGame}
              />
            )}
          </>
        )}

        {/* Connection Status */}
        {connectionState !== 'connected' && currentMode !== 'menu' && (
          <div className="fixed bottom-4 right-4 bg-card border border-border rounded-lg p-4 shadow-lg">
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${
                connectionState === 'connecting' ? 'bg-yellow-500 animate-pulse' : 'bg-red-500'
              }`}></div>
              <span className="text-sm text-foreground">
                {connectionState === 'connecting' ? 'Connecting...' : 'Disconnected'}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
