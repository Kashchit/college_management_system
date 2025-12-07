const express = require('express');
const router = express.Router();
const Announcement = require('../models/Announcement');
const { pool } = require('../config/db');
const auth = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');
const { sendAssignmentNotification } = require('../utils/emailService'); // Reuse email service

// Create Announcement (Teacher only)
router.post('/', auth, requireRole('TEACHER'), async (req, res) => {
    try {
        const { title, content, targetAudience, subjectId } = req.body;

        const announcement = await Announcement.create({
            title,
            content,
            createdBy: req.user.id,
            targetAudience, // 'ALL' or 'SUBJECT'
            subjectId
        });

        // Send Emails
        // If ALL, send to all students. If SUBJECT, send to enrolled students.
        let recipients = [];
        if (targetAudience === 'ALL') {
            const result = await pool.query("SELECT email, name FROM users WHERE role = 'STUDENT'");
            recipients = result.rows;
        } else if (targetAudience === 'SUBJECT' && subjectId) {
            const result = await pool.query(`
                SELECT u.email, u.name 
                FROM users u 
                JOIN subject_enrollments se ON u.id = se.user_id 
                WHERE se.subject_id = $1 AND u.role = 'STUDENT'
            `, [subjectId]);
            recipients = result.rows;
        }

        // Send emails in background
        const emailPromises = recipients.map(student =>
            sendAssignmentNotification(student.email, student.name, {
                title: `Announcement: ${title}`,
                description: content,
                dueDate: 'N/A',
                subjectName: 'General Announcement'
            }).catch(err => {
                console.error(`Failed to send email to ${student.email}:`, err.message);
                return null; // Don't fail the whole operation if one email fails
            })
        );

        // Don't wait for emails, send response immediately
        Promise.all(emailPromises)
            .then(() => console.log(`Sent ${recipients.length} announcement emails`))
            .catch(err => console.error('Error sending announcement emails:', err));

        res.status(201).json(announcement);
    } catch (error) {
        console.error('Create announcement error:', error);
        console.error('Error stack:', error.stack);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// List Announcements
router.get('/', auth, async (req, res) => {
    try {
        const announcements = await Announcement.list(req.user.role, req.user.id);
        res.json(announcements);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

module.exports = router;
