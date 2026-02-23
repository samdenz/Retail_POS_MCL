// test-concurrency.js
// Simulate concurrent sales and returns to test backend concurrency safety
const fetch = require('node-fetch');

const API_BASE = 'http://localhost:3000/api';
const TEST_USER_TOKEN = 'YOUR_ADMIN_OR_CASHIER_JWT_TOKEN'; // Replace with a valid token
const TEST_BOOK_ID = 1; // Replace with a real book_id
const TEST_SALE_ID = 1; // Replace with a real sale_id

async function simulateSale(quantity) {
  return fetch(`${API_BASE}/sales`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + TEST_USER_TOKEN
    },
    body: JSON.stringify({
      user_id: 1, // Replace with a real user_id
      payment_method: 'CASH',
      items: [{ book_id: TEST_BOOK_ID, quantity }]
    })
  }).then(res => res.json());
}

async function simulateReturn(quantity) {
  return fetch(`${API_BASE}/returns`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + TEST_USER_TOKEN
    },
    body: JSON.stringify({
      sale_id: TEST_SALE_ID,
      items: [{ book_id: TEST_BOOK_ID, quantity }],
      reason: 'Test return'
    })
  }).then(res => res.json());
}

async function runConcurrentSales() {
  console.log('Simulating concurrent sales...');
  const promises = [simulateSale(1), simulateSale(1)];
  const results = await Promise.all(promises);
  console.log('Sale results:', results);
}

async function runConcurrentReturns() {
  console.log('Simulating concurrent returns...');
  const promises = [simulateReturn(1), simulateReturn(1)];
  const results = await Promise.all(promises);
  console.log('Return results:', results);
}

(async () => {
  await runConcurrentSales();
  await runConcurrentReturns();
})();
