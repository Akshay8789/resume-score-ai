const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { analyzeResumes } = require('../controllers/parserController');
const Resume = require('../models/Resume');
const { getStatus } = require('../config/db');

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
router.post('/analyze', upload.array('resumes', 5), analyzeResumes);

// Fetch analysis history route
router.get('/history', async (req, res) => {
  try {
    const dbConnected = getStatus();
    let history = [];

    if (dbConnected) {
      // Fetch history from MongoDB (sorted newest first)
      history = await Resume.find().sort({ uploadedAt: -1 }).select('-parsedText');
    } else {
      // Fallback: Fetch history from local in-memory store
      history = (global.inMemoryStore || []).map(({ parsedText, ...rest }) => rest);
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

// Delete a resume analysis entry route
router.delete('/resume/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const dbConnected = getStatus();
    let deleted = false;

    if (dbConnected) {
      const result = await Resume.findByIdAndDelete(id);
      deleted = !!result;
    } else {
      // Fallback: Delete from local in-memory store
      const initialLength = (global.inMemoryStore || []).length;
      global.inMemoryStore = (global.inMemoryStore || []).filter(item => item._id !== id);
      deleted = (global.inMemoryStore || []).length < initialLength;
    }

    if (deleted) {
      res.json({ success: true, message: 'Resume analysis deleted successfully.' });
    } else {
      res.status(404).json({ success: false, message: 'Resume entry not found.' });
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
