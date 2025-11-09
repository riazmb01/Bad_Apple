import { useState, useEffect, useRef } from "react";
import { BookOpen, Check, Forward, Pause, SkipForward, Trophy, Home, RotateCw, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface GameState {
  currentRound?: number;
  totalRounds?: number;
  timeLeft?: number;
  score?: number;
}

interface GrammarGameProps {
  gameState?: GameState;
  userId?: string | null;
  onSubmitAnswer: (answer: string) => void;
  onSkipWord: () => void;
  onPauseGame: () => void;
}

interface GrammarQuestion {
  id: string;
  sentence: string;
  question: string;
  options: string[];
  answer: string;
  maskedWord?: string;
}

const FALLBACK_QUESTIONS: GrammarQuestion[] = [
  {
    id: 'fallback-1',
    sentence: "The cat sat on the mat.",
    question: "What part of speech is 'cat' in this sentence?",
    options: ["Noun", "Verb", "Adjective", "Adverb"],
    answer: "Noun"
  },
  {
    id: 'fallback-2',
    sentence: "She runs quickly to school.",
    question: "What part of speech is 'quickly' in this sentence?",
    options: ["Noun", "Verb", "Adjective", "Adverb"],
    answer: "Adverb"
  },
  {
    id: 'fallback-3',
    sentence: "The beautiful garden blooms every spring.",
    question: "What part of speech is 'beautiful' in this sentence?",
    options: ["Noun", "Verb", "Adjective", "Adverb"],
    answer: "Adjective"
  },
  {
    id: 'fallback-4',
    sentence: "We will meet at the library tomorrow.",
    question: "What part of speech is 'at' in this sentence?",
    options: ["Preposition", "Conjunction", "Interjection", "Pronoun"],
    answer: "Preposition"
  },
  {
    id: 'fallback-5',
    sentence: "They have finished their homework.",
    question: "What is the verb tense in this sentence?",
    options: ["Present perfect", "Past simple", "Future simple", "Present simple"],
    answer: "Present perfect"
  }
];

export default function GrammarGame({ 
  gameState,
  userId, 
  onSubmitAnswer, 
  onSkipWord, 
  onPauseGame 
}: GrammarGameProps) {
  const { toast } = useToast();
  const [selectedAnswer, setSelectedAnswer] = useState("");
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60);
  const [showExplanation, setShowExplanation] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const timeoutRef = useRef(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const autoAdvanceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [score, setScore] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [totalAttempts, setTotalAttempts] = useState(0);
  const [totalQuestionsAttempted, setTotalQuestionsAttempted] = useState(0);
  const [questions, setQuestions] = useState<GrammarQuestion[]>([]);
  const [nextQuestions, setNextQuestions] = useState<GrammarQuestion[]>([]);
  const [batchCounter, setBatchCounter] = useState(0);
  const [usingFallback, setUsingFallback] = useState(false);
  const [focusedOptionIndex, setFocusedOptionIndex] = useState(0);
  const [feedback, setFeedback] = useState<{ show: boolean; isCorrect: boolean; message: string }>({
    show: false,
    isCorrect: false,
    message: ''
  });
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Fetch initial questions
  const { data: initialQuestions, error: initialError, isLoading: isLoadingInitial } = useQuery<GrammarQuestion[]>({
    queryKey: ['/api/grammar/batch', 'initial'],
    queryFn: async () => {
      const res = await fetch('/api/grammar/batch?count=5');
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: 'Failed to fetch questions' }));
        throw new Error(errorData.message || 'Failed to fetch questions');
      }
      const data = await res.json();
      if (!data || data.length === 0) {
        throw new Error('No questions available');
      }
      return data;
    },
    staleTime: Infinity,
    gcTime: Infinity,
    retry: 2,
  });

  // Fetch next batch of questions (when on 4th question, which is index 3)
  const { data: prefetchedQuestions, isFetching: isPrefetching } = useQuery<GrammarQuestion[]>({
    queryKey: ['/api/grammar/batch', { count: 5, batch: 'prefetch', counter: batchCounter }],
    queryFn: async () => {
      console.log('Fetching prefetch batch #', batchCounter);
      const res = await fetch('/api/grammar/batch?count=5');
      if (!res.ok) throw new Error('Failed to fetch questions');
      const data = await res.json();
      if (!data || data.length === 0) {
        throw new Error('No questions available');
      }
      return data;
    },
    enabled: currentQuestionIndex === 3 && nextQuestions.length === 0 && !usingFallback,
    staleTime: 0,
  });

  // Set initial questions once (with fallback on error)
  const hasSetInitialQuestions = useRef(false);
  useEffect(() => {
    if (initialQuestions && questions.length === 0 && !hasSetInitialQuestions.current) {
      console.log('Setting initial questions from MongoDB');
      setQuestions(initialQuestions);
      hasSetInitialQuestions.current = true;
      setUsingFallback(false);
    } else if (initialError && questions.length === 0 && !hasSetInitialQuestions.current) {
      console.log('MongoDB failed, using fallback questions');
      setQuestions(FALLBACK_QUESTIONS);
      hasSetInitialQuestions.current = true;
      setUsingFallback(true);
      toast({
        title: "Using Offline Questions",
        description: "Unable to load questions from database. Playing with limited question set.",
        variant: "destructive",
      });
    }
  }, [initialQuestions, initialError, questions.length, toast]);

  // Store prefetched questions
  useEffect(() => {
    if (prefetchedQuestions && nextQuestions.length === 0 && !isPrefetching) {
      console.log('Setting next questions batch #', batchCounter, ':', prefetchedQuestions);
      setNextQuestions(prefetchedQuestions);
    }
  }, [prefetchedQuestions, isPrefetching, nextQuestions.length, batchCounter]);

  // Load next batch when current batch is exhausted
  useEffect(() => {
    if (currentQuestionIndex >= questions.length && nextQuestions.length > 0) {
      console.log('Switching to next batch of questions');
      setQuestions(nextQuestions);
      setNextQuestions([]);
      setCurrentQuestionIndex(0);
      setBatchCounter(prev => prev + 1);
    } else if (currentQuestionIndex >= questions.length && nextQuestions.length === 0 && questions.length > 0 && !usingFallback) {
      console.log('No more questions available, fetching new batch');
      fetch('/api/grammar/batch?count=5')
        .then(res => {
          if (!res.ok) throw new Error('Failed to fetch questions');
          return res.json();
        })
        .then(data => {
          if (!data || data.length === 0) throw new Error('No questions available');
          console.log('Fetched new batch:', data);
          setQuestions(data);
          setCurrentQuestionIndex(0);
          setBatchCounter(prev => prev + 1);
        })
        .catch(err => {
          console.error('Failed to fetch new batch, using fallback:', err);
          setQuestions(FALLBACK_QUESTIONS);
          setCurrentQuestionIndex(0);
          setUsingFallback(true);
          toast({
            title: "Connection Lost",
            description: "Switched to offline questions. Limited question set available.",
            variant: "destructive",
          });
        });
    } else if (currentQuestionIndex >= questions.length && questions.length > 0 && usingFallback) {
      console.log('Restarting fallback questions');
      setCurrentQuestionIndex(0);
    }
  }, [currentQuestionIndex, questions.length, nextQuestions.length, usingFallback, toast]);

  const currentQuestion = questions[currentQuestionIndex] || null;

  // Reset state on question changes (but NOT timer)
  useEffect(() => {
    setSelectedAnswer('');
    setFeedback({ show: false, isCorrect: false, message: '' });
    setFocusedOptionIndex(0);
    // Re-focus wrapper for keyboard navigation
    wrapperRef.current?.focus();
  }, [currentQuestionIndex]);

  // Re-focus wrapper when feedback appears so Enter key can advance to next question
  useEffect(() => {
    if (feedback.show) {
      wrapperRef.current?.focus();
    }
  }, [feedback.show]);

  // Continuous timer countdown - runs throughout the game, not reset per question
  useEffect(() => {
    if (gameOver) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    if (intervalRef.current) clearInterval(intervalRef.current);
    
    intervalRef.current = setInterval(() => {
      setTimeLeft((prev: number) => {
        if (prev <= 1 && !timeoutRef.current) {
          timeoutRef.current = true;
          handleTimeOut();
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
  }, [gameOver]);

  // Save game results when game ends
  const resultsSavedRef = useRef(false);
  useEffect(() => {
    if (gameOver && userId && !resultsSavedRef.current) {
      resultsSavedRef.current = true;
      
      const accuracy = totalAttempts > 0 ? Math.round((correctCount / totalAttempts) * 100) : 0;
      
      // Save results to database
      apiRequest('POST', '/api/game-results', {
        userId,
        score,
        correctAnswers: correctCount,
        totalAttempts
      })
        .then(() => {
          // Check for newly unlocked achievements
          return apiRequest('POST', '/api/achievements/check', {
            userId,
            gameData: {
              score,
              accuracy,
              timeRemaining: timeLeft,
              currentStreak: correctCount
            }
          });
        })
        .then(() => {
          // Invalidate caches to update progress card and achievements
          queryClient.invalidateQueries({ queryKey: ['/api/users', userId] });
          queryClient.invalidateQueries({ queryKey: ['/api/users', userId, 'achievements'] });
        })
        .catch((error) => {
          console.error('Failed to save game results or check achievements:', error);
        });
    }
  }, [gameOver, userId, score, correctCount, totalAttempts, timeLeft]);

  // Helper function to schedule auto-advance to next question
  const scheduleAutoAdvance = () => {
    // Clear any existing auto-advance timeout
    if (autoAdvanceRef.current) {
      clearTimeout(autoAdvanceRef.current);
      autoAdvanceRef.current = null;
    }
    
    // Schedule auto-advance after 2 seconds (same as Spelling Bee)
    autoAdvanceRef.current = setTimeout(() => {
      // Guard: only advance if game is not over
      if (!timeoutRef.current) {
        setCurrentQuestionIndex(prev => prev + 1);
        setTotalQuestionsAttempted(prev => prev + 1);
      }
      autoAdvanceRef.current = null;
    }, 2000);
  };

  // Cleanup auto-advance timeout on unmount or game over
  useEffect(() => {
    return () => {
      if (autoAdvanceRef.current) {
        clearTimeout(autoAdvanceRef.current);
        autoAdvanceRef.current = null;
      }
    };
  }, []);

  // Clear auto-advance when game ends
  useEffect(() => {
    if (gameOver && autoAdvanceRef.current) {
      clearTimeout(autoAdvanceRef.current);
      autoAdvanceRef.current = null;
    }
  }, [gameOver]);

  const handleTimeOut = () => {
    setGameOver(true);
    timeoutRef.current = false;
  };

  const handleSubmit = () => {
    if (selectedAnswer && currentQuestion && !gameOver && !feedback.show) {
      const isCorrect = selectedAnswer === currentQuestion.answer;
      
      setTotalAttempts(prev => prev + 1);
      
      if (isCorrect) {
        setCorrectCount(prev => prev + 1);
        const points = 10; // Base points for grammar questions
        setScore(prev => prev + points);
        
        // Add 5 seconds to timer for correct answer (capped at 60 seconds max)
        setTimeLeft(prev => Math.min(60, prev + 5));
        
        setFeedback({
          show: true,
          isCorrect: true,
          message: `Correct! ${currentQuestion.question} The answer is "${currentQuestion.answer}". You earned ${points} points! +5 seconds`
        });
      } else {
        // Subtract 3 seconds for incorrect answer
        setTimeLeft(prev => Math.max(0, prev - 3));
        
        setFeedback({
          show: true,
          isCorrect: false,
          message: `Incorrect. The correct answer is "${currentQuestion.answer}". -3 seconds`
        });
      }
      
      onSubmitAnswer(selectedAnswer);
      
      // Auto-advance to next question after 2 seconds
      scheduleAutoAdvance();
    }
  };

  const handleSkip = () => {
    if (!gameOver && !feedback.show) {
      setTotalAttempts(prev => prev + 1);
      setFeedback({
        show: true,
        isCorrect: false,
        message: `Skipped. The correct answer was "${currentQuestion?.answer || 'unknown'}".`
      });
      onSkipWord();
      
      // Auto-advance to next question after 2 seconds
      scheduleAutoAdvance();
    }
  };

  const handlePlayAgain = () => {
    setGameOver(false);
    setTimeLeft(60);
    setScore(0);
    setCorrectCount(0);
    setTotalAttempts(0);
    setTotalQuestionsAttempted(0);
    setCurrentQuestionIndex(0);
    setSelectedAnswer('');
    setFeedback({ show: false, isCorrect: false, message: '' });
    setFocusedOptionIndex(0);
    timeoutRef.current = false;
    resultsSavedRef.current = false;
  };

  const handleBackToMenu = () => {
    window.location.reload();
  };

  // Keyboard navigation for answer options
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!currentQuestion || gameOver || feedback.show) return;

    const optionsCount = currentQuestion.options.length;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusedOptionIndex(prev => (prev + 1) % optionsCount);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedOptionIndex(prev => (prev - 1 + optionsCount) % optionsCount);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (currentQuestion.options[focusedOptionIndex]) {
        // Before answering, Enter submits the focused option
        setSelectedAnswer(currentQuestion.options[focusedOptionIndex]);
        // Trigger submit after state update
        setTimeout(() => {
          const isCorrect = currentQuestion.options[focusedOptionIndex] === currentQuestion.answer;
          setTotalAttempts(prev => prev + 1);
          
          if (isCorrect) {
            setCorrectCount(prev => prev + 1);
            const points = 10;
            setScore(prev => prev + points);
            // Add 5 seconds to timer for correct answer (capped at 60 seconds max)
            setTimeLeft(prev => Math.min(60, prev + 5));
            setFeedback({
              show: true,
              isCorrect: true,
              message: `Correct! ${currentQuestion.question} The answer is "${currentQuestion.answer}". You earned ${points} points! +5 seconds`
            });
          } else {
            // Subtract 3 seconds for incorrect answer
            setTimeLeft(prev => Math.max(0, prev - 3));
            setFeedback({
              show: true,
              isCorrect: false,
              message: `Incorrect. The correct answer is "${currentQuestion.answer}". -3 seconds`
            });
          }
          onSubmitAnswer(currentQuestion.options[focusedOptionIndex]);
          
          // Auto-advance to next question after 2 seconds
          scheduleAutoAdvance();
        }, 0);
      }
    }
  };

  // Focus the currently selected option when index changes
  useEffect(() => {
    if (optionRefs.current[focusedOptionIndex]) {
      optionRefs.current[focusedOptionIndex]?.focus();
    }
  }, [focusedOptionIndex]);

  // Calculate progress - clamp between 0-100% to handle bonus time correctly
  const timeProgress = Math.min(100, Math.max(0, ((60 - timeLeft) / 60) * 100));

  // Show loading state until we have a current question (either from API or fallback)
  if (!currentQuestion) {
    return (
      <section className="mb-12" data-testid="grammar-game">
        <Card>
          <CardContent className="p-8">
            <div className="text-center">
              <p className="text-lg text-muted-foreground">
                {initialError ? 'Loading offline questions...' : 'Loading questions...'}
              </p>
            </div>
          </CardContent>
        </Card>
      </section>
    );
  }

  return (
    <section className="mb-12" data-testid="grammar-game">
      <Card>
        <CardContent className="p-8">
          {/* Game Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center space-x-4">
              <h3 className="text-2xl font-bold text-foreground" data-testid="game-title">Grammar Mastery Challenge</h3>
              <div className="bg-accent/10 text-accent text-sm font-semibold px-3 py-1 rounded-full" data-testid="question-progress">
                Question {totalQuestionsAttempted + 1} | Score: {score}
              </div>
              <div className="text-sm text-muted-foreground" data-testid="accuracy-display">
                Accuracy: {totalAttempts > 0 ? Math.round((correctCount / totalAttempts) * 100) : 0}%
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

          {/* Question Display */}
          <div className="text-center mb-8">
            <Card className="mb-6">
              <CardContent className="p-6">
                <div className="flex items-center justify-center mb-4">
                  <BookOpen className="w-6 h-6 text-green-600 mr-2" />
                  <h4 className="text-lg font-semibold">Analyze this sentence:</h4>
                </div>
                <p className="text-2xl font-mono mb-4 p-4 bg-muted/30 rounded-lg whitespace-normal break-words leading-relaxed" data-testid="grammar-sentence">
                  "{currentQuestion.sentence}"
                </p>
                <p className="text-lg text-foreground whitespace-normal break-words leading-relaxed" data-testid="grammar-question">
                  {currentQuestion.question}
                </p>
              </CardContent>
            </Card>
            
            {/* Feedback Display */}
            {feedback.show && (
              <div 
                className={`mb-6 p-4 rounded-lg ${
                  feedback.isCorrect 
                    ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200 border-2 border-green-500' 
                    : 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-200 border-2 border-red-500'
                }`}
                data-testid={feedback.isCorrect ? 'feedback-correct' : 'feedback-incorrect'}
              >
                <p className="text-lg font-semibold">{feedback.message}</p>
              </div>
            )}

            {/* Answer Options */}
            <div ref={wrapperRef} className="max-w-md mx-auto" onKeyDown={handleKeyDown} tabIndex={0}>
              <RadioGroup value={selectedAnswer} onValueChange={setSelectedAnswer} disabled={feedback.show}>
                {currentQuestion.options.map((option, index) => (
                  <div key={option} className={`flex items-center space-x-2 p-3 border rounded-lg ${
                    feedback.show 
                      ? option === currentQuestion.answer 
                        ? 'bg-green-50 border-green-300' 
                        : selectedAnswer === option 
                          ? 'bg-red-50 border-red-300'
                          : 'bg-muted/10'
                      : focusedOptionIndex === index
                        ? 'bg-accent/20 border-accent'
                        : 'hover:bg-muted/30'
                  }`}>
                    <RadioGroupItem 
                      value={option} 
                      id={option} 
                      disabled={feedback.show}
                      ref={(el) => { optionRefs.current[index] = el; }}
                      data-testid={`radio-option-${index}`}
                    />
                    <Label 
                      htmlFor={option} 
                      className="flex-1 text-left cursor-pointer whitespace-normal break-words leading-relaxed"
                    >
                      {option}
                    </Label>
                    {feedback.show && option === currentQuestion.answer && (
                      <Check className="w-5 h-5 text-green-600" />
                    )}
                  </div>
                ))}
              </RadioGroup>
            </div>
          </div>

          {/* Game Controls */}
          <div className="flex items-center justify-between">
            <Button 
              variant="ghost"
              onClick={handleSkip}
              disabled={feedback.show}
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
                disabled={!selectedAnswer || feedback.show}
                data-testid="button-submit-answer"
              >
                <Check className="mr-2 w-4 h-4" />
                Submit Answer
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Game Over Dialog */}
      <Dialog open={gameOver} onOpenChange={setGameOver}>
        <DialogContent className="sm:max-w-md" data-testid="dialog-game-over">
          <DialogHeader>
            <div className="flex items-center justify-center mb-4">
              <Trophy className="w-16 h-16 text-yellow-500" />
            </div>
            <DialogTitle className="text-center text-2xl">Game Over!</DialogTitle>
            <DialogDescription className="text-center">
              Time's up! Here's how you did:
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Score Summary */}
            <div className="bg-accent/10 rounded-lg p-4 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-lg font-semibold">Final Score:</span>
                <span className="text-2xl font-bold text-accent" data-testid="final-score">{score}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Questions Attempted:</span>
                <span className="font-medium" data-testid="questions-attempted">{totalAttempts}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Correct Answers:</span>
                <span className="font-medium text-green-600" data-testid="correct-answers">{correctCount}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Accuracy:</span>
                <span className="font-medium" data-testid="accuracy-percentage">
                  {totalAttempts > 0 ? Math.round((correctCount / totalAttempts) * 100) : 0}%
                </span>
              </div>
            </div>

            {/* Performance Message */}
            <div className="text-center text-sm text-muted-foreground">
              {correctCount === 0 && "Keep practicing! Every expert was once a beginner."}
              {correctCount > 0 && correctCount < 3 && "Good effort! You're on the right track."}
              {correctCount >= 3 && correctCount < 6 && "Nice work! You're getting better!"}
              {correctCount >= 6 && correctCount < 10 && "Excellent grammar skills! Keep it up!"}
              {correctCount >= 10 && "Outstanding performance! You're a grammar master!"}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col space-y-2 pt-2">
              <Button 
                onClick={handlePlayAgain}
                className="w-full"
                data-testid="button-play-again"
              >
                <RotateCw className="mr-2 w-4 h-4" />
                Play Again
              </Button>
              <Button 
                onClick={handleBackToMenu}
                variant="outline"
                className="w-full"
                data-testid="button-back-to-menu"
              >
                <Home className="mr-2 w-4 h-4" />
                Back to Main Menu
              </Button>
              <Button 
                variant="secondary"
                className="w-full"
                disabled
                data-testid="button-share-score"
              >
                <Share2 className="mr-2 w-4 h-4" />
                Share Score (Coming Soon)
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
