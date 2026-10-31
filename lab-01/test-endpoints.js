const http = require('http');

const request = (path) => new Promise((resolve, reject) => {
  http.get('http://localhost:3000' + path, (res) => {
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => resolve({ path, status: res.statusCode, data }));
  }).on('error', reject);
});

async function runTests() {
  const paths = ['/', '/about', '/time', '/not-found-example'];
  for (const p of paths) {
    const res = await request(p);
    console.log(`Endpoint: ${res.path} | HTTP Status: ${res.status}`);
    console.log(`Response: ${res.data}\n`);
  }
}

runTests().catch(console.error);
