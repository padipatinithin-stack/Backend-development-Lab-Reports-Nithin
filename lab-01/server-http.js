/**
 * Lab 1: Task 3 - Plain Node.js HTTP Server using built-in http module
 * Course: Backend Development Fundamentals · Year II Term II · Aurora
 * Faculty: shiva teja
 * Student: P. Nithin Chowdary
 */

const http = require('http');

const PORT = process.env.PORT || 3000;

// Create server instance
const server = http.createServer((req, res) => {
  console.log(`[HTTP Server] Incoming Request: ${req.method} ${req.url}`);

  // Set HTTP Response Headers
  res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });

  // Send response body
  res.end('Hello from the built-in Node.js HTTP server!\n');
});

// Start listening for incoming connections
server.listen(PORT, () => {
  console.log(`[HTTP Server] Server is running on http://localhost:${PORT}`);
});
