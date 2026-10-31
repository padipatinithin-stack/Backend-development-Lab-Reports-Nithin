/**
 * Lab 2: SQLite database and CRUD routes
 * Backend Development Fundamentals · Year II Term II · Aurora
 * Faculty: Shiva Teja
 * Student: P. Nithin Chowdary
 * Registration No: 252U1R1173
 * Section: CSE-2D
 */

const express = require('express');
const path = require('path');
const fs = require('fs');
const { open } = require('sqlite');
const sqlite3 = require('sqlite3');

const app = express();
const PORT = process.env.PORT || 3000;

// Resolve DB path (Support persistent local/Render storage or /tmp in Vercel serverless)
let activeDbPath = path.join(__dirname, 'books.db');
if (process.env.VERCEL) {
  const tmpPath = path.join('/tmp', 'books.db');
  if (!fs.existsSync(tmpPath) && fs.existsSync(activeDbPath)) {
    fs.copyFileSync(activeDbPath, tmpPath);
  }
  activeDbPath = tmpPath;
}

let db = null;

// Helper to ensure database is opened
const getDB = async () => {
  if (db) return db;
  db = await open({
    filename: activeDbPath,
    driver: sqlite3.Database,
  });

  await db.exec(`
    CREATE TABLE IF NOT EXISTS book (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      author TEXT NOT NULL,
      price INTEGER NOT NULL,
      pages INTEGER NOT NULL
    );
  `);
  return db;
};

// Middleware to parse JSON request bodies
app.use(express.json());

// Ensure DB is connected for every request
app.use(async (req, res, next) => {
  try {
    await getDB();
    next();
  } catch (err) {
    console.error('Database middleware connection error:', err);
    res.status(500).json({ error: 'Database connection failed', details: err.message });
  }
});

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} -> ${res.statusCode} (${duration}ms)`);
  });
  next();
});

// Root welcome route
app.get('/', (req, res) => {
  res.status(200).json({
    message: 'Welcome to the Lab 2 SQLite Books CRUD API',
    endpoints: {
      getAllBooks: 'GET /books/',
      getSingleBook: 'GET /books/:bookId/',
      addBook: 'POST /books/',
      updateBook: 'PUT /books/:bookId/',
      deleteBook: 'DELETE /books/:bookId/',
    },
    student: {
      name: 'P. Nithin Chowdary',
      registrationNumber: '252U1R1173',
      section: 'CSE-2D',
      course: 'Backend Development Fundamentals',
      module: 'SQLite and relational database operations',
      faculty: 'Shiva Teja'
    },
  });
});

// 1. GET /books/ - Retrieve all books
app.get('/books/', async (req, res) => {
  try {
    const getBooksQuery = `
      SELECT *
      FROM book
      ORDER BY id ASC;
    `;
    const books = await db.all(getBooksQuery);
    res.status(200).json(books);
  } catch (error) {
    console.error('Error fetching books:', error.message);
    res.status(500).json({ error: 'Failed to retrieve books', details: error.message });
  }
});

// 2. GET /books/:bookId/ - Retrieve a specific book by ID
app.get('/books/:bookId/', async (req, res) => {
  try {
    const { bookId } = req.params;
    const getBookQuery = `
      SELECT *
      FROM book
      WHERE id = ?;
    `;
    const book = await db.get(getBookQuery, [bookId]);

    if (!book) {
      return res.status(404).json({
        status: 404,
        error: 'Not Found',
        message: `Book with ID ${bookId} does not exist.`,
      });
    }

    res.status(200).json(book);
  } catch (error) {
    console.error(`Error fetching book ${req.params.bookId}:`, error.message);
    res.status(500).json({ error: 'Failed to retrieve book', details: error.message });
  }
});

// 3. POST /books/ - Add a new book
app.post('/books/', async (req, res) => {
  try {
    const { title, author, price, pages } = req.body;

    // Validate required fields
    if (!title || !author || price === undefined || pages === undefined) {
      return res.status(400).json({
        status: 400,
        error: 'Bad Request',
        message: 'All fields (title, author, price, pages) are required.',
      });
    }

    const addBookQuery = `
      INSERT INTO book (title, author, price, pages)
      VALUES (?, ?, ?, ?);
    `;
    const result = await db.run(addBookQuery, [title, author, price, pages]);

    res.status(201).json({
      status: 201,
      message: 'Book Added Successfully',
      bookId: result.lastID,
      book: {
        id: result.lastID,
        title,
        author,
        price,
        pages,
      },
    });
  } catch (error) {
    console.error('Error adding book:', error.message);
    res.status(500).json({ error: 'Failed to add book', details: error.message });
  }
});

// 4. PUT /books/:bookId/ - Update an existing book
app.put('/books/:bookId/', async (req, res) => {
  try {
    const { bookId } = req.params;
    const { title, author, price, pages } = req.body;

    // First check if book exists
    const checkQuery = `SELECT * FROM book WHERE id = ?;`;
    const existingBook = await db.get(checkQuery, [bookId]);

    if (!existingBook) {
      return res.status(404).json({
        status: 404,
        error: 'Not Found',
        message: `Cannot update: Book with ID ${bookId} does not exist.`,
      });
    }

    // Validate required fields
    if (!title || !author || price === undefined || pages === undefined) {
      return res.status(400).json({
        status: 400,
        error: 'Bad Request',
        message: 'All fields (title, author, price, pages) are required for update.',
      });
    }

    const updateBookQuery = `
      UPDATE book
      SET
        title = ?,
        author = ?,
        price = ?,
        pages = ?
      WHERE id = ?;
    `;
    await db.run(updateBookQuery, [title, author, price, pages, bookId]);

    res.status(200).json({
      status: 200,
      message: 'Book Updated Successfully',
      updatedBook: {
        id: Number(bookId),
        title,
        author,
        price,
        pages,
      },
    });
  } catch (error) {
    console.error(`Error updating book ${req.params.bookId}:`, error.message);
    res.status(500).json({ error: 'Failed to update book', details: error.message });
  }
});

// 5. DELETE /books/:bookId/ - Remove a book
app.delete('/books/:bookId/', async (req, res) => {
  try {
    const { bookId } = req.params;

    // Check if book exists before deleting
    const checkQuery = `SELECT * FROM book WHERE id = ?;`;
    const existingBook = await db.get(checkQuery, [bookId]);

    if (!existingBook) {
      return res.status(404).json({
        status: 404,
        error: 'Not Found',
        message: `Cannot delete: Book with ID ${bookId} does not exist.`,
      });
    }

    const deleteBookQuery = `
      DELETE FROM book
      WHERE id = ?;
    `;
    await db.run(deleteBookQuery, [bookId]);

    res.status(200).json({
      status: 200,
      message: 'Book Deleted Successfully',
      deletedBookId: Number(bookId),
    });
  } catch (error) {
    console.error(`Error deleting book ${req.params.bookId}:`, error.message);
    res.status(500).json({ error: 'Failed to delete book', details: error.message });
  }
});

// 404 Catch-All Middleware for unmapped routes
app.use((req, res) => {
  res.status(404).json({
    status: 404,
    error: 'Not Found',
    message: `The requested path '${req.originalUrl}' does not exist on this server.`,
  });
});

// Task 3: initializeDBAndServer() async function (starts server on Render/Local)
const initializeDBAndServer = async () => {
  try {
    await getDB();

    if (!process.env.VERCEL) {
      app.listen(PORT, () => {
        console.log('====================================================');
        console.log(` SQLite Database connected at: ${activeDbPath}`);
        console.log(` Server is running on http://localhost:${PORT}`);
        console.log(' Available CRUD Routes:');
        console.log('   - GET    /books/');
        console.log('   - GET    /books/:bookId/');
        console.log('   - POST   /books/');
        console.log('   - PUT    /books/:bookId/');
        console.log('   - DELETE /books/:bookId/');
        console.log('====================================================');
      });
    }
  } catch (error) {
    console.error(`Database Connection Error: ${error.message}`);
    process.exit(1);
  }
};

initializeDBAndServer();

module.exports = app;
