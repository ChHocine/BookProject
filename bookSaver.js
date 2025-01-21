const fs = require('fs');
const readline = require('readline');
const { Pool } = require('pg');

// I am using postgres database but we can change the database to any other database
const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT
});

async function saveBookToDatabase(filePath, bookMetadata) {
    const fileStream = fs.createReadStream(filePath, { encoding: 'utf8' });
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    try {
        const client = await pool.connect();
        await client.query('BEGIN');

        try {
            const bookResult = await client.query(
                `INSERT INTO books (
                    title, 
                    author, 
                    file_path,
                    file_size,
                    created_at,
                    status
                ) VALUES ($1, $2, $3, $4, NOW(), 'processing') 
                RETURNING id`,
                [
                    bookMetadata.title,
                    bookMetadata.author,
                    filePath,
                    fs.statSync(filePath).size
                ]
            );
            const bookId = bookResult.rows[0].id;

            let chunkNumber = 0;
            let chunk = '';
            const CHUNK_SIZE = 5000;
            let lineCount = 0;

            const insertChunkStmt = await client.query(
                `PREPARE insert_chunk AS 
                INSERT INTO book_contents (book_id, content, chunk_number, page_number) 
                VALUES ($1, $2, $3, $4)`
            );

            let currentPage = 1;
            for await (const line of rl) {
                chunk += line + '\n';
                lineCount++;

                if (line.includes('--- Page')) {
                    currentPage = parseInt(line.match(/Page (\d+)/)?.[1] || currentPage);
                }

                if (lineCount >= CHUNK_SIZE) {
                    await client.query('EXECUTE insert_chunk($1, $2, $3, $4)', 
                        [bookId, chunk, chunkNumber, currentPage]
                    );
                    chunk = '';
                    lineCount = 0;
                    chunkNumber++;
                }
            }

            if (chunk) {
                await client.query('EXECUTE insert_chunk($1, $2, $3, $4)', 
                    [bookId, chunk, chunkNumber, currentPage]
                );
            }

            await client.query(
                'UPDATE books SET status = $1 WHERE id = $2',
                ['complete', bookId]
            );

            await client.query('COMMIT');
            console.log(`Book saved successfully! ID: ${bookId}`);
            return bookId;

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }

    } catch (error) {
        console.error('Error saving book:', error);
        throw error;
    } finally {
        rl.close();
    }
}

module.exports = { saveBookToDatabase };