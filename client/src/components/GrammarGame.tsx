import { useState, useEffect, useRef } from "react";
import { BookOpen, Check, Forward, Pause } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

interface GrammarGameProps {
  gameState: any;
  onSubmitAnswer: (answer: string) => void;
  onSkipWord: () => void;
  onPauseGame: () => void;
}

const grammarQuestions = [
  {
    id: 1,
    sentence: "The cat sat on the mat.",
    question: "What part of speech is 'cat' in this sentence?",
    options: ["Noun", "Verb", "Adjective", "Adverb"],
    correctAnswer: "Noun",
    explanation: "A noun is a word that names a person, place, thing, or idea. 'Cat' names an animal."
  },
  {
    id: 2,
    sentence: "She runs quickly to school.",
    question: "What part of speech is 'quickly' in this sentence?",
    options: ["Noun", "Verb", "Adjective", "Adverb"],
    correctAnswer: "Adverb",
    explanation: "An adverb modifies a verb, adjective, or another adverb. 'Quickly' describes how she runs."
  },
  {
    id: 3,
    sentence: "The beautiful garden blooms every spring.",
    question: "What part of speech is 'beautiful' in this sentence?",
    options: ["Noun", "Verb", "Adjective", "Adverb"],
    correctAnswer: "Adjective",
    explanation: "An adjective describes or modifies a noun. 'Beautiful' describes the garden."
  }
];

export default function GrammarGame({ 
  gameState, 
  onSubmitAnswer, 
  onSkipWord, 
  onPauseGame 
}: GrammarGameProps) {
  const [selectedAnswer, setSelectedAnswer] = useState("");
  const [currentQuestion, setCurrentQuestion] = useState(grammarQuestions[0]);
  const [timeLeft, setTimeLeft] = useState(gameState?.timeLeft || 60);
  const [showExplanation, setShowExplanation] = useState(false);
  const timeoutRef = useRef(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [isTimedOutRound, setIsTimedOutRound] = useState(false);

  // Reset on round changes only
  useEffect(() => {
    timeoutRef.current = false;
    setIsTimedOutRound(false);
    setShowExplanation(false);
    setSelectedAnswer('');
    // Move to next question based on round
    const nextIndex = ((gameState?.currentRound || 1) - 1) % grammarQuestions.length;
    setCurrentQuestion(grammarQuestions[nextIndex]);
  }, [gameState?.currentRound]);
  
  // Sync timeLeft when it changes
  useEffect(() => {
    if (gameState?.timeLeft !== undefined) {
      setTimeLeft(gameState.timeLeft);
    }
  }, [gameState?.timeLeft]);

  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    
    intervalRef.current = setInterval(() => {
      setTimeLeft((prev: number) => {
        if (prev <= 1 && !timeoutRef.current) {
          // Time's up - show explanation without marking as correct
          timeoutRef.current = true;
          setIsTimedOutRound(true);
          setShowExplanation(true);
          onSubmitAnswer(''); // Let parent handle advancing
          // Stop interval after timeout
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
          return 0;
        } else if (prev > 1) {
          return prev - 1;
        }
        return prev;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [gameState?.currentRound]);

  const handleSubmit = () => {
    if (selectedAnswer) {
      onSubmitAnswer(selectedAnswer);
      setShowExplanation(true);
      // Let parent handle advancing - no local timeout
    }
  };

  const timeProgress = ((60 - timeLeft) / 60) * 100;

  return (
    <section className="mb-12" data-testid="grammar-game">
      <Card>
        <CardContent className="p-8">
          {/* Game Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center space-x-4">
              <h3 className="text-2xl font-bold text-foreground" data-testid="game-title">Grammar Mastery Challenge</h3>
              <div className="bg-green-100 text-green-800 text-sm font-semibold px-3 py-1 rounded-full">
                Question {gameState?.currentRound || 1} of {gameState?.totalRounds || 10}
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
                    className="text-green-500 stroke-current" 
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

          {/* Question Display */}
          <div className="text-center mb-8">
            <Card className="mb-6">
              <CardContent className="p-6">
                <div className="flex items-center justify-center mb-4">
                  <BookOpen className="w-6 h-6 text-green-600 mr-2" />
                  <h4 className="text-lg font-semibold">Analyze this sentence:</h4>
                </div>
                <p className="text-2xl font-mono mb-4 p-4 bg-muted/30 rounded-lg" data-testid="grammar-sentence">
                  "{currentQuestion.sentence}"
                </p>
                <p className="text-lg text-foreground" data-testid="grammar-question">
                  {currentQuestion.question}
                </p>
              </CardContent>
            </Card>
            
            {/* Answer Options */}
            <div className="max-w-md mx-auto">
              <RadioGroup value={selectedAnswer} onValueChange={setSelectedAnswer}>
                {currentQuestion.options.map((option) => (
                  <div key={option} className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-muted/30">
                    <RadioGroupItem value={option} id={option} data-testid={`radio-option-${option.toLowerCase()}`} />
                    <Label htmlFor={option} className="flex-1 text-left cursor-pointer">
                      {option}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            {/* Explanation (shown after answer) */}
            {showExplanation && (
              <Card className="mt-6 border-green-200 bg-green-50">
                <CardContent className="p-4">
                  <div className={`text-lg font-semibold mb-2 ${
                    isTimedOutRound ? 'text-orange-700' : 
                    selectedAnswer === currentQuestion.correctAnswer ? 'text-green-700' : 'text-red-700'
                  }`}>
                    {isTimedOutRound ? `Time's up! The answer is: ${currentQuestion.correctAnswer}` :
                     selectedAnswer === currentQuestion.correctAnswer ? 'Correct!' : `Incorrect. The answer is: ${currentQuestion.correctAnswer}`}
                  </div>
                  <p className="text-green-700">{currentQuestion.explanation}</p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Game Controls */}
          <div className="flex items-center justify-between">
            <Button 
              variant="ghost"
              onClick={onSkipWord}
              data-testid="button-skip-question"
            >
              <Forward className="mr-2 w-4 h-4" />
              Skip Question
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
                disabled={!selectedAnswer || showExplanation}
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
