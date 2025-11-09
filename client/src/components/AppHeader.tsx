import { useState, useEffect } from "react";
import { Trophy, TrendingUp } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import type { AchievementWithStatus, User } from "@shared/mongodb-schema";
import BeeIcon from "./BeeIcon";
import UsernamePromptDialog from "./UsernamePromptDialog";

interface AppHeaderProps {
  user: {
    id: string;
    username: string;
    level: number;
  };
  dbUserId?: string;
}

export default function AppHeader({ user, dbUserId }: AppHeaderProps) {
  const [showUsernamePrompt, setShowUsernamePrompt] = useState(false);
  const [currentUsername, setCurrentUsername] = useState(user.username);

  const initials = currentUsername
    .split(' ')
    .map(name => name.charAt(0))
    .join('')
    .toUpperCase();

  // Fetch achievements to count unlocked ones
  const { data: achievements } = useQuery<AchievementWithStatus[]>({
    queryKey: ['/api/users', dbUserId, 'achievements'],
    enabled: !!dbUserId,
  });

  // Fetch full user data to check if username is customized
  const { data: fullUser } = useQuery<User>({
    queryKey: ['/api/users', dbUserId],
    enabled: !!dbUserId,
  });

  const unlockedCount = achievements?.filter(a => a.unlocked).length || 0;

  // Show username prompt after 5 seconds if user hasn't customized their name
  useEffect(() => {
    if (!fullUser || !dbUserId) return;
    
    // Check if user has dismissed the prompt before
    const dismissedKey = `username-prompt-dismissed-${dbUserId}`;
    const hasDismissed = localStorage.getItem(dismissedKey);
    
    // Only show if user hasn't customized their username and hasn't dismissed the prompt
    if (!fullUser.hasCustomUsername && !hasDismissed) {
      const timer = setTimeout(() => {
        setShowUsernamePrompt(true);
      }, 5000); // 5 seconds delay

      return () => clearTimeout(timer);
    }
  }, [fullUser, dbUserId]);

  const handleUsernameUpdate = (newUsername: string) => {
    setCurrentUsername(newUsername);
    // Mark as dismissed so we don't show it again
    if (dbUserId) {
      localStorage.setItem(`username-prompt-dismissed-${dbUserId}`, 'true');
    }
  };

  const handlePromptClose = (open: boolean) => {
    setShowUsernamePrompt(open);
    // If user closed the dialog, mark as dismissed
    if (!open && dbUserId) {
      localStorage.setItem(`username-prompt-dismissed-${dbUserId}`, 'true');
    }
  };

  return (
    <header className="bg-card border-b border-border shadow-sm" data-testid="app-header">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo and Title */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-yellow-400 rounded-lg flex items-center justify-center">
              <BeeIcon className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground" data-testid="app-title">Bad Apple</h1>
              <p className="text-xs text-muted-foreground">Educational Gaming Platform</p>
            </div>
          </div>

          {/* User Status and Navigation */}
          <div className="flex items-center space-x-6">
            {/* Achievements */}
            <div className="flex items-center space-x-2 bg-accent/10 px-3 py-2 rounded-lg" data-testid="user-achievements">
              <Trophy className="h-4 w-4 text-yellow-500" />
              <span className="text-sm font-semibold text-foreground">{unlockedCount} Achievements</span>
            </div>

            {/* Level */}
            <div className="flex items-center space-x-2 bg-primary/10 px-3 py-2 rounded-lg" data-testid="user-level">
              <TrendingUp className="h-4 w-4 text-green-500" />
              <span className="text-sm font-semibold text-foreground">Level {user.level}</span>
            </div>

            {/* Profile */}
            <div className="flex items-center space-x-2" data-testid="user-profile">
              <div className="w-8 h-8 bg-secondary rounded-full flex items-center justify-center">
                <span className="text-sm font-semibold text-secondary-foreground">{initials}</span>
              </div>
              <span className="text-sm font-medium text-foreground">{currentUsername}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Username Prompt Dialog */}
      {dbUserId && (
        <UsernamePromptDialog
          open={showUsernamePrompt}
          onOpenChange={handlePromptClose}
          userId={dbUserId}
          currentUsername={currentUsername}
          onSuccess={handleUsernameUpdate}
        />
      )}
    </header>
  );
}
