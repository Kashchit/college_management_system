const express = require('express');
const { pool } = require('../config/db');
const auth = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');
const router = express.Router();

// Get all users (teachers only)
router.get('/', auth, requireRole('TEACHER'), async (req, res) => {
    try {
        const { role } = req.query;

        let query = 'SELECT id, name, email, role, student_id, created_at FROM users';
        const params = [];

        if (role) {
            query += ' WHERE role = $1';
            params.push(role);
        }

        query += ' ORDER BY created_at DESC';

        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Delete user (teachers only)
router.delete('/:id', auth, requireRole('TEACHER'), async (req, res) => {
    try {
        const result = await pool.query('DELETE FROM users WHERE id = $1 RETURNING *', [req.params.id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json({ message: 'User deleted successfully', user: result.rows[0] });
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

module.exports = router;
