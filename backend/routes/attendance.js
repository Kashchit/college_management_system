const express = require('express');
const Attendance = require('../models/Attendance');
const auth = require('../middleware/auth');
const router = express.Router();

// Mark attendance (admin/teacher-controlled)
router.post('/', auth, async (req, res) => {
  try {
    const { studentId, name, subject, confidence } = req.body;

    if (!studentId || !name || !confidence) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const recentAttendance = await Attendance.findRecent(studentId, 5);

    if (recentAttendance) {
      return res.status(400).json({ message: 'Attendance already marked recently' });
    }

    const attendance = await Attendance.create(studentId, name, subject, confidence);
    res.status(201).json({ message: 'Attendance marked successfully', attendance });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Mark attendance for current authenticated user (self)
router.post('/self', auth, async (req, res) => {
  try {
    const { name, studentId, subject, confidence } = req.body;
    const effectiveStudentId = studentId || req.user?.id; // prefer provided studentId, fallback to user id
    const effectiveName = name || req.user?.email;

    if (!effectiveStudentId || !effectiveName) {
      return res.status(400).json({ message: 'Missing identity for attendance' });
    }

    const recentAttendance = await Attendance.findRecent(effectiveStudentId, 5);
    if (recentAttendance) {
      return res.status(400).json({ message: 'Attendance already marked recently' });
    }

    const attendance = await Attendance.create(effectiveStudentId, effectiveName, subject, confidence ?? 1);
    res.status(201).json({ message: 'Attendance marked successfully', attendance });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get all attendance records with filters
router.get('/', auth, async (req, res) => {
  try {
    const { date, subject, studentId } = req.query;
    const filters = {};

    if (date) filters.date = date;
    if (subject) filters.subject = subject;
    if (studentId) filters.studentId = studentId;

    const attendance = await Attendance.findAll(filters);
    res.json(attendance);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
