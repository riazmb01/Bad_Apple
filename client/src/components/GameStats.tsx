import { Trophy, Flame, Brain } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";

interface GameStatsProps {
  user: {
    level: number;
    points: number;
    streak: number;
    accuracy: number;
    wordsSpelled: number;
    gamesWon: number;
    bestStreak: number;
  };
}

export default function GameStats({ user }: GameStatsProps) {
  // Calculate level progress (mock calculation)
  const currentLevelXP = 1200;
  const nextLevelXP = 2000;
  const levelProgress = (currentLevelXP / nextLevelXP) * 100;

  const achievements = [
    {
      id: 1,
      title: "Spelling Champion",
      description: "Win 20 multiplayer games",
      icon: Trophy,
      iconColor: "text-yellow-500",
      bgColor: "bg-yellow-50",
      points: 100,
      unlocked: true
    },
    {
      id: 2,
      title: "Hot Streak",
      description: "Maintain 10-day streak",
      icon: Flame,
      iconColor: "text-orange-500",
      bgColor: "bg-orange-50",
      points: 50,
      unlocked: true
    },
    {
      id: 3,
      title: "Grammar Guru",
      description: "Perfect score in grammar challenge",
      icon: Brain,
      iconColor: "text-purple-500",
      bgColor: "bg-purple-50",
      points: 75,
      unlocked: true
    }
  ];

  return (
    <section className="mb-12" data-testid="game-stats">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Progress Overview */}
        <Card>
          <CardContent className="p-6">
            <h3 className="text-xl font-semibold text-foreground mb-6" data-testid="progress-title">Your Progress</h3>
            
            <div className="space-y-6">
              {/* Level Progress */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-foreground">Current Level</span>
                  <span className="text-sm text-muted-foreground" data-testid="user-level">Level {user.level}</span>
                </div>
                <Progress value={levelProgress} className="h-3" />
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>{currentLevelXP.toLocaleString()} XP</span>
                  <span>{nextLevelXP.toLocaleString()} XP</span>
                </div>
              </div>

              {/* Statistics */}
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-muted/30 rounded-lg" data-testid="stat-words-spelled">
                  <div className="text-2xl font-bold text-foreground">{user.wordsSpelled}</div>
                  <div className="text-sm text-muted-foreground">Words Spelled</div>
                </div>
                <div className="text-center p-4 bg-muted/30 rounded-lg" data-testid="stat-accuracy">
                  <div className="text-2xl font-bold text-foreground">{user.accuracy}%</div>
                  <div className="text-sm text-muted-foreground">Accuracy</div>
                </div>
                <div className="text-center p-4 bg-muted/30 rounded-lg" data-testid="stat-games-won">
                  <div className="text-2xl font-bold text-foreground">{user.gamesWon}</div>
                  <div className="text-sm text-muted-foreground">Games Won</div>
                </div>
                <div className="text-center p-4 bg-muted/30 rounded-lg" data-testid="stat-best-streak">
                  <div className="text-2xl font-bold text-foreground">{user.bestStreak}</div>
                  <div className="text-sm text-muted-foreground">Best Streak</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Achievements */}
        <Card>
          <CardContent className="p-6">
            <h3 className="text-xl font-semibold text-foreground mb-6" data-testid="achievements-title">Recent Achievements</h3>
            
            <div className="space-y-4">
              {achievements.map((achievement) => {
                const IconComponent = achievement.icon;
                return (
                  <div 
                    key={achievement.id} 
                    className={`flex items-center space-x-4 p-3 ${achievement.bgColor} rounded-lg`}
                    data-testid={`achievement-${achievement.id}`}
                  >
                    <div className={`w-12 h-12 bg-white rounded-lg flex items-center justify-center`}>
                      <IconComponent className={`${achievement.iconColor} text-xl w-6 h-6`} />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-foreground">{achievement.title}</div>
                      <div className="text-sm text-muted-foreground">{achievement.description}</div>
                    </div>
                    <div className={`text-xs font-semibold ${achievement.iconColor.replace('text-', 'text-')}`}>
                      +{achievement.points} XP
                    </div>
                  </div>
                );
              })}

              <Button 
                variant="ghost" 
                className="w-full"
                data-testid="button-view-all-achievements"
              >
                View All Achievements
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
