import { Trophy, Medal, Award, Home, Play, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useState } from "react";

interface Player {
  userId: string;
  username: string;
  avatar?: string;
  score: number;
  correctAnswers?: number;
  totalAnswers?: number;
  isReady?: boolean;
}

interface MultiplayerResultsProps {
  players: Player[];
  currentUserId: string;
  onBackToMenu: () => void;
  onReadyUp?: () => void;
  onRestartGame?: () => void;
  isHost?: boolean;
}

export default function MultiplayerResults({ 
  players, 
  currentUserId, 
  onBackToMenu,
  onReadyUp,
  onRestartGame,
  isHost = false
}: MultiplayerResultsProps) {
  const sortedPlayers = [...players].sort((a, b) => (b.score || 0) - (a.score || 0));
  const winner = sortedPlayers[0];
  const currentPlayer = sortedPlayers.find(p => p.userId === currentUserId);
  const [hasReadied, setHasReadied] = useState(false);

  const handleReadyUp = () => {
    if (onReadyUp) {
      onReadyUp();
      setHasReadied(true);
    }
  };

  return (
    <section className="mb-12">
      <Card className="max-w-4xl mx-auto">
        <CardContent className="p-8">
          {/* Winner Announcement */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full mb-4">
              <Trophy className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-3xl font-bold text-foreground mb-2">
              Game Over!
            </h2>
            <p className="text-xl text-muted-foreground">
              {winner.userId === currentUserId ? "Congratulations! You won!" : `${winner.username} wins!`}
            </p>
          </div>

          {/* Final Standings */}
          <div className="space-y-3 mb-8">
            {sortedPlayers.map((player, index) => {
              const isCurrentUser = player.userId === currentUserId;
              const accuracy = player.totalAnswers 
                ? Math.round(((player.correctAnswers || 0) / player.totalAnswers) * 100) 
                : 0;

              return (
                <div
                  key={player.userId}
                  className={`flex items-center justify-between p-4 rounded-lg transition-all ${
                    isCurrentUser
                      ? 'bg-primary/10 border-2 border-primary'
                      : 'bg-muted/30 border border-border'
                  }`}
                  data-testid={`result-player-${player.userId}`}
                >
                  <div className="flex items-center space-x-4">
                    {/* Rank Badge */}
                    {index === 0 && (
                      <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center">
                        <Trophy className="w-6 h-6 text-white" />
                      </div>
                    )}
                    {index === 1 && (
                      <div className="w-12 h-12 bg-gradient-to-br from-gray-300 to-gray-500 rounded-full flex items-center justify-center">
                        <Medal className="w-6 h-6 text-white" />
                      </div>
                    )}
                    {index === 2 && (
                      <div className="w-12 h-12 bg-gradient-to-br from-amber-600 to-amber-800 rounded-full flex items-center justify-center">
                        <Award className="w-6 h-6 text-white" />
                      </div>
                    )}
                    {index > 2 && (
                      <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center">
                        <span className="text-xl font-bold text-muted-foreground">#{index + 1}</span>
                      </div>
                    )}

                    {/* Player Info */}
                    <div>
                      <div className="font-semibold text-foreground text-lg">
                        {player.username}
                        {isCurrentUser && (
                          <span className="ml-2 text-sm text-primary">(You)</span>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {player.correctAnswers || 0}/{player.totalAnswers || 0} correct
                        {accuracy > 0 && ` • ${accuracy}% accuracy`}
                      </div>
                    </div>
                  </div>

                  {/* Score and Ready Status */}
                  <div className="flex items-center space-x-4">
                    <div className="text-2xl font-bold text-foreground">
                      {player.score || 0} pts
                    </div>
                    {/* Ready Status Indicator */}
                    {player.isReady !== undefined && (
                      <div className={`flex items-center space-x-1 px-3 py-1 rounded-full text-sm font-medium ${
                        player.isReady 
                          ? 'bg-green-500/20 text-green-600' 
                          : 'bg-red-500/20 text-red-600'
                      }`} data-testid={`ready-status-${player.userId}`}>
                        {player.isReady ? (
                          <>
                            <Check className="w-4 h-4" />
                            <span>Ready</span>
                          </>
                        ) : (
                          <>
                            <X className="w-4 h-4" />
                            <span>Not Ready</span>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Personal Stats */}
          {currentPlayer && (
            <div className="bg-primary/5 rounded-lg p-6 mb-6">
              <h3 className="text-lg font-semibold text-foreground mb-3">Your Performance</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">{currentPlayer.score || 0}</div>
                  <div className="text-sm text-muted-foreground">Points Earned</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">{currentPlayer.correctAnswers || 0}</div>
                  <div className="text-sm text-muted-foreground">Correct Answers</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">
                    {currentPlayer.totalAnswers 
                      ? Math.round(((currentPlayer.correctAnswers || 0) / currentPlayer.totalAnswers) * 100) 
                      : 0}%
                  </div>
                  <div className="text-sm text-muted-foreground">Accuracy</div>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-center space-x-4">
            {isHost ? (
              <>
                <Button 
                  onClick={onRestartGame}
                  size="lg"
                  variant="default"
                  data-testid="button-restart-game"
                >
                  <Play className="w-4 h-4 mr-2" />
                  Start New Game
                </Button>
                <Button 
                  onClick={onBackToMenu}
                  size="lg"
                  variant="outline"
                  data-testid="button-back-to-menu"
                >
                  <Home className="w-4 h-4 mr-2" />
                  Back to Menu
                </Button>
              </>
            ) : (
              <>
                <Button 
                  onClick={handleReadyUp}
                  size="lg"
                  variant="default"
                  disabled={hasReadied || currentPlayer?.isReady}
                  data-testid="button-ready-up"
                >
                  <Check className="w-4 h-4 mr-2" />
                  {hasReadied || currentPlayer?.isReady ? "Ready!" : "Ready Up"}
                </Button>
                <Button 
                  onClick={onBackToMenu}
                  size="lg"
                  variant="outline"
                  data-testid="button-back-to-menu"
                >
                  <Home className="w-4 h-4 mr-2" />
                  Back to Menu
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
