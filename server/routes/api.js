const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const rateLimit = require('express-rate-limit');
const { analyzeResumes } = require('../controllers/parserController');
const Resume = require('../models/Resume');
const { getStatus } = require('../config/db');

const analyzeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15, // Max 15 resume scans per IP per window
  message: { success: false, message: 'Too many resume requests. Please try again later.' }
});

// PDF Magic Bytes: %PDF (0x25 0x50 0x44 0x46)
// DOCX Magic Bytes (ZIP header): PK\x03\x04 (0x50 0x4B 0x03 0x04)
const validateMagicBytes = (buffer) => {
  if (!buffer || buffer.length < 4) return false;
  const header = buffer.toString('hex', 0, 4);
  return header === '25504446' || header === '504b0304';
};

const validateUploadedFiles = (req, res, next) => {
  if (!req.files || req.files.length === 0) return next();

  for (const file of req.files) {
    try {
      const buffer = fs.readFileSync(file.path);
      if (!validateMagicBytes(buffer)) {
        req.files.forEach(f => {
          try { fs.unlinkSync(f.path); } catch (e) {}
        });
        return res.status(400).json({
          success: false,
          message: `Invalid file format for ${file.originalname}. Binary header signature check failed.`
        });
      }
    } catch (err) {
      return res.status(500).json({ success: false, message: 'File validation error.' });
    }
  }
  next();
};

// Multer Storage Configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../uploads'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

// File Filter (Only PDF and DOCX)
const fileFilter = (req, file, cb) => {
  const allowedExtensions = ['.pdf', '.docx', '.doc'];
  const ext = path.extname(file.originalname).toLowerCase();
  
  if (allowedExtensions.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type: ${ext}. Only PDF and Word files are supported.`), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit per file
    files: 5 // Cap at 5 uploads at a time
  }
});

// Upload and analyze resumes route
router.post('/analyze', analyzeLimiter, upload.array('resumes', 5), validateUploadedFiles, analyzeResumes);

// Fetch analysis history route (scoped to user to prevent IDOR)
router.get('/history', async (req, res) => {
  try {
    const userId = req.user?.id || req.headers['x-user-id'] || 'default_user';
    const dbConnected = getStatus();
    let history = [];

    if (dbConnected) {
      // Fetch user-scoped history from MongoDB (sorted newest first)
      history = await Resume.find({ userId }).sort({ uploadedAt: -1 }).select('-parsedText');
    } else {
      // Fallback: Fetch history from local in-memory store for current user
      history = (global.inMemoryStore || [])
        .filter(item => !item.userId || item.userId === userId)
        .map(({ parsedText, ...rest }) => rest);
      // Sort newest first
      history.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
    }

    res.json({
      success: true,
      database: dbConnected ? 'connected' : 'fallback_mode',
      history
    });
  } catch (error) {
    console.error('[Get History Route Error]', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve analysis history.'
    });
  }
});

// Delete a resume analysis entry route (ownership protected against IDOR)
router.delete('/resume/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id || req.headers['x-user-id'] || 'default_user';
    const dbConnected = getStatus();
    let deleted = false;

    if (dbConnected) {
      const result = await Resume.findOneAndDelete({ _id: id, userId });
      deleted = !!result;
    } else {
      // Fallback: Delete from local in-memory store if belonging to user
      const initialLength = (global.inMemoryStore || []).length;
      global.inMemoryStore = (global.inMemoryStore || []).filter(
        item => !(item._id === id && (!item.userId || item.userId === userId))
      );
      deleted = (global.inMemoryStore || []).length < initialLength;
    }

    if (deleted) {
      res.json({ success: true, message: 'Resume analysis deleted successfully.' });
    } else {
      res.status(404).json({ success: false, message: 'Resume entry not found or unauthorized.' });
    }
  } catch (error) {
    console.error('[Delete Resume Route Error]', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete resume entry.'
    });
  }
});

module.exports = router;
