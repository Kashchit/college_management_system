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

// List subjects (teacher/admin)
router.get('/', auth, requireRole('TEACHER'), async (_req, res) => {
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

// Get enrolled students with embeddings for scanner
router.get('/:id/students-with-embeddings', auth, requireRole('TEACHER'), async (req, res) => {
  try {
    res.set('Cache-Control', 'no-store');
    const students = await SubjectEnrollment.listStudents(req.params.id);
    const withEmbeddings = await Promise.all(students.map(async (u) => {
      if (!u.student_id) return null;
      const s = await Student.findByStudentId(u.student_id);
      if (!s) return null;
      return { studentId: s.student_id, name: s.name, embedding: s.embedding };
    }));
    res.json(withEmbeddings.filter(Boolean));
  } catch (e) {
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
