-- SQLite Schema and Seed Script for Lab 3
-- Table: book
DROP TABLE IF EXISTS book;

CREATE TABLE book (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  author TEXT NOT NULL,
  price INTEGER NOT NULL,
  pages INTEGER NOT NULL
);

-- Insert sample books with varied prices and titles for search & filter tests
INSERT INTO book (title, author, price, pages) VALUES
('The Great Gatsby', 'F. Scott Fitzgerald', 350, 180),
('To Kill a Mockingbird', 'Harper Lee', 420, 281),
('1984', 'George Orwell', 299, 328),
('Pride and Prejudice', 'Jane Austen', 250, 279),
('The Catcher in the Rye', 'J.D. Salinger', 380, 214),
('The Hobbit', 'J.R.R. Tolkien', 499, 310),
('Brave New World', 'Aldous Huxley', 340, 268),
('Crime and Punishment', 'Fyodor Dostoevsky', 550, 671),
('The Alchemist', 'Paulo Coelho', 299, 208),
('Clean Code', 'Robert C. Martin', 850, 464),
('Design Patterns', 'Erich Gamma', 920, 395),
('JavaScript: The Good Parts', 'Douglas Crockford', 450, 176);
