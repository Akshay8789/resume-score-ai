const mongoose = require('mongoose');

const SectionSchema = new mongoose.Schema({
  name: { type: String, required: true },
  found: { type: Boolean, default: false },
  content: { type: String, default: '' }
}, { _id: false });

const KeywordSchema = new mongoose.Schema({
  word: { type: String, required: true },
  matched: { type: Boolean, default: false }
}, { _id: false });

const FormattingMetricSchema = new mongoose.Schema({
  metricName: { type: String, required: true },
  passed: { type: Boolean, default: false },
  rating: { type: Number, default: 0 }, // 0 to 100
  feedback: { type: String, default: '' }
}, { _id: false });

const ResumeSchema = new mongoose.Schema({
  fileName: {
    type: String,
    required: true
  },
  fileSize: {
    type: Number,
    required: true
  },
  fileType: {
    type: String, // 'pdf' or 'docx'
    required: true
  },
  jobTitle: {
    type: String,
    default: 'General Application'
  },
  targetJobDescription: {
    type: String,
    default: ''
  },
  parsedText: {
    type: String,
    default: ''
  },
  atsScore: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  sections: [SectionSchema],
  keywords: [KeywordSchema],
  formattingMetrics: [FormattingMetricSchema],
  recommendations: [{
    category: String, // 'skills', 'formatting', 'experience', 'general'
    suggestion: String,
    impact: { type: String, enum: ['High', 'Medium', 'Low'], default: 'Medium' }
  }],
  uploadedAt: {
    type: Date,
    default: Date.now
  }
});

// Avoid model compilation error if model already exists in development hot reloading
module.exports = mongoose.models.Resume || mongoose.model('Resume', ResumeSchema);
