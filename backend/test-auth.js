// test-auth.js
const fetch = require('node-fetch');

async function testLoginLogout() {
  // Login
  const loginRes = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'admin123' })
  });
  const loginData = await loginRes.json();
  console.log('Login:', loginData);
  if (!loginData.token) return;

  // Verify
  const verifyRes = await fetch('http://localhost:3000/api/auth/verify', {
    headers: { 'Authorization': 'Bearer ' + loginData.token }
  });
  const verifyData = await verifyRes.json();
  console.log('Verify:', verifyData);

  // Logout
  const logoutRes = await fetch('http://localhost:3000/api/auth/logout', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + loginData.token }
  });
  const logoutData = await logoutRes.json();
  console.log('Logout:', logoutData);

  // Verify after logout
  const verifyRes2 = await fetch('http://localhost:3000/api/auth/verify', {
    headers: { 'Authorization': 'Bearer ' + loginData.token }
  });
  const verifyData2 = await verifyRes2.json();
  console.log('Verify after logout:', verifyData2);
}

testLoginLogout();