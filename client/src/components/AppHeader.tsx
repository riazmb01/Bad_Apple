import { Flame, Star } from "lucide-react";

interface AppHeaderProps {
  user: {
    id: string;
    username: string;
    streak: number;
    points: number;
  };
}

export default function AppHeader({ user }: AppHeaderProps) {
  const initials = user.username
    .split(' ')
    .map(name => name.charAt(0))
    .join('')
    .toUpperCase();

  return (
    <header className="bg-card border-b border-border shadow-sm" data-testid="app-header">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo and Title */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <i className="fas fa-spell-check text-primary-foreground text-xl"></i>
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground" data-testid="app-title">SpellMaster Pro</h1>
              <p className="text-xs text-muted-foreground">Educational Gaming Platform</p>
            </div>
          </div>

          {/* User Status and Navigation */}
          <div className="flex items-center space-x-6">
            {/* Current Streak */}
            <div className="flex items-center space-x-2 bg-accent/10 px-3 py-2 rounded-lg" data-testid="user-streak">
              <Flame className="h-4 w-4 text-orange-500" />
              <span className="text-sm font-semibold text-foreground">{user.streak} Day Streak</span>
            </div>

            {/* Points */}
            <div className="flex items-center space-x-2 bg-primary/10 px-3 py-2 rounded-lg" data-testid="user-points">
              <Star className="h-4 w-4 text-yellow-500" />
              <span className="text-sm font-semibold text-foreground">{user.points.toLocaleString()} Points</span>
            </div>

            {/* Profile */}
            <div className="flex items-center space-x-2" data-testid="user-profile">
              <div className="w-8 h-8 bg-secondary rounded-full flex items-center justify-center">
                <span className="text-sm font-semibold text-secondary-foreground">{initials}</span>
              </div>
              <span className="text-sm font-medium text-foreground">{user.username}</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
