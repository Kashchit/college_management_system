const express = require('express');
const router = express.Router();
const LeaveRequest = require('../models/LeaveRequest');
const auth = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');
const { getIo } = require('../socket/socketHandler');

// Create leave request (Student only)
router.post('/', auth, requireRole('STUDENT'), async (req, res) => {
    try {
        const { subjectId, startDate, endDate, reason } = req.body;

        const leaveRequest = await LeaveRequest.create({
            studentId: req.user.id,
            subjectId,
            startDate,
            endDate,
            reason
        });

        // Emit real-time update
        try {
            const io = getIo();
            io.emit('leave_request_update', { type: 'new', request: leaveRequest });
        } catch (e) {
            console.error('Socket emit error:', e);
        }

        res.status(201).json(leaveRequest);
    } catch (error) {
        console.error('Create leave request error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Get my leave requests (Student)
router.get('/my-requests', auth, async (req, res) => {
    try {
        const requests = await LeaveRequest.findByStudent(req.user.id);
        res.json(requests);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Get pending leave requests (Teacher)
router.get('/pending', auth, requireRole('TEACHER'), async (req, res) => {
    try {
        const requests = await LeaveRequest.findPendingByTeacher(req.user.id);
        res.json(requests);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Approve leave request (Teacher)
router.put('/:id/approve', auth, requireRole('TEACHER'), async (req, res) => {
    try {
        const leaveRequest = await LeaveRequest.updateStatus(req.params.id, 'approved', req.user.id);
        // Emit real-time update
        try {
            const io = getIo();
            io.emit('leave_request_update', { type: 'update', request: leaveRequest });
        } catch (e) {
            console.error('Socket emit error:', e);
        }

        res.json(leaveRequest);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Reject leave request (Teacher)
router.put('/:id/reject', auth, requireRole('TEACHER'), async (req, res) => {
    try {
        const leaveRequest = await LeaveRequest.updateStatus(req.params.id, 'rejected', req.user.id);
        // Emit real-time update
        try {
            const io = getIo();
            io.emit('leave_request_update', { type: 'update', request: leaveRequest });
        } catch (e) {
            console.error('Socket emit error:', e);
        }

        res.json(leaveRequest);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

module.exports = router;
