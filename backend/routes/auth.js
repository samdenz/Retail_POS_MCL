// routes/auth.js
const express = require('express');
const bcrypt = require('bcrypt');
const router = express.Router();
const { pool } = require('../db'); // Updated import
const jwt = require('jsonwebtoken');

// Simple in-memory JWT blacklist (for demo; use Redis or DB in production)
const jwtBlacklist = new Set();

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ 
      success: false,
      message: 'Username and password required' 
    });
  }

  try {
    const [users] = await pool.execute(
      `SELECT u.user_id, u.username, u.password_hash, r.role_name
       FROM users u
       JOIN roles r ON u.role_id = r.role_id
       WHERE u.username = ? AND u.is_active = TRUE`,
      [username]
    );

    if (!users.length) {
      return res.status(401).json({ 
        success: false,
        message: 'Invalid credentials' 
      });
    }

    const user = users[0];
    const passwordMatch = await bcrypt.compare(password, user.password_hash);

    if (!passwordMatch) {
      return res.status(401).json({ 
        success: false,
        message: 'Invalid credentials' 
      });
    }

    // Issue JWT token
    const token = jwt.sign(
      {
        user_id: user.user_id,
        username: user.username,
        role: user.role_name
      },
      process.env.JWT_SECRET || 'changeme',
      { expiresIn: '8h' }
    );

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        user_id: user.user_id,
        username: user.username,
        role: user.role_name
      }
    });

  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ 
      success: false,
      message: 'Login failed',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (token) jwtBlacklist.add(token);
  res.json({ 
    success: true,
    message: 'Logout successful' 
  });
});

// Middleware to verify JWT
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ success: false, message: 'No token provided' });
  if (jwtBlacklist.has(token)) {
    return res.status(403).json({ success: false, message: 'Token has been logged out' });
  }
  jwt.verify(token, process.env.JWT_SECRET || 'changeme', (err, user) => {
    if (err) return res.status(403).json({ success: false, message: 'Invalid token' });
    req.user = user;
    next();
  });
}

// GET /api/auth/verify - Check if user is authenticated
router.get('/verify', authenticateToken, (req, res) => {
  res.json({ 
    success: true,
    authenticated: true,
    user: req.user
  });
});

module.exports = router;