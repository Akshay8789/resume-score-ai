# Comprehensive Security Vulnerability Report

**Project Name:** AI Resume ATS Score Checker  
**Audit Date:** August 4, 2026  
**Scope:** Full-stack MERN Application (`server/` and `client/`)  
**Report File:** `SECURITY_VULNERABILITIES.md`

---

## Executive Summary

A comprehensive security analysis was conducted on the **AI Resume ATS Score Checker** codebase. The analysis covered server-side routes, controllers, middleware, data storage, API key management, client-side data handling, file parsing logic, and third-party dependencies.

Multiple security vulnerabilities were identified, ranging from **High/Critical** (Insecure Direct Object Reference / Missing Authentication, Candidate PII Data Exposure, Client-Side API Key Storage) to **Medium** (Unrestricted CORS, Extension-Only File Upload Validation, Lack of Rate Limiting, ReDoS, Vulnerable Dependencies) and **Low** (Missing Security Headers, Verbose Error Output).

---

## Vulnerability Summary Matrix

| ID | Vulnerability Name | Category | Severity | Impacted File(s) |
|---|---|---|---|---|
| **VULN-01** | Insecure Direct Object Reference (IDOR) & Missing Auth | Broken Access Control | **CRITICAL** | [`server/routes/api.js`](file:///home/akshayrajput8789/resume-score-ai-main/server/routes/api.js#L45-L103) |
| **VULN-02** | Unencrypted Candidate PII Exposure | Privacy & Data Leakage | **HIGH** | [`server/routes/api.js`](file:///home/akshayrajput8789/resume-score-ai-main/server/routes/api.js#L52), [`server/models/Resume.js`](file:///home/akshayrajput8789/resume-score-ai-main/server/models/Resume.js#L42) |
| **VULN-03** | Insecure API Key Storage (`localStorage`) & Header Injection | Sensitive Data Exposure | **HIGH** | [`client/src/App.jsx`](file:///home/akshayrajput8789/resume-score-ai-main/client/src/App.jsx#L125-L148), [`server/controllers/parserController.js`](file:///home/akshayrajput8789/resume-score-ai-main/server/controllers/parserController.js#L302) |
| **VULN-04** | Permissive Wildcard CORS Policy (`cors()`) | Cross-Origin Security | **HIGH** | [`server/server.js`](file:///home/akshayrajput8789/resume-score-ai-main/server/server.js#L13) |
| **VULN-05** | Extension-Only File Upload Validation (MIME Bypass) | Unvalidated File Upload | **MEDIUM** | [`server/routes/api.js`](file:///home/akshayrajput8789/resume-score-ai-main/server/routes/api.js#L21-L30) |
| **VULN-06** | Absence of Rate Limiting (DoS & API Quota Drain) | Denial of Service | **MEDIUM** | [`server/server.js`](file:///home/akshayrajput8789/resume-score-ai-main/server/server.js#L9), [`server/routes/api.js`](file:///home/akshayrajput8789/resume-score-ai-main/server/routes/api.js#L42) |
| **VULN-07** | Dynamic Regular Expression Denial of Service (ReDoS) | Resource Exhaustion | **MEDIUM** | [`server/controllers/parserController.js`](file:///home/akshayrajput8789/resume-score-ai-main/server/controllers/parserController.js#L99-L105) |
| **VULN-08** | Vulnerable Node & Client Dependencies (CVEs) | Dependency Management | **MEDIUM** | [`server/package.json`](file:///home/akshayrajput8789/resume-score-ai-main/server/package.json), [`client/package.json`](file:///home/akshayrajput8789/resume-score-ai-main/client/package.json) |
| **VULN-09** | Missing HTTP Security Headers (No Helmet / CSP) | Security Hardening | **LOW** | [`server/server.js`](file:///home/akshayrajput8789/resume-score-ai-main/server/server.js#L9) |
| **VULN-10** | Verbose Error Disclosure & Sensitive Logging | Information Disclosure | **LOW** | [`server/server.js`](file:///home/akshayrajput8789/resume-score-ai-main/server/server.js#L55-L61), [`server/config/db.js`](file:///home/akshayrajput8789/resume-score-ai-main/server/config/db.js#L8) |

---

## Detailed Vulnerability Analysis & Remediation Plan

---

### VULN-01: Insecure Direct Object Reference (IDOR) & Missing Authentication
- **Severity:** **CRITICAL**
- **Affected File:** [`server/routes/api.js`](file:///home/akshayrajput8789/resume-score-ai-main/server/routes/api.js#L45-L103)
- **Description:**
  - `GET /api/history` fetches and returns all candidate resume records (`Resume.find()`) across the entire system without authenticating the requester or scoping queries by user ID.
  - `DELETE /api/resume/:id` accepts an arbitrary document ID and deletes it without verifying whether the requesting client created or owns that entry.
- **Impact:** Any unauthenticated third-party user or attacker can enumerate and read all submitted candidate resumes, or delete records belonging to other users.
- **Remediation:**
  1. Implement an authentication layer (e.g., JWT, OAuth2, or Session cookies).
  2. Associate each uploaded resume document with a authenticated `userId`.
  3. Scope `GET /api/history` and `DELETE /api/resume/:id` queries strictly to `req.user.id`.

---

### VULN-02: Unencrypted Storage & Leakage of Candidate Personally Identifiable Information (PII)
- **Severity:** **HIGH**
- **Affected Files:**
  - [`server/models/Resume.js`](file:///home/akshayrajput8789/resume-score-ai-main/server/models/Resume.js#L42)
  - [`server/routes/api.js`](file:///home/akshayrajput8789/resume-score-ai-main/server/routes/api.js#L52)
  - [`server/controllers/parserController.js`](file:///home/akshayrajput8789/resume-score-ai-main/server/controllers/parserController.js#L336)
- **Description:** Resumes typically contain sensitive candidate PII (full names, phone numbers, email addresses, home addresses, work history).
  - The application stores raw extracted text (`parsedText`) and candidate data unencrypted in MongoDB or in a global server object (`global.inMemoryStore`).
  - In-memory store fallback persists across requests without access controls.
- **Impact:** Exposure of user data violates data privacy compliance standard requirements (e.g., GDPR, CCPA).
- **Remediation:**
  1. Avoid storing full extracted candidate resume raw text unless explicitly required.
  2. Encrypt sensitive fields at rest in MongoDB using envelope encryption or Mongoose field-level encryption middleware.
  3. Purge or mask PII fields when returning data in summary/history responses.

---

### VULN-03: Insecure API Key Storage (`localStorage`) & Transmission via Headers
- **Severity:** **HIGH**
- **Affected Files:**
  - [`client/src/App.jsx`](file:///home/akshayrajput8789/resume-score-ai-main/client/src/App.jsx#L125-L148)
  - [`server/controllers/parserController.js`](file:///home/akshayrajput8789/resume-score-ai-main/server/controllers/parserController.js#L302)
- **Description:**
  - The React client saves the user's Google Gemini API Key in browser `localStorage` (`localStorage.setItem('gemini_api_key', apiKey)`).
  - The key is transmitted to the server via the custom header `x-gemini-key`.
- **Impact:**
  - Any XSS vulnerability or malicious browser extension running in the user's browser can extract the Gemini API key from `localStorage`.
  - Transmitting third-party secret keys from client to server exposes them to proxy logs, middleboxes, or backend logging.
- **Remediation:**
  1. Store third-party API keys securely on the server side in environment variables (`.env`).
  2. Do not require users to input personal secret API keys in the client UI unless scoped to ephemeral client-side direct calls, or proxy through an authenticated backend gateway.

---

### VULN-04: Permissive Wildcard CORS Policy (`cors()`)
- **Severity:** **HIGH**
- **Affected File:** [`server/server.js`](file:///home/akshayrajput8789/resume-score-ai-main/server/server.js#L13)
- **Description:**
  `app.use(cors())` is invoked without configuration, enabling `Access-Control-Allow-Origin: *`.
- **Impact:** Any malicious website running in a user's browser can issue cross-origin requests to the ATS server to read history or execute actions.
- **Remediation:** Restrict CORS configuration to explicit trusted origins:
  ```javascript
  const allowedOrigins = process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : ['http://localhost:3000'];
  app.use(cors({ origin: allowedOrigins, credentials: true }));
  ```

---

### VULN-05: Extension-Only File Upload Validation (MIME / Magic Byte Bypass)
- **Severity:** **MEDIUM**
- **Affected File:** [`server/routes/api.js`](file:///home/akshayrajput8789/resume-score-ai-main/server/routes/api.js#L21-L30)
- **Description:**
  Multer filter relies strictly on string extension matching (`path.extname(file.originalname)`). It does not inspect the binary signature (magic bytes) or verified MIME type of uploaded files.
- **Impact:** An attacker can rename arbitrary binary/script files to `.pdf` or `.docx` and upload them to the server upload directory.
- **Remediation:** Validate true magic bytes of incoming file streams (e.g., using `file-type` package) before accepting files into memory or disk storage.

---

### VULN-06: Absence of Rate Limiting (DoS & API Quota Exhaustion)
- **Severity:** **MEDIUM**
- **Affected Files:**
  - [`server/server.js`](file:///home/akshayrajput8789/resume-score-ai-main/server/server.js#L9)
  - [`server/routes/api.js`](file:///home/akshayrajput8789/resume-score-ai-main/server/routes/api.js#L42)
- **Description:**
  The server has no rate-limiting middleware configured on `/api/analyze` or global application endpoints.
- **Impact:** Attackers can send automated burst requests with max allowed files (5 x 10MB), causing high CPU load during PDF parsing or depleting Google Gemini API quotas.
- **Remediation:** Add `express-rate-limit` middleware:
  ```javascript
  const rateLimit = require('express-rate-limit');
  const analyzeLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20, // Limit each IP to 20 analyze requests per windowMs
    message: 'Too many resume analysis requests from this IP, please try again later.'
  });
  router.post('/analyze', analyzeLimiter, upload.array('resumes', 5), analyzeResumes);
  ```

---

### VULN-07: Dynamic Regular Expression Denial of Service (ReDoS)
- **Severity:** **MEDIUM**
- **Affected File:** [`server/controllers/parserController.js`](file:///home/akshayrajput8789/resume-score-ai-main/server/controllers/parserController.js#L99-L105)
- **Description:**
  User-supplied Job Description text is used to generate dynamic keyword sets, which are then passed into `new RegExp(\`\\b${escapedWord}\\b\`, 'i')` and evaluated against resume text.
- **Impact:** Pathological text strings in candidate resumes or job descriptions can cause catastrophic backtracking in the Node JavaScript regex engine, hanging the event loop.
- **Remediation:** Replace dynamic regex creation with exact string tokenization and set lookup or use a safe matching library.

---

### VULN-08: Vulnerable Third-Party Dependencies (npm Advisories)
- **Severity:** **MEDIUM**
- **Affected Files:**
  - [`server/package.json`](file:///home/akshayrajput8789/resume-score-ai-main/server/package.json)
  - [`client/package.json`](file:///home/akshayrajput8789/resume-score-ai-main/client/package.json)
- **Description:**
  An audit revealed vulnerable nested dependencies:
  - `brace-expansion` (High Severity - DoS via unbounded expansion)
  - `mongoose` (Moderate Severity - Prototype pollution via update casting GHSA-664h-wqgq-64gw)
  - `vite` & `esbuild` (High/Moderate Severity - Path traversal in dev server / source maps)
- **Remediation:**
  Upgrade packages to fixed versions:
  - Server: Upgrade `mongoose` to `>=8.24.1` and run `npm audit fix`.
  - Client: Upgrade `vite` and `esbuild` dependencies.

---

### VULN-09: Absence of HTTP Security Headers (Missing Helmet / CSP)
- **Severity:** **LOW**
- **Affected File:** [`server/server.js`](file:///home/akshayrajput8789/resume-score-ai-main/server/server.js#L9)
- **Description:** Express application lacks security response headers (e.g., `Content-Security-Policy`, `X-Content-Type-Options`, `X-Frame-Options`, `Strict-Transport-Security`).
- **Impact:** Higher vulnerability to clickjacking, XSS attacks, MIME sniffing, and protocol downgrade attacks.
- **Remediation:** Integrate `helmet` middleware:
  ```javascript
  const helmet = require('helmet');
  app.use(helmet());
  ```

---

### VULN-10: Information Disclosure in Error Responses & Verbose Logging
- **Severity:** **LOW**
- **Affected Files:**
  - [`server/server.js`](file:///home/akshayrajput8789/resume-score-ai-main/server/server.js#L55-L61)
  - [`server/config/db.js`](file:///home/akshayrajput8789/resume-score-ai-main/server/config/db.js#L8)
  - [`server/controllers/parserController.js`](file:///home/akshayrajput8789/resume-score-ai-main/server/controllers/parserController.js#L392)
- **Description:**
  - Database connection URI (which may contain username/password strings) is logged in plaintext: `console.log('[Database] Attempting connection to MongoDB at: ${mongoURI}')`.
  - Unhandled error messages (`err.message`) are returned directly to API clients in HTTP 500 error responses.
- **Impact:** System paths, database hostnames/credentials, or internal library exception details can be leaked to external users.
- **Remediation:**
  1. Redact credentials when logging connection strings.
  2. Return generic user-friendly messages in production (e.g., `"Internal Server Error"`) while logging full details internally.

---

## Conclusion & Next Steps

Addressing these vulnerabilities will ensure that the **AI Resume ATS Score Checker** application protects candidate data, secures third-party AI keys, and safeguards the server against unauthorized access and denial-of-service vectors.

**Recommended Action Plan:**
1. Fix **VULN-01** (IDOR/Auth) and **VULN-04** (CORS) immediately.
2. Secure API key storage and removal from `localStorage` (**VULN-03**).
3. Implement file magic-byte validation (**VULN-05**) and rate limiting (**VULN-06**).
4. Update npm dependencies (**VULN-08**) and add `helmet` security headers (**VULN-09**).
