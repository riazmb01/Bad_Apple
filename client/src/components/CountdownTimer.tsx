import { Timer, AlertCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useEffect, useState } from "react";

interface CountdownTimerProps {
  timeRemaining: number; // in seconds
}

export default function CountdownTimer({ timeRemaining }: CountdownTimerProps) {
  const [pulse, setPulse] = useState(false);
  
  // Pulse animation when time is low
  useEffect(() => {
    if (timeRemaining <= 30 && timeRemaining > 0) {
      setPulse(true);
      const timer = setTimeout(() => setPulse(false), 500);
      return () => clearTimeout(timer);
    }
  }, [timeRemaining]);

  const minutes = Math.floor(timeRemaining / 60);
  const seconds = timeRemaining % 60;
  
  // Determine urgency level
  const isUrgent = timeRemaining <= 30;
  const isCritical = timeRemaining <= 10;
  
  // Color based on time remaining
  const getTimerColor = () => {
    if (isCritical) return "text-red-600 dark:text-red-400";
    if (isUrgent) return "text-orange-600 dark:text-orange-400";
    return "text-primary";
  };
  
  const getBgColor = () => {
    if (isCritical) return "bg-red-100 dark:bg-red-950 border-red-300 dark:border-red-800";
    if (isUrgent) return "bg-orange-100 dark:bg-orange-950 border-orange-300 dark:border-orange-800";
    return "bg-primary/5 border-primary/20";
  };

  return (
    <Card className={`${getBgColor()} transition-all duration-300 ${pulse ? 'scale-105' : ''}`} data-testid="countdown-timer">
      <CardContent className="p-6">
        <div className="flex items-center justify-center space-x-3">
          <div className={`${getTimerColor()} transition-colors ${isCritical ? 'animate-pulse' : ''}`}>
            {isCritical ? (
              <AlertCircle className="w-8 h-8" />
            ) : (
              <Timer className="w-8 h-8" />
            )}
          </div>
          <div>
            <div className={`text-4xl font-bold ${getTimerColor()} transition-colors tabular-nums`} data-testid="timer-display">
              {minutes}:{seconds.toString().padStart(2, '0')}
            </div>
            <div className="text-sm text-muted-foreground text-center">
              {isCritical ? "Hurry!" : isUrgent ? "Time Running Out!" : "Time Remaining"}
            </div>
          </div>
        </div>
        
        {/* Progress bar */}
        <div className="mt-4 w-full h-2 bg-muted rounded-full overflow-hidden">
          <div 
            className={`h-full transition-all duration-1000 ${
              isCritical ? 'bg-red-600' : 
              isUrgent ? 'bg-orange-600' : 
              'bg-primary'
            }`}
            style={{ width: `${(timeRemaining / 180) * 100}%` }}
          />
        </div>
      </CardContent>
    </Card>
  );
}
