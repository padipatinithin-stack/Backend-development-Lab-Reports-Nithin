/**
 * Lab 1: Node.js and Express Server
 * Course: Backend Development Fundamentals · Year II Term II · Aurora
 * Faculty: Joel Prashanth D
 * Student: Padipati Nithin
 *
 * Tasks:
 *  - GET /      : Welcome text
 *  - GET /about : JSON with name and section
 *  - GET /time  : Current date and time using new Date()
 *  - Catch-all  : 404 message for any unknown path
 */

const express = require('express');
const app = express();

const PORT = process.env.PORT || 3000;

// Middleware: Request Logger (Logs method, URL, and response status code)
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} -> Status: ${res.statusCode} (${duration}ms)`);
  });
  next();
});

// Route 1: GET / (Welcome text)
app.get('/', (req, res) => {
  res.status(200).send('Welcome to the Lab 1 Express Server! Backend Development Fundamentals.');
});

// Route 2: GET /about (JSON with name, registration number, section, and module)
app.get('/about', (req, res) => {
  res.status(200).json({
    name: "Padipati Nithin",
    registrationNumber: "ENTER_YOUR_REG_NO",
    section: "Section A",
    module: "Node.js and Express.js fundamentals",
    course: "Backend Development Fundamentals - Year II Term II",
    faculty: "Joel Prashanth D"
  });
});

// Route 3: GET /time (Current date and time using new Date())
app.get('/time', (req, res) => {
  const now = new Date();
  res.status(200).json({
    iso: now.toISOString(),
    utcString: now.toUTCString(),
    localTime: now.toLocaleString(),
    timestamp: now.getTime()
  });
});

// Route 4: 404 Handler - Catch-all for any unknown route
app.use((req, res) => {
  res.status(404).json({
    status: 404,
    error: 'Not Found',
    message: `The requested path '${req.originalUrl}' does not exist on this server.`
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('[Internal Server Error]', err);
  res.status(500).json({
    status: 500,
    error: 'Internal Server Error',
    message: err.message
  });
});

// Start the Express server
app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(` Express server listening on http://localhost:${PORT}`);
  console.log(` Available endpoints:`);
  console.log(`  - GET  /`);
  console.log(`  - GET  /about`);
  console.log(`  - GET  /time`);
  console.log(`====================================================`);
});
