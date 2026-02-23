// routes/returns.js
const express = require('express');
const router = express.Router();
const { pool } = require('../db');

// Middleware: authenticateToken, requireAdminOrCashier
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ success: false, message: 'No token provided' });
  require('jsonwebtoken').verify(token, process.env.JWT_SECRET || 'changeme', (err, user) => {
    if (err) return res.status(403).json({ success: false, message: 'Invalid token' });
    req.user = user;
    next();
  });
}
function requireAdminOrCashier(req, res, next) {
  if (!req.user || !['ADMIN', 'CASHIER'].includes(req.user.role)) {
    return res.status(403).json({ success: false, message: 'Admin or cashier access required' });
  }
  next();
}

// POST /api/returns - Create a return
router.post('/', authenticateToken, requireAdminOrCashier, async (req, res) => {
  const { sale_id, items, reason } = req.body;
  const user_id = req.user.user_id;
  if (!sale_id || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ success: false, message: 'sale_id and items are required' });
  }
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    // Validate sale exists
    const [sales] = await conn.execute('SELECT * FROM sales WHERE sale_id = ?', [sale_id]);
    if (!sales.length) throw new Error('Sale not found');
    let total_refunded = 0;
    // Validate and process each item
    for (const item of items) {
      const { book_id, quantity } = item;
      if (!book_id || !quantity || quantity <= 0) throw new Error('Invalid item');
      // Get sale item
      const [saleItems] = await conn.execute('SELECT * FROM sale_items WHERE sale_id = ? AND book_id = ?', [sale_id, book_id]);
      if (!saleItems.length) throw new Error('Book not found in sale');
      const saleItem = saleItems[0];
      // Check not returning more than sold
      // Get total returned so far for this sale/book
      const [returnedRows] = await conn.execute('SELECT SUM(quantity) as returned_qty FROM return_items ri JOIN returns r ON ri.return_id = r.return_id WHERE r.sale_id = ? AND ri.book_id = ?', [sale_id, book_id]);
      const alreadyReturned = returnedRows[0].returned_qty || 0;
      if (quantity + alreadyReturned > saleItem.quantity) throw new Error('Cannot return more than sold');
      // Calculate refund
      const refund_amount = saleItem.unit_price * quantity;
      total_refunded += refund_amount;
      // Restock book
      await conn.execute('UPDATE books SET quantity = quantity + ? WHERE book_id = ?', [quantity, book_id]);
    }
    // Create return record
    const [retResult] = await conn.execute('INSERT INTO returns (sale_id, user_id, total_refunded, reason, status) VALUES (?, ?, ?, ?, ?)', [sale_id, user_id, total_refunded, reason || null, 'COMPLETED']);
    const return_id = retResult.insertId;
    // Insert return items
    for (const item of items) {
      const { book_id, quantity } = item;
      const [saleItems] = await conn.execute('SELECT * FROM sale_items WHERE sale_id = ? AND book_id = ?', [sale_id, book_id]);
      const saleItem = saleItems[0];
      const refund_amount = saleItem.unit_price * quantity;
      await conn.execute('INSERT INTO return_items (return_id, book_id, quantity, refund_amount) VALUES (?, ?, ?, ?)', [return_id, book_id, quantity, refund_amount]);
    }
    await conn.commit();
    res.status(201).json({ success: true, message: 'Return processed', return_id, total_refunded });
  } catch (err) {
    await conn.rollback();
    res.status(400).json({ success: false, message: err.message });
  } finally {
    conn.release();
  }
});

// GET /api/returns - List returns (admin: all, cashier: own)
router.get('/', authenticateToken, requireAdminOrCashier, async (req, res) => {
  try {
    let query = 'SELECT * FROM returns';
    let params = [];
    if (req.user.role === 'CASHIER') {
      query += ' WHERE user_id = ?';
      params.push(req.user.user_id);
    }
    query += ' ORDER BY return_date DESC';
    const [rows] = await pool.execute(query, params);
    res.json({ success: true, returns: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/returns/:id - Get return details
router.get('/:id', authenticateToken, requireAdminOrCashier, async (req, res) => {
  const { id } = req.params;
  try {
    const [[ret]] = await pool.execute('SELECT * FROM returns WHERE return_id = ?', [id]);
    if (!ret) return res.status(404).json({ success: false, message: 'Return not found' });
    const [items] = await pool.execute('SELECT * FROM return_items WHERE return_id = ?', [id]);
    res.json({ success: true, return: ret, items });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
