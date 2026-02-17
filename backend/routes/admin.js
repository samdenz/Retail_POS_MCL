// GET /api/admin/cashier-performance
router.get('/cashier-performance', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        u.full_name AS name,
        COUNT(s.sale_id) AS transactions,
        IFNULL(SUM(s.total_amount), 0) AS total_revenue,
        IFNULL(SUM(s.total_amount), 0) AS total_sales
      FROM users u
      LEFT JOIN sales s ON u.user_id = s.user_id
      WHERE u.role = 'cashier'
      GROUP BY u.user_id
      ORDER BY total_revenue DESC
    `);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
const express = require('express');
const router = express.Router();
const { pool } = require('../db');

// GET /api/admin/stats
router.get('/stats', async (req, res) => {
  try {
    const [[salesCount]] = await pool.query(
      'SELECT COUNT(*) AS count FROM sales'
    );

    const [[inventoryCount]] = await pool.query(
      'SELECT COUNT(*) AS count FROM books'
    );

    const [[usersCount]] = await pool.query(
      'SELECT COUNT(*) AS count FROM users'
    );

    const [[revenueSum]] = await pool.query(
      'SELECT IFNULL(SUM(total_amount), 0) AS total FROM sales'
    );

    res.json({
      sales: salesCount.count,
      inventory: inventoryCount.count,
      users: usersCount.count,
      revenue: revenueSum.total
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
});

// GET /api/admin/recent-transactions
router.get('/recent-transactions', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        s.sale_id AS id,
        s.sale_date AS date,
        s.total_amount AS amount,
        u.full_name AS user
      FROM sales s
      JOIN users u ON s.user_id = u.user_id
      ORDER BY s.sale_date DESC
      LIMIT 5
    `);

    res.json(rows);

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/admin/low-stock
router.get('/low-stock', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        title AS name,
        quantity
      FROM books
      WHERE quantity <= low_stock_threshold
    `);

    res.json(rows);

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/admin/active-users
router.get('/active-users', async (req, res) => {
  try {
    const [[result]] = await pool.query(`
      SELECT COUNT(*) AS count 
      FROM users 
      WHERE is_active = TRUE
    `);

    res.json(result.count);

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
