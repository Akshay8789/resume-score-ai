const fs = require('fs');
const path = require('path');

// 1. Generate a valid, basic PDF resume file programmatically
const createMockPDF = () => {
  const pdfPath = path.join(__dirname, 'sample-resume.pdf');
  
  // Hand-crafted minimal PDF containing text that pdf-parse can read
  const pdfContent = `%PDF-1.4
1 0 obj <</Type /Catalog /Pages 2 0 R>> endobj
2 0 obj <</Type /Pages /Kids [3 0 R] /Count 1>> endobj
3 0 obj <</Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources <</Font <</F1 5 0 R>>>>>> endobj
4 0 obj <</Length 180>> stream
BT
/F1 12 Tf
72 750 Td
(JOHN DOE - SENIOR FULL STACK ENGINEER) Tj
0 -20 Td
(Email: john.doe@email.com | Phone: 123-456-7890 | LinkedIn: linkedin.com/in/johndoe) Tj
0 -40 Td
(WORK EXPERIENCE) Tj
0 -20 Td
(Led development of high-throughput web applications using python, react, and nodejs.) Tj
0 -20 Td
(Optimized database queries in MongoDB and PostgreSQL, saving 20% server costs.) Tj
0 -40 Td
(EDUCATION) Tj
0 -20 Td
(Bachelor of Science in Computer Science - State University) Tj
0 -40 Td
(SKILLS) Tj
0 -20 Td
(Python, JavaScript, React, Node, Express, MongoDB, SQL, Git, API, AWS, Docker) Tj
ET
endstream
endobj
5 0 obj <</Type /Font /Subtype /Type1 /BaseFont /Helvetica>> endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000056 00000 n 
0000000111 00000 n 
0000000244 00000 n 
0000000475 00000 n 
trailer <</Size 6 /Root 1 0 R>>
startxref
546
%%EOF`;

  fs.writeFileSync(pdfPath, Buffer.from(pdfContent, 'binary'));
  console.log(`[Test] Generated mock PDF at: ${pdfPath}`);
  return pdfPath;
};

// 2. Perform the upload and fetch validation
const runTest = async () => {
  const pdfPath = createMockPDF();
  
  // We need to construct a multipart/form-data upload using standard Node APIs.
  // Since we are on Node 18+, we can use global fetch and FormData!
  if (typeof FormData === 'undefined') {
    console.error('This script requires Node 18+ which supports global fetch and FormData.');
    process.exit(1);
  }

  const formData = new FormData();
  
  // Read file and append as a Blob
  const fileBuffer = fs.readFileSync(pdfPath);
  const blob = new Blob([fileBuffer], { type: 'application/pdf' });
  formData.append('resumes', blob, 'john-doe-resume.pdf');
  
  formData.append('jobTitle', 'Senior Full Stack Engineer');
  formData.append('jobDescription', 'Looking for a senior developer with experience in python, react, node, and cloud deployments like AWS. Strong communication skills are a must.');

  console.log('[Test] Sending POST request to http://localhost:5000/api/analyze...');

  try {
    const response = await fetch('http://localhost:5000/api/analyze', {
      method: 'POST',
      body: formData
    });

    const result = await response.json();
    console.log('[Test] Received Response Status:', response.status);
    
    if (result.success) {
      console.log('======================================================');
      console.log('✓ TEST SUCCESS: Resume uploaded and parsed successfully!');
      console.log('======================================================');
      console.log('ATS Score:', result.results[0].atsScore);
      console.log('Sections Found:');
      result.results[0].sections.forEach(s => {
        console.log(`  - ${s.name}: ${s.found ? 'Found' : 'Missing'}`);
      });
      console.log('Keywords Checked:');
      result.results[0].keywords.forEach(k => {
        console.log(`  - ${k.word}: ${k.matched ? 'Matched' : 'Missing'}`);
      });
      console.log('Formatting Ratings:');
      result.results[0].formattingMetrics.forEach(m => {
        console.log(`  - ${m.metricName}: ${m.rating}/100 (${m.passed ? 'Passed' : 'Failed'})`);
      });
      console.log('Recommendations Count:', result.results[0].recommendations.length);
      
      // Let's test the history endpoint
      console.log('\n[Test] Verifying history db retrieval...');
      const historyResponse = await fetch('http://localhost:5000/api/history');
      const historyData = await historyResponse.json();
      
      if (historyData.success && historyData.history.length > 0) {
        console.log(`✓ TEST SUCCESS: Found ${historyData.history.length} items in scan history!`);
        const savedItem = historyData.history.find(h => h.fileName === 'john-doe-resume.pdf');
        if (savedItem) {
          console.log(`✓ TEST SUCCESS: Verified record was written to Database! (ID: ${savedItem._id})`);
        } else {
          console.log('⚠ TEST WARNING: Mock resume file not found in history.');
        }
      } else {
        console.error('✖ TEST FAILED: History retrieval returned empty or failed.');
      }
    } else {
      console.error('✖ TEST FAILED: Server returned error response:', result.message);
    }
  } catch (error) {
    console.error('✖ TEST FAILED: Network or code execution error:', error);
  } finally {
    // Clean up sample resume file
    try {
      fs.unlinkSync(pdfPath);
      console.log('[Test] Cleaned up temporary test file.');
    } catch (e) {}
  }
};

// Wait 2 seconds for server to bind port before executing test
setTimeout(runTest, 2000);
