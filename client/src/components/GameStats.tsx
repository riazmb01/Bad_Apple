import { Trophy, Flame, Brain, Loader2, Lock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { type User, type AchievementWithStatus } from "@shared/schema";

interface GameStatsProps {
  userId: string;
  isUserReady: boolean;
}

export default function GameStats({ userId, isUserReady }: GameStatsProps) {
  const { data: user, isLoading: userLoading, error: userError } = useQuery<User>({
    queryKey: ['/api/users', userId],
    enabled: !!userId && isUserReady,
  });

  const { data: achievements, isLoading: achievementsLoading } = useQuery<AchievementWithStatus[]>({
    queryKey: ['/api/users', userId, 'achievements'],
    enabled: !!userId && isUserReady,
  });

  // Calculate level progress based on points
  const calculateLevelProgress = (points: number) => {
    const pointsPerLevel = 1000;
    const currentLevelPoints = points % pointsPerLevel;
    return (currentLevelPoints / pointsPerLevel) * 100;
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
            <h3 className="text-xl font-semibold text-foreground mb-6" data-testid="achievements-title">Achievements</h3>
            
            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {achievementsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="animate-spin h-6 w-6" />
                </div>
              ) : achievements && achievements.length > 0 ? (
                <div className="grid grid-cols-1 gap-2">
                  {achievements.map((achievement) => (
                    <div 
                      key={achievement.id} 
                      className={`flex items-center space-x-3 p-3 rounded-lg border ${
                        achievement.unlocked 
                          ? 'bg-green-50 border-green-200' 
                          : 'bg-muted/30 border-muted opacity-60'
                      }`}
                      data-testid={`achievement-${achievement.id}`}
                    >
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-2xl ${
                        achievement.unlocked ? 'bg-white' : 'bg-muted'
                      }`}>
                        {achievement.unlocked ? achievement.icon : <Lock className="w-5 h-5 text-muted-foreground" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className={`font-medium text-sm ${achievement.unlocked ? 'text-foreground' : 'text-muted-foreground'}`}>
                          {achievement.name}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {achievement.description}
                        </div>
                      </div>
                      {achievement.unlocked && achievement.unlockedAt && (
                        <div className="text-xs text-green-600 font-medium">
                          ✓
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No achievements available
                </div>
              )}
            </div>
            
            <div className="mt-4 pt-4 border-t border-border">
              <div className="text-sm text-center text-muted-foreground">
                {achievements?.filter(a => a.unlocked).length || 0} of {achievements?.length || 0} unlocked
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
