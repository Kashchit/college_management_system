const express = require('express');
const Attendance = require('../models/Attendance');
const auth = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');
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

// Manual attendance marking (teachers only)
router.post('/manual', auth, async (req, res) => {
  try {
    const { studentIds, subjectId, date } = req.body;

    if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
      return res.status(400).json({ message: 'Student IDs array is required' });
    }

    const { pool } = require('../config/db');

    // Get student details and subject name
    const studentsQuery = await pool.query(
      'SELECT id, name, student_id FROM users WHERE id = ANY($1)',
      [studentIds]
    );

    const subjectQuery = await pool.query(
      'SELECT name FROM subjects WHERE id = $1',
      [subjectId]
    );

    const subjectName = subjectQuery.rows[0]?.name || 'General';
    const markedAttendance = [];

    // Mark attendance for each student
    for (const student of studentsQuery.rows) {
      const attendance = await pool.query(`
        INSERT INTO attendance (student_id, name, subject, confidence, method, marked_by, timestamp)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `, [
        student.student_id || student.id,
        student.name,
        subjectName,
        1.0, // Full confidence for manual marking
        'manual',
        req.user.id,
        date || new Date()
      ]);

      markedAttendance.push(attendance.rows[0]);
    }

    res.status(201).json({
      message: `Attendance marked for ${markedAttendance.length} students`,
      attendance: markedAttendance
    });
  } catch (error) {
    console.error('Manual attendance error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Bulk attendance marking for class (teachers only)
router.post('/mark-class', auth, requireRole('TEACHER'), async (req, res) => {
  try {
    const { subjectId, date, attendance } = req.body;

    if (!attendance || !Array.isArray(attendance)) {
      return res.status(400).json({ message: 'Attendance array is required' });
    }

    const { pool } = require('../config/db');

    // Get subject name
    const subjectQuery = await pool.query('SELECT name FROM subjects WHERE id = $1', [subjectId]);
    const subjectName = subjectQuery.rows[0]?.name || 'General';

    const markedAttendance = [];

    // Mark attendance for each student
    for (const record of attendance) {
      if (record.status === 'present') {
        // Get student details
        const studentQuery = await pool.query(
          'SELECT id, name, student_id FROM users WHERE id = $1',
          [record.studentId]
        );

        if (studentQuery.rows.length > 0) {
          const student = studentQuery.rows[0];
          const attendanceRecord = await pool.query(`
                        INSERT INTO attendance (student_id, name, subject, confidence, method, marked_by, timestamp)
                        VALUES ($1, $2, $3, $4, $5, $6, $7)
                        RETURNING *
                    `, [
            student.student_id || student.id,
            student.name,
            subjectName,
            1.0,
            'manual',
            req.user.id,
            date || new Date()
          ]);

          markedAttendance.push(attendanceRecord.rows[0]);
        }
      }
    }

    res.status(201).json({
      message: `Attendance marked for ${markedAttendance.length} students`,
      attendance: markedAttendance
    });
  } catch (error) {
    console.error('Bulk attendance error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
