const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const jwt = require('jsonwebtoken');

/* ===============================
   AUTH MIDDLEWARE
=================================*/

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'No token provided'
    });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'changeme', (err, user) => {
    if (err) {
      return res.status(403).json({
        success: false,
        message: 'Invalid token'
      });
    }

    req.user = user;
    next();
  });
}

function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'ADMIN') {
    return res.status(403).json({
      success: false,
      message: 'Admin access required'
    });
  }
  next();
}

/* ===============================
   ROUTES
=================================*/

// GET /api/books/reports/low-stock (Admin only)
router.get('/reports/low-stock', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const [books] = await pool.execute(
      `SELECT book_id, title, isbn, quantity, low_stock_threshold
       FROM books
       WHERE quantity <= low_stock_threshold
       ORDER BY quantity ASC`
    );

    res.json({
      success: true,
      count: books.length,
      books
    });
  } catch (err) {
    console.error('Low stock error:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch low stock books'
    });
  }
});

// POST /api/books (Admin only)
router.post('/', authenticateToken, requireAdmin, async (req, res) => {
  const { title, isbn, author, price, quantity, low_stock_threshold } = req.body;

  if (!title || !price || quantity === undefined) {
    return res.status(400).json({
      success: false,
      message: 'Title, price, and quantity are required'
    });
  }

  try {
    const [result] = await pool.execute(
      `INSERT INTO books (title, isbn, author, price, quantity, low_stock_threshold)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [title, isbn || null, author || null, price, quantity, low_stock_threshold || 5]
    );

    res.status(201).json({
      success: true,
      message: 'Book added successfully',
      book_id: result.insertId
    });

  } catch (err) {
    console.error('Add book error:', err);

    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        success: false,
        message: 'Book with this ISBN already exists'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to add book'
    });
  }
});

// PUT /api/books/:id (Admin only)
router.put('/:id', authenticateToken, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { title, isbn, author, price, quantity, low_stock_threshold } = req.body;

  try {
    const updates = [];
    const params = [];

    if (title !== undefined) { updates.push('title = ?'); params.push(title); }
    if (isbn !== undefined) { updates.push('isbn = ?'); params.push(isbn); }
    if (author !== undefined) { updates.push('author = ?'); params.push(author); }
    if (price !== undefined) { updates.push('price = ?'); params.push(price); }
    if (quantity !== undefined) { updates.push('quantity = ?'); params.push(quantity); }
    if (low_stock_threshold !== undefined) { updates.push('low_stock_threshold = ?'); params.push(low_stock_threshold); }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No fields to update'
      });
    }

    params.push(id);

    const [result] = await pool.execute(
      `UPDATE books SET ${updates.join(', ')} WHERE book_id = ?`,
      params
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Book not found'
      });
    }

    res.json({
      success: true,
      message: 'Book updated successfully'
    });

  } catch (err) {
    console.error('Update book error:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to update book'
    });
  }
});

// DELETE /api/books/:id (Admin only)
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  const { id } = req.params;

  try {
    const [result] = await pool.execute(
      'DELETE FROM books WHERE book_id = ?',
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Book not found'
      });
    }

    res.json({
      success: true,
      message: 'Book deleted successfully'
    });

  } catch (err) {
    console.error('Delete book error:', err);

    if (err.code === 'ER_ROW_IS_REFERENCED_2') {
      return res.status(409).json({
        success: false,
        message: 'Cannot delete book with existing sales records'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to delete book'
    });
  }
});

// GET /api/books/:id (Dynamic route LAST)
router.get('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const [books] = await pool.execute(
      'SELECT * FROM books WHERE book_id = ?',
      [id]
    );

    if (!books.length) {
      return res.status(404).json({
        success: false,
        message: 'Book not found'
      });
    }

    res.json({
      success: true,
      book: books[0]
    });

  } catch (err) {
    console.error('Fetch book error:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch book'
    });
  }
});

module.exports = router;
