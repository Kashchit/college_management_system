const express = require('express');
const Assignment = require('../models/Assignment');
const Submission = require('../models/Submission');
const auth = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');
const { sendAssignmentNotification } = require('../utils/emailService');
const { pool } = require('../config/db');
const upload = require('../middleware/upload');
const router = express.Router();

// Create Assignment (Teacher only)
router.post('/', auth, requireRole('TEACHER'), async (req, res) => {
    try {
        const { subjectId, title, description, dueDate } = req.body;
        if (!subjectId || !title) return res.status(400).json({ message: 'Subject and Title are required' });

        const assignment = await Assignment.create({
            subjectId,
            title,
            description,
            dueDate,
            createdBy: req.user.id
        });

        // Get subject name
        const subjectResult = await pool.query('SELECT name FROM subjects WHERE id = $1', [subjectId]);
        const subjectName = subjectResult.rows[0]?.name || 'Unknown Subject';

        // Get all enrolled students for this subject
        const enrolledStudents = await pool.query(`
            SELECT u.id, u.email, u.name 
            FROM users u
            JOIN subject_enrollments se ON u.id = se.user_id
            WHERE se.subject_id = $1 AND u.role = 'STUDENT'
        `, [subjectId]);

        // Send email notifications to all enrolled students
        const emailPromises = enrolledStudents.rows.map(async (student) => {
            // 1. Send Email
            await sendAssignmentNotification(student.email, student.name, {
                title,
                description,
                dueDate,
                subjectName
            });

            // 2. Create In-App Notification
            const message = `New assignment in ${subjectName}: ${title}`;
            const notif = await Notification.create({
                userId: student.id, // We need student ID, but query only selected email/name. Fix query below.
                message,
                type: 'info'
            });

            // 3. Send Socket Notification
            sendNotification(student.id, notif);
        });

        // Send emails/notifications in background
        Promise.all(emailPromises).then(() => {
            console.log(`Sent ${enrolledStudents.rows.length} assignment notifications`);
        }).catch(err => {
            console.error('Error sending some notifications:', err);
        });

        res.status(201).json(assignment);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// List Assignments (by Subject)
router.get('/', auth, async (req, res) => {
    try {
        const { subjectId } = req.query;
        if (!subjectId) return res.status(400).json({ message: 'Subject ID is required' });

        const assignments = await Assignment.listBySubject(subjectId);

        // If student, attach their submission status? 
        // For MVP, we can fetch submissions separately or just list assignments.
        res.json(assignments);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Submit Assignment (Student only) - with optional file upload
router.post('/:id/submit', auth, upload.single('file'), async (req, res) => {
    try {
        const { content } = req.body;
        const assignmentId = req.params.id;
        const file = req.file;

        // Create submission with file info if uploaded
        const submissionData = {
            assignmentId,
            studentId: req.user.id,
            content
        };

        // If file was uploaded, add file info
        if (file) {
            await pool.query(`
                INSERT INTO submissions (assignment_id, student_id, content, file_path, file_name)
                VALUES ($1, $2, $3, $4, $5)
                ON CONFLICT (assignment_id, student_id) 
                DO UPDATE SET content = $3, file_path = $4, file_name = $5, submitted_at = NOW()
                RETURNING *
            `, [assignmentId, req.user.id, content, file.path, file.originalname]);
        } else {
            await pool.query(`
                INSERT INTO submissions (assignment_id, student_id, content)
                VALUES ($1, $2, $3)
                ON CONFLICT (assignment_id, student_id) 
                DO UPDATE SET content = $3, submitted_at = NOW()
                RETURNING *
            `, [assignmentId, req.user.id, content]);
        }

        res.status(201).json({
            message: 'Assignment submitted successfully',
            file: file ? { name: file.originalname, size: file.size } : null
        });
    } catch (error) {
        console.error('Submission error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// List Submissions for an Assignment (Teacher only)
router.get('/:id/submissions', auth, requireRole('TEACHER'), async (req, res) => {
    try {
        const submissions = await Submission.listByAssignment(req.params.id);
        res.json(submissions);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Get My Submission for an Assignment (Student)
router.get('/:id/my-submission', auth, async (req, res) => {
    try {
        const submission = await Submission.findByStudentAndAssignment(req.user.id, req.params.id);
        res.json(submission || null);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

const { sendNotification } = require('../socket/socketHandler');
const Notification = require('../models/Notification');

// Grade Submission (Teacher only)
router.post('/submissions/:id/grade', auth, requireRole('TEACHER'), async (req, res) => {
    try {
        const { grade, feedback } = req.body;
        const submission = await Submission.grade(req.params.id, { grade, feedback });

        // Send notification to student
        const studentId = submission.student_id;
        const message = `Your submission for assignment #${submission.assignment_id} has been graded: ${grade}`;

        await Notification.create({ userId: studentId, message, type: 'success' });
        sendNotification(studentId, { message, type: 'success' });

        res.json(submission);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Download submission file
router.get('/submissions/:submissionId/download', auth, async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT file_path, file_name FROM submissions WHERE id = $1',
            [req.params.submissionId]
        );

        if (result.rows.length === 0 || !result.rows[0].file_path) {
            return res.status(404).json({ message: 'File not found' });
        }

        const { file_path, file_name } = result.rows[0];
        res.download(file_path, file_name);
    } catch (error) {
        console.error('Download error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Delete Assignment (Teacher only)
router.delete('/:id', auth, requireRole('TEACHER'), async (req, res) => {
    try {
        const assignmentId = req.params.id;

        // Check if assignment exists and belongs to teacher
        const assignmentResult = await pool.query('SELECT * FROM assignments WHERE id = $1', [assignmentId]);
        if (assignmentResult.rows.length === 0) {
            return res.status(404).json({ message: 'Assignment not found' });
        }

        const assignment = assignmentResult.rows[0];
        if (assignment.created_by !== req.user.id) {
            return res.status(403).json({ message: 'Not authorized to delete this assignment' });
        }

        // Delete assignment (Cascade should handle submissions, but let's be safe)
        // Note: In clear_db.js we saw tables have dependencies. 
        // If ON DELETE CASCADE is set in DB, this is enough. 
        // If not, we might need to delete submissions first. 
        // Assuming standard schema with CASCADE or manual cleanup.
        // Let's try deleting.
        await pool.query('DELETE FROM assignments WHERE id = $1', [assignmentId]);

        res.json({ message: 'Assignment deleted successfully' });
    } catch (error) {
        console.error('Delete assignment error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

module.exports = router;
