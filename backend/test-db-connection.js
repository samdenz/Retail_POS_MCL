// test-db-connection.js
require('dotenv').config();
const { pool, testConnection, closePool } = require('./db');

async function runTests() {
  console.log('Testing database connection...\n');

  // Test 1: Basic connection
  const isConnected = await testConnection();
  
  if (!isConnected) {
    console.log('\n❌ Database connection failed. Check your .env file.');
    process.exit(1);
  }

  // Test 2: Query test
  try {
    const [rows] = await pool.query('SELECT 1 + 1 AS result');
    console.log('✓ Query test passed:', rows[0].result === 2 ? 'Success' : 'Failed');
  } catch (error) {
    console.error('✗ Query test failed:', error.message);
  }

  // Test 3: Check if tables exist
  try {
    const [tables] = await pool.query(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = ?
    `, [process.env.DB_NAME || 'retail_pos_mcl']);
    
    console.log('\n✓ Tables found:', tables.length);
    tables.forEach(table => {
      console.log(`  - ${table.TABLE_NAME}`);
    });
  } catch (error) {
    console.error('✗ Table check failed:', error.message);
  }

  // Test 4: Check roles
  try {
    const [roles] = await pool.query('SELECT * FROM roles');
    console.log('\n✓ Roles in database:', roles.length);
    roles.forEach(role => {
      console.log(`  - ${role.role_name} (ID: ${role.role_id})`);
    });
  } catch (error) {
    console.error('✗ Roles check failed:', error.message);
  }

  // Close connection
  await closePool();
  console.log('\n✓ All tests completed!');
}

runTests();