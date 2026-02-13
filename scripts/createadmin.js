// scripts/create-admin.js
require('dotenv').config();
const bcrypt = require('bcrypt');
const { pool, closePool } = require('../backend/db');

async function createAdminUser() {
  const username = process.argv[2] || 'admin';
  const password = process.argv[3] || 'admin123';

  console.log('Creating admin user...');
  console.log(`Username: ${username}`);

  try {
    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Get ADMIN role_id
    const [[role]] = await pool.execute(
      'SELECT role_id FROM roles WHERE role_name = "ADMIN"'
    );

    if (!role) {
      console.error('✗ ADMIN role not found in database');
      process.exit(1);
    }

    // Check if user already exists
    const [existingUsers] = await pool.execute(
      'SELECT username FROM users WHERE username = ?',
      [username]
    );

    if (existingUsers.length > 0) {
      console.log('⚠ User already exists, updating password...');
      await pool.execute(
        'UPDATE users SET password_hash = ?, is_active = TRUE WHERE username = ?',
        [passwordHash, username]
      );
      console.log('✓ Password updated successfully');
    } else {
      // Create new admin user
      await pool.execute(
        'INSERT INTO users (username, password_hash, role_id, is_active) VALUES (?, ?, ?, TRUE)',
        [username, passwordHash, role.role_id]
      );
      console.log('✓ Admin user created successfully');
    }

    console.log('\nCredentials:');
    console.log(`  Username: ${username}`);
    console.log(`  Password: ${password}`);
    console.log('\n⚠ IMPORTANT: Change this password after first login!');

  } catch (error) {
    console.error('✗ Error creating admin user:', error.message);
  } finally {
    await closePool();
  }
}

createAdminUser();