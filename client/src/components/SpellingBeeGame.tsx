import { useState, useEffect, useRef } from "react";
import { Volume2, Lightbulb, Forward, Pause, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { speakWord } from "@/utils/speechUtils";
import { useQuery } from "@tanstack/react-query";

interface Word {
  _id?: string;
  word: string;
  definition?: string;
  difficulty?: string;
  exampleSentence?: string;
}

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
  const [timeLeft, setTimeLeft] = useState(45);
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
  const [feedback, setFeedback] = useState<{ show: boolean; isCorrect: boolean; message: string }>({
    show: false,
    isCorrect: false,
    message: ''
  });
  const [batchCounter, setBatchCounter] = useState(0);

  // Fetch initial words
  const { data: initialWords, refetch: refetchInitial } = useQuery<Word[]>({
    queryKey: ['/api/words/batch', { count: 5, batch: 'initial', timestamp: Date.now() }],
    queryFn: async () => {
      const res = await fetch('/api/words/batch?count=5');
      if (!res.ok) throw new Error('Failed to fetch words');
      return res.json();
    },
    enabled: words.length === 0,
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

  useEffect(() => {
    if (initialWords && words.length === 0) {
      setWords(initialWords);
    }
  }, [initialWords]);

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

  // Console log each word and auto-play pronunciation
  useEffect(() => {
    if (currentWord) {
      console.log('Current word:', currentWord.word);
      console.log('Word details:', currentWord);
      // Auto-play pronunciation for the new word
      setTimeout(() => {
        if (!isMuted) {
          speakWord(currentWord.word, false);
        }
      }, 500);
    }
  }, [currentWord]);

  // Reset on word changes
  useEffect(() => {
    timeoutRef.current = false;
    setUserInput('');
    setTimeLeft(45);
    setFeedback({ show: false, isCorrect: false, message: '' });
    setHintsUsed({
      firstLetter: false,
      definition: false,
      sentence: false
    });
  }, [currentWordIndex]);

  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    
    intervalRef.current = setInterval(() => {
      setTimeLeft((prev: number) => {
        if (prev <= 1 && !timeoutRef.current) {
          timeoutRef.current = true;
          setUserInput('');
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
  }, [currentWordIndex]);

  const handleTimeOut = () => {
    setTotalAttempts(prev => prev + 1);
    // Notify parent component that time expired
    onSubmitAnswer('');
    setCurrentWordIndex(prev => prev + 1);
  };

  const handleSubmit = () => {
    if (userInput.trim() && currentWord) {
      const isCorrect = userInput.trim().toLowerCase() === currentWord.word.toLowerCase();
      
      setTotalAttempts(prev => prev + 1);
      
      if (isCorrect) {
        setCorrectCount(prev => prev + 1);
        let points = 10;
        if (hintsUsed.firstLetter) points -= 2;
        if (hintsUsed.definition) points -= 3;
        if (hintsUsed.sentence) points -= 3;
        setScore(prev => prev + Math.max(points, 1));
        setFeedback({
          show: true,
          isCorrect: true,
          message: `Correct! The word was "${currentWord.word}". You earned ${Math.max(points, 1)} points!`
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
    setTotalAttempts(prev => prev + 1);
    // Notify parent component that word was skipped
    onSkipWord();
    setCurrentWordIndex(prev => prev + 1);
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
                Word {currentWordIndex + 1} | Score: {score}
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
                  className="text-left p-4 h-auto flex-col items-start"
                  onClick={() => handleUseHint('firstLetter')}
                  disabled={hintsUsed.firstLetter}
                  data-testid="button-hint-first-letter"
                >
                  <div className="flex items-center justify-between w-full mb-2">
                    <span className="font-medium">First Letter</span>
                    <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">-5 pts</span>
                  </div>
                  <p className="text-sm text-muted-foreground break-words leading-relaxed">
                    {hintsUsed.firstLetter && currentWord ? `First letter: ${currentWord.word[0].toUpperCase()}` : "Reveal the first letter of the word"}
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
                  <p className="text-sm text-muted-foreground break-words leading-relaxed">
                    {hintsUsed.definition && currentWord?.definition ? currentWord.definition : "Show the word's meaning"}
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
    </section>
  );
}
