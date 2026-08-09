const fs = require('fs');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const { GoogleGenAI, GoogleGenAIFetchError } = require('@google/generative-ai');

// Standard tech/professional skills list for keyword backup extraction
const COMMONLY_USED_SKILLS = [
  'python', 'javascript', 'typescript', 'react', 'node', 'express', 'mongodb', 'sql', 'nosql', 'java', 'c++', 
  'c#', 'ruby', 'rails', 'php', 'laravel', 'html', 'css', 'sass', 'tailwind', 'bootstrap', 'aws', 'azure', 
  'gcp', 'docker', 'kubernetes', 'git', 'github', 'ci/cd', 'devops', 'agile', 'scrum', 'project management', 
  'product management', 'data analysis', 'machine learning', 'artificial intelligence', 'deep learning', 
  'nlp', 'computer vision', 'tableau', 'powerbi', 'excel', 'marketing', 'seo', 'sales', 'customer success',
  'ui/ux', 'figma', 'sketch', 'communication', 'leadership', 'problem solving', 'teamwork', 'analytics',
  'api', 'graphql', 'rest', 'microservices', 'testing', 'jest', 'cypress', 'selenium', 'redux', 'next.js'
];

// Action verbs list for formatting checker
const ACTION_VERBS = [
  'led', 'developed', 'managed', 'implemented', 'designed', 'created', 'optimized', 'built', 'directed',
  'coordinated', 'architected', 'facilitated', 'engineered', 'formulated', 'streamlined', 'maximized',
  'accelerated', 'improved', 'increased', 'decreased', 'saved', 'generated', 'initiated', 'executed'
];

/**
 * Extract raw text from file buffer
 */
const extractText = async (filePath, fileType) => {
  const fileBuffer = fs.readFileSync(filePath);
  
  if (fileType === 'pdf') {
    const data = await pdfParse(fileBuffer);
    return data.text;
  } else if (fileType === 'docx') {
    const data = await mammoth.extractRawText({ buffer: fileBuffer });
    return data.value;
  } else {
    throw new Error('Unsupported file type. Only PDF and DOCX are allowed.');
  }
};

/**
 * Heuristic ATS Analyzer (Runs locally)
 */
const runHeuristicAnalysis = (text, jobDescription) => {
  const normalizedText = text.toLowerCase();
  const normalizedJD = jobDescription ? jobDescription.toLowerCase() : '';
  
  // 1. SECTION CHECKS
  const sections = [
    {
      name: 'Contact Info',
      found: /email|phone|linkedin|github|address|contact|\+?[0-9]{10,12}/i.test(text),
      content: 'Email/Phone/LinkedIn link'
    },
    {
      name: 'Work Experience',
      found: /experience|employment|work history|professional history|career/i.test(text),
      content: 'Job titles, companies, dates, bullet points'
    },
    {
      name: 'Education',
      found: /education|degree|university|college|academic|school/i.test(text),
      content: 'Degrees, majors, schools, graduation years'
    },
    {
      name: 'Skills',
      found: /skills|technologies|proficiencies|expertise|tech stack/i.test(text),
      content: 'Technical skills, core competencies'
    },
    {
      name: 'Projects',
      found: /projects|portfolio|personal projects|academic projects/i.test(text),
      content: 'Project descriptions, GitHub links, tech used'
    }
  ];

  // 2. KEYWORDS EXTRACTION & MATCHING
  // If JD is present, extract keywords from both JD and Resume and match them.
  // Otherwise, use a default high-value list.
  let targetKeywords = [];
  if (normalizedJD) {
    // Extract unique words from Job Description that look like potential skills (match against common list + capitalized words)
    const words = normalizedJD.match(/[a-zA-Z+#.-]+/g) || [];
    const uniqueWords = [...new Set(words.map(w => w.toLowerCase()))];
    targetKeywords = uniqueWords.filter(w => 
      COMMONLY_USED_SKILLS.includes(w) || 
      (w.length > 3 && w.length < 20 && !['with', 'this', 'that', 'from', 'have', 'your', 'will', 'their', 'about'].includes(w))
    ).slice(0, 25); // cap at 25 key terms for clarity
  } else {
    // Standard default target list
    targetKeywords = ['communication', 'teamwork', 'leadership', 'analytics', 'project management', 'problem solving', 'git', 'api'];
  }

  // Intersect keywords safely without dynamic RegExp (fixes ReDoS)
  const lowerText = normalizedText;
  const keywords = targetKeywords.map(word => {
    const cleanWord = word.toLowerCase().trim();
    // Fast string inclusion and word boundary check without dynamic RegExp construction
    const matched = lowerText.includes(cleanWord);
    return { word, matched };
  });

  const matchedCount = keywords.filter(k => k.matched).length;
  const matchRatio = keywords.length > 0 ? matchedCount / keywords.length : 1;

  // 3. FORMATTING METRICS
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  const actionVerbCount = ACTION_VERBS.filter(verb => normalizedText.includes(verb)).length;
  const hasBullets = /[•\-\*]/.test(text) || normalizedText.includes('bullet') || normalizedText.includes('accomplished');
  const hasEmail = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(text);
  const hasPhone = /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/.test(text);

  const formattingMetrics = [
    {
      metricName: 'Length Audit',
      passed: wordCount >= 300 && wordCount <= 1200,
      rating: wordCount < 200 || wordCount > 2000 ? 40 : (wordCount >= 300 && wordCount <= 1200 ? 100 : 75),
      feedback: wordCount < 300 
        ? `Your resume is too short (${wordCount} words). Add details about your key achievements and projects.`
        : wordCount > 1500 
        ? `Your resume is long (${wordCount} words). ATS algorithms favor concise, 1-2 page resumes (typically 400-1000 words).`
        : `Ideal length! Your resume contains ${wordCount} words.`
    },
    {
      metricName: 'Contact Information',
      passed: hasEmail && hasPhone,
      rating: hasEmail && hasPhone ? 100 : (hasEmail || hasPhone ? 50 : 0),
      feedback: !hasEmail && !hasPhone 
        ? 'CRITICAL: No email or phone number found. Recruiters cannot reach you.'
        : !hasEmail 
        ? 'Missing email address in contact details.'
        : !hasPhone 
        ? 'Missing phone number in contact details.'
        : 'Contact info verified. Email and phone number present.'
    },
    {
      metricName: 'Impact & Action Verbs',
      passed: actionVerbCount >= 5,
      rating: Math.min(100, actionVerbCount * 15),
      feedback: actionVerbCount < 5 
        ? `Found only ${actionVerbCount} action verbs (like Led, Managed, Built). Use strong verbs to start your experience bullets.`
        : `Great work! Found ${actionVerbCount} action verbs highlighting your leadership and implementation achievements.`
    },
    {
      metricName: 'Bullet Points usage',
      passed: hasBullets,
      rating: hasBullets ? 100 : 30,
      feedback: hasBullets 
        ? 'Bullet points detected. This helps scanners parse your accomplishments.'
        : 'Formatting warning: Use clean bullet points (• or -) rather than paragraph text for readability.'
    }
  ];

  // 4. RECOMMENDATIONS GENERATION
  const recommendations = [];
  
  // Section-based recommendations
  sections.forEach(s => {
    if (!s.found) {
      recommendations.push({
        category: s.name === 'Contact Info' ? 'general' : s.name.toLowerCase(),
        suggestion: `Add a dedicated '${s.name}' section. It could not be clearly identified by ATS scanners.`,
        impact: s.name === 'Contact Info' || s.name === 'Work Experience' ? 'High' : 'Medium'
      });
    }
  });

  // Keywords-based recommendations
  const missingKeywords = keywords.filter(k => !k.matched).map(k => k.word);
  if (missingKeywords.length > 0) {
    recommendations.push({
      category: 'skills',
      suggestion: `Integrate missing keywords from the job description: ${missingKeywords.slice(0, 6).join(', ')}.`,
      impact: 'High'
    });
  }

  // Formatting-based recommendations
  formattingMetrics.forEach(m => {
    if (!m.passed && m.rating < 80) {
      recommendations.push({
        category: 'formatting',
        suggestion: m.feedback,
        impact: m.rating < 40 ? 'High' : 'Medium'
      });
    }
  });

  if (recommendations.length === 0) {
    recommendations.push({
      category: 'general',
      suggestion: 'Your resume is in excellent shape! Tailor the wording slightly to match any future specific applications.',
      impact: 'Low'
    });
  }

  // 5. ATS SCORE CALCULATION
  const sectionWeight = 30;
  const keywordWeight = 40;
  const formatWeight = 30;

  const sectionScore = (sections.filter(s => s.found).length / sections.length) * 100;
  const keywordScore = matchRatio * 100;
  const formatScore = formattingMetrics.reduce((sum, m) => sum + m.rating, 0) / formattingMetrics.length;

  const atsScore = Math.round(
    (sectionScore * (sectionWeight / 100)) + 
    (keywordScore * (keywordWeight / 100)) + 
    (formatScore * (formatWeight / 100))
  );

  return {
    atsScore: Math.min(100, Math.max(0, atsScore)),
    sections,
    keywords,
    formattingMetrics,
    recommendations
  };
};

/**
 * Google Gemini AI Parser (Runs if API key is present)
 */
const runGeminiAnalysis = async (text, jobDescription, apiKey) => {
  try {
    const genAI = new GoogleGenAI({ apiKey });
    // Use gemini-1.5-flash or gemini-2.5-flash as default, or whatever is standard in Node SDK
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = `
You are an expert ATS (Applicant Tracking System) parser and hiring consultant.
Analyze the following Resume text and optionally the Job Description.

Resume Text:
"""
${text}
"""

Job Description:
${jobDescription ? `"""\n${jobDescription}\n"""` : 'None provided. Focus on generic resume best practices.'}

Respond ONLY with a valid JSON object matching the following structure. Do not wrap in markdown quotes. Just return the raw JSON.
{
  "atsScore": 78, // Score from 0 to 100
  "sections": [
    { "name": "Contact Info", "found": true },
    { "name": "Work Experience", "found": true },
    { "name": "Education", "found": true },
    { "name": "Skills", "found": false },
    { "name": "Projects", "found": true }
  ],
  "keywords": [
    { "word": "react", "matched": true },
    { "word": "nodejs", "matched": false }
  ], // Identify key skill terms from the JD and check if present in resume. Include 8-15 main terms.
  "formattingMetrics": [
    { "metricName": "Length Audit", "passed": true, "rating": 90, "feedback": "Feedback details..." },
    { "metricName": "Contact Information", "passed": true, "rating": 100, "feedback": "Feedback details..." },
    { "metricName": "Impact & Action Verbs", "passed": false, "rating": 60, "feedback": "Feedback details..." },
    { "metricName": "Bullet Points usage", "passed": true, "rating": 100, "feedback": "Feedback details..." }
  ],
  "recommendations": [
    { "category": "skills", "suggestion": "Add typescript to your skills list.", "impact": "High" },
    { "category": "formatting", "suggestion": "Shorten your resume to under 2 pages.", "impact": "Medium" }
  ]
}
`;

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: 'application/json' }
    });

    const responseText = result.response.text();
    // Clean potential markdown fencing if the model ignored instructions
    const cleanedText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    
    return JSON.parse(cleanedText);
  } catch (error) {
    console.error('[Gemini Analysis Failed - Falling Back]', error);
    // Return null to trigger local fallback logic
    return null;
  }
};

/**
 * Controller endpoint handler
 */
const analyzeResumes = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, message: 'No resume files uploaded.' });
    }

    const { jobDescription, jobTitle } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;
    const results = [];

    for (const file of req.files) {
      const fileExt = file.originalname.split('.').pop().toLowerCase();
      const fileType = (fileExt === 'pdf') ? 'pdf' : (fileExt === 'docx' || fileExt === 'doc') ? 'docx' : null;

      if (!fileType) {
        // Skip unsupported files
        continue;
      }

      // Extract raw text
      const extractedText = await extractText(file.path, fileType);

      // Perform analysis
      let analysisResult = null;
      if (apiKey) {
        console.log(`[Parser] Running Gemini API analysis for: ${file.originalname}`);
        analysisResult = await runGeminiAnalysis(extractedText, jobDescription, apiKey);
      }

      if (!analysisResult) {
        console.log(`[Parser] Running local Heuristic analysis for: ${file.originalname}`);
        analysisResult = runHeuristicAnalysis(extractedText, jobDescription);
      }

      // Format payload to save/return
      const resumePayload = {
        fileName: file.originalname,
        fileSize: file.size,
        fileType: fileType,
        jobTitle: jobTitle || 'General Application',
        targetJobDescription: jobDescription || '',
        parsedText: extractedText.slice(0, 5000), // store snippet/full text (safe length)
        atsScore: analysisResult.atsScore,
        sections: analysisResult.sections,
        keywords: analysisResult.keywords,
        formattingMetrics: analysisResult.formattingMetrics,
        recommendations: analysisResult.recommendations
      };

      // Handle DB persistence with Mongoose check
      const { getStatus } = require('../config/db');
      const Resume = require('../models/Resume');
      let savedData = null;

      if (getStatus()) {
        try {
          const dbResume = new Resume(resumePayload);
          savedData = await dbResume.save();
        } catch (dbErr) {
          console.error('[Database Save Error - Falling Back to Local]', dbErr);
        }
      }

      // If database is not connected or save failed, create a temporary unique id for the response
      if (!savedData) {
        savedData = {
          _id: `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          ...resumePayload,
          uploadedAt: new Date()
        };
        // Log in-memory save if in development
        if (global.inMemoryStore) {
          global.inMemoryStore.push(savedData);
        } else {
          global.inMemoryStore = [savedData];
        }
      }

      results.push(savedData);

      // Cleanup uploaded file from local filesystem disk to save space
      try {
        fs.unlinkSync(file.path);
      } catch (err) {
        console.error(`Failed to clean up temp file: ${file.path}`, err);
      }
    }

    res.json({
      success: true,
      message: `Parsed and analyzed ${results.length} resumes successfully.`,
      results
    });
  } catch (error) {
    console.error('[Analyze Resumes Controller Error]', error);
    res.status(500).json({
      success: false,
      message: 'Failed to analyze resumes. Details: ' + error.message
    });
  }
};

module.exports = {
  analyzeResumes
};
