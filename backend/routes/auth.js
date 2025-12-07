const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { pool } = require('../config/db');
const { sendOTP } = require('../utils/emailService');
const router = express.Router();

// Helper: Generate 6-digit OTP
const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

// Helper: Store OTP
const storeOTP = async (email, otp) => {
  const expiresAt = new Date(Date.now() + 5 * 60000); // 5 mins
  await pool.query('DELETE FROM otp_store WHERE email = $1', [email]); // Clear old OTPs
  await pool.query('INSERT INTO otp_store (email, otp, expires_at) VALUES ($1, $2, $3)', [email, otp, expiresAt]);
};

// Helper: Verify OTP
const verifyOTP = async (email, otp) => {
  const result = await pool.query('SELECT * FROM otp_store WHERE email = $1 AND otp = $2 AND expires_at > NOW()', [email, otp]);
  if (result.rows.length > 0) {
    await pool.query('DELETE FROM otp_store WHERE email = $1', [email]); // Consume OTP
    return true;
  }
  return false;
};

// 1. Signup - Step 1: Send OTP
router.post('/send-signup-otp', async (req, res) => {
  try {
    const { email, password, name, studentId } = req.body;
    if (!email || !password || !name) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const existing = await User.findByEmail(email);
    if (existing) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    const otp = generateOTP();
    await storeOTP(email, otp);
    await sendOTP(email, otp);

    res.json({ message: 'OTP sent to email' });
  } catch (error) {
    console.error('Signup OTP Error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// 2. Signup - Step 2: Verify OTP & Create Account
router.post('/verify-signup-otp', async (req, res) => {
  try {
    const { email, otp, password, name, role, studentId } = req.body;

    const isValid = await verifyOTP(email, otp);
    if (!isValid) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    // Check existence again to be safe
    const existing = await User.findByEmail(email);
    if (existing) return res.status(400).json({ message: 'Email already registered' });

    const user = await User.create({ email, password, name, studentId, role: role || 'STUDENT' });
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({ token, user });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// 3. Login - Step 1: Verify Credentials & Send OTP
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const user = await User.findByEmail(email);
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });

    const ok = await User.comparePassword(password, user.password);
    if (!ok) return res.status(401).json({ message: 'Invalid credentials' });

    const otp = generateOTP();
    await storeOTP(email, otp);
    await sendOTP(email, otp);

    res.json({ message: 'OTP sent to email', requireOtp: true, email });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// 4. Login - Step 2: Verify OTP & Login
router.post('/verify-login-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;

    const isValid = await verifyOTP(email, otp);
    if (!isValid) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    const user = await User.findByEmail(email);
    if (!user) return res.status(400).json({ message: 'User not found' });

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, email: user.email, name: user.name, studentId: user.student_id, role: user.role } });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Direct Signup (for teacher-created students, no OTP required)
router.post('/signup', async (req, res) => {
  try {
    const { email, password, name, role, studentId } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ message: 'Email, password, and name are required' });
    }

    // Check if user already exists
    const existing = await User.findByEmail(email);
    if (existing) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    // Create user
    const user = await User.create({
      email,
      password,
      name,
      studentId,
      role: role || 'STUDENT'
    });

    // Generate token
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        studentId: user.student_id,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Direct signup error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// 5. Forgot Password
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email is required' });

    const user = await User.findByEmail(email);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Generate secure token
    const crypto = require('crypto');
    const token = crypto.randomBytes(32).toString('hex');

    // Store token (reuse otp_store)
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await pool.query('DELETE FROM otp_store WHERE email = $1', [email]);
    await pool.query('INSERT INTO otp_store (email, otp, expires_at) VALUES ($1, $2, $3)', [email, token, expiresAt]);

    // Send email
    const { sendPasswordResetEmail } = require('../utils/emailService');
    const resetLink = `http://localhost:5173/reset-password?token=${token}&email=${email}`;
    await sendPasswordResetEmail(email, resetLink);

    res.json({ message: 'Password reset email sent' });
  } catch (error) {
    console.error('Forgot Password Error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// 6. Reset Password
router.post('/reset-password', async (req, res) => {
  try {
    const { email, token, newPassword } = req.body;
    if (!email || !token || !newPassword) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    // Verify token
    const result = await pool.query('SELECT * FROM otp_store WHERE email = $1 AND otp = $2 AND expires_at > NOW()', [email, token]);
    if (result.rows.length === 0) {
      return res.status(400).json({ message: 'Invalid or expired token' });
    }

    // Update password
    const hashedPassword = await require('bcryptjs').hash(newPassword, 10);
    await pool.query('UPDATE users SET password = $1 WHERE email = $2', [hashedPassword, email]);

    // Clear token
    await pool.query('DELETE FROM otp_store WHERE email = $1', [email]);

    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    console.error('Reset Password Error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
