// routes/users.js
const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// Middleware: require admin
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ success: false, message: 'No token provided' });
  jwt.verify(token, process.env.JWT_SECRET || 'changeme', (err, user) => {
    if (err) return res.status(403).json({ success: false, message: 'Invalid token' });
    req.user = user;
    next();
  });
}
function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'ADMIN') {
    return res.status(403).json({ success: false, message: 'Admin access required' });
  }
  next();
}

// GET /api/users - List users (admin only)
router.get('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const [users] = await pool.execute(
      `SELECT u.user_id, u.username, r.role_name as role, u.is_active
       FROM users u
       JOIN roles r ON u.role_id = r.role_id`
    );
    res.json({ success: true, users });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch users' });
  }
});
// PUT /api/users/:id/activate - Activate/deactivate user (admin only)
router.put('/:id/activate', authenticateToken, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { is_active } = req.body;
  try {
    // Only allow for cashiers
    const [[user]] = await pool.execute(
      'SELECT u.user_id, r.role_name FROM users u JOIN roles r ON u.role_id = r.role_id WHERE u.user_id = ?',
      [id]
    );
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    if (user.role_name !== 'CASHIER') return res.status(403).json({ success: false, message: 'Only cashiers can be activated/deactivated' });
    await pool.execute('UPDATE users SET is_active = ? WHERE user_id = ?', [!!is_active, id]);
    res.json({ success: true, message: 'User status updated' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update user' });
  }
});

// POST /api/users - Add user (admin only)
router.post('/', authenticateToken, requireAdmin, async (req, res) => {
  const { username, password, role } = req.body;
  if (!username || !password || !role) {
    return res.status(400).json({ success: false, message: 'Username, password, and role required' });
  }
  try {
    // Get role_id
    const [[roleRow]] = await pool.execute('SELECT role_id FROM roles WHERE role_name = ?', [role]);
    if (!roleRow) return res.status(400).json({ success: false, message: 'Invalid role' });
    // Check if user exists
    const [existing] = await pool.execute('SELECT user_id FROM users WHERE username = ?', [username]);
    if (existing.length) return res.status(409).json({ success: false, message: 'Username already exists' });
    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);
    await pool.execute(
      'INSERT INTO users (username, password_hash, role_id, is_active) VALUES (?, ?, ?, TRUE)',
      [username, passwordHash, roleRow.role_id]
    );
    res.json({ success: true, message: 'User added' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to add user' });
  }
});

module.exports = router;