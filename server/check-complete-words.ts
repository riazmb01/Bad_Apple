import { getWordsCollection, closeMongoDB } from './mongodb';

async function checkCompleteWords() {
  try {
    const wordsCollection = await getWordsCollection();
    
    // Find words with all fields
    const completeWords = await wordsCollection.find({
      difficulty: { $exists: true },
      definition: { $exists: true }
    }).limit(5).toArray();
    
    console.log(`Words with difficulty and definition: ${completeWords.length}`);
    
    if (completeWords.length > 0) {
      console.log('\nSample complete words:');
      completeWords.forEach((word: any, index: number) => {
        console.log(`${index + 1}. ${word.word} (${word.difficulty}) - ${word.definition?.substring(0, 60)}...`);
      });
    }
    
    // Count words by difficulty
    const beginnerCount = await wordsCollection.countDocuments({ difficulty: 'beginner' });
    const intermediateCount = await wordsCollection.countDocuments({ difficulty: 'intermediate' });
    const advancedCount = await wordsCollection.countDocuments({ difficulty: 'advanced' });
    
    console.log('\nWords by difficulty:');
    console.log(`- Beginner: ${beginnerCount}`);
    console.log(`- Intermediate: ${intermediateCount}`);
    console.log(`- Advanced: ${advancedCount}`);
    console.log(`- No difficulty: ${64084 - beginnerCount - intermediateCount - advancedCount}`);
    
    await closeMongoDB();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkCompleteWords();
