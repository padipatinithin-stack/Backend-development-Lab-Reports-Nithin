/**
 * Comprehensive Automated Test Suite for Lab 3 REST API
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

async function runTests() {
  console.log('========================================================');
  console.log('       STARTING LAB 3 REST API & VALIDATION TESTS        ');
  console.log('========================================================\n');

  // Test 1: GET /books (Default query parameters)
  console.log('1. Testing GET /books (Default limit 10, offset 0)...');
  const res1 = await sendRequest({ hostname: 'localhost', port: 3000, path: '/books', method: 'GET' });
  console.log(`   Status: ${res1.statusCode} | Total returned: ${res1.data.length}`);
  console.assert(res1.statusCode === 200 && res1.data.length === 10, 'Test 1 Failed');

  // Test 2: GET /books?search_q=Code (Partial title match with LIKE)
  console.log('\n2. Testing GET /books?search_q=Code (Search title)...');
  const res2 = await sendRequest({ hostname: 'localhost', port: 3000, path: '/books?search_q=Code', method: 'GET' });
  console.log(`   Status: ${res2.statusCode} | Match: "${res2.data[0]?.title}"`);
  console.assert(res2.statusCode === 200 && res2.data.some(b => b.title.includes('Code')), 'Test 2 Failed');

  // Test 3: GET /books?order_by=price&order=DESC (Sorting)
  console.log('\n3. Testing GET /books?order_by=price&order=DESC (Sort by price DESC)...');
  const res3 = await sendRequest({ hostname: 'localhost', port: 3000, path: '/books?order_by=price&order=DESC', method: 'GET' });
  console.log(`   Status: ${res3.statusCode} | Highest price book: "${res3.data[0]?.title}" (₹${res3.data[0]?.price})`);
  console.assert(res3.statusCode === 200 && res3.data[0].price >= res3.data[1].price, 'Test 3 Failed');

  // Test 4: GET /books?min_price=300&max_price=500 (Price range filter)
  console.log('\n4. Testing GET /books?min_price=300&max_price=500 (Price BETWEEN filter)...');
  const res4 = await sendRequest({ hostname: 'localhost', port: 3000, path: '/books?min_price=300&max_price=500', method: 'GET' });
  console.log(`   Status: ${res4.statusCode} | Results in range [300, 500]: ${res4.data.length}`);
  const allInRange = res4.data.every(b => b.price >= 300 && b.price <= 500);
  console.assert(res4.statusCode === 200 && allInRange, 'Test 4 Failed');

  // Test 5: GET /books?limit=3&offset=3 (Pagination)
  console.log('\n5. Testing GET /books?limit=3&offset=3 (Pagination)...');
  const res5 = await sendRequest({ hostname: 'localhost', port: 3000, path: '/books?limit=3&offset=3', method: 'GET' });
  console.log(`   Status: ${res5.statusCode} | Page count: ${res5.data.length} | First book ID: ${res5.data[0]?.id}`);
  console.assert(res5.statusCode === 200 && res5.data.length === 3 && res5.data[0].id === 4, 'Test 5 Failed');

  // Test 6: GET /books/1 (Single book)
  console.log('\n6. Testing GET /books/1 (Get single book)...');
  const res6 = await sendRequest({ hostname: 'localhost', port: 3000, path: '/books/1', method: 'GET' });
  console.log(`   Status: ${res6.statusCode} | Book: "${res6.data.title}" by ${res6.data.author}`);
  console.assert(res6.statusCode === 200 && res6.data.id === 1, 'Test 6 Failed');

  // Test 7: GET /books/999 (Non-existent book 404)
  console.log('\n7. Testing GET /books/999 (Expect 404 Not Found)...');
  const res7 = await sendRequest({ hostname: 'localhost', port: 3000, path: '/books/999', method: 'GET' });
  console.log(`   Status: ${res7.statusCode} | Error Message: "${res7.data.message}"`);
  console.assert(res7.statusCode === 404, 'Test 7 Failed');

  // Test 8: POST /books (Valid creation -> 201)
  console.log('\n8. Testing POST /books (Valid book creation)...');
  const newBook = { title: 'Refactoring', author: 'Martin Fowler', price: 750, pages: 448 };
  const res8 = await sendRequest({
    hostname: 'localhost',
    port: 3000,
    path: '/books',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  }, newBook);
  console.log(`   Status: ${res8.statusCode} | Created ID: ${res8.data.bookId} | Message: "${res8.data.message}"`);
  console.assert(res8.statusCode === 201 && res8.data.bookId, 'Test 8 Failed');
  const createdId = res8.data.bookId;

  // Test 9: POST /books (Validation: Missing required fields -> 400)
  console.log('\n9. Testing POST /books (Validation: Missing author)...');
  const invalidBook1 = { title: 'No Author Book', price: 500, pages: 200 };
  const res9 = await sendRequest({
    hostname: 'localhost',
    port: 3000,
    path: '/books',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  }, invalidBook1);
  console.log(`   Status: ${res9.statusCode} | Validation message: "${res9.data.message}"`);
  console.assert(res9.statusCode === 400, 'Test 9 Failed');

  // Test 10: POST /books (Validation: Non-numeric price -> 400)
  console.log('\n10. Testing POST /books (Validation: Invalid string price)...');
  const invalidBook2 = { title: 'Bad Price', author: 'Test', price: 'free', pages: 100 };
  const res10 = await sendRequest({
    hostname: 'localhost',
    port: 3000,
    path: '/books',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  }, invalidBook2);
  console.log(`   Status: ${res10.statusCode} | Validation message: "${res10.data.message}"`);
  console.assert(res10.statusCode === 400, 'Test 10 Failed');

  // Test 11: PUT /books/:id (Valid update -> 200)
  console.log(`\n11. Testing PUT /books/${createdId} (Valid update)...`);
  const updatedData = { title: 'Refactoring: 2nd Edition', author: 'Martin Fowler', price: 820, pages: 448 };
  const res11 = await sendRequest({
    hostname: 'localhost',
    port: 3000,
    path: `/books/${createdId}`,
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
  }, updatedData);
  console.log(`   Status: ${res11.statusCode} | Message: "${res11.data.message}" | New Price: ₹${res11.data.book.price}`);
  console.assert(res11.statusCode === 200 && res11.data.book.price === 820, 'Test 11 Failed');

  // Test 12: PUT /books/999 (Update non-existent -> 404)
  console.log('\n12. Testing PUT /books/999 (Expect 404)...');
  const res12 = await sendRequest({
    hostname: 'localhost',
    port: 3000,
    path: '/books/999',
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
  }, updatedData);
  console.log(`   Status: ${res12.statusCode} | Message: "${res12.data.message}"`);
  console.assert(res12.statusCode === 404, 'Test 12 Failed');

  // Test 13: DELETE /books/:id (Valid deletion -> 200)
  console.log(`\n13. Testing DELETE /books/${createdId} (Valid delete)...`);
  const res13 = await sendRequest({
    hostname: 'localhost',
    port: 3000,
    path: `/books/${createdId}`,
    method: 'DELETE',
  });
  console.log(`   Status: ${res13.statusCode} | Message: "${res13.data.message}"`);
  console.assert(res13.statusCode === 200, 'Test 13 Failed');

  // Test 14: DELETE /books/999 (Delete non-existent -> 404)
  console.log('\n14. Testing DELETE /books/999 (Expect 404)...');
  const res14 = await sendRequest({
    hostname: 'localhost',
    port: 3000,
    path: '/books/999',
    method: 'DELETE',
  });
  console.log(`   Status: ${res14.statusCode} | Message: "${res14.data.message}"`);
  console.assert(res14.statusCode === 404, 'Test 14 Failed');

  console.log('\n========================================================');
  console.log('     ALL 14 REST API & VALIDATION TESTS PASSED!         ');
  console.log('========================================================\n');
}

runTests().catch(console.error);
