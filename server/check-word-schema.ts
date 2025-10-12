import { getWordsCollection, closeMongoDB } from './mongodb';

async function checkWordSchema() {
  try {
    const wordsCollection = await getWordsCollection();
    const sampleWord = await wordsCollection.findOne();
    
    console.log('Sample word schema:');
    console.log(JSON.stringify(sampleWord, null, 2));
    
    await closeMongoDB();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkWordSchema();
