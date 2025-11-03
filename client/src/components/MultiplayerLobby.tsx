import { useState } from "react";
import { Copy, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";

interface MultiplayerLobbyProps {
  roomCode: string;
  connectedPlayers: any[];
  isHost: boolean;
  onStartGame: () => void;
  onLeaveRoom: () => void;
  onUpdateSettings?: (settings: any) => void;
}

export default function MultiplayerLobby({ 
  roomCode, 
  connectedPlayers, 
  isHost, 
  onStartGame, 
  onLeaveRoom,
  onUpdateSettings
}: MultiplayerLobbyProps) {
  const [gameSettings, setGameSettings] = useState({
    difficulty: "intermediate",
    competitionType: "elimination",
    timeLimit: "45",
    hintsEnabled: true
  });

  const { toast } = useToast();

  const updateSetting = (key: string, value: any) => {
    if (!isHost) {
      toast({
        title: "Permission denied",
        description: "Only the host can change game settings.",
        variant: "destructive"
      });
      return;
    }
    
    const newSettings = { ...gameSettings, [key]: value };
    setGameSettings(newSettings);
    
    if (onUpdateSettings) {
      onUpdateSettings(newSettings);
    }
  };

  const copyRoomCode = async () => {
    try {
      await navigator.clipboard.writeText(roomCode);
      toast({
        title: "Room code copied!",
        description: "Share this code with other players to join."
      });
    } catch (error) {
      toast({
        title: "Failed to copy",
        description: "Please copy the room code manually.",
        variant: "destructive"
      });
    }
  };

  const playersToShow = connectedPlayers;

  return (
    <section className="mb-12" data-testid="multiplayer-lobby">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Player List */}
        <div className="lg:col-span-2">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-foreground" data-testid="lobby-title">Classroom Battle Lobby</h3>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full pulse-animation"></div>
                  <span className="text-sm text-muted-foreground">Live Session</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                {playersToShow.length === 0 ? (
                  <div className="col-span-2 text-center py-8 text-muted-foreground">
                    <p className="mb-2">Waiting for players to join...</p>
                    <p className="text-sm">Share the room code with others</p>
                  </div>
                ) : (
                  playersToShow.map((player) => {
                    const isDisconnected = player.isConnected === false;
                    return (
                      <div key={player.userId} className={`flex items-center space-x-3 p-3 rounded-lg ${isDisconnected ? 'bg-muted/10 opacity-60' : 'bg-muted/30'}`} data-testid={`player-${player.userId}`}>
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isDisconnected ? 'bg-muted' : 'bg-primary'}`}>
                          <span className={`text-sm font-semibold ${isDisconnected ? 'text-muted-foreground' : 'text-primary-foreground'}`}>{player.avatar}</span>
                        </div>
                        <div className="flex-1">
                          <div className="font-medium text-foreground">{player.username}</div>
                          <div className={`text-sm ${isDisconnected ? 'text-orange-600' : player.isReady ? 'text-green-600' : 'text-muted-foreground'}`}>
                            {isDisconnected ? 'Disconnected - Reconnecting...' : player.isReady ? 'Ready to play' : 'Waiting...'}
                          </div>
                        </div>
                        <div className={`w-3 h-3 rounded-full ${isDisconnected ? 'bg-orange-500 pulse-animation' : player.isReady ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-border">
                <div className="text-sm text-muted-foreground" data-testid="player-count">
                  {playersToShow.length} {playersToShow.length === 1 ? 'player' : 'players'} connected
                </div>
                <div className="flex space-x-2">
                  <Button 
                    variant="ghost"
                    onClick={onLeaveRoom}
                    data-testid="button-leave-session"
                  >
                    Leave Session
                  </Button>
                  {isHost && (
                    <Button 
                      onClick={onStartGame}
                      disabled={playersToShow.filter(p => p.isReady).length < 1}
                      data-testid="button-start-game"
                    >
                      Start Game
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Game Settings */}
        <div>
          <Card>
            <CardContent className="p-6">
              <h4 className="text-lg font-semibold text-foreground mb-4 flex items-center">
                <Settings className="w-5 h-5 mr-2" />
                Game Settings
              </h4>
              
              <div className="space-y-4">
                {/* Difficulty Level */}
                <div>
                  <Label htmlFor="difficulty" className="text-sm font-medium text-foreground mb-2 block">
                    Difficulty Level
                  </Label>
                  <Select 
                    value={gameSettings.difficulty} 
                    onValueChange={(value) => updateSetting('difficulty', value)}
                    disabled={!isHost}
                  >
                    <SelectTrigger data-testid="select-difficulty">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="beginner">Beginner (1st-3rd Grade)</SelectItem>
                      <SelectItem value="intermediate">Intermediate (4th-6th Grade)</SelectItem>
                      <SelectItem value="advanced">Advanced (7th-9th Grade)</SelectItem>
                      <SelectItem value="expert">Expert (10th+ Grade)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Game Mode */}
                <div>
                  <Label htmlFor="competition-type" className="text-sm font-medium text-foreground mb-2 block">
                    Competition Type
                  </Label>
                  <Select 
                    value={gameSettings.competitionType} 
                    onValueChange={(value) => updateSetting('competitionType', value)}
                    disabled={!isHost}
                  >
                    <SelectTrigger data-testid="select-competition-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="elimination">Elimination Round</SelectItem>
                      <SelectItem value="timed">Timed Challenge</SelectItem>
                      <SelectItem value="team">Team Battle</SelectItem>
                      <SelectItem value="relay">Word Relay</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Time Limit */}
                <div>
                  <Label htmlFor="time-limit" className="text-sm font-medium text-foreground mb-2 block">
                    Time Per Word
                  </Label>
                  <Select 
                    value={gameSettings.timeLimit} 
                    onValueChange={(value) => updateSetting('timeLimit', value)}
                    disabled={!isHost}
                  >
                    <SelectTrigger data-testid="select-time-limit">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="30">30 seconds</SelectItem>
                      <SelectItem value="45">45 seconds</SelectItem>
                      <SelectItem value="60">60 seconds</SelectItem>
                      <SelectItem value="90">90 seconds</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Hints Enabled */}
                <div className="flex items-center space-x-3">
                  <Checkbox 
                    id="hintsEnabled" 
                    checked={gameSettings.hintsEnabled}
                    onCheckedChange={(checked) => updateSetting('hintsEnabled', !!checked)}
                    disabled={!isHost}
                    data-testid="checkbox-hints-enabled"
                  />
                  <Label htmlFor="hintsEnabled" className="text-sm font-medium text-foreground">
                    Enable Hints {!isHost && "(Host only)"}
                  </Label>
                </div>
              </div>

              {/* Room Code */}
              <div className="mt-6 pt-4 border-t border-border">
                <Label className="block text-sm font-medium text-foreground mb-2">Room Code</Label>
                <div className="flex items-center space-x-2">
                  <Input 
                    type="text" 
                    value={roomCode} 
                    readOnly 
                    className="flex-1 font-mono bg-muted"
                    data-testid="input-room-code"
                  />
                  <Button 
                    variant="secondary"
                    size="sm"
                    onClick={copyRoomCode}
                    data-testid="button-copy-room-code"
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Share this code with other players</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
