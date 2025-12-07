const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const auth = require('../middleware/auth');

// Upload file for chat
router.post('/upload', auth, upload.single('file'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        // Return the file path/url
        // Assuming static files are served from /uploads
        const fileUrl = `${req.protocol}://${req.get('host')}/${req.file.path}`;

        res.json({
            url: fileUrl,
            filename: req.file.originalname,
            mimetype: req.file.mimetype,
            size: req.file.size
        });
    } catch (error) {
        console.error('Chat upload error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

module.exports = router;
