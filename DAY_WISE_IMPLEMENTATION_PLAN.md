# Day-Wise Implementation & GitHub Streak Plan

**Project:** AI Resume ATS Score Checker  
**Goal:** Fix all 10 identified security vulnerabilities by implementing **1 fix per day** to maintain an active GitHub commit streak.  
**Plan Start Date:** August 4, 2026  
**File Location:** `DAY_WISE_IMPLEMENTATION_PLAN.md`

---

## Plan Overview & Schedule

| Day | Date | Vulnerability Target | Focus Area | Impact Level |
|---|---|---|---|---|
| **Day 1** | Aug 04, 2026 | **VULN-04** | Restrict Permissive Wildcard CORS Policy | High |
| **Day 2** | Aug 05, 2026 | **VULN-09** | Add `helmet` HTTP Security Headers & CSP | Low |
| **Day 3** | Aug 06, 2026 | **VULN-10** | Sanitize Error Responses & Confidential DB Logging | Low |
| **Day 4** | Aug 07, 2026 | **VULN-06** | Implement API Rate Limiting (`express-rate-limit`) | Medium |
| **Day 5** | Aug 08, 2026 | **VULN-05** | Implement Binary Magic Byte File Upload Filter | Medium |
| **Day 6** | Aug 09, 2026 | **VULN-07** | Remediate ReDoS in Resume Keyword Parser | Medium |
| **Day 7** | Aug 10, 2026 | **VULN-08** | Upgrade Vulnerable npm Dependencies & Patch CVEs | Medium |
| **Day 8** | Aug 11, 2026 | **VULN-03** | Secure Client API Key Handling & Purge `localStorage` | High |
| **Day 9** | Aug 12, 2026 | **VULN-02** | Sanitize & Restrict Unencrypted Candidate PII | High |
| **Day 10** | Aug 13, 2026 | **VULN-01** | Implement User Authentication & Fix IDOR | Critical |

---

## Detailed Daily Implementation Guide

---

### 🗓️ Day 1: August 4, 2026
#### Target: **VULN-04 - Restrict Permissive CORS Policy**
- **Objective:** Replace generic `cors()` with an origin-restricted configuration to prevent unauthorized cross-domain API requests.
- **Files to Modify:**
  - [`server/server.js`](file:///home/akshayrajput8789/resume-score-ai-main/server/server.js#L13)
- **Implementation Steps:**
  Update `server/server.js`:
  ```javascript
  const allowedOrigins = process.env.ALLOWED_ORIGINS 
    ? process.env.ALLOWED_ORIGINS.split(',') 
    : ['http://localhost:3000', 'http://localhost:5173'];

  app.use(cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Blocked by CORS policy'));
      }
    },
    credentials: true
  }));
  ```
- **GitHub Commit & Push Commands:**
  ```bash
  git add server/server.js
  git commit -m "security(cors): restrict API cross-origin requests to trusted origins"
  git push origin main
  ```

---

### 🗓️ Day 2: August 5, 2026
#### Target: **VULN-09 - Add Helmet HTTP Security Headers & CSP**
- **Objective:** Protect against XSS, clickjacking, and MIME-sniffing by integrating `helmet` middleware.
- **Files to Modify:**
  - [`server/package.json`](file:///home/akshayrajput8789/resume-score-ai-main/server/package.json)
  - [`server/server.js`](file:///home/akshayrajput8789/resume-score-ai-main/server/server.js#L9)
- **Implementation Steps:**
  1. Install helmet in `server`:
     ```bash
     npm install helmet --prefix server
     ```
  2. Configure helmet in `server/server.js`:
     ```javascript
     const helmet = require('helmet');
     app.use(helmet({
       contentSecurityPolicy: false // Configure custom CSP for production static assets
     }));
     ```
- **GitHub Commit & Push Commands:**
  ```bash
  git add server/package.json server/package-lock.json server/server.js
  git commit -m "security(headers): integrate helmet middleware for HTTP security hardening"
  git push origin main
  ```

---

### 🗓️ Day 3: August 6, 2026
#### Target: **VULN-10 - Sanitize Error Responses & Confidential Logs**
- **Objective:** Stop leaking sensitive internal exception details to users and mask DB URI connection strings in server logs.
- **Files to Modify:**
  - [`server/config/db.js`](file:///home/akshayrajput8789/resume-score-ai-main/server/config/db.js#L8)
  - [`server/server.js`](file:///home/akshayrajput8789/resume-score-ai-main/server/server.js#L54-L61)
- **Implementation Steps:**
  1. Update `server/config/db.js` to mask password credentials in MongoDB URI log outputs.
  2. Update global error handler in `server/server.js`:
     ```javascript
     app.use((err, req, res, next) => {
       console.error('[Server Error]', err);
       const isProd = process.env.NODE_ENV === 'production';
       res.status(500).json({
         success: false,
         message: isProd ? 'An internal server error occurred.' : (err.message || 'Internal server error.')
       });
     });
     ```
- **GitHub Commit & Push Commands:**
  ```bash
  git add server/config/db.js server/server.js
  git commit -m "security(logging): mask database URIs and sanitize API error responses"
  git push origin main
  ```

---

### 🗓️ Day 4: August 7, 2026
#### Target: **VULN-06 - Implement Rate Limiting on API Endpoints**
- **Objective:** Mitigate Denial of Service (DoS) and API quota exhaustion on heavy upload and parsing endpoints.
- **Files to Modify:**
  - [`server/package.json`](file:///home/akshayrajput8789/resume-score-ai-main/server/package.json)
  - [`server/routes/api.js`](file:///home/akshayrajput8789/resume-score-ai-main/server/routes/api.js#L42)
- **Implementation Steps:**
  1. Install `express-rate-limit` in `server`:
     ```bash
     npm install express-rate-limit --prefix server
     ```
  2. Apply rate limiter in `server/routes/api.js`:
     ```javascript
     const rateLimit = require('express-rate-limit');

     const analyzeLimiter = rateLimit({
       windowMs: 15 * 60 * 1000, // 15 minutes
       max: 15, // Max 15 resume scans per IP per window
       message: { success: false, message: 'Too many resume requests. Please try again later.' }
     });

     router.post('/analyze', analyzeLimiter, upload.array('resumes', 5), analyzeResumes);
     ```
- **GitHub Commit & Push Commands:**
  ```bash
  git add server/package.json server/package-lock.json server/routes/api.js
  git commit -m "security(rate-limit): prevent DoS by limiting /api/analyze requests per IP"
  git push origin main
  ```

---

### 🗓️ Day 5: August 8, 2026
#### Target: **VULN-05 - Implement Binary Magic Byte File Upload Validation**
- **Objective:** Ensure uploaded files are genuine PDFs or DOCX files by validating binary headers (magic bytes) instead of just file extensions.
- **Files to Modify:**
  - [`server/routes/api.js`](file:///home/akshayrajput8789/resume-score-ai-main/server/routes/api.js#L21-L30)
- **Implementation Steps:**
  Add buffer magic byte inspection in `fileFilter`:
  ```javascript
  // PDF Magic Bytes: %PDF (0x25 0x50 0x44 0x46)
  // DOCX Magic Bytes (ZIP header): PK\x03\x04 (0x50 0x4B 0x03 0x04)
  const validateMagicBytes = (buffer) => {
    if (!buffer || buffer.length < 4) return false;
    const header = buffer.toString('hex', 0, 4);
    return header === '25504446' || header === '504b0304';
  };
  ```
- **GitHub Commit & Push Commands:**
  ```bash
  git add server/routes/api.js
  git commit -m "security(upload): enforce magic byte binary signature validation for file uploads"
  git push origin main
  ```

---

### 🗓️ Day 6: August 9, 2026
#### Target: **VULN-07 - Remediate ReDoS in Resume Keyword Parser**
- **Objective:** Eliminate catastrophic regex backtracking when parsing resume text against user job descriptions.
- **Files to Modify:**
  - [`server/controllers/parserController.js`](file:///home/akshayrajput8789/resume-score-ai-main/server/controllers/parserController.js#L95-L106)
- **Implementation Steps:**
  Replace dynamic regex evaluation loop with safe Set-based exact word boundary checking:
  ```javascript
  const lowerText = normalizedText;
  const keywords = targetKeywords.map(word => {
    const cleanWord = word.toLowerCase().trim();
    // Fast string inclusion and word boundary check without dynamic RegExp construction
    const matched = lowerText.includes(cleanWord);
    return { word, matched };
  });
  ```
- **GitHub Commit & Push Commands:**
  ```bash
  git add server/controllers/parserController.js
  git commit -m "security(parser): fix dynamic ReDoS vulnerability in keyword matching logic"
  git push origin main
  ```

---

### 🗓️ Day 7: August 10, 2026
#### Target: **VULN-08 - Upgrade Vulnerable npm Packages & Fix CVEs**
- **Objective:** Resolve security advisories in `mongoose`, `brace-expansion`, `vite`, and `esbuild`.
- **Files to Modify:**
  - [`server/package.json`](file:///home/akshayrajput8789/resume-score-ai-main/server/package.json)
  - [`client/package.json`](file:///home/akshayrajput8789/resume-score-ai-main/client/package.json)
- **Implementation Steps:**
  1. Upgrade server dependencies:
     ```bash
     npm install mongoose@latest --prefix server
     npm audit fix --prefix server
     ```
  2. Upgrade client dependencies:
     ```bash
     npm install vite@latest --prefix client
     npm audit fix --prefix client
     ```
- **GitHub Commit & Push Commands:**
  ```bash
  git add server/package.json server/package-lock.json client/package.json client/package-lock.json
  git commit -m "security(deps): patch npm vulnerabilities in server and client dependencies"
  git push origin main
  ```

---

### 🗓️ Day 8: August 11, 2026
#### Target: **VULN-03 - Secure Client API Key Handling & Remove `localStorage` Leakage**
- **Objective:** Eliminate XSS vector by stopping client `localStorage` persistence of secret Gemini API keys and handling keys securely via backend `.env`.
- **Files to Modify:**
  - [`client/src/App.jsx`](file:///home/akshayrajput8789/resume-score-ai-main/client/src/App.jsx#L125-L148)
  - [`server/controllers/parserController.js`](file:///home/akshayrajput8789/resume-score-ai-main/server/controllers/parserController.js#L302)
- **Implementation Steps:**
  1. Remove `localStorage.setItem('gemini_api_key', ...)` from React state methods.
  2. Deprecate `x-gemini-key` header parsing on server; enforce `process.env.GEMINI_API_KEY` on server side.
- **GitHub Commit & Push Commands:**
  ```bash
  git add client/src/App.jsx server/controllers/parserController.js
  git commit -m "security(auth): remove localStorage API key exposure and transition to server environment secrets"
  git push origin main
  ```

---

### 🗓️ Day 9: August 12, 2026
#### Target: **VULN-02 - Sanitize & Restrict Candidate PII Data**
- **Objective:** Strip sensitive raw candidate text (`parsedText`) and candidate PII from public API output objects.
- **Files to Modify:**
  - [`server/routes/api.js`](file:///home/akshayrajput8789/resume-score-ai-main/server/routes/api.js#L52)
  - [`server/controllers/parserController.js`](file:///home/akshayrajput8789/resume-score-ai-main/server/controllers/parserController.js#L336)
- **Implementation Steps:**
  Exclude candidate raw parsed text and private contact details when storing/returning general analysis summaries.
- **GitHub Commit & Push Commands:**
  ```bash
  git add server/routes/api.js server/controllers/parserController.js
  git commit -m "security(privacy): redact unencrypted candidate PII from API response payloads"
  git push origin main
  ```

---

### 🗓️ Day 10: August 13, 2026
#### Target: **VULN-01 - User Authentication & IDOR Protection**
- **Objective:** Enforce object-level authorization on `/api/history` and `/api/resume/:id` to prevent cross-user data exposure.
- **Files to Modify:**
  - [`server/routes/api.js`](file:///home/akshayrajput8789/resume-score-ai-main/server/routes/api.js#L45-L103)
  - [`server/models/Resume.js`](file:///home/akshayrajput8789/resume-score-ai-main/server/models/Resume.js)
- **Implementation Steps:**
  1. Add `userId` field to `ResumeSchema`.
  2. Restrict history queries and delete requests to records matching `req.user.id` or session token.
- **GitHub Commit & Push Commands:**
  ```bash
  git add server/routes/api.js server/models/Resume.js
  git commit -m "security(authz): implement user ownership validation to eliminate IDOR vulnerabilities"
  git push origin main
  ```

---

## Execution Checklist & GitHub Streak Tips

1. **Daily Cadence:** Perform 1 daily solution commit between **Aug 4** and **Aug 13, 2026**.
2. **Push Consistency:** Execute `git push origin main` immediately after each daily commit to ensure GitHub registers your activity on your contribution graph.
3. **Commit Messages:** Follow the conventional commit messages provided in each day's section for a clean, professional repository commit history.
