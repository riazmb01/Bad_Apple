import { MongoClient } from 'mongodb';

async function checkEx1DB() {
  try {
    const client = new MongoClient(process.env.MONGODB_URI || '');
    await client.connect();
    const db = client.db('wordDB');
    const collection = db.collection('ex1DB');
    
    const count = await collection.countDocuments();
    console.log(`Total words in ex1DB collection: ${count}`);
    
    const sample = await collection.findOne();
    console.log('\nSample document structure:');
    console.log(JSON.stringify(sample, null, 2));
    
    await client.close();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkEx1DB();
