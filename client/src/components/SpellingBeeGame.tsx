import { useState, useEffect } from "react";
import { Volume2, Lightbulb, Forward, Pause, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface SpellingBeeGameProps {
  gameState: any;
  onSubmitAnswer: (answer: string) => void;
  onUseHint: (hintType: string) => void;
  onSkipWord: () => void;
  onPauseGame: () => void;
}

export default function SpellingBeeGame({ 
  gameState, 
  onSubmitAnswer, 
  onUseHint, 
  onSkipWord, 
  onPauseGame 
}: SpellingBeeGameProps) {
  const [userInput, setUserInput] = useState("");
  const [timeLeft, setTimeLeft] = useState(gameState?.timeLeft || 45);
  const [hintsUsed, setHintsUsed] = useState({
    firstLetter: false,
    definition: false,
    sentence: false
  });

  useEffect(() => {
    if (gameState?.timeLeft) {
      setTimeLeft(gameState.timeLeft);
    }
  }, [gameState?.timeLeft]);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev: number) => {
        if (prev <= 1) {
          // Time's up - auto submit
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const handleSubmit = () => {
    if (userInput.trim()) {
      onSubmitAnswer(userInput.trim());
      setUserInput("");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit();
    }
  };

  const handleUseHint = (hintType: string) => {
    onUseHint(hintType);
    setHintsUsed(prev => ({ ...prev, [hintType]: true }));
  };

  const playPronunciation = () => {
    if ('speechSynthesis' in window && gameState?.currentWord) {
      const utterance = new SpeechSynthesisUtterance(gameState.currentWord.word);
      utterance.rate = 0.7;
      utterance.volume = 0.8;
      speechSynthesis.speak(utterance);
    }
  };

  const timeProgress = ((45 - timeLeft) / 45) * 100;

  return (
    <section className="mb-12" data-testid="spelling-bee-game">
      <Card>
        <CardContent className="p-8">
          {/* Game Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center space-x-4">
              <h3 className="text-2xl font-bold text-foreground" data-testid="game-title">Spelling Bee Challenge</h3>
              <div className="bg-accent/10 text-accent text-sm font-semibold px-3 py-1 rounded-full">
                Round {gameState?.currentRound || 1} of {gameState?.totalRounds || 10}
              </div>
            </div>
            
            {/* Timer */}
            <div className="flex items-center space-x-4">
              <div className="relative w-16 h-16" data-testid="timer-display">
                <svg className="progress-ring w-16 h-16 -rotate-90" viewBox="0 0 36 36">
                  <path 
                    className="text-muted stroke-current" 
                    strokeWidth="3" 
                    fill="none" 
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path 
                    className="text-orange-500 stroke-current" 
                    strokeWidth="3" 
                    strokeDasharray={`${timeProgress}, 100`}
                    strokeLinecap="round" 
                    fill="none" 
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xl font-bold text-foreground" data-testid="time-left">{timeLeft}</span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-muted-foreground">Time Left</div>
                <div className="text-sm font-semibold text-foreground">{timeLeft} seconds</div>
              </div>
            </div>
          </div>

          {/* Word Display and Audio */}
          <div className="text-center mb-8">
            <div className="mb-6">
              <Button 
                onClick={playPronunciation}
                className="inline-flex items-center space-x-3"
                data-testid="button-play-pronunciation"
              >
                <Volume2 className="w-5 h-5" />
                <span className="text-lg font-semibold">Play Pronunciation</span>
              </Button>
            </div>
            
            {/* Word Input */}
            <div className="max-w-md mx-auto">
              <Input 
                type="text" 
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                onKeyPress={handleKeyPress}
                className="typing-input text-2xl text-center py-4 px-6"
                placeholder="Type the word here..."
                data-testid="input-word-spelling"
              />
            </div>
          </div>

          {/* Hints Section */}
          <Card className="mb-8">
            <CardContent className="p-6">
              <h4 className="text-lg font-semibold text-foreground mb-4 flex items-center">
                <Lightbulb className="text-yellow-500 mr-2 w-5 h-5" />
                Hints Available
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* First Letter Hint */}
                <Button 
                  variant="outline"
                  className="text-left p-4 h-auto flex-col items-start"
                  onClick={() => handleUseHint('firstLetter')}
                  disabled={hintsUsed.firstLetter}
                  data-testid="button-hint-first-letter"
                >
                  <div className="flex items-center justify-between w-full mb-2">
                    <span className="font-medium">First Letter</span>
                    <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">-5 pts</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {hintsUsed.firstLetter ? "Revealed!" : "Reveal the first letter of the word"}
                  </p>
                </Button>

                {/* Definition Hint */}
                <Button 
                  variant="outline"
                  className="text-left p-4 h-auto flex-col items-start"
                  onClick={() => handleUseHint('definition')}
                  disabled={hintsUsed.definition}
                  data-testid="button-hint-definition"
                >
                  <div className="flex items-center justify-between w-full mb-2">
                    <span className="font-medium">Definition</span>
                    <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">-10 pts</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {hintsUsed.definition ? "Revealed!" : "Show the word's meaning"}
                  </p>
                </Button>

                {/* Example Sentence Hint */}
                <Button 
                  variant="outline"
                  className="text-left p-4 h-auto flex-col items-start"
                  onClick={() => handleUseHint('sentence')}
                  disabled={hintsUsed.sentence}
                  data-testid="button-hint-sentence"
                >
                  <div className="flex items-center justify-between w-full mb-2">
                    <span className="font-medium">Example</span>
                    <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">-15 pts</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {hintsUsed.sentence ? "Revealed!" : "See the word used in context"}
                  </p>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Game Controls */}
          <div className="flex items-center justify-between">
            <Button 
              variant="ghost"
              onClick={onSkipWord}
              data-testid="button-skip-word"
            >
              <Forward className="mr-2 w-4 h-4" />
              Skip Word
            </Button>
            
            <div className="flex space-x-3">
              <Button 
                variant="secondary"
                onClick={onPauseGame}
                data-testid="button-pause-game"
              >
                <Pause className="mr-2 w-4 h-4" />
                Pause
              </Button>
              <Button 
                onClick={handleSubmit}
                disabled={!userInput.trim()}
                data-testid="button-submit-answer"
              >
                <Check className="mr-2 w-4 h-4" />
                Submit Answer
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
