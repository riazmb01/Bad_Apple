import { Trophy, Flame, Brain, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { type User, type Achievement } from "@shared/schema";

interface GameStatsProps {
  userId: string;
  isUserReady: boolean;
}

export default function GameStats({ userId, isUserReady }: GameStatsProps) {
  const { data: user, isLoading: userLoading, error: userError } = useQuery<User>({
    queryKey: ['/api/users', userId],
    enabled: !!userId && isUserReady,
  });

  const { data: achievements, isLoading: achievementsLoading } = useQuery<Achievement[]>({
    queryKey: ['/api/users', userId, 'achievements'],
    enabled: !!userId && isUserReady,
  });

  // Calculate level progress based on points
  const calculateLevelProgress = (points: number) => {
    const pointsPerLevel = 1000;
    const currentLevelPoints = points % pointsPerLevel;
    return (currentLevelPoints / pointsPerLevel) * 100;
  };

  const getAchievementIcon = (iconName: string) => {
    switch (iconName) {
      case 'trophy':
        return Trophy;
      case 'flame':
        return Flame;
      case 'brain':
        return Brain;
      default:
        return Trophy;
    }
  };

  const getAchievementColors = (iconName: string) => {
    switch (iconName) {
      case 'trophy':
        return { iconColor: 'text-yellow-500', bgColor: 'bg-yellow-50' };
      case 'flame':
        return { iconColor: 'text-orange-500', bgColor: 'bg-orange-50' };
      case 'brain':
        return { iconColor: 'text-purple-500', bgColor: 'bg-purple-50' };
      default:
        return { iconColor: 'text-blue-500', bgColor: 'bg-blue-50' };
    }
  };

  if (userLoading) {
    return (
      <section className="mb-12" data-testid="game-stats">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-center h-32">
                <Loader2 className="animate-spin h-8 w-8" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-center h-32">
                <Loader2 className="animate-spin h-8 w-8" />
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    );
  }

  if (userError || !user) {
    return (
      <section className="mb-12" data-testid="game-stats">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card>
            <CardContent className="p-6">
              <div className="text-center text-muted-foreground">
                Failed to load user statistics
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    );
  }

  const levelProgress = calculateLevelProgress(user.points || 0);
  const currentLevel = Math.floor((user.points || 0) / 1000) + 1;
  const currentLevelXP = (user.points || 0) % 1000;
  const nextLevelXP = 1000;

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
                  <span className="text-sm text-muted-foreground" data-testid="user-level">Level {currentLevel}</span>
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
                  <div className="text-2xl font-bold text-foreground">{user.wordsSpelled || 0}</div>
                  <div className="text-sm text-muted-foreground">Words Spelled</div>
                </div>
                <div className="text-center p-4 bg-muted/30 rounded-lg" data-testid="stat-accuracy">
                  <div className="text-2xl font-bold text-foreground">{user.accuracy || 0}%</div>
                  <div className="text-sm text-muted-foreground">Accuracy</div>
                </div>
                <div className="text-center p-4 bg-muted/30 rounded-lg" data-testid="stat-games-won">
                  <div className="text-2xl font-bold text-foreground">{user.gamesWon || 0}</div>
                  <div className="text-sm text-muted-foreground">Games Won</div>
                </div>
                <div className="text-center p-4 bg-muted/30 rounded-lg" data-testid="stat-best-streak">
                  <div className="text-2xl font-bold text-foreground">{user.bestStreak || 0}</div>
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
              {achievementsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="animate-spin h-6 w-6" />
                </div>
              ) : achievements && achievements.length > 0 ? (
                achievements.slice(0, 3).map((achievement) => {
                  const IconComponent = getAchievementIcon(achievement.icon);
                  const { iconColor, bgColor } = getAchievementColors(achievement.icon);
                  return (
                    <div 
                      key={achievement.id} 
                      className={`flex items-center space-x-4 p-3 ${bgColor} rounded-lg`}
                      data-testid={`achievement-${achievement.id}`}
                    >
                      <div className={`w-12 h-12 bg-white rounded-lg flex items-center justify-center`}>
                        <IconComponent className={`${iconColor} text-xl w-6 h-6`} />
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-foreground">{achievement.name}</div>
                        <div className="text-sm text-muted-foreground">{achievement.description}</div>
                      </div>
                      <div className={`text-xs font-semibold ${iconColor}`}>
                        +{achievement.points} XP
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No achievements unlocked yet
                </div>
              )}

              {achievements && achievements.length > 3 && (
                <Button 
                  variant="ghost" 
                  className="w-full"
                  data-testid="button-view-all-achievements"
                >
                  View All {achievements.length} Achievements
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
