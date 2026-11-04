/**
 * Lab 3: REST API, query parameters, validation, debugging
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

// Resolve DB path (Support persistent local storage or /tmp in Vercel serverless)
let activeDbPath = path.join(__dirname, 'books.db');
if (process.env.VERCEL) {
  const tmpPath = path.join('/tmp', 'books.db');
  if (!fs.existsSync(tmpPath) && fs.existsSync(activeDbPath)) {
    fs.copyFileSync(activeDbPath, tmpPath);
  }
  activeDbPath = tmpPath;
}

let db = null;

// Helper to open database and ensure schema
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

// Middleware: Parse JSON bodies
app.use(express.json());

// Middleware: Ensure DB is connected
app.use(async (req, res, next) => {
  try {
    await getDB();
    next();
  } catch (err) {
    console.error('Database connection error:', err);
    res.status(500).json({ message: 'Database connection failed', details: err.message });
  }
});

// Middleware: Request Logger
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} -> ${res.statusCode} (${duration}ms)`);
  });
  next();
});

// Root informational endpoint
app.get('/', (req, res) => {
  res.status(200).json({
    message: 'Welcome to Lab 3: RESTful Books API with Query Parameters & Validation',
    student: {
      name: 'P. Nithin Chowdary',
      registrationNumber: '252U1R1173',
      section: 'CSE-2D',
      faculty: 'Shiva Teja',
      module: 'RESTful API development and validation',
    },
    endpoints: {
      getBooksWithFilters: 'GET /books?search_q=&order_by=&order=&limit=&offset=&min_price=&max_price=',
      getSingleBook: 'GET /books/:bookId',
      createBook: 'POST /books',
      updateBook: 'PUT /books/:bookId',
      deleteBook: 'DELETE /books/:bookId',
    },
  });
});

/**
 * 1. GET /books
 * Supports query parameters:
 *  - search_q: partial title match (LIKE %search_q%)
 *  - order_by: column name (id, title, author, price, pages) [default: id]
 *  - order: sorting direction (ASC, DESC) [default: ASC]
 *  - limit: integer limit [default: 10]
 *  - offset: integer offset [default: 0]
 *  - min_price: minimum price filter
 *  - max_price: maximum price filter
 */
app.get('/books', async (req, res) => {
  try {
    const {
      search_q = '',
      order_by = 'id',
      order = 'ASC',
      limit = 10,
      offset = 0,
      min_price,
      max_price,
    } = req.query;

    // Whitelist valid columns to prevent SQL injection in ORDER BY clause
    const allowedColumns = ['id', 'title', 'author', 'price', 'pages'];
    const validOrderBy = allowedColumns.includes(order_by.toLowerCase())
      ? order_by.toLowerCase()
      : 'id';

    const validOrder = order.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
    const parsedLimit = parseInt(limit, 10) > 0 ? parseInt(limit, 10) : 10;
    const parsedOffset = parseInt(offset, 10) >= 0 ? parseInt(offset, 10) : 0;

    // Build dynamic WHERE clause using parameterized queries
    const whereConditions = [];
    const queryParams = [];

    // Title search with LIKE
    if (search_q.trim() !== '') {
      whereConditions.push('title LIKE ?');
      queryParams.push(`%${search_q.trim()}%`);
    }

    // Price range filter
    const parsedMinPrice = min_price !== undefined ? parseFloat(min_price) : null;
    const parsedMaxPrice = max_price !== undefined ? parseFloat(max_price) : null;

    if (parsedMinPrice !== null && !isNaN(parsedMinPrice) && parsedMaxPrice !== null && !isNaN(parsedMaxPrice)) {
      whereConditions.push('price BETWEEN ? AND ?');
      queryParams.push(parsedMinPrice, parsedMaxPrice);
    } else if (parsedMinPrice !== null && !isNaN(parsedMinPrice)) {
      whereConditions.push('price >= ?');
      queryParams.push(parsedMinPrice);
    } else if (parsedMaxPrice !== null && !isNaN(parsedMaxPrice)) {
      whereConditions.push('price <= ?');
      queryParams.push(parsedMaxPrice);
    }

    const whereClause = whereConditions.length > 0
      ? `WHERE ${whereConditions.join(' AND ')}`
      : '';

    const sqlQuery = `
      SELECT *
      FROM book
      ${whereClause}
      ORDER BY ${validOrderBy} ${validOrder}
      LIMIT ? OFFSET ?;
    `;

    queryParams.push(parsedLimit, parsedOffset);

    const books = await db.all(sqlQuery, queryParams);
    res.status(200).json(books);
  } catch (error) {
    console.error('Error fetching books:', error.message);
    res.status(500).json({ message: 'Failed to retrieve books', error: error.message });
  }
});

/**
 * 2. GET /books/:bookId
 * Retrieve a single book by ID
 */
app.get('/books/:bookId', async (req, res) => {
  try {
    const { bookId } = req.params;
    const book = await db.get('SELECT * FROM book WHERE id = ?;', [bookId]);

    if (!book) {
      return res.status(404).json({ message: `Book with ID ${bookId} not found` });
    }

    res.status(200).json(book);
  } catch (error) {
    console.error(`Error fetching book ${req.params.bookId}:`, error.message);
    res.status(500).json({ message: 'Failed to retrieve book', error: error.message });
  }
});

/**
 * Helper: Validate book input body
 */
function validateBookBody(body) {
  const { title, author, price, pages } = body;

  if (!title || typeof title !== 'string' || title.trim() === '') {
    return { valid: false, message: 'Missing or invalid title: title must be a non-empty string' };
  }

  if (!author || typeof author !== 'string' || author.trim() === '') {
    return { valid: false, message: 'Missing or invalid author: author must be a non-empty string' };
  }

  if (price === undefined || price === null || isNaN(Number(price)) || Number(price) < 0) {
    return { valid: false, message: 'Missing or invalid price: price must be a non-negative number' };
  }

  if (pages === undefined || pages === null || isNaN(Number(pages)) || Number(pages) <= 0 || !Number.isInteger(Number(pages))) {
    return { valid: false, message: 'Missing or invalid pages: pages must be a positive integer' };
  }

  return {
    valid: true,
    data: {
      title: title.trim(),
      author: author.trim(),
      price: Number(price),
      pages: Number(pages),
    },
  };
}

/**
 * 3. POST /books
 * Create a new book with input validation
 */
app.post('/books', async (req, res) => {
  try {
    const validation = validateBookBody(req.body);
    if (!validation.valid) {
      return res.status(400).json({ message: validation.message });
    }

    const { title, author, price, pages } = validation.data;

    const insertQuery = `
      INSERT INTO book (title, author, price, pages)
      VALUES (?, ?, ?, ?);
    `;
    const result = await db.run(insertQuery, [title, author, price, pages]);

    res.status(201).json({
      message: 'Book created successfully',
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
    console.error('Error creating book:', error.message);
    res.status(500).json({ message: 'Failed to create book', error: error.message });
  }
});

/**
 * 4. PUT /books/:bookId
 * Update an existing book with validation and 404 check
 */
app.put('/books/:bookId', async (req, res) => {
  try {
    const { bookId } = req.params;

    // Check if book exists
    const existing = await db.get('SELECT * FROM book WHERE id = ?;', [bookId]);
    if (!existing) {
      return res.status(404).json({ message: `Book with ID ${bookId} not found` });
    }

    const validation = validateBookBody(req.body);
    if (!validation.valid) {
      return res.status(400).json({ message: validation.message });
    }

    const { title, author, price, pages } = validation.data;

    const updateQuery = `
      UPDATE book
      SET title = ?, author = ?, price = ?, pages = ?
      WHERE id = ?;
    `;
    await db.run(updateQuery, [title, author, price, pages, bookId]);

    res.status(200).json({
      message: 'Book updated successfully',
      book: {
        id: Number(bookId),
        title,
        author,
        price,
        pages,
      },
    });
  } catch (error) {
    console.error(`Error updating book ${req.params.bookId}:`, error.message);
    res.status(500).json({ message: 'Failed to update book', error: error.message });
  }
});

/**
 * 5. DELETE /books/:bookId
 * Delete book by ID with 404 check
 */
app.delete('/books/:bookId', async (req, res) => {
  try {
    const { bookId } = req.params;

    // Check if book exists
    const existing = await db.get('SELECT * FROM book WHERE id = ?;', [bookId]);
    if (!existing) {
      return res.status(404).json({ message: `Book with ID ${bookId} not found` });
    }

    await db.run('DELETE FROM book WHERE id = ?;', [bookId]);

    res.status(200).json({
      message: 'Book deleted successfully',
      deletedBookId: Number(bookId),
    });
  } catch (error) {
    console.error(`Error deleting book ${req.params.bookId}:`, error.message);
    res.status(500).json({ message: 'Failed to delete book', error: error.message });
  }
});

// 404 Catch-All Middleware for unmapped routes
app.use((req, res) => {
  res.status(404).json({
    message: `The requested path '${req.originalUrl}' does not exist on this server.`,
  });
});

// Initialize DB and start server when running locally
const initializeDBAndServer = async () => {
  try {
    await getDB();

    if (!process.env.VERCEL) {
      app.listen(PORT, () => {
        console.log('====================================================');
        console.log(` SQLite Database connected at: ${activeDbPath}`);
        console.log(` Server is running on http://localhost:${PORT}`);
        console.log(' Available RESTful Routes:');
        console.log('   - GET    /books (supports search_q, order_by, order, limit, offset, min_price, max_price)');
        console.log('   - GET    /books/:bookId');
        console.log('   - POST   /books (with body validation)');
        console.log('   - PUT    /books/:bookId (with validation)');
        console.log('   - DELETE /books/:bookId');
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
