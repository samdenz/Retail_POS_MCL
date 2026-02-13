// routes/sales.js
const express = require('express');
const router = express.Router();
const { pool } = require('../db'); // Updated import

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

// POST /api/sales - Create new sale
router.post('/', authenticateToken, async (req, res) => {
  const { user_id, payment_method, items } = req.body;

  // Validate input
  if (!user_id || !payment_method || !items?.length) {
    return res.status(400).json({ 
      success: false,
      message: 'Invalid sale data. user_id, payment_method, and items are required' 
    });
  }

  // Validate payment method
  const validPaymentMethods = ['CASH', 'MPESA', 'CARD'];
  if (!validPaymentMethods.includes(payment_method.toUpperCase())) {
    return res.status(400).json({ 
      success: false,
      message: `Invalid payment method. Must be one of: ${validPaymentMethods.join(', ')}` 
    });
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    let totalAmount = 0;

    // Validate all items and check stock before processing
    for (const item of items) {
      if (!item.book_id || !item.quantity || item.quantity <= 0) {
        throw new Error('Each item must have a valid book_id and quantity');
      }

      const [rows] = await connection.execute(
        'SELECT price, quantity, title FROM books WHERE book_id = ? FOR UPDATE',
        [item.book_id]
      );

      if (!rows.length) {
        throw new Error(`Book with ID ${item.book_id} not found`);
      }

      if (rows[0].quantity < item.quantity) {
        throw new Error(`Insufficient stock for "${rows[0].title}". Available: ${rows[0].quantity}, Requested: ${item.quantity}`);
      }

      totalAmount += rows[0].price * item.quantity;
    }

    // Create sale record
    const [saleResult] = await connection.execute(
      'INSERT INTO sales (user_id, total_amount) VALUES (?, ?)',
      [user_id, totalAmount]
    );

    const saleId = saleResult.insertId;

    // Process each item
    for (const item of items) {
      const [[book]] = await connection.execute(
        'SELECT price FROM books WHERE book_id = ?',
        [item.book_id]
      );

      const subtotal = book.price * item.quantity;

      // Insert sale item
      await connection.execute(
        'INSERT INTO sale_items (sale_id, book_id, quantity, unit_price, subtotal) VALUES (?, ?, ?, ?, ?)',
        [saleId, item.book_id, item.quantity, book.price, subtotal]
      );

      // Update book quantity
      await connection.execute(
        'UPDATE books SET quantity = quantity - ? WHERE book_id = ?',
        [item.quantity, item.book_id]
      );

      // Record stock movement
      await connection.execute(
        'INSERT INTO stock_movements (book_id, change_quantity, movement_type, reference_id) VALUES (?, ?, "SALE", ?)',
        [item.book_id, -item.quantity, saleId]
      );
    }

    // Record payment
    await connection.execute(
      'INSERT INTO payments (sale_id, payment_method, amount_paid) VALUES (?, ?, ?)',
      [saleId, payment_method.toUpperCase(), totalAmount]
    );

    await connection.commit();

    res.status(201).json({
      success: true,
      message: 'Sale completed successfully',
      sale: {
        sale_id: saleId,
        total_amount: totalAmount,
        payment_method: payment_method.toUpperCase(),
        items_count: items.length
      }
    });

  } catch (err) {
    await connection.rollback();
    console.error('Sale error:', err);
    res.status(500).json({ 
      success: false,
      message: 'Sale failed',
      error: err.message 
    });
  } finally {
    connection.release();
  }
});

// GET /api/sales/:id - Get sale details
router.get('/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;

  try {
    // Get sale header
    const [sales] = await pool.execute(
      `SELECT s.sale_id, s.total_amount, s.sale_date, 
              u.username, u.user_id, r.role_name,
              p.payment_method, p.amount_paid
       FROM sales s
       JOIN users u ON s.user_id = u.user_id
       JOIN roles r ON u.role_id = r.role_id
       LEFT JOIN payments p ON s.sale_id = p.sale_id
       WHERE s.sale_id = ?`,
      [id]
    );

    if (!sales.length) {
      return res.status(404).json({ 
        success: false,
        message: 'Sale not found' 
      });
    }

    // Get sale items
    const [items] = await pool.execute(
      `SELECT si.quantity, si.unit_price, si.subtotal,
              b.book_id, b.title, b.isbn, b.author
       FROM sale_items si
       JOIN books b ON si.book_id = b.book_id
       WHERE si.sale_id = ?`,
      [id]
    );

    res.json({
      success: true,
      sale: {
        ...sales[0],
        items
      }
    });

  } catch (err) {
    console.error('Fetch sale error:', err);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch sale details',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// GET /api/sales/reports/daily - Get daily sales report
router.get('/reports/daily', authenticateToken, async (req, res) => {
  const { date } = req.query; // Optional: ?date=2024-01-30

  try {
    let dateCondition = 'DATE(sale_date) = CURDATE()';
    let params = [];

    if (date) {
      dateCondition = 'DATE(sale_date) = ?';
      params.push(date);
    }

    // Get summary
    const [summary] = await pool.execute(
      `SELECT 
         COUNT(*) as total_transactions,
         SUM(total_amount) as total_sales,
         AVG(total_amount) as average_sale
       FROM sales
       WHERE ${dateCondition}`,
      params
    );

    // Get sales by payment method
    const [byPaymentMethod] = await pool.execute(
      `SELECT 
         p.payment_method,
         COUNT(*) as count,
         SUM(p.amount_paid) as total
       FROM payments p
       JOIN sales s ON p.sale_id = s.sale_id
       WHERE ${dateCondition}
       GROUP BY p.payment_method`,
      params
    );

    // Get top selling books
    const [topBooks] = await pool.execute(
      `SELECT 
         b.book_id, b.title, b.author,
         SUM(si.quantity) as total_sold,
         SUM(si.subtotal) as revenue
       FROM sale_items si
       JOIN sales s ON si.sale_id = s.sale_id
       JOIN books b ON si.book_id = b.book_id
       WHERE ${dateCondition}
       GROUP BY b.book_id, b.title, b.author
       ORDER BY total_sold DESC
       LIMIT 10`,
      params
    );

    res.json({
      success: true,
      date: date || new Date().toISOString().split('T')[0],
      summary: summary[0],
      by_payment_method: byPaymentMethod,
      top_books: topBooks
    });

  } catch (err) {
    console.error('Daily report error:', err);
    res.status(500).json({ 
      success: false,
      message: 'Failed to generate daily report',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// GET /api/sales/history - Get sales history with pagination
router.get('/history', authenticateToken, async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const offset = (page - 1) * limit;

  try {
    // Get total count
    const [[{ total }]] = await pool.execute(
      'SELECT COUNT(*) as total FROM sales'
    );

    // Get sales
    const [sales] = await pool.execute(
      `SELECT 
         s.sale_id, s.total_amount, s.sale_date,
         u.username,
         p.payment_method
       FROM sales s
       JOIN users u ON s.user_id = u.user_id
       LEFT JOIN payments p ON s.sale_id = p.sale_id
       ORDER BY s.sale_date DESC
       LIMIT ? OFFSET ?`,
      [limit, offset]
    );

    res.json({
      success: true,
      pagination: {
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit)
      },
      sales
    });

  } catch (err) {
    console.error('Sales history error:', err);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch sales history',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// GET /api/sales/user/:user_id - Get sales by specific user (cashier's own sales)
router.get('/user/:user_id', authenticateToken, async (req, res) => {
  const { user_id } = req.params;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const offset = (page - 1) * limit;

  try {
    // Get total count
    const [[{ total }]] = await pool.execute(
      'SELECT COUNT(*) as total FROM sales WHERE user_id = ?',
      [user_id]
    );

    // Get sales
    const [sales] = await pool.execute(
      `SELECT 
         s.sale_id, s.total_amount, s.sale_date,
         p.payment_method
       FROM sales s
       LEFT JOIN payments p ON s.sale_id = p.sale_id
       WHERE s.user_id = ?
       ORDER BY s.sale_date DESC
       LIMIT ? OFFSET ?`,
      [user_id, limit, offset]
    );

    res.json({
      success: true,
      pagination: {
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit)
      },
      sales
    });

  } catch (err) {
    console.error('User sales error:', err);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch user sales',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

module.exports = router;