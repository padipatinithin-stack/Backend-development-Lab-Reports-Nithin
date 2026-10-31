/**
 * Database Initialization Script
 * Creates books.db and populates 10 initial rows
 */
const path = require('path');
const { open } = require('sqlite');
const sqlite3 = require('sqlite3');
const fs = require('fs');

const dbPath = path.join(__dirname, 'books.db');

async function initializeDatabase() {
  console.log(`Connecting to database at: ${dbPath}`);
  const db = await open({
    filename: dbPath,
    driver: sqlite3.Database,
  });

  const sql = fs.readFileSync(path.join(__dirname, 'init_db.sql'), 'utf-8');
  await db.exec(sql);

  const books = await db.all('SELECT * FROM book');
  console.log(`Database initialized successfully with ${books.length} records.`);
  console.table(books);

  await db.close();
}

initializeDatabase().catch((err) => {
  console.error('Database initialization failed:', err);
  process.exit(1);
});
