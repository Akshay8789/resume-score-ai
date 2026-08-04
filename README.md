# AI Resume ATS Score Checker

## Repository

<!-- Add your project banner or screenshot here -->

[![AI Resume ATS Score Checker Screenshot](https://lh3.googleusercontent.com/d/1pmK91HjBlwrTwglrTQ5YgLEnLqTY4Rdq)](https://drive.google.com/file/d/1pmK91HjBlwrTwglrTQ5YgLEnLqTY4Rdq/view?usp=sharing)

---

# Description

AI Resume ATS Score Checker is a full-stack AI-powered web application that analyzes resumes against job descriptions and generates an ATS (Applicant Tracking System) compatibility score. Built using the MERN Stack and Google Gemini AI, the application helps job seekers optimize their resumes by identifying missing keywords, skill gaps, and improvement opportunities.

The system automatically parses uploaded resumes, compares them with a target job description, calculates an ATS score, and provides AI-generated feedback to improve interview chances.

## Features

- AI-powered resume analysis using Google Gemini AI
- ATS Score calculation based on job description matching
- Resume parsing for PDF and DOCX files
- Keyword extraction and missing keyword detection
- Skill gap analysis with improvement suggestions
- Resume history management
- Multiple resume upload support
- Fast and responsive user interface
- MongoDB database integration
- RESTful API architecture
- Responsive design for desktop and mobile devices

---

## Technologies Used

### Frontend

- React.js
- Vite
- CSS3
- JavaScript (ES6+)

### Backend

- Node.js
- Express.js

### Database

- MongoDB
- Mongoose

### AI Integration

- Google Gemini AI API

### Other Libraries

- Multer
- PDF Parser
- DOCX Parser
- Axios

---

## Project Modules

- Resume Upload Module
- Resume Parsing Module
- Job Description Analyzer
- ATS Score Calculator
- AI Recommendation Engine
- Resume History Module
- MongoDB Data Management
- REST API Layer

---

## Key Functionalities

- Upload resumes in PDF or DOCX format
- Compare resumes with any job description
- Generate ATS compatibility score
- Detect missing technical skills and keywords
- Receive AI-generated resume improvement suggestions
- Store previous resume analyses
- View resume analysis history
- Clean and responsive user interface

---

## Security Features

- File upload validation
- Environment variable configuration
- MongoDB schema validation
- Error handling
- Secure API architecture

---

## Future Improvements

- User authentication
- Dashboard analytics
- Resume version comparison
- Cover letter generator
- AI interview preparation
- Resume template generator
- LinkedIn profile analyzer
- Export analysis as PDF
- Email reports
- Multi-language support

---

## Project Architecture

User

↓

React Frontend

↓

Express REST API

↓

Resume Parser

↓

Google Gemini AI

↓

MongoDB Database

---

## Installation

```bash
git clone https://github.com/Akshay8789/resume-score-ai.git

cd resume-score-ai

npm install

cd client
npm install

cd ../server
npm install

npm run dev
```

---

## Environment Variables

Create a `.env` file inside the server folder.

```env
PORT=5000

MONGO_URI=your_mongodb_connection

GEMINI_API_KEY=your_gemini_api_key
```

---

## Author

**Akshay Rajput**

GitHub:
https://github.com/Akshay8789

---

## License

This project is licensed under the MIT License.
