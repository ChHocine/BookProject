CREATE TABLE books (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    author VARCHAR(255),
    file_path TEXT,
    file_size BIGINT,
    status VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE book_contents (
    id SERIAL PRIMARY KEY,
    book_id INTEGER REFERENCES books(id),
    content TEXT,
    chunk_number INTEGER,
    page_number INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_book_contents_book_id ON book_contents(book_id);
CREATE INDEX idx_book_contents_page_number ON book_contents(page_number);