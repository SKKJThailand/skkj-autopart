// Simple static file server for Playwright tests.
// Uses Node.js only — no extra packages needed.
// Run: node server.js

const http = require('http');
const fs   = require('fs');
const path = require('path');

const PORT = 3000;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'application/javascript',
  '.css':  'text/css',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg':  'image/svg+xml',
  '.json': 'application/json',
  '.ico':  'image/x-icon',
  '.txt':  'text/plain',
  '.xml':  'text/xml',
};

http.createServer((req, res) => {
  const url      = req.url.split('?')[0]; // strip query strings
  const filePath = path.join(__dirname, url === '/' ? 'index.html' : url);

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  });
}).listen(PORT, '127.0.0.1', () => {
  console.log(`Test server running at http://localhost:${PORT}`);
});
