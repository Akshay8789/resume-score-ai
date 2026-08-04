import React, { useState, useEffect, useRef } from 'react';
import {
  UploadCloud,
  FileText,
  X,
  Briefcase,
  Layers,
  Tag,
  CheckCircle2,
  AlertTriangle,
  Trash2,
  History,
  Sparkles,
  Key,
  Check,
  ArrowRight,
  BarChart2,
  Info,
  Calendar,
  AlertCircle
} from 'lucide-react';
import confetti from 'canvas-confetti';

function App() {
  // Inputs
  const [files, setFiles] = useState([]);
  const [jobTitle, setJobTitle] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [apiKey, setApiKey] = useState(localStorage.getItem('gemini_api_key') || '');

  // UI States
  const [isDragActive, setIsDragActive] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard', 'comparison', 'history'
  const [activeResumeId, setActiveResumeId] = useState(null);

  // Data States
  const [results, setResults] = useState([]);
  const [history, setHistory] = useState([]);
  const [dbConnected, setDbConnected] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const fileInputRef = useRef(null);

  // Fetch history on startup
  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const response = await fetch('/api/history');
      const data = await response.json();
      if (data.success) {
        setHistory(data.history || []);
        setDbConnected(data.database === 'connected');
      }
    } catch (err) {
      console.error('Failed to fetch history:', err);
    }
  };

  // Drag and drop event handlers
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addFiles(e.dataTransfer.files);
    }
  };

  const fileSelected = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      addFiles(e.target.files);
    }
  };

  const addFiles = (selectedFiles) => {
    const validExtensions = ['.pdf', '.docx', '.doc'];
    const addedList = [...files];

    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      const ext = '.' + file.name.split('.').pop().toLowerCase();

      if (validExtensions.includes(ext)) {
        // Prevent duplicate files by checking name and size
        const isDuplicate = addedList.some(f => f.name === file.name && f.size === file.size);
        if (!isDuplicate) {
          addedList.push(file);
        }
      } else {
        alert(`File "${file.name}" is not supported. Please upload PDF or Word documents.`);
      }
    }
    setFiles(addedList);
  };

  const removeFile = (index) => {
    const updated = files.filter((_, i) => i !== index);
    setFiles(updated);
  };

  const saveApiKey = () => {
    localStorage.setItem('gemini_api_key', apiKey);
    setShowConfig(false);
    alert('Gemini API Key saved locally in your browser!');
  };

  const clearApiKey = () => {
    setApiKey('');
    localStorage.removeItem('gemini_api_key');
    setShowConfig(false);
    alert('Gemini API Key removed.');
  };

  // Run ATS Analysis
  const handleAnalyze = async (e) => {
    e.preventDefault();
    if (files.length === 0) return;

    setAnalyzing(true);
    setErrorMsg('');

    const formData = new FormData();
    files.forEach(file => {
      formData.append('resumes', file);
    });
    formData.append('jobTitle', jobTitle);
    formData.append('jobDescription', jobDescription);

    try {
      const headers = {};
      if (apiKey) {
        headers['x-gemini-key'] = apiKey;
      }

      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: headers,
        body: formData
      });

      const data = await response.json();

      if (data.success && data.results && data.results.length > 0) {
        setResults(data.results);
        setActiveResumeId(data.results[0]._id);
        setActiveTab('dashboard');

        // Refresh past history
        fetchHistory();

        // Celebration confetti if we got a high score
        const topScore = Math.max(...data.results.map(r => r.atsScore));
        if (topScore >= 80) {
          confetti({
            particleCount: 150,
            spread: 80,
            origin: { y: 0.6 }
          });
        }
      } else {
        setErrorMsg(data.message || 'An error occurred during analysis.');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Failed to connect to the analysis server. Please check that your server is running.');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleDeleteHistory = async (e, id) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this analysis record?')) return;

    try {
      const response = await fetch(`/api/resume/${id}`, { method: 'DELETE' });
      const data = await response.json();
      if (data.success) {
        // Remove from local states
        setHistory(history.filter(item => item._id !== id));
        setResults(results.filter(item => item._id !== id));
        if (activeResumeId === id) {
          const remaining = results.filter(item => item._id !== id);
          setActiveResumeId(remaining.length > 0 ? remaining[0]._id : null);
        }
      }
    } catch (err) {
      console.error('Failed to delete resume record:', err);
    }
  };

  const loadHistoryItem = (item) => {
    // History endpoint returns a summary without full parsed text for efficiency,
    // but contains score and audits. If we want details, we load it into results
    setResults([item]);
    setActiveResumeId(item._id);
    setActiveTab('dashboard');
  };

  // Helper variables
  const activeResume = results.find(r => r._id === activeResumeId);

  // Helper for animated progress ring color
  const getScoreColor = (score) => {
    if (score >= 80) return 'var(--color-success)';
    if (score >= 50) return 'var(--color-warning)';
    return 'var(--color-error)';
  };

  const getScoreRating = (score) => {
    if (score >= 80) return { text: 'Good ATS Match', class: 'good' };
    if (score >= 50) return { text: 'Fair Match', class: 'fair' };
    return { text: 'Poor ATS Match', class: 'poor' };
  };

  return (
    <div className="app-container">
      {/* App Header */}
      <header className="app-header">
        <div className="logo-container">
          <div className="logo-icon">
            <Sparkles size={22} color="#fff" />
          </div>
          <div>
            <h1 className="logo-text">AI Resume Checker</h1>
            <span style={{ fontSize: '0.65rem', color: 'var(--text-dim)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              Multi-Resume Heuristic Analyzer
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {/* MongoDB Status badge */}
          {dbConnected ? (
            <span className="badge-status connected">
              <span className="pulse-dot" style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--color-success)', display: 'inline-block' }}></span>
              MongoDB Active
            </span>
          ) : (
            <span className="badge-status sandbox" title="Server is falling back to server memory because local MongoDB is offline.">
              <span className="pulse-dot" style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--color-warning)', display: 'inline-block' }}></span>
              Sandbox Mode
            </span>
          )}

          {/* API Key Panel trigger */}
          <button className="config-trigger" onClick={() => setShowConfig(!showConfig)}>
            <Key size={14} />
            {apiKey ? 'API Key Saved' : 'Configure AI'}
          </button>
        </div>
      </header>

      {/* Main Workspace Layout */}
      <main className="main-workspace">

        {/* LEFT COLUMN: Input Sidebar */}
        <section className="sidebar-panel">

          {/* Optional API config box */}
          {showConfig && (
            <div className="glass-card highlighted">
              <div className="card-title">
                <Sparkles size={16} color="var(--color-primary)" />
                <span>Google Gemini API Configuration</span>
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                Optionally paste your Gemini API key below to unlock advanced semantic AI resume feedback. Leave blank to run local parsing.
              </p>
              <div className="config-panel">
                <input
                  type="password"
                  placeholder="Enter Gemini API Key..."
                  className="config-input"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                />
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
                  <button className="btn-primary" style={{ padding: '0.45rem', fontSize: '0.8rem' }} onClick={saveApiKey}>
                    <Check size={14} /> Save
                  </button>
                  {localStorage.getItem('gemini_api_key') && (
                    <button
                      className="btn-primary"
                      style={{ padding: '0.45rem', fontSize: '0.8rem', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--color-error)', border: '1px solid rgba(239, 68, 68, 0.2)', boxShadow: 'none' }}
                      onClick={clearApiKey}
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Core Analyzer Controls */}
          <div className="glass-card">
            <div className="card-title">
              <Briefcase size={18} color="var(--color-primary)" />
              <span>Target Role Details</span>
            </div>

            <form onSubmit={handleAnalyze} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label className="input-label" htmlFor="job-title-input">Job Title</label>
                <input
                  type="text"
                  id="job-title-input"
                  placeholder="e.g. Senior Frontend Engineer"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    background: 'rgba(0, 0, 0, 0.25)',
                    border: '1px solid var(--border-light)',
                    borderRadius: '10px',
                    color: '#fff',
                    outline: 'none',
                    fontSize: '0.875rem'
                  }}
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                />
              </div>

              <div>
                <label className="input-label" htmlFor="job-desc-input">Job Description Keywords Matcher</label>
                <textarea
                  id="job-desc-input"
                  className="text-area"
                  placeholder="Paste the target job description here. Our analyzer will identify keywords and run an intersection check..."
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                />
              </div>

              <div>
                <label className="input-label">Upload Resumes (Multiple files supported)</label>

                {/* File Dropzone */}
                <div
                  className={`dropzone ${isDragActive ? 'drag-active' : ''}`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current.click()}
                >
                  <UploadCloud size={32} className="dropzone-icon" />
                  <div>
                    <p style={{ fontSize: '0.85rem', fontWeight: 500 }}>Drag & drop files or click to browse</p>
                    <span className="file-specs">Supports PDF, DOCX (Max 10MB per file)</span>
                  </div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    style={{ display: 'none' }}
                    multiple
                    accept=".pdf,.docx,.doc"
                    onChange={fileSelected}
                  />
                </div>

                {/* Selected Files List */}
                {files.length > 0 && (
                  <div className="uploaded-files-list">
                    {files.map((file, idx) => (
                      <div className="file-item" key={`${file.name}-${idx}`}>
                        <div className="file-item-info">
                          <FileText size={14} color="var(--color-secondary)" />
                          <span className="file-name" title={file.name}>{file.name}</span>
                        </div>
                        <button type="button" className="file-remove" onClick={() => removeFile(idx)}>
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {errorMsg && (
                <div style={{ display: 'flex', gap: '0.5rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '0.75rem', borderRadius: '10px', fontSize: '0.8rem', color: 'var(--color-error)' }}>
                  <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
                  <span>{errorMsg}</span>
                </div>
              )}

              <button
                type="submit"
                className="btn-primary"
                disabled={files.length === 0 || analyzing}
              >
                {analyzing ? (
                  <>
                    <span className="spinner" style={{ width: 16, height: 16, borderThickness: '2px' }}></span>
                    Parsing & Analyzing...
                  </>
                ) : (
                  <>
                    Analyze Resumes
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>
          </div>
        </section>

        {/* RIGHT COLUMN: Output Dashboard & Tabs */}
        <section className="dashboard-panel">

          {/* Navigation tabs */}
          <div className="tabs-container">
            <button
              className={`tab-button ${activeTab === 'dashboard' ? 'active' : ''}`}
              onClick={() => setActiveTab('dashboard')}
            >
              Analysis Report
            </button>
            <button
              className={`tab-button ${activeTab === 'comparison' ? 'active' : ''}`}
              onClick={() => setActiveTab('comparison')}
            >
              Resume Comparison Matrix ({results.length})
            </button>
            <button
              className={`tab-button ${activeTab === 'history' ? 'active' : ''}`}
              onClick={() => setActiveTab('history')}
            >
              Past Scans History ({history.length})
            </button>
          </div>

          {/* TAB 1: Detailed Resume Report Dashboard */}
          {activeTab === 'dashboard' && (
            <>
              {results.length === 0 ? (
                <div className="glass-card empty-state">
                  <FileText className="empty-state-icon" size={48} />
                  <div>
                    <h3 style={{ fontSize: '1.25rem', color: '#fff', marginBottom: '0.25rem' }}>No Analysis Results Loaded</h3>
                    <p style={{ fontSize: '0.875rem' }}>Paste a job description and upload one or more resumes to calculate ATS scores.</p>
                  </div>
                </div>
              ) : (
                <>
                  {/* Horizontal resume switcher if multiple results */}
                  {results.length > 1 && (
                    <div className="resume-tabs-strip">
                      {results.map((res) => (
                        <button
                          key={res._id}
                          className={`resume-pill ${activeResumeId === res._id ? 'active' : ''}`}
                          onClick={() => setActiveResumeId(res._id)}
                        >
                          {res.fileName} ({res.atsScore}%)
                        </button>
                      ))}
                    </div>
                  )}

                  {activeResume && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

                      {/* Overall ATS Score Summary Card */}
                      <div className="glass-card highlighted">
                        <div className="score-overview-section">
                          <div className="circular-score-wrapper">
                            <svg className="circular-score-svg" viewBox="0 0 160 160">
                              <circle className="score-track" cx="80" cy="80" r="70" strokeWidth="10" />
                              <circle
                                className="score-fill"
                                cx="80"
                                cy="80"
                                r="70"
                                strokeWidth="10"
                                stroke={getScoreColor(activeResume.atsScore)}
                                style={{
                                  strokeDashoffset: 439.8 - (439.8 * activeResume.atsScore) / 100
                                }}
                              />
                            </svg>
                            <div className="score-number-overlay">
                              <span className="score-val" style={{ color: getScoreColor(activeResume.atsScore) }}>
                                {activeResume.atsScore}
                              </span>
                              <span className="score-label">% Score</span>
                            </div>
                          </div>

                          <div className="score-text-details">
                            <h2 style={{ color: '#fff' }}>ATS Score Audit</h2>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', maxWidth: '500px' }}>
                              Detailed analysis of **{activeResume.fileName}** evaluated against the **{activeResume.jobTitle}** role description.
                            </p>

                            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginTop: '0.75rem' }}>
                              <span className={`score-rating-badge ${getScoreRating(activeResume.atsScore).class}`}>
                                {getScoreRating(activeResume.atsScore).text}
                              </span>

                              <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>
                                Analyzed on {new Date(activeResume.uploadedAt).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Main Analysis Breakdowns Grid */}
                      <div className="dashboard-grid">

                        {/* Box A: Section Audits */}
                        <div className="glass-card">
                          <div className="card-title">
                            <Layers size={16} color="var(--color-primary)" />
                            <span>Structural Sections Check</span>
                          </div>
                          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                            ATS parsers look for core headings to segment your history. Missing headings can prevent parsing.
                          </p>

                          <div className="section-indicator-list">
                            {activeResume.sections.map((sec, idx) => (
                              <div className="section-indicator-item" key={`${sec.name}-${idx}`}>
                                <span className="section-label">
                                  <FileText size={14} color="var(--text-dim)" />
                                  {sec.name}
                                </span>
                                <span className={`status-badge ${sec.found ? 'found' : 'missing'}`}>
                                  {sec.found ? (
                                    <>
                                      <CheckCircle2 size={14} /> Found
                                    </>
                                  ) : (
                                    <>
                                      <AlertTriangle size={14} /> Missing
                                    </>
                                  )}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Box B: Formatting Audits */}
                        <div className="glass-card">
                          <div className="card-title">
                            <BarChart2 size={16} color="var(--color-primary)" />
                            <span>Formatting & Structure Review</span>
                          </div>
                          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                            Scans for formatting red flags such as excessive page lengths, missing contacts, or missing bullets.
                          </p>

                          <div className="formatting-audits">
                            {activeResume.formattingMetrics.map((met, idx) => (
                              <div className="audit-item" key={`${met.metricName}-${idx}`}>
                                <div className="audit-meta">
                                  <span className="audit-name">{met.metricName}</span>
                                  <span style={{ fontWeight: 600, color: met.passed ? 'var(--color-success)' : 'var(--color-warning)' }}>
                                    {met.rating}/100
                                  </span>
                                </div>
                                <div className="audit-bar-track">
                                  <div
                                    className="audit-bar-fill"
                                    style={{
                                      width: `${met.rating}%`,
                                      background: met.passed ? 'linear-gradient(90deg, var(--color-secondary), var(--color-success))' : 'linear-gradient(90deg, var(--color-warning), var(--color-error))'
                                    }}
                                  ></div>
                                </div>
                                <span className="audit-desc">{met.feedback}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                      </div>

                      {/* Keywords Panel */}
                      <div className="glass-card">
                        <div className="card-title">
                          <Tag size={16} color="var(--color-primary)" />
                          <span>Job Keyword Intersection Checks</span>
                        </div>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                          These high-value terminology tokens were found in the job description. Integrate missing terms naturally.
                        </p>

                        <div className="keywords-grid">
                          {activeResume.keywords && activeResume.keywords.length > 0 ? (
                            activeResume.keywords.map((kw, idx) => (
                              <span
                                key={`${kw.word}-${idx}`}
                                className={`keyword-badge ${kw.matched ? 'match' : 'missing'}`}
                              >
                                {kw.matched ? <CheckCircle2 size={10} /> : <AlertTriangle size={10} />}
                                {kw.word}
                              </span>
                            ))
                          ) : (
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)', padding: '1rem 0' }}>
                              No keywords identified. Paste a Job Description to enable detailed keyword comparison checks.
                            </span>
                          )}
                        </div>
                      </div>

                      {/* AI Recommendations Action Card */}
                      <div className="glass-card">
                        <div className="card-title">
                          <Sparkles size={16} color="var(--color-primary)" />
                          <span>Actionable Recommendations to Improve Score</span>
                        </div>

                        <div className="recommendations-list">
                          {activeResume.recommendations.map((rec, idx) => (
                            <div className={`rec-item ${rec.impact.toLowerCase()}`} key={`rec-${idx}`}>
                              <div className="rec-icon">
                                <Info size={16} />
                              </div>
                              <div className="rec-body">
                                <span className="rec-suggestion">{rec.suggestion}</span>
                                <span className="rec-impact-badge">{rec.impact} Impact</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                    </div>
                  )}
                </>
              )}
            </>
          )}

          {/* TAB 2: Resume Comparison Matrix */}
          {activeTab === 'comparison' && (
            <div className="glass-card">
              <div className="card-title">
                <Layers size={18} color="var(--color-primary)" />
                <span>Uploaded Resumes Matrix Comparison</span>
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
                Compare scores, section ratings, and missing keyword counts side-by-side to choose your best performing resume version.
              </p>

              {results.length === 0 ? (
                <div className="empty-state" style={{ padding: '3rem 1rem' }}>
                  <FileText className="empty-state-icon" size={36} />
                  <p style={{ fontSize: '0.85rem' }}>No uploaded resumes to compare yet.</p>
                </div>
              ) : (
                <div className="comparison-container">
                  <div className="table-wrapper">
                    <table className="comparison-table">
                      <thead>
                        <tr>
                          <th>Resume Name</th>
                          <th>Role Scope</th>
                          <th>ATS Score</th>
                          <th>Sections Passed</th>
                          <th>Missing Skills</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {results.map((res) => {
                          const sectionsPassed = res.sections.filter(s => s.found).length;
                          const missingKeywords = res.keywords ? res.keywords.filter(k => !k.matched).length : 0;

                          return (
                            <tr key={res._id}>
                              <td style={{ fontWeight: 600, color: '#fff' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                  <FileText size={14} color="var(--color-primary)" />
                                  <span>{res.fileName}</span>
                                </div>
                              </td>
                              <td>{res.jobTitle}</td>
                              <td>
                                <span
                                  className="comparison-score-pill"
                                  style={{
                                    background: `${getScoreColor(res.atsScore)}20`,
                                    color: getScoreColor(res.atsScore),
                                    border: `1px solid ${getScoreColor(res.atsScore)}40`
                                  }}
                                >
                                  {res.atsScore}%
                                </span>
                              </td>
                              <td>
                                <span style={{ fontWeight: 500 }}>{sectionsPassed} / {res.sections.length}</span>
                              </td>
                              <td style={{ color: missingKeywords > 0 ? 'var(--color-warning)' : 'var(--color-success)' }}>
                                {missingKeywords} missing
                              </td>
                              <td>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                  <button
                                    className="btn-primary"
                                    style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem', width: 'auto', boxShadow: 'none' }}
                                    onClick={() => {
                                      setActiveResumeId(res._id);
                                      setActiveTab('dashboard');
                                    }}
                                  >
                                    View Report
                                  </button>
                                  <button
                                    className="file-remove"
                                    style={{ border: '1px solid var(--border-light)', borderRadius: '8px', padding: '0.35rem' }}
                                    onClick={(e) => handleDeleteHistory(e, res._id)}
                                    title="Delete from database"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: History list */}
          {activeTab === 'history' && (
            <div className="glass-card">
              <div className="card-title">
                <History size={18} color="var(--color-primary)" />
                <span>Past Submissions Database History</span>
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
                Access previously processed resumes stored on MongoDB. Click a card to reload the full audit analysis details.
              </p>

              {history.length === 0 ? (
                <div className="empty-state" style={{ padding: '3rem 1rem' }}>
                  <History className="empty-state-icon" size={36} />
                  <p style={{ fontSize: '0.85rem' }}>No past resume analyses stored in the database.</p>
                </div>
              ) : (
                <div className="history-list">
                  {history.map((item) => (
                    <div
                      className="history-item"
                      key={item._id}
                      onClick={() => loadHistoryItem(item)}
                    >
                      <div className="history-item-details">
                        <span className="history-name">{item.fileName}</span>
                        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginTop: '0.25rem' }}>
                          <span className="history-meta" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <Briefcase size={10} /> {item.jobTitle}
                          </span>
                          <span className="history-meta" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <Calendar size={10} /> {new Date(item.uploadedAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <span
                          className="history-score-badge"
                          style={{
                            background: `${getScoreColor(item.atsScore)}20`,
                            color: getScoreColor(item.atsScore),
                            border: `1px solid ${getScoreColor(item.atsScore)}40`
                          }}
                        >
                          {item.atsScore}%
                        </span>
                        <button
                          className="file-remove"
                          style={{ border: '1px solid var(--border-light)', borderRadius: '8px', padding: '0.4rem' }}
                          onClick={(e) => handleDeleteHistory(e, item._id)}
                          title="Delete from database"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </section>

      </main>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid var(--border-light)', padding: '1.25rem', textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: 'auto' }}>
      </footer>
    </div>
  );
}

export default App;
