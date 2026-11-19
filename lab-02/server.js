/**
 * Lab 2: SQLite CRUD API
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
  catch (err) { res.status(500).json({ error: 'Database connection failed' }); }
});

app.get('/', (req, res) => {
  res.json({
    message: 'Lab 2 – SQLite Books CRUD API',
    endpoints: ['GET /books/', 'GET /books/:bookId/', 'POST /books/', 'PUT /books/:bookId/', 'DELETE /books/:bookId/'],
    student: { name: 'P. Nithin Chowdary', reg: '252U1R1173', section: 'CSE-2D', faculty: 'Shiva Teja' },
  });
});

app.get('/books/', async (req, res) => {
  try {
    const books = await db.all('SELECT * FROM book ORDER BY id ASC');
    res.json(books);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/books/:bookId/', async (req, res) => {
  try {
    const book = await db.get('SELECT * FROM book WHERE id = ?', [req.params.bookId]);
    if (!book) return res.status(404).json({ message: `Book with ID ${req.params.bookId} does not exist.` });
    res.json(book);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/books/', async (req, res) => {
  try {
    const { title, author, price, pages } = req.body;
    if (!title || !author || price === undefined || pages === undefined)
      return res.status(400).json({ message: 'All fields (title, author, price, pages) are required.' });
    const result = await db.run('INSERT INTO book (title, author, price, pages) VALUES (?, ?, ?, ?)', [title, author, price, pages]);
    res.status(201).json({ message: 'Book Added Successfully', bookId: result.lastID, book: { id: result.lastID, title, author, price, pages } });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/books/:bookId/', async (req, res) => {
  try {
    const { bookId } = req.params;
    const existing = await db.get('SELECT * FROM book WHERE id = ?', [bookId]);
    if (!existing) return res.status(404).json({ message: `Book with ID ${bookId} does not exist.` });
    const { title, author, price, pages } = req.body;
    if (!title || !author || price === undefined || pages === undefined)
      return res.status(400).json({ message: 'All fields (title, author, price, pages) are required.' });
    await db.run('UPDATE book SET title = ?, author = ?, price = ?, pages = ? WHERE id = ?', [title, author, price, pages, bookId]);
    res.json({ message: 'Book Updated Successfully', book: { id: Number(bookId), title, author, price, pages } });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/books/:bookId/', async (req, res) => {
  try {
    const { bookId } = req.params;
    const existing = await db.get('SELECT * FROM book WHERE id = ?', [bookId]);
    if (!existing) return res.status(404).json({ message: `Book with ID ${bookId} does not exist.` });
    await db.run('DELETE FROM book WHERE id = ?', [bookId]);
    res.json({ message: 'Book Deleted Successfully', deletedBookId: Number(bookId) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.use((req, res) => {
  res.status(404).json({ message: `The requested path '${req.originalUrl}' does not exist on this server.` });
});

const initializeDBAndServer = async () => {
  try {
    await getDB();
    if (!process.env.VERCEL) {
      app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
    }
  } catch (e) { console.error(`DB Error: ${e.message}`); process.exit(1); }
};

initializeDBAndServer();
module.exports = app;
