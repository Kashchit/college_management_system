const express = require('express');
const Student = require('../models/Student');
const auth = require('../middleware/auth');
const router = express.Router();

// Enroll new student with face embedding
router.post('/enroll', async (req, res) => {
  try {
    const { studentId, name, embedding } = req.body;

    if (!studentId || !name || !embedding) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    if (!Array.isArray(embedding) || embedding.length !== 128) {
      return res.status(400).json({ message: 'Invalid embedding format' });
    }

    // Check if student already exists
    const existing = await Student.findByStudentId(studentId);
    if (existing) {
      return res.status(400).json({ message: 'Student ID already enrolled' });
    }

    const student = await Student.create(studentId, name, embedding);
    res.status(201).json({ message: 'Student enrolled successfully', student });
  } catch (error) {
    if (error.code === '23505') { // PostgreSQL unique violation
      return res.status(400).json({ message: 'Student ID already exists' });
    }
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get all students (protected route)
router.get('/', auth, async (req, res) => {
  try {
    const students = await Student.findAll();
    res.json(students);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get all students with embeddings (for matching)
router.get('/with-embeddings', auth, async (req, res) => {
  try {
    const students = await Student.findAllWithEmbeddings();
    res.json(students);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
