import { Trophy, Users, XCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import SpellingBeeGame from "./SpellingBeeGame";
import GrammarGame from "./GrammarGame";
import CountdownTimer from "./CountdownTimer";

interface MultiplayerGameViewProps {
  gameState: any;
  connectedPlayers: any[];
  currentUserId: string;
  roomSettings: any;
  onSubmitAnswer: (answer: string) => void;
  onUseHint: (hintType: string) => void;
  onSkipWord: () => void;
  onPauseGame: () => void;
  multiplayerFeedback: { show: boolean; isCorrect: boolean; message: string };
  clearMultiplayerFeedback: () => void;
}

export default function MultiplayerGameView({
  gameState,
  connectedPlayers,
  currentUserId,
  roomSettings,
  onSubmitAnswer,
  onUseHint,
  onSkipWord,
  onPauseGame,
  multiplayerFeedback,
  clearMultiplayerFeedback
}: MultiplayerGameViewProps) {
  const sortedPlayers = [...connectedPlayers].sort((a, b) => (b.score || 0) - (a.score || 0));
  const isTimedChallenge = gameState.competitionType === 'timed';
  const isEliminationMode = gameState.competitionType === 'elimination';
  const currentPlayer = connectedPlayers.find(p => p.userId === currentUserId);
  const isEliminated = currentPlayer?.isEliminated || false;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* Live Leaderboard */}
      <div className="lg:col-span-1 order-2 lg:order-1 space-y-4">
        {/* Universal 3-Minute Timer for ALL Multiplayer Games */}
        {gameState.globalTimer !== undefined && (
          <CountdownTimer timeRemaining={gameState.globalTimer} />
        )}
        
        <Card className="sticky top-4">
          <CardContent className="p-6">
            <div className="flex items-center space-x-2 mb-4">
              <Users className="w-5 h-5 text-primary" />
              <h3 className="text-lg font-semibold text-foreground">Live Scores</h3>
            </div>
            
            <div className="space-y-3">
              {sortedPlayers.map((player, index) => (
                <div 
                  key={player.userId}
                  className={`flex items-center justify-between p-3 rounded-lg transition-all ${
                    player.userId === currentUserId 
                      ? 'bg-primary/10 border border-primary/20' 
                      : 'bg-muted/30'
                  }`}
                  data-testid={`leaderboard-player-${player.userId}`}
                >
                  <div className="flex items-center space-x-3">
                    {index < 3 && (
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                        index === 0 ? 'bg-yellow-500' : 
                        index === 1 ? 'bg-gray-400' : 
                        'bg-amber-600'
                      }`}>
                        <Trophy className="w-3 h-3 text-white" />
                      </div>
                    )}
                    {index >= 3 && (
                      <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center">
                        <span className="text-xs font-semibold text-muted-foreground">{index + 1}</span>
                      </div>
                    )}
                    <div>
                      <div className="font-medium text-foreground text-sm">
                        {player.username}
                        {player.userId === currentUserId && (
                          <span className="ml-2 text-xs text-primary">(You)</span>
                        )}
                        {player.isEliminated && (
                          <span className="ml-2 text-xs text-destructive">(Eliminated)</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {player.isEliminated && <XCircle className="w-4 h-4 text-destructive" data-testid={`eliminated-icon-${player.userId}`} />}
                    <div className="text-lg font-bold text-foreground">{player.score || 0}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 pt-4 border-t border-border">
              <div className="text-sm text-muted-foreground">
                Round {gameState.currentRound || 1}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Game Area */}
      <div className="lg:col-span-3 order-1 lg:order-2 space-y-4">
        {/* Elimination Banner */}
        {isEliminationMode && isEliminated && (
          <Card className="bg-destructive/10 border-destructive/50" data-testid="elimination-banner">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <XCircle className="w-6 h-6 text-destructive" />
                <div>
                  <h3 className="text-lg font-semibold text-destructive">You've Been Eliminated</h3>
                  <p className="text-sm text-muted-foreground">
                    You got a word wrong and have been eliminated. You can spectate the remaining players.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {gameState.gameMode === 'spelling' && (
          <SpellingBeeGame
            gameState={gameState}
            userId={currentUserId}
            hintsEnabled={roomSettings?.hintsEnabled !== false}
            onSubmitAnswer={onSubmitAnswer}
            onUseHint={onUseHint}
            onSkipWord={onSkipWord}
            onPauseGame={onPauseGame}
            isEliminated={isEliminated}
            multiplayerFeedback={multiplayerFeedback}
            clearMultiplayerFeedback={clearMultiplayerFeedback}
          />
        )}
        {gameState.gameMode === 'grammar' && (
          <GrammarGame
            gameState={gameState}
            onSubmitAnswer={onSubmitAnswer}
            onSkipWord={onSkipWord}
            onPauseGame={onPauseGame}
            isEliminated={isEliminated}
          />
        )}
      </div>
    </div>
  );
}
