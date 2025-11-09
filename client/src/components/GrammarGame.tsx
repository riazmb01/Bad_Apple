import { useState, useEffect, useRef } from "react";
import { BookOpen, Check, Forward, Pause, SkipForward } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

interface GameState {
  currentRound?: number;
  totalRounds?: number;
  timeLeft?: number;
  score?: number;
}

interface GrammarGameProps {
  gameState?: GameState;
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
  onSubmitAnswer, 
  onSkipWord, 
  onPauseGame 
}: GrammarGameProps) {
  const { toast } = useToast();
  const [selectedAnswer, setSelectedAnswer] = useState("");
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60);
  const [showExplanation, setShowExplanation] = useState(false);
  const timeoutRef = useRef(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [isTimedOutRound, setIsTimedOutRound] = useState(false);
  const [localScore, setLocalScore] = useState(0);
  const [localCorrectAnswers, setLocalCorrectAnswers] = useState(0);
  const [questions, setQuestions] = useState<GrammarQuestion[]>([]);
  const [nextQuestions, setNextQuestions] = useState<GrammarQuestion[]>([]);
  const [batchCounter, setBatchCounter] = useState(0);
  const [usingFallback, setUsingFallback] = useState(false);

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

  // Reset state on question changes
  useEffect(() => {
    setSelectedAnswer('');
    setShowExplanation(false);
    setIsTimedOutRound(false);
    timeoutRef.current = false;
    setTimeLeft(60);
  }, [currentQuestionIndex]);
  
  // Sync timeLeft when it changes from gameState
  useEffect(() => {
    if (gameState?.timeLeft !== undefined) {
      setTimeLeft(gameState.timeLeft);
    }
  }, [gameState?.timeLeft]);

  // Timer countdown
  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    
    intervalRef.current = setInterval(() => {
      setTimeLeft((prev: number) => {
        if (prev <= 1 && !timeoutRef.current && !showExplanation) {
          timeoutRef.current = true;
          setIsTimedOutRound(true);
          setShowExplanation(true);
          onSubmitAnswer('');
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
  }, [currentQuestionIndex, showExplanation]);
  
  // Clear timer when explanation is shown
  useEffect(() => {
    if (showExplanation && intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, [showExplanation]);

  const handleSubmit = () => {
    if (selectedAnswer && currentQuestion) {
      const isCorrect = selectedAnswer === currentQuestion.answer;
      if (isCorrect) {
        setLocalScore(prev => prev + 100);
        setLocalCorrectAnswers(prev => prev + 1);
      }
      onSubmitAnswer(selectedAnswer);
      setShowExplanation(true);
    }
  };

  const handleNextQuestion = () => {
    setCurrentQuestionIndex(prev => prev + 1);
  };

  const handleSkip = () => {
    setShowExplanation(true);
    onSkipWord();
  };

  const timeProgress = ((60 - timeLeft) / 60) * 100;

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
              <div className="bg-green-100 text-green-800 text-sm font-semibold px-3 py-1 rounded-full" data-testid="question-progress">
                Question {currentQuestionIndex + 1}
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
                <p className="text-2xl font-mono mb-4 p-4 bg-muted/30 rounded-lg whitespace-normal break-words leading-relaxed" data-testid="grammar-sentence">
                  "{currentQuestion.sentence}"
                </p>
                <p className="text-lg text-foreground whitespace-normal break-words leading-relaxed" data-testid="grammar-question">
                  {currentQuestion.question}
                </p>
              </CardContent>
            </Card>
            
            {/* Answer Options */}
            <div className="max-w-md mx-auto">
              <RadioGroup value={selectedAnswer} onValueChange={setSelectedAnswer} disabled={showExplanation}>
                {currentQuestion.options.map((option, index) => (
                  <div key={option} className={`flex items-center space-x-2 p-3 border rounded-lg ${
                    showExplanation 
                      ? option === currentQuestion.answer 
                        ? 'bg-green-50 border-green-300' 
                        : selectedAnswer === option 
                          ? 'bg-red-50 border-red-300'
                          : 'bg-muted/10'
                      : 'hover:bg-muted/30'
                  }`}>
                    <RadioGroupItem 
                      value={option} 
                      id={option} 
                      disabled={showExplanation}
                      data-testid={`radio-option-${index}`}
                    />
                    <Label 
                      htmlFor={option} 
                      className="flex-1 text-left cursor-pointer whitespace-normal break-words leading-relaxed"
                    >
                      {option}
                    </Label>
                    {showExplanation && option === currentQuestion.answer && (
                      <Check className="w-5 h-5 text-green-600" />
                    )}
                  </div>
                ))}
              </RadioGroup>
            </div>

            {/* Feedback (shown after answer) */}
            {showExplanation && (
              <Card className="mt-6 border-green-200 bg-green-50">
                <CardContent className="p-4">
                  <div className={`text-lg font-semibold ${
                    isTimedOutRound ? 'text-orange-700' : 
                    selectedAnswer === currentQuestion.answer ? 'text-green-700' : 'text-red-700'
                  }`} data-testid="answer-feedback">
                    {isTimedOutRound ? `⏱️ Time's up! The answer is: ${currentQuestion.answer}` :
                     selectedAnswer === currentQuestion.answer ? '✅ Correct!' : `❌ Incorrect. The answer is: ${currentQuestion.answer}`}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Game Controls */}
          <div className="flex items-center justify-between">
            <Button 
              variant="ghost"
              onClick={handleSkip}
              disabled={showExplanation}
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
              
              {!showExplanation ? (
                <Button 
                  onClick={handleSubmit}
                  disabled={!selectedAnswer || showExplanation}
                  data-testid="button-submit-answer"
                >
                  <Check className="mr-2 w-4 h-4" />
                  Submit Answer
                </Button>
              ) : (
                <Button 
                  onClick={handleNextQuestion}
                  data-testid="button-next-question"
                >
                  <SkipForward className="mr-2 w-4 h-4" />
                  Next Question
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
