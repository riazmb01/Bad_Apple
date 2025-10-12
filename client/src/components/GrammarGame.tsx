import { useState, useEffect, useRef } from "react";
import { BookOpen, Check, Forward, Pause, SkipForward } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

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
  id: number;
  type: 'parts-of-speech' | 'sentence-structure' | 'grammar-rules' | 'punctuation' | 'correction';
  sentence: string;
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
}

const grammarQuestions: GrammarQuestion[] = [
  // Parts of Speech Questions
  {
    id: 1,
    type: 'parts-of-speech',
    sentence: "The cat sat on the mat.",
    question: "What part of speech is 'cat' in this sentence?",
    options: ["Noun", "Verb", "Adjective", "Adverb"],
    correctAnswer: "Noun",
    explanation: "A noun is a word that names a person, place, thing, or idea. 'Cat' names an animal."
  },
  {
    id: 2,
    type: 'parts-of-speech',
    sentence: "She runs quickly to school.",
    question: "What part of speech is 'quickly' in this sentence?",
    options: ["Noun", "Verb", "Adjective", "Adverb"],
    correctAnswer: "Adverb",
    explanation: "An adverb modifies a verb, adjective, or another adverb. 'Quickly' describes how she runs."
  },
  {
    id: 3,
    type: 'parts-of-speech',
    sentence: "The beautiful garden blooms every spring.",
    question: "What part of speech is 'beautiful' in this sentence?",
    options: ["Noun", "Verb", "Adjective", "Adverb"],
    correctAnswer: "Adjective",
    explanation: "An adjective describes or modifies a noun. 'Beautiful' describes the garden."
  },
  {
    id: 4,
    type: 'parts-of-speech',
    sentence: "We will meet at the library tomorrow.",
    question: "What part of speech is 'at' in this sentence?",
    options: ["Preposition", "Conjunction", "Interjection", "Pronoun"],
    correctAnswer: "Preposition",
    explanation: "A preposition shows the relationship between a noun or pronoun and other words. 'At' shows location."
  },
  
  // Sentence Structure Questions
  {
    id: 5,
    type: 'sentence-structure',
    sentence: "Although it was raining, we went to the park.",
    question: "What is the dependent clause in this sentence?",
    options: ["Although it was raining", "we went to the park", "it was raining", "to the park"],
    correctAnswer: "Although it was raining",
    explanation: "A dependent clause cannot stand alone as a sentence. 'Although it was raining' depends on the main clause for complete meaning."
  },
  {
    id: 6,
    type: 'sentence-structure',
    sentence: "The students studied hard and passed the exam.",
    question: "What type of sentence is this?",
    options: ["Simple", "Compound", "Complex", "Compound-Complex"],
    correctAnswer: "Compound",
    explanation: "A compound sentence has two or more independent clauses joined by a coordinating conjunction. 'The students studied hard' and 'passed the exam' are both independent clauses joined by 'and'."
  },
  {
    id: 7,
    type: 'sentence-structure',
    sentence: "Running down the street, the boy dropped his book.",
    question: "What is 'Running down the street' in this sentence?",
    options: ["Participial phrase", "Gerund phrase", "Infinitive phrase", "Prepositional phrase"],
    correctAnswer: "Participial phrase",
    explanation: "A participial phrase begins with a participle and modifies a noun or pronoun. 'Running down the street' modifies 'the boy'."
  },
  {
    id: 8,
    type: 'sentence-structure',
    sentence: "The book that I borrowed from the library is overdue.",
    question: "What is the subject of this sentence?",
    options: ["The book", "I", "the library", "The book that I borrowed from the library"],
    correctAnswer: "The book",
    explanation: "The simple subject is 'the book'. The phrase 'that I borrowed from the library' is a relative clause modifying the subject."
  },
  
  // Grammar Rules Questions
  {
    id: 9,
    type: 'grammar-rules',
    sentence: "Neither the students nor the teacher ___ present.",
    question: "Which verb form correctly completes this sentence?",
    options: ["was", "were", "are", "is"],
    correctAnswer: "was",
    explanation: "When using 'neither...nor', the verb agrees with the noun closest to it. 'Teacher' is singular, so we use 'was'."
  },
  {
    id: 10,
    type: 'grammar-rules',
    sentence: "She has ___ to Paris three times.",
    question: "Which verb form correctly completes this sentence?",
    options: ["went", "gone", "go", "going"],
    correctAnswer: "gone",
    explanation: "The present perfect tense (has/have + past participle) is used for actions that occurred at an unspecified time. 'Gone' is the past participle of 'go'."
  },
  {
    id: 11,
    type: 'grammar-rules',
    sentence: "Each of the players ___ their own equipment.",
    question: "Which verb form is grammatically correct?",
    options: ["bring", "brings", "bringing", "brought"],
    correctAnswer: "brings",
    explanation: "With 'each of', the verb should be singular because 'each' is the subject, not 'players'. Therefore, 'brings' is correct."
  },
  {
    id: 12,
    type: 'grammar-rules',
    sentence: "If I ___ you, I would apologize immediately.",
    question: "Which verb form correctly completes this conditional sentence?",
    options: ["was", "were", "am", "be"],
    correctAnswer: "were",
    explanation: "In hypothetical conditional sentences (second conditional), we use 'were' for all subjects, including 'I'. This is the subjunctive mood."
  },
  
  // Punctuation Questions
  {
    id: 13,
    type: 'punctuation',
    sentence: "My sister who lives in Boston is a doctor.",
    question: "Where should commas be placed in this sentence?",
    options: [
      "After 'sister' and after 'Boston'",
      "After 'sister' only",
      "After 'Boston' only",
      "No commas needed"
    ],
    correctAnswer: "After 'sister' and after 'Boston'",
    explanation: "The clause 'who lives in Boston' is non-essential (non-restrictive), providing additional information. It should be set off with commas."
  },
  {
    id: 14,
    type: 'punctuation',
    sentence: "I need to buy eggs milk bread and cheese.",
    question: "What punctuation is missing from this sentence?",
    options: ["Commas between items", "Semicolons between items", "Periods between items", "Colons between items"],
    correctAnswer: "Commas between items",
    explanation: "Items in a list should be separated by commas. The sentence should read: 'I need to buy eggs, milk, bread, and cheese.'"
  },
  {
    id: 15,
    type: 'punctuation',
    sentence: "The teacher said the test is tomorrow",
    question: "What punctuation mark should end this sentence?",
    options: ["Period (.)", "Question mark (?)", "Exclamation mark (!)", "Semicolon (;)"],
    correctAnswer: "Period (.)",
    explanation: "This is a declarative sentence (a statement), so it should end with a period. Even though it contains reported speech, the entire sentence is a statement."
  },
  {
    id: 16,
    type: 'punctuation',
    sentence: "Its a beautiful day however I have to work.",
    question: "What punctuation error needs to be corrected?",
    options: [
      "Need apostrophe in 'Its' and semicolon before 'however'",
      "Need apostrophe in 'Its' only",
      "Need semicolon before 'however' only",
      "No errors present"
    ],
    correctAnswer: "Need apostrophe in 'Its' and semicolon before 'however'",
    explanation: "The possessive 'its' without apostrophe means 'belonging to it'; we need 'It's' (it is). Two independent clauses joined by 'however' need a semicolon or period, not just a comma."
  },
  
  // Sentence Correction Questions
  {
    id: 17,
    type: 'correction',
    sentence: "Me and John went to the store.",
    question: "How should this sentence be corrected?",
    options: [
      "John and I went to the store.",
      "John and me went to the store.",
      "I and John went to the store.",
      "The sentence is correct."
    ],
    correctAnswer: "John and I went to the store.",
    explanation: "Use 'I' (not 'me') as a subject pronoun. Also, it's polite to put the other person's name first."
  },
  {
    id: 18,
    type: 'correction',
    sentence: "Between you and I, this is a secret.",
    question: "What is the error in this sentence?",
    options: [
      "Should be 'between you and me'",
      "Should be 'among you and I'",
      "Should be 'between you and myself'",
      "No error"
    ],
    correctAnswer: "Should be 'between you and me'",
    explanation: "After prepositions like 'between', we use object pronouns. 'Me' is the object pronoun form of 'I'."
  },
  {
    id: 19,
    type: 'correction',
    sentence: "She don't like vegetables.",
    question: "How should this sentence be corrected?",
    options: [
      "She doesn't like vegetables.",
      "She do not like vegetables.",
      "She didn't like vegetables.",
      "The sentence is correct."
    ],
    correctAnswer: "She doesn't like vegetables.",
    explanation: "With third-person singular subjects (she, he, it), use 'doesn't' (does not), not 'don't' (do not)."
  },
  {
    id: 20,
    type: 'correction',
    sentence: "The team are playing well today.",
    question: "Is this sentence correct in American English?",
    options: [
      "No, should be 'The team is playing well today.'",
      "Yes, it's correct.",
      "No, should be 'The teams is playing well today.'",
      "No, should be 'The team were playing well today.'"
    ],
    correctAnswer: "No, should be 'The team is playing well today.'",
    explanation: "In American English, collective nouns like 'team' are treated as singular and take singular verbs. 'The team is' is correct."
  },
  {
    id: 21,
    type: 'correction',
    sentence: "I could of helped you with that.",
    question: "What is the error in this sentence?",
    options: [
      "Should be 'could have' not 'could of'",
      "Should be 'can of' not 'could of'",
      "Should be 'could off' not 'could of'",
      "No error"
    ],
    correctAnswer: "Should be 'could have' not 'could of'",
    explanation: "'Could have' (or 'could've') is correct. 'Could of' is a common mistake based on how 'could've' sounds when spoken."
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
    }
  };

  const handleNextQuestion = () => {
    onSkipWord(); // Reuse skip functionality to move to next question
  };

  const handleSkip = () => {
    setShowExplanation(true);
    onSkipWord();
  };

  const timeProgress = ((60 - timeLeft) / 60) * 100;

  const getQuestionTypeLabel = (type: GrammarQuestion['type']) => {
    const labels = {
      'parts-of-speech': 'Parts of Speech',
      'sentence-structure': 'Sentence Structure',
      'grammar-rules': 'Grammar Rules',
      'punctuation': 'Punctuation',
      'correction': 'Sentence Correction'
    };
    return labels[type];
  };

  const getQuestionTypeColor = (type: GrammarQuestion['type']) => {
    const colors = {
      'parts-of-speech': 'bg-blue-100 text-blue-800',
      'sentence-structure': 'bg-purple-100 text-purple-800',
      'grammar-rules': 'bg-green-100 text-green-800',
      'punctuation': 'bg-orange-100 text-orange-800',
      'correction': 'bg-red-100 text-red-800'
    };
    return colors[type];
  };

  return (
    <section className="mb-12" data-testid="grammar-game">
      <Card>
        <CardContent className="p-8">
          {/* Game Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center space-x-4">
              <h3 className="text-2xl font-bold text-foreground" data-testid="game-title">Grammar Mastery Challenge</h3>
              <div className="bg-green-100 text-green-800 text-sm font-semibold px-3 py-1 rounded-full" data-testid="question-progress">
                Question {gameState?.currentRound || 1} of {gameState?.totalRounds || 10}
              </div>
              <div className={`text-xs font-semibold px-3 py-1 rounded-full ${getQuestionTypeColor(currentQuestion.type)}`} data-testid="question-type">
                {getQuestionTypeLabel(currentQuestion.type)}
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
                      ? option === currentQuestion.correctAnswer 
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
                    {showExplanation && option === currentQuestion.correctAnswer && (
                      <Check className="w-5 h-5 text-green-600" />
                    )}
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
                  }`} data-testid="answer-feedback">
                    {isTimedOutRound ? `⏱️ Time's up! The answer is: ${currentQuestion.correctAnswer}` :
                     selectedAnswer === currentQuestion.correctAnswer ? '✅ Correct!' : `❌ Incorrect. The answer is: ${currentQuestion.correctAnswer}`}
                  </div>
                  <p className="text-green-700 whitespace-normal break-words leading-relaxed" data-testid="answer-explanation">
                    {currentQuestion.explanation}
                  </p>
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
