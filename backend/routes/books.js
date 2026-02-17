// POST /api/books/bulk - Bulk upload books (Admin only)
router.post('/bulk', authenticateToken, requireAdmin, async (req, res) => {
  const { books } = req.body;
  if (!Array.isArray(books) || !books.length) {
    return res.status(400).json({ success: false, message: 'Books array required' });
  }
  let added = 0, skipped = 0, errors = [];
  for (let i = 0; i < books.length; i++) {
    const { title, author, isbn, price, quantity } = books[i];
    if (!title || price === undefined || quantity === undefined) {
      errors.push(`Row ${i+1}: Missing required fields`);
      skipped++;
      continue;
    }
    try {
      await pool.execute(
        `INSERT INTO books (title, author, isbn, price, quantity, low_stock_threshold)
         VALUES (?, ?, ?, ?, ?, 5)`,
        [title, author || null, isbn || null, price, quantity]
      );
      added++;
    } catch (err) {
      if (err.code === 'ER_DUP_ENTRY') {
        skipped++;
      } else {
        errors.push(`Row ${i+1}: ${err.message}`);
        skipped++;
      }
    }
  }
  res.json({ success: true, added, skipped, errors });
});
// routes/books.js
const express = require('express');
const router = express.Router();
const { pool } = require('../db'); // Updated import

// GET /api/books?search=keyword
router.get('/', async (req, res) => {
  const { search } = req.query;

  try {
    let query = `
      SELECT book_id, title, isbn, author, price, quantity, low_stock_threshold
      FROM books
    `;
    let params = [];

    if (search) {
      query += ` WHERE title LIKE ? OR isbn LIKE ? OR author LIKE ?`;
      const keyword = `%${search}%`;
      params.push(keyword, keyword, keyword);
    }

    query += ` ORDER BY title ASC LIMIT 50`;

    const [books] = await pool.execute(query, params);

    res.json({
      success: true,
      count: books.length,
      books
    });

  } catch (err) {
    console.error('Fetch books error:', err);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch books', 
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// GET /api/books/:id - Get single book
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
      message: 'Failed to fetch book',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});


const jwt = require('jsonwebtoken');
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

// POST /api/books - Add new book (Admin only)
router.post('/', authenticateToken, requireAdmin, async (req, res) => {
  const { title, isbn, author, price, quantity, low_stock_threshold } = req.body;

  // TODO: Add authentication middleware to check if user is admin
  // For now, anyone can add books

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
    
    // Check for duplicate ISBN
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ 
        success: false,
        message: 'Book with this ISBN already exists' 
      });
    }

    res.status(500).json({ 
      success: false,
      message: 'Failed to add book',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// PUT /api/books/:id - Update book (Admin only)
router.put('/:id', authenticateToken, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { title, isbn, author, price, quantity, low_stock_threshold } = req.body;

  // TODO: Add authentication middleware to check if user is admin

  try {
    // Build dynamic update query
    const updates = [];
    const params = [];

    if (title !== undefined) {
      updates.push('title = ?');
      params.push(title);
    }
    if (isbn !== undefined) {
      updates.push('isbn = ?');
      params.push(isbn);
    }
    if (author !== undefined) {
      updates.push('author = ?');
      params.push(author);
    }
    if (price !== undefined) {
      updates.push('price = ?');
      params.push(price);
    }
    if (quantity !== undefined) {
      updates.push('quantity = ?');
      params.push(quantity);
    }
    if (low_stock_threshold !== undefined) {
      updates.push('low_stock_threshold = ?');
      params.push(low_stock_threshold);
    }

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
      message: 'Failed to update book',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// DELETE /api/books/:id - Delete book (Admin only)
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  const { id } = req.params;

  // TODO: Add authentication middleware to check if user is admin

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
    
    // Check if book is referenced in sales
    if (err.code === 'ER_ROW_IS_REFERENCED_2') {
      return res.status(409).json({ 
        success: false,
        message: 'Cannot delete book with existing sales records' 
      });
    }

    res.status(500).json({ 
      success: false,
      message: 'Failed to delete book',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// GET /api/books/low-stock - Get books below threshold (Admin only)
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
      message: 'Failed to fetch low stock books',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

module.exports = router;