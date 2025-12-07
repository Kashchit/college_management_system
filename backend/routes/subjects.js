const express = require('express');
const Subject = require('../models/Subject');
const SubjectEnrollment = require('../models/SubjectEnrollment');
const Student = require('../models/Student');
const User = require('../models/User');
const { pool } = require('../config/db');
const auth = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');
const router = express.Router();

// Create subject (teacher/admin)
router.post('/', auth, requireRole('TEACHER'), async (req, res) => {
  try {
    const { name, code } = req.body;
    if (!name || !code) return res.status(400).json({ message: 'Name and code required' });
    const subj = await Subject.create({ name, code, createdBy: req.user?.id });
    res.status(201).json(subj);
  } catch (e) {
    if (e.code === '23505') {
      return res.status(409).json({ message: 'Subject code already exists' });
    }
    return res.status(500).json({ message: 'Server error', error: e.message });
  }
});

// List subjects (authenticated users)
router.get('/', auth, async (_req, res) => {
  try {
    const list = await Subject.list();
    res.json(list);
  } catch (e) {
    res.status(500).json({ message: 'Server error', error: e.message });
  }
});

// Enroll user to subject (by userId or email); optional studentId to bind face records
router.post('/:id/enroll', auth, requireRole('TEACHER'), async (req, res) => {
  try {
    const { userId, email, studentId } = req.body;
    let targetUser = null;
    if (userId) {
      const { rows } = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
      targetUser = rows[0] || null;
    } else if (email) {
      targetUser = await User.findByEmail(email);
    }
    if (!targetUser) return res.status(404).json({ message: 'User not found' });

    // Optionally set users.student_id to link with face embeddings
    if (studentId) {
      await pool.query('UPDATE users SET student_id = $1 WHERE id = $2', [studentId.trim(), targetUser.id]);
      targetUser.student_id = studentId.trim();
    }

    const enr = await SubjectEnrollment.enroll(req.params.id, targetUser.id);
    res.status(201).json({ enrolled: !!enr });
  } catch (e) {
    if (e.code === '23503') {
      return res.status(404).json({ message: 'Subject not found' });
    }
    res.status(500).json({ message: 'Server error', error: e.message });
  }
});

// Bulk Enroll (Teacher only)
router.post('/:id/enroll-bulk', auth, requireRole('TEACHER'), async (req, res) => {
  try {
    const { emails } = req.body; // Array of emails
    if (!emails || !Array.isArray(emails)) {
      return res.status(400).json({ message: 'Invalid input: emails array required' });
    }

    const results = {
      success: [],
      failed: []
    };

    for (const email of emails) {
      try {
        const user = await User.findByEmail(email.trim());
        if (!user) {
          results.failed.push({ email, reason: 'User not found' });
          continue;
        }

        await SubjectEnrollment.enroll(req.params.id, user.id);
        results.success.push(email);
      } catch (error) {
        results.failed.push({ email, reason: error.message });
      }
    }

    res.json({ message: 'Bulk enrollment processed', results });
  } catch (e) {
    console.error('Bulk enroll error:', e);
    res.status(500).json({ message: 'Server error', error: e.message });
  }
});

// Get all enrolled students for a subject (for manual attendance)
router.get('/:id/students', auth, async (req, res) => {
  try {
    const query = `
      SELECT 
        u.id,
        u.name,
        u.email,
        u.student_id,
        u.role
      FROM users u
      JOIN subject_enrollments se ON u.id = se.user_id
      WHERE se.subject_id = $1 AND u.role = 'STUDENT'
      ORDER BY u.name
    `;

    const result = await pool.query(query, [req.params.id]);
    res.json(result.rows);
  } catch (e) {
    console.error('Error getting enrolled students:', e);
    res.status(500).json({ message: 'Server error', error: e.message });
  }
});

// Get enrolled students with embeddings for scanner
router.get('/:id/students-with-embeddings', auth, requireRole('TEACHER'), async (req, res) => {
  try {
    res.set('Cache-Control', 'no-store');

    // Get all students enrolled in this subject who have face embeddings
    const query = `
      SELECT DISTINCT
        s.student_id,
        s.name,
        s.embedding,
        u.id as user_id,
        u.email
      FROM students s
      LEFT JOIN users u ON s.student_id = u.student_id
      LEFT JOIN subject_enrollments se ON u.id = se.user_id
      WHERE se.subject_id = $1
        AND s.embedding IS NOT NULL
        AND array_length(s.embedding, 1) = 128
    `;

    const result = await pool.query(query, [req.params.id]);

    const studentsWithEmbeddings = result.rows.map(row => ({
      studentId: row.student_id,
      name: row.name,
      embedding: row.embedding,
      userId: row.user_id,
      email: row.email
    }));

    console.log(`Found ${studentsWithEmbeddings.length} students with face data for subject ${req.params.id}`);
    res.json(studentsWithEmbeddings);
  } catch (e) {
    console.error('Error getting students with embeddings:', e);
    res.status(500).json({ message: 'Server error', error: e.message });
  }
});

// Debug: show enrollment and embedding linkage
router.get('/:id/debug', auth, requireRole('TEACHER'), async (req, res) => {
  try {
    const students = await SubjectEnrollment.listStudents(req.params.id);
    const details = await Promise.all(students.map(async (u) => {
      let hasEmbedding = false;
      if (u.student_id) {
        const s = await Student.findByStudentId(u.student_id);
        hasEmbedding = !!s;
      }
      return { email: u.email, name: u.name, studentId: u.student_id, hasEmbedding };
    }));
    res.json(details);
  } catch (e) {
    res.status(500).json({ message: 'Server error', error: e.message });
  }
});

module.exports = router;
