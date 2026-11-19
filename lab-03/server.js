/**
 * Lab 3: REST API with Query Parameters & Validation
 * Student: P. Nithin Chowdary | 252U1R1173 | CSE-2D
 * Faculty: Shiva Teja
 */

const express = require('express');
const path = require('path');
const fs = require('fs');
const { open } = require('sqlite');
const sqlite3 = require('sqlite3');

const app = express();
const PORT = process.env.PORT || 3000;

let activeDbPath = path.join(__dirname, 'books.db');
if (process.env.VERCEL) {
  const tmpPath = '/tmp/books.db';
  if (!fs.existsSync(tmpPath) && fs.existsSync(activeDbPath)) fs.copyFileSync(activeDbPath, tmpPath);
  activeDbPath = tmpPath;
}

let db = null;
const getDB = async () => {
  if (db) return db;
  db = await open({ filename: activeDbPath, driver: sqlite3.Database });
  await db.exec(`CREATE TABLE IF NOT EXISTS book (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL, author TEXT NOT NULL,
    price INTEGER NOT NULL, pages INTEGER NOT NULL
  )`);
  return db;
};

app.use(express.json());
app.use(async (req, res, next) => {
  try { await getDB(); next(); }
  catch (err) { res.status(500).json({ message: 'Database connection failed' }); }
});

app.get('/', (req, res) => {
  res.json({
    message: 'Lab 3 – RESTful Books API with Query Parameters & Validation',
    endpoints: ['GET /books', 'GET /books/:bookId', 'POST /books', 'PUT /books/:bookId', 'DELETE /books/:bookId'],
    student: { name: 'P. Nithin Chowdary', reg: '252U1R1173', section: 'CSE-2D', faculty: 'Shiva Teja' },
  });
});

// Validation helper
function validateBookBody({ title, author, price, pages }) {
  if (!title || typeof title !== 'string' || !title.trim()) return { valid: false, message: 'title must be a non-empty string' };
  if (!author || typeof author !== 'string' || !author.trim()) return { valid: false, message: 'author must be a non-empty string' };
  if (price == null || isNaN(Number(price)) || Number(price) < 0) return { valid: false, message: 'price must be a non-negative number' };
  if (pages == null || isNaN(Number(pages)) || Number(pages) <= 0 || !Number.isInteger(Number(pages))) return { valid: false, message: 'pages must be a positive integer' };
  return { valid: true, data: { title: title.trim(), author: author.trim(), price: Number(price), pages: Number(pages) } };
}

// GET /books with query params: search_q, order_by, order, limit, offset, min_price, max_price
app.get('/books', async (req, res) => {
  try {
    const { search_q = '', order_by = 'id', order = 'ASC', limit = 10, offset = 0, min_price, max_price } = req.query;
    const allowedCols = ['id', 'title', 'author', 'price', 'pages'];
    const col = allowedCols.includes(order_by.toLowerCase()) ? order_by.toLowerCase() : 'id';
    const dir = order.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
    const lim = parseInt(limit, 10) > 0 ? parseInt(limit, 10) : 10;
    const off = parseInt(offset, 10) >= 0 ? parseInt(offset, 10) : 0;

    const where = [], params = [];
    if (search_q.trim()) { where.push('title LIKE ?'); params.push(`%${search_q.trim()}%`); }
    const minP = min_price != null ? parseFloat(min_price) : null;
    const maxP = max_price != null ? parseFloat(max_price) : null;
    if (minP != null && !isNaN(minP) && maxP != null && !isNaN(maxP)) { where.push('price BETWEEN ? AND ?'); params.push(minP, maxP); }
    else if (minP != null && !isNaN(minP)) { where.push('price >= ?'); params.push(minP); }
    else if (maxP != null && !isNaN(maxP)) { where.push('price <= ?'); params.push(maxP); }

    const whereSQL = where.length ? `WHERE ${where.join(' AND ')}` : '';
    params.push(lim, off);
    const books = await db.all(`SELECT * FROM book ${whereSQL} ORDER BY ${col} ${dir} LIMIT ? OFFSET ?`, params);
    res.json(books);
  } catch (e) { res.status(500).json({ message: 'Failed to retrieve books', error: e.message }); }
});

app.get('/books/:bookId', async (req, res) => {
  try {
    const book = await db.get('SELECT * FROM book WHERE id = ?', [req.params.bookId]);
    if (!book) return res.status(404).json({ message: `Book with ID ${req.params.bookId} not found` });
    res.json(book);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/books', async (req, res) => {
  try {
    const v = validateBookBody(req.body);
    if (!v.valid) return res.status(400).json({ message: v.message });
    const { title, author, price, pages } = v.data;
    const result = await db.run('INSERT INTO book (title, author, price, pages) VALUES (?, ?, ?, ?)', [title, author, price, pages]);
    res.status(201).json({ message: 'Book created successfully', bookId: result.lastID, book: { id: result.lastID, title, author, price, pages } });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/books/:bookId', async (req, res) => {
  try {
    const { bookId } = req.params;
    if (!await db.get('SELECT id FROM book WHERE id = ?', [bookId]))
      return res.status(404).json({ message: `Book with ID ${bookId} not found` });
    const v = validateBookBody(req.body);
    if (!v.valid) return res.status(400).json({ message: v.message });
    const { title, author, price, pages } = v.data;
    await db.run('UPDATE book SET title = ?, author = ?, price = ?, pages = ? WHERE id = ?', [title, author, price, pages, bookId]);
    res.json({ message: 'Book updated successfully', book: { id: Number(bookId), title, author, price, pages } });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/books/:bookId', async (req, res) => {
  try {
    const { bookId } = req.params;
    if (!await db.get('SELECT id FROM book WHERE id = ?', [bookId]))
      return res.status(404).json({ message: `Book with ID ${bookId} not found` });
    await db.run('DELETE FROM book WHERE id = ?', [bookId]);
    res.json({ message: 'Book deleted successfully', deletedBookId: Number(bookId) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.use((req, res) => {
  res.status(404).json({ message: `The requested path '${req.originalUrl}' does not exist on this server.` });
});

const initializeDBAndServer = async () => {
  try {
    await getDB();
    if (!process.env.VERCEL) app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
  } catch (e) { console.error(`DB Error: ${e.message}`); process.exit(1); }
};

initializeDBAndServer();
module.exports = app;
