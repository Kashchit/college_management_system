const express = require('express');
const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const { pool } = require('../config/db');
const router = express.Router();

// TEMP: Debug endpoint to list admin emails (do not expose in production)
router.get('/debug', async (req, res) => {
  try {
    const result = await pool.query('SELECT email FROM admins');
    res.json({ admins: result.rows });
  } catch (e) {
    res.status(500).json({ message: 'DB error', error: e.message });
  }
});

// Admin login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Please provide email and password' });
    }

    const admin = await Admin.findByEmail(email);
    if (!admin) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isMatch = await Admin.comparePassword(password, admin.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: admin.id, email: admin.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      admin: {
        id: admin.id,
        email: admin.email
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
