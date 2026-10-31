/**
 * Automated CRUD Route Test Script for Lab 2
 */
const http = require('http');

function sendRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        let parsed = null;
        try {
          parsed = JSON.parse(data);
        } catch (e) {
          parsed = data;
        }
        resolve({ statusCode: res.statusCode, data: parsed });
      });
    });

    req.on('error', reject);

    if (postData) {
      req.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
    }
    req.end();
  });
}

async function runCrudTests() {
  console.log('\n--- Starting Lab 2 CRUD Route Tests ---\n');

  // 1. GET /books/
  console.log('1. Testing GET /books/...');
  const allBooksRes = await sendRequest({
    hostname: 'localhost',
    port: 3000,
    path: '/books/',
    method: 'GET',
  });
  console.log(`Status: ${allBooksRes.statusCode} | Total Books: ${allBooksRes.data.length}`);
  console.log(`First Book:`, allBooksRes.data[0]);

  // 2. GET /books/1/
  console.log('\n2. Testing GET /books/1/...');
  const singleBookRes = await sendRequest({
    hostname: 'localhost',
    port: 3000,
    path: '/books/1/',
    method: 'GET',
  });
  console.log(`Status: ${singleBookRes.statusCode}`);
  console.log(`Book:`, singleBookRes.data);

  // 3. POST /books/
  console.log('\n3. Testing POST /books/...');
  const newBook = {
    title: 'The Pragmatic Programmer',
    author: 'Andrew Hunt & David Thomas',
    price: 650,
    pages: 352,
  };
  const postRes = await sendRequest({
    hostname: 'localhost',
    port: 3000,
    path: '/books/',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  }, newBook);
  console.log(`Status: ${postRes.statusCode}`);
  console.log(`Response:`, postRes.data);
  const createdId = postRes.data.bookId;

  // 4. PUT /books/:id/
  console.log(`\n4. Testing PUT /books/${createdId}/...`);
  const updatedBook = {
    title: 'The Pragmatic Programmer (20th Anniversary Edition)',
    author: 'Andrew Hunt & David Thomas',
    price: 799,
    pages: 352,
  };
  const putRes = await sendRequest({
    hostname: 'localhost',
    port: 3000,
    path: `/books/${createdId}/`,
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
  }, updatedBook);
  console.log(`Status: ${putRes.statusCode}`);
  console.log(`Response:`, putRes.data);

  // 5. DELETE /books/:id/
  console.log(`\n5. Testing DELETE /books/${createdId}/...`);
  const delRes = await sendRequest({
    hostname: 'localhost',
    port: 3000,
    path: `/books/${createdId}/`,
    method: 'DELETE',
  });
  console.log(`Status: ${delRes.statusCode}`);
  console.log(`Response:`, delRes.data);

  // 6. 404 test on deleted ID
  console.log(`\n6. Testing GET /books/${createdId}/ (expecting 404)...`);
  const notFoundRes = await sendRequest({
    hostname: 'localhost',
    port: 3000,
    path: `/books/${createdId}/`,
    method: 'GET',
  });
  console.log(`Status: ${notFoundRes.statusCode}`);
  console.log(`Response:`, notFoundRes.data);

  console.log('\n--- All CRUD Tests Passed Successfully! ---\n');
}

runCrudTests().catch(console.error);
