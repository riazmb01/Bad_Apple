import { useState, useEffect, useRef } from "react";
import { Volume2, Lightbulb, Forward, Pause, Check, Trophy, Home, RotateCw, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { speakWord, initializeSpeech } from "@/utils/speechUtils";
import { useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface Word {
  _id?: string;
  word: string;
  definition?: string;
  difficulty?: string;
  exampleSentence?: string;
}

interface SpellingBeeGameProps {
  gameState: any;
  userId: string | null;
  onSubmitAnswer: (answer: string) => void;
  onUseHint: (hintType: string) => void;
  onSkipWord: () => void;
  onPauseGame: () => void;
}

export default function SpellingBeeGame({ 
  gameState,
  userId, 
  onSubmitAnswer, 
  onUseHint, 
  onSkipWord, 
  onPauseGame 
}: SpellingBeeGameProps) {
  const [userInput, setUserInput] = useState("");
  const [timeLeft, setTimeLeft] = useState(60);
  const [gameOver, setGameOver] = useState(false);
  const timeoutRef = useRef(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [hintsUsed, setHintsUsed] = useState({
    firstLetter: false,
    definition: false,
    sentence: false
  });
  const [isMuted, setIsMuted] = useState(false);
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [words, setWords] = useState<Word[]>([]);
  const [nextWords, setNextWords] = useState<Word[]>([]);
  const [score, setScore] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [totalAttempts, setTotalAttempts] = useState(0);
  const [totalWordsAttempted, setTotalWordsAttempted] = useState(0);
  const [feedback, setFeedback] = useState<{ show: boolean; isCorrect: boolean; message: string }>({
    show: false,
    isCorrect: false,
    message: ''
  });
  const [batchCounter, setBatchCounter] = useState(0);
  const [voicesReady, setVoicesReady] = useState(false);

  // Fetch initial words - only once per component mount
  const { data: initialWords, refetch: refetchInitial } = useQuery<Word[]>({
    queryKey: ['/api/words/batch', 'initial'],
    queryFn: async () => {
      const res = await fetch('/api/words/batch?count=5');
      if (!res.ok) throw new Error('Failed to fetch words');
      return res.json();
    },
    staleTime: Infinity, // Never refetch automatically
    gcTime: Infinity, // Keep in cache forever
  });

  // Fetch next batch of words (when on 4th word, which is index 3)
  const { data: prefetchedWords, isFetching: isPrefetching } = useQuery<Word[]>({
    queryKey: ['/api/words/batch', { count: 5, batch: 'prefetch', counter: batchCounter }],
    queryFn: async () => {
      console.log('Fetching prefetch batch #', batchCounter);
      const res = await fetch('/api/words/batch?count=5');
      if (!res.ok) throw new Error('Failed to fetch words');
      return res.json();
    },
    enabled: currentWordIndex === 3 && nextWords.length === 0,
    staleTime: 0, // Always fetch fresh data
  });

  // Initialize speech synthesis when component mounts
  useEffect(() => {
    console.log('Initializing speech synthesis...');
    initializeSpeech().then(() => {
      console.log('Speech synthesis ready!');
      setVoicesReady(true);
    }).catch((err) => {
      console.error('Failed to initialize speech:', err);
      // Even if it fails, still set ready to not block the game
      setVoicesReady(true);
    });
  }, []);

  // Only set initial words once when both voices and words are ready
  const hasSetInitialWords = useRef(false);
  useEffect(() => {
    if (initialWords && words.length === 0 && voicesReady && !hasSetInitialWords.current) {
      console.log('Setting initial words now that voices are ready');
      setWords(initialWords);
      hasSetInitialWords.current = true;
    }
  }, [initialWords, voicesReady, words.length]);

  useEffect(() => {
    if (prefetchedWords && nextWords.length === 0 && !isPrefetching) {
      console.log('Setting next words batch #', batchCounter, ':', prefetchedWords);
      setNextWords(prefetchedWords);
    }
  }, [prefetchedWords, isPrefetching, nextWords.length, batchCounter]);

  // Load next batch when current batch is exhausted
  useEffect(() => {
    if (currentWordIndex >= words.length && nextWords.length > 0) {
      console.log('Switching to next batch of words');
      setWords(nextWords);
      setNextWords([]);
      setCurrentWordIndex(0);
      setBatchCounter(prev => prev + 1); // Increment for next prefetch
    } else if (currentWordIndex >= words.length && nextWords.length === 0 && words.length > 0) {
      console.log('No more words available, fetching new batch');
      // Fetch a completely new batch
      fetch('/api/words/batch?count=5')
        .then(res => res.json())
        .then(data => {
          console.log('Fetched new batch:', data);
          setWords(data);
          setCurrentWordIndex(0);
          setBatchCounter(prev => prev + 1); // Increment for next prefetch
        })
        .catch(err => console.error('Failed to fetch new batch:', err));
    }
  }, [currentWordIndex, words.length, nextWords.length]);

  const currentWord = words[currentWordIndex] || null;

  // Auto-play pronunciation for new words
  useEffect(() => {
    if (currentWord && !isMuted) {
      // Immediate pronunciation for faster UX
      speakWord(currentWord.word, false);
    }
  }, [currentWord, isMuted]);

  // Reset hints and feedback on word changes (but NOT timer)
  useEffect(() => {
    setUserInput('');
    setFeedback({ show: false, isCorrect: false, message: '' });
    setHintsUsed({
      firstLetter: false,
      definition: false,
      sentence: false
    });
  }, [currentWordIndex]);

  // Timer countdown - runs continuously, not reset per word
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
              currentStreak: correctCount // Using correctCount as current streak for simplicity
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

  const handleTimeOut = () => {
    // Game over - show results screen
    setGameOver(true);
    // Reset timeout ref so next game can timeout properly
    timeoutRef.current = false;
  };

  const handleSubmit = () => {
    if (userInput.trim() && currentWord && !gameOver) {
      const isCorrect = userInput.trim().toLowerCase() === currentWord.word.toLowerCase();
      
      setTotalAttempts(prev => prev + 1);
      
      if (isCorrect) {
        setCorrectCount(prev => prev + 1);
        let points = 10;
        if (hintsUsed.firstLetter) points -= 2;
        if (hintsUsed.definition) points -= 3;
        if (hintsUsed.sentence) points -= 3;
        setScore(prev => prev + Math.max(points, 1));
        
        // Add 5 seconds to timer for correct answer
        setTimeLeft(prev => prev + 5);
        
        setFeedback({
          show: true,
          isCorrect: true,
          message: `Correct! The word was "${currentWord.word}". You earned ${Math.max(points, 1)} points! +5 seconds`
        });
      } else {
        setFeedback({
          show: true,
          isCorrect: false,
          message: `Incorrect. The correct spelling was "${currentWord.word}".`
        });
      }
      
      // Notify parent component for backend synchronization
      onSubmitAnswer(userInput.trim());
      
      // Show feedback for 2 seconds before moving to next word
      setTimeout(() => {
        setUserInput("");
        setCurrentWordIndex(prev => prev + 1);
        setTotalWordsAttempted(prev => prev + 1);
      }, 2000);
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
    if (currentWord) {
      console.log('Playing pronunciation for:', currentWord.word);
      speakWord(currentWord.word, false);
    }
  };

  const handleSkipWord = () => {
    if (!gameOver) {
      setTotalAttempts(prev => prev + 1);
      // Notify parent component that word was skipped
      onSkipWord();
      setCurrentWordIndex(prev => prev + 1);
      setTotalWordsAttempted(prev => prev + 1);
    }
  };

  const handlePlayAgain = () => {
    // Reset all game state including timeout ref and results saved flag
    setGameOver(false);
    setTimeLeft(60);
    setScore(0);
    setCorrectCount(0);
    setTotalAttempts(0);
    setTotalWordsAttempted(0);
    setCurrentWordIndex(0);
    setUserInput('');
    setFeedback({ show: false, isCorrect: false, message: '' });
    setHintsUsed({ firstLetter: false, definition: false, sentence: false });
    timeoutRef.current = false;
    resultsSavedRef.current = false;
    // Refetch words
    refetchInitial();
  };

  const handleBackToMenu = () => {
    // Navigate back to main menu
    window.location.reload();
  };

  // Calculate progress - clamp between 0-100% to handle bonus time correctly
  // When time > 60 (from bonuses), show 0% progress (full circle)
  // When time approaches 0, show ~100% progress (nearly empty)
  const timeProgress = Math.min(100, Math.max(0, ((60 - timeLeft) / 60) * 100));

  return (
    <section className="mb-12" data-testid="spelling-bee-game">
      <Card>
        <CardContent className="p-8">
          {/* Game Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center space-x-4">
              <h3 className="text-2xl font-bold text-foreground" data-testid="game-title">Spelling Bee Challenge</h3>
              <div className="bg-accent/10 text-accent text-sm font-semibold px-3 py-1 rounded-full">
                Word {totalWordsAttempted + 1} | Score: {score}
              </div>
              <div className="text-sm text-muted-foreground">
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
                disabled={feedback.show}
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
                  className="text-left p-4 h-auto flex-col items-start whitespace-normal"
                  onClick={() => handleUseHint('firstLetter')}
                  disabled={hintsUsed.firstLetter}
                  data-testid="button-hint-first-letter"
                >
                  <div className="flex items-center justify-between w-full mb-2">
                    <span className="font-medium">First Letter</span>
                    <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">-2 pts</span>
                  </div>
                  <p className="text-sm text-muted-foreground break-words leading-relaxed">
                    {hintsUsed.firstLetter && currentWord ? `First letter: ${currentWord.word[0].toUpperCase()}` : "Reveal the first letter of the word"}
                  </p>
                </Button>

                {/* Definition Hint */}
                <Button 
                  variant="outline"
                  className="text-left p-4 h-auto flex-col items-start whitespace-normal"
                  onClick={() => handleUseHint('definition')}
                  disabled={hintsUsed.definition}
                  data-testid="button-hint-definition"
                >
                  <div className="flex items-center justify-between w-full mb-2">
                    <span className="font-medium">Definition</span>
                    <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">-3 pts</span>
                  </div>
                  <p className="text-sm text-muted-foreground break-words leading-relaxed">
                    {hintsUsed.definition && currentWord?.definition ? currentWord.definition : "Show the word's meaning"}
                  </p>
                </Button>

                {/* Example Sentence Hint */}
                <Button 
                  variant="outline"
                  className="text-left p-4 h-auto flex-col items-start whitespace-normal"
                  onClick={() => handleUseHint('sentence')}
                  disabled={hintsUsed.sentence}
                  data-testid="button-hint-sentence"
                >
                  <div className="flex items-center justify-between w-full mb-2">
                    <span className="font-medium">Example</span>
                    <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">-3 pts</span>
                  </div>
                  <p className="text-sm text-muted-foreground break-words leading-relaxed italic">
                    {hintsUsed.sentence && currentWord?.exampleSentence ? currentWord.exampleSentence : "See the word used in context"}
                  </p>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Game Controls */}
          <div className="flex items-center justify-between">
            <Button 
              variant="ghost"
              onClick={handleSkipWord}
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
                disabled={!userInput.trim() || feedback.show}
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
                <span className="text-muted-foreground">Words Attempted:</span>
                <span className="font-medium" data-testid="words-attempted">{totalAttempts}</span>
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
              {correctCount > 0 && correctCount < 5 && "Good effort! You're on the right track."}
              {correctCount >= 5 && correctCount < 10 && "Nice work! You're getting better!"}
              {correctCount >= 10 && correctCount < 15 && "Excellent spelling! Keep it up!"}
              {correctCount >= 15 && "Outstanding performance! You're a spelling master!"}
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
