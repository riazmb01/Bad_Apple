import { Trophy, Medal } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useState } from "react";

interface LeaderboardProps {
  currentUserId: string;
}

export default function Leaderboard({ currentUserId }: LeaderboardProps) {
  const [timeFrame, setTimeFrame] = useState<'week' | 'alltime'>('week');

  // Mock leaderboard data
  const weeklyLeaderboard = [
    { 
      id: "user-1", 
      username: "Sarah Smith", 
      level: 9, 
      accuracy: 98, 
      points: 3250, 
      wins: 23,
      avatar: "SS",
      rank: 1
    },
    { 
      id: "user-2", 
      username: "Michael Johnson", 
      level: 8, 
      accuracy: 95, 
      points: 2890, 
      wins: 19,
      avatar: "MJ",
      rank: 2
    },
    { 
      id: currentUserId, 
      username: "John Doe", 
      level: 7, 
      accuracy: 92, 
      points: 2450, 
      wins: 16,
      avatar: "JD",
      rank: 3
    },
    { 
      id: "user-4", 
      username: "Emma Wilson", 
      level: 6, 
      accuracy: 89, 
      points: 2100, 
      wins: 14,
      avatar: "EW",
      rank: 4
    },
    { 
      id: "user-5", 
      username: "Alex Chen", 
      level: 7, 
      accuracy: 91, 
      points: 1950, 
      wins: 12,
      avatar: "AC",
      rank: 5
    }
  ];

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center">
          <span className="text-sm font-bold text-white">1</span>
        </div>;
      case 2:
        return <div className="w-8 h-8 bg-gray-400 rounded-full flex items-center justify-center">
          <span className="text-sm font-bold text-white">2</span>
        </div>;
      case 3:
        return <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center">
          <span className="text-sm font-bold text-white">3</span>
        </div>;
      default:
        return <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center">
          <span className="text-sm font-bold text-muted-foreground">{rank}</span>
        </div>;
    }
  };

  return (
    <section className="mb-12" data-testid="leaderboard">
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-foreground flex items-center">
              <Trophy className="w-6 h-6 mr-2 text-yellow-500" />
              Class Leaderboard
            </h3>
            <div className="flex space-x-2">
              <Button 
                size="sm"
                variant={timeFrame === 'week' ? 'default' : 'ghost'}
                onClick={() => setTimeFrame('week')}
                data-testid="button-timeframe-week"
              >
                This Week
              </Button>
              <Button 
                size="sm"
                variant={timeFrame === 'alltime' ? 'default' : 'ghost'}
                onClick={() => setTimeFrame('alltime')}
                data-testid="button-timeframe-alltime"
              >
                All Time
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            {weeklyLeaderboard.map((player) => (
              <div 
                key={player.id}
                className={`flex items-center space-x-4 p-4 rounded-lg ${
                  player.id === currentUserId 
                    ? 'bg-primary/10 border-2 border-primary' 
                    : 'bg-muted/30'
                }`}
                data-testid={`leaderboard-player-${player.rank}`}
              >
                {getRankIcon(player.rank)}
                <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                  <span className="text-sm font-semibold text-primary-foreground">{player.avatar}</span>
                </div>
                <div className="flex-1">
                  <div className="font-medium text-foreground">
                    {player.username} {player.id === currentUserId && '(You)'}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Level {player.level} • {player.accuracy}% accuracy
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-foreground" data-testid={`player-points-${player.rank}`}>
                    {player.points.toLocaleString()} pts
                  </div>
                  <div className="text-sm text-muted-foreground" data-testid={`player-wins-${player.rank}`}>
                    {player.wins} wins
                  </div>
                </div>
              </div>
            ))}

            <div className="text-center pt-4">
              <Button 
                variant="ghost"
                data-testid="button-view-full-leaderboard"
              >
                View Full Leaderboard
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
