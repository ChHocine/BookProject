import { Pinecone } from '@pinecone-database/pinecone';
import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// I'm using postgres database but we can change the database to any other database
const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT
});

// We can get the book chunk based on the book id
async function getBookChunks(bookId) {
    const client = await pool.connect();
    try {
        const result = await client.query(
            'SELECT content, chunk_number, page_number FROM book_contents WHERE book_id = $1 ORDER BY chunk_number',
            [bookId]
        );
        return result.rows;
    } finally {
        client.release();
    }
}

// Get Book Metadata from bookId
async function getBookMetadata(bookId) {
    const client = await pool.connect();
    try {
        const result = await client.query(
            'SELECT title, author, file_path FROM books WHERE id = $1',
            [bookId]
        );
        return result.rows[0];
    } finally {
        client.release();
    }
}

async function processAndUploadBook(bookId) {
    try {
        const pc = new Pinecone({ 
            apiKey: process.env.PINECONE_API_KEY
        });
        
        const index = pc.index(process.env.PINECONE_INDEX_NAME); // Index name is "BookReply"

        const bookMetadata = await getBookMetadata(bookId);
        if (!bookMetadata) {
            throw new Error(`Book with ID ${bookId} not found`);
        }

        // Update book status to indexing
        await pool.query(
            'UPDATE books SET status = $1 WHERE id = $2',
            ['indexing', bookId]
        );

        // Get chunks from database
        const chunks = await getBookChunks(bookId);
        console.log(`Processing ${chunks.length} chunks from book "${bookMetadata.title}" (ID: ${bookId})`);
        
        const batchSize = 96; // I tried to use 100 but it was too much for the pinecone
        let successfulBatches = 0;
        const totalBatches = Math.ceil(chunks.length / batchSize);

        for (let i = 0; i < chunks.length; i += batchSize) {
            try {
                const batchChunks = chunks.slice(i, Math.min(i + batchSize, chunks.length));
                
                const chunkContents = batchChunks.map(chunk => chunk.content);
                
                const embeddings = await pc.inference.embed(
                    'multilingual-e5-large',
                    chunkContents,
                    { inputType: 'passage', truncate: 'END' }
                );

                const records = batchChunks.map((chunk, index) => ({
                    id: `book_${bookId}_chunk_${chunk.chunk_number}`,
                    values: embeddings[index].values,
                    metadata: {
                        bookId: bookId,
                        bookTitle: bookMetadata.title,
                        author: bookMetadata.author,
                        pageNumber: chunk.page_number,
                        chunkNumber: chunk.chunk_number,
                        text: chunk.content,
                        source: bookMetadata.file_path
                    }
                }));
                
                await index.namespace('books').upsert(records);
                successfulBatches++;
                
                const progress = Math.round((successfulBatches / totalBatches) * 100);
                await pool.query(
                    'UPDATE books SET indexing_progress = $1 WHERE id = $2',
                    [progress, bookId]
                );

                console.log(`Uploaded batch ${successfulBatches}/${totalBatches} (${progress}%) for "${bookMetadata.title}"`);

            } catch (batchError) {
                console.error(`Error processing batch for book ${bookId}, chunks ${i}-${i + batchSize}:`, batchError);
                
                // Retry logic
                if (batchError.message.includes('rate limit')) {
                    console.log('Rate limit reached, waiting 60 seconds...');
                    await new Promise(resolve => setTimeout(resolve, 60000));
                    i -= batchSize; // Retry this batch
                    continue;
                }
                
                throw batchError;
            }
        }

        await pool.query(
            'UPDATE books SET status = $1, indexing_progress = 100 WHERE id = $2',
            ['indexed', bookId]
        );

        console.log(`Successfully processed ${successfulBatches}/${totalBatches} batches for "${bookMetadata.title}"`);
        return true;
        
    } catch (error) {
        console.error('Error:', error);
        // Mark indexing as failed
        await pool.query(
            'UPDATE books SET status = $1, error_message = $2 WHERE id = $3',
            ['indexing_failed', error.message, bookId]
        );
        throw error;
    }
}

async function searchBooks(query, limit = 5) {
    try {
        const pc = new Pinecone({ 
            apiKey: process.env.PINECONE_API_KEY
        });
        
        const index = pc.index(process.env.PINECONE_INDEX_NAME);

        const queryEmbedding = await pc.inference.embed(
            'multilingual-e5-large',
            [query],
            { inputType: 'passage' }
        );

        const searchResults = await index.namespace('books').query({
            vector: queryEmbedding[0].values,
            topK: limit,
            includeMetadata: true
        });

        return searchResults.matches.map(match => ({
            score: match.score,
            bookId: match.metadata.bookId,
            bookTitle: match.metadata.bookTitle,
            author: match.metadata.author,
            pageNumber: match.metadata.pageNumber,
            text: match.metadata.text
        }));

    } catch (error) {
        console.error('Search error:', error);
        throw error;
    }
}


export { processAndUploadBook, searchBooks };