import { useState } from "react";
import AppHeader from "@/components/AppHeader";
import GameModeSelector from "@/components/GameModeSelector";
import SpellingBeeGame from "@/components/SpellingBeeGame";
import GrammarGame from "@/components/GrammarGame";
import MultiplayerLobby from "@/components/MultiplayerLobby";
import MultiplayerGameView from "@/components/MultiplayerGameView";
import MultiplayerResults from "@/components/MultiplayerResults";
import GameStats from "@/components/GameStats";
import Leaderboard from "@/components/Leaderboard";
import { useGameState } from "@/hooks/useGameState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

type GameMode = 'menu' | 'spelling' | 'grammar' | 'multiplayer' | 'join_room' | 'create_room';

export default function Home() {
  const [currentMode, setCurrentMode] = useState<GameMode>('menu');
  const [joinCode, setJoinCode] = useState("");
  const [isHost, setIsHost] = useState(false);
  const [createGameMode, setCreateGameMode] = useState("spelling");
  
  const {
    gameState,
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
  } = useGameState();

  const handleSelectMode = (mode: 'spelling' | 'grammar' | 'multiplayer') => {
    if (mode === 'multiplayer') {
      setCurrentMode('join_room');
    } else {
      setCurrentMode(mode);
    }
  };

  const handleCreateRoom = (gameMode: string) => {
    createRoom(gameMode, 'intermediate', {
      maxPlayers: 10,
      timePerWord: 45,
      hintsEnabled: true
    });
    setIsHost(true);
    setCurrentMode('multiplayer');
  };

  const handleJoinRoom = () => {
    if (joinCode.trim()) {
      joinRoom(joinCode.trim());
      setIsHost(false);
      setCurrentMode('multiplayer');
    }
  };

  const handleBackToMenu = () => {
    if (isInRoom) {
      leaveRoom();
    }
    setIsHost(false);
    setCurrentMode('menu');
  };

  const handleSkipWord = () => {
    if (isInRoom && gameState?.isActive) {
      // In multiplayer mode, send skip message to server
      skipWord();
    } else {
      // Single player mode - not implemented
      console.log('Skip word');
    }
  };

  const handlePauseGame = () => {
    console.log('Pause game');
    // Implement pause logic
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader user={currentUser} dbUserId={dbUserId || undefined} />
      
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
            {dbUserId && (
              <>
                <GameStats userId={dbUserId} isUserReady={isUserReady} />
                <Leaderboard currentUserId={dbUserId} />
              </>
            )}
          </>
        )}

        {/* Join Room Interface */}
        {currentMode === 'join_room' && (
          <section className="mb-12">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
              {/* Join Existing Room */}
              <Card>
                <CardContent className="p-8">
                  <h2 className="text-xl font-bold text-foreground mb-4 text-center">Join a Room</h2>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm text-muted-foreground block mb-2">Room Code</label>
                      <Input
                        type="text"
                        placeholder="SPELL-1234"
                        value={joinCode}
                        onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                        className="text-center font-mono"
                        data-testid="input-join-room-code"
                      />
                    </div>
                    <Button 
                      onClick={handleJoinRoom}
                      disabled={!joinCode.trim() || connectionState !== 'connected'}
                      className="w-full"
                      data-testid="button-join-room"
                    >
                      {connectionState === 'connecting' ? 'Connecting...' : 'Join Room'}
                    </Button>
                    <p className="text-xs text-muted-foreground text-center">
                      Ask your teacher for the room code
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Create New Room */}
              <Card>
                <CardContent className="p-8">
                  <h2 className="text-xl font-bold text-foreground mb-4 text-center">Create a Room</h2>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="create-game-mode" className="text-sm font-medium text-foreground mb-2 block">
                        Game Mode
                      </Label>
                      <Select 
                        value={createGameMode} 
                        onValueChange={setCreateGameMode}
                      >
                        <SelectTrigger data-testid="select-create-game-mode">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="spelling">Spelling Bee</SelectItem>
                          <SelectItem value="grammar">Grammar Mastery</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button 
                      onClick={() => handleCreateRoom(createGameMode)}
                      disabled={connectionState !== 'connected'}
                      className="w-full"
                      data-testid="button-create-room"
                    >
                      Create Room
                    </Button>
                    <p className="text-xs text-muted-foreground text-center">
                      You'll be the host and get a room code to share
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </section>
        )}

        {/* Spelling Bee Game */}
        {currentMode === 'spelling' && !gameState && (
          <SpellingBeeGame
            gameState={gameState}
            userId={dbUserId}
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
            userId={dbUserId}
            onSubmitAnswer={submitAnswer}
            onSkipWord={handleSkipWord}
            onPauseGame={handlePauseGame}
          />
        )}

        {/* Multiplayer Lobby */}
        {currentMode === 'multiplayer' && isInRoom && !gameState?.isActive && !gameResults && (
          <MultiplayerLobby
            roomCode={roomCode}
            connectedPlayers={connectedPlayers}
            isHost={isHost}
            gameMode={roomSettings?.gameMode}
            onStartGame={startGame}
            onLeaveRoom={handleBackToMenu}
            onUpdateSettings={updateSettings}
          />
        )}

        {/* Active Multiplayer Game */}
        {currentMode === 'multiplayer' && gameState?.isActive && (
          <MultiplayerGameView
            gameState={gameState}
            connectedPlayers={connectedPlayers}
            currentUserId={dbUserId || currentUser.id}
            roomSettings={roomSettings}
            onSubmitAnswer={submitAnswer}
            onUseHint={(hintType: string) => useHint(hintType as 'firstLetter' | 'definition' | 'sentence')}
            onSkipWord={handleSkipWord}
            onPauseGame={handlePauseGame}
          />
        )}

        {/* Multiplayer Results */}
        {currentMode === 'multiplayer' && gameResults && (
          <MultiplayerResults
            players={gameResults.map((session: any) => ({
              userId: session.userId,
              username: connectedPlayers.find((p: any) => p.userId === session.userId)?.username || 'Player',
              avatar: connectedPlayers.find((p: any) => p.userId === session.userId)?.avatar,
              score: session.score || 0,
              correctAnswers: session.correctAnswers || 0,
              totalAnswers: session.totalAnswers || 0
            }))}
            currentUserId={dbUserId || currentUser.id}
            onBackToMenu={handleBackToMenu}
            onPlayAgain={restartGame}
            roomCode={roomCode}
          />
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
