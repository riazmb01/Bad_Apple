import { getWordsCollection, closeMongoDB } from './mongodb';

const sampleWords = [
  {
    word: "accommodate",
    definition: "To provide lodging or sufficient space for",
    exampleSentence: "The hotel can accommodate up to 500 guests.",
    difficulty: "intermediate",
    category: "vocabulary"
  },
  {
    word: "necessary",
    definition: "Required to be done, achieved, or present; needed; essential",
    exampleSentence: "It is necessary to check your work before submitting.",
    difficulty: "beginner",
    category: "vocabulary"
  },
  {
    word: "conscientious",
    definition: "Wishing to do what is right, especially to do one's work or duty well and thoroughly",
    exampleSentence: "She was conscientious about completing her homework.",
    difficulty: "advanced",
    category: "vocabulary"
  },
  {
    word: "rhythm",
    definition: "A strong, regular repeated pattern of movement or sound",
    exampleSentence: "The rhythm of the music made everyone want to dance.",
    difficulty: "intermediate",
    category: "vocabulary"
  },
  {
    word: "separate",
    definition: "Forming or viewed as a unit apart or by itself",
    exampleSentence: "Please keep your personal items separate from work materials.",
    difficulty: "beginner",
    category: "vocabulary"
  },
  {
    word: "pronunciation",
    definition: "The way in which a word is pronounced",
    exampleSentence: "Her pronunciation of French words was excellent.",
    difficulty: "intermediate",
    category: "vocabulary"
  },
  {
    word: "entrepreneur",
    definition: "A person who organizes and operates a business, taking on financial risks",
    exampleSentence: "The young entrepreneur started her own tech company.",
    difficulty: "advanced",
    category: "vocabulary"
  },
  {
    word: "beautiful",
    definition: "Pleasing the senses or mind aesthetically",
    exampleSentence: "The sunset over the ocean was beautiful.",
    difficulty: "beginner",
    category: "vocabulary"
  },
  {
    word: "exercise",
    definition: "Activity requiring physical effort, carried out to sustain or improve health",
    exampleSentence: "Regular exercise is important for good health.",
    difficulty: "beginner",
    category: "vocabulary"
  },
  {
    word: "appreciate",
    definition: "Recognize the full worth of something",
    exampleSentence: "I really appreciate your help with this project.",
    difficulty: "intermediate",
    category: "vocabulary"
  }
];

async function seedDatabase() {
  try {
    const wordsCollection = await getWordsCollection();
    
    // Clear existing words
    await wordsCollection.deleteMany({});
    console.log('Cleared existing words from database');
    
    // Insert sample words
    const result = await wordsCollection.insertMany(sampleWords);
    console.log(`Successfully inserted ${result.insertedCount} words into MongoDB`);
    
    // Verify insertion
    const count = await wordsCollection.countDocuments();
    console.log(`Total words in database: ${count}`);
    
    await closeMongoDB();
    process.exit(0);
  } catch (error) {
    console.error('Failed to seed database:', error);
    process.exit(1);
  }
}

seedDatabase();
