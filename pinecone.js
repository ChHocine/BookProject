import { Pinecone } from '@pinecone-database/pinecone';
import fs from 'fs/promises';

function chunkText(text, chunkSize = 500) {
  const chunks = [];
  const sentences = text.split(/[.!?]+/); 
  let currentChunk = '';

  for (const sentence of sentences) {
    if ((currentChunk + sentence).length > chunkSize && currentChunk.length > 0) {
      chunks.push(currentChunk.trim());
      currentChunk = '';
    }
    currentChunk += sentence + '. ';
  }
  
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }
  
  return chunks;
}

async function processAndUploadText(filePath) {
  try {
    const pc = new Pinecone({ 
      apiKey: '--your-pinecone-api-key'
    });
    
    const index = pc.index('example-index');
    const text = await fs.readFile(filePath, 'utf-8');
    
    const chunks = chunkText(text);
    console.log(`Created ${chunks.length} chunks`);
    
    const batchSize = 96;
    let successfulBatches = 0;
    const totalBatches = Math.ceil(chunks.length / batchSize);

    for (let i = 0; i < chunks.length; i += batchSize) {
      try {
        const batchChunks = chunks.slice(i, Math.min(i + batchSize, chunks.length));
        
        const embeddings = await pc.inference.embed(
          'multilingual-e5-large',
          batchChunks,
          { inputType: 'passage', truncate: 'END' }
        );
        
        const records = batchChunks.map((chunk, index) => ({
          id: `chunk_${i + index}`,
          values: embeddings[index].values,
          metadata: {
            text: chunk,
            position: i + index,
            source: filePath
          }
        }));
        
        await index.namespace('books').upsert(records);
        successfulBatches++;
        console.log(`Uploaded batch ${successfulBatches} of ${totalBatches}`);
      } catch (batchError) {
        console.error(`Error processing batch starting at index ${i}:`, batchError.message);
        // Retry with smaller batch if needed
        i -= batchSize; // Move back to retry this batch
        continue;
      }
    }

    console.log(`Upload complete! Successfully processed ${successfulBatches} of ${totalBatches} batches`);
    
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
}

// Usage
const filePath = '--book_path--';
processAndUploadText(filePath);