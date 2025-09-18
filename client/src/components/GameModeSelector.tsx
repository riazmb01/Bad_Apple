import { Mic, Book, Users, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface GameModeSelectorProps {
  onSelectMode: (mode: 'spelling' | 'grammar' | 'multiplayer') => void;
}

export default function GameModeSelector({ onSelectMode }: GameModeSelectorProps) {
  const gameModes = [
    {
      id: 'spelling' as const,
      title: 'Spelling Bee',
      description: 'Listen and spell words correctly. Includes pronunciation and definitions.',
      icon: Mic,
      iconColor: 'text-blue-600',
      bgColor: 'bg-blue-100',
      badgeColor: 'bg-blue-100 text-blue-800',
      badge: 'Classic',
      players: '1-10 players',
      duration: '5-15 min'
    },
    {
      id: 'grammar' as const,
      title: 'Grammar Mastery',
      description: 'Identify parts of speech, sentence structure, and grammar rules.',
      icon: Book,
      iconColor: 'text-green-600',
      bgColor: 'bg-green-100',
      badgeColor: 'bg-green-100 text-green-800',
      badge: 'Challenge',
      players: '1-8 players',
      duration: '10-20 min'
    },
    {
      id: 'multiplayer' as const,
      title: 'Classroom Battle',
      description: 'Real-time multiplayer competitions with elimination rounds.',
      icon: Users,
      iconColor: 'text-purple-600',
      bgColor: 'bg-purple-100',
      badgeColor: 'bg-purple-100 text-purple-800',
      badge: 'Competitive',
      players: '4-30 players',
      duration: '15-30 min'
    }
  ];

  return (
    <section className="mb-12">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-foreground mb-2" data-testid="title-choose-challenge">Choose Your Challenge</h2>
        <p className="text-muted-foreground">Select a game mode to start learning and competing</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {gameModes.map((mode) => {
          const IconComponent = mode.icon;
          return (
            <Card 
              key={mode.id}
              className="game-card cursor-pointer hover:shadow-lg transition-all duration-200 hover:-translate-y-1"
              onClick={() => onSelectMode(mode.id)}
              data-testid={`card-game-mode-${mode.id}`}
            >
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className={`w-12 h-12 ${mode.bgColor} rounded-lg flex items-center justify-center`}>
                    <IconComponent className={`${mode.iconColor} text-xl w-6 h-6`} />
                  </div>
                  <div className={`${mode.badgeColor} text-xs font-semibold px-2 py-1 rounded-full`}>
                    {mode.badge}
                  </div>
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2" data-testid={`title-${mode.id}`}>
                  {mode.title}
                </h3>
                <p className="text-muted-foreground mb-4" data-testid={`description-${mode.id}`}>
                  {mode.description}
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground" data-testid={`players-${mode.id}`}>
                    {mode.players}
                  </span>
                  <div className="flex items-center space-x-1">
                    <Clock className="text-muted-foreground w-4 h-4" />
                    <span className="text-sm text-muted-foreground" data-testid={`duration-${mode.id}`}>
                      {mode.duration}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
