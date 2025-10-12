import { getWordsCollection, closeMongoDB } from './mongodb';

async function checkWordDB() {
  try {
    const wordsCollection = await getWordsCollection();
    const count = await wordsCollection.countDocuments();
    console.log(`Total words in wordDB collection: ${count}`);
    
    // Get sample words
    const samples = await wordsCollection.find().limit(5).toArray();
    console.log('\nSample words:');
    samples.forEach((word: any, index: number) => {
      console.log(`${index + 1}. ${word.word} (${word.difficulty || 'no difficulty'}) - ${word.definition?.substring(0, 50) || 'no definition'}...`);
    });
    
    await closeMongoDB();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkWordDB();
