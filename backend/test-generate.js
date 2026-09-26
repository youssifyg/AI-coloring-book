import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Create a tiny valid PNG file for testing so Gemini Flash parses it correctly
const dummyImagePath = path.join(__dirname, 'test-photo.png');

// 1x1 transparent PNG base64
const pngBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
const pngBuffer = Buffer.from(pngBase64, 'base64');
fs.writeFileSync(dummyImagePath, pngBuffer);

// Build the multipart form data manually
const boundary = '----TestBoundary' + Date.now();
const CRLF = '\r\n';

const parts = [];

// childName field
parts.push(`--${boundary}${CRLF}`);
parts.push(`Content-Disposition: form-data; name="childName"${CRLF}${CRLF}`);
parts.push(`فاطمة${CRLF}`);

// templateId field
parts.push(`--${boundary}${CRLF}`);
parts.push(`Content-Disposition: form-data; name="templateId"${CRLF}${CRLF}`);
parts.push(`space_girl${CRLF}`);

// photo file
parts.push(`--${boundary}${CRLF}`);
parts.push(`Content-Disposition: form-data; name="photo"; filename="test-photo.png"${CRLF}`);
parts.push(`Content-Type: image/png${CRLF}${CRLF}`);

const textParts = Buffer.from(parts.join(''));
const endPart = Buffer.from(`${CRLF}--${boundary}--${CRLF}`);
const body = Buffer.concat([textParts, pngBuffer, endPart]);

console.log('=== AI Kids Coloring Book — E2E Test ===\n');

// Test 1: Health check
console.log('1. Testing GET /api/health...');
try {
  const healthRes = await fetch('http://localhost:5000/api/health');
  const healthData = await healthRes.json();
  console.log(`   ✅ Status: ${healthData.status}\n`);
} catch (err) {
  console.error(`   ❌ Health check failed: ${err.message}\n`);
}

// Test 2: Templates
console.log('2. Testing GET /api/templates...');
try {
  const templatesRes = await fetch('http://localhost:5000/api/templates');
  const templatesData = await templatesRes.json();
  console.log(`   ✅ ${templatesData.length} templates returned`);
  for (const t of templatesData) {
    console.log(`      ${t.icon} ${t.id} — ${t.sceneCount} scenes`);
  }
  console.log();
} catch (err) {
  console.error(`   ❌ Templates failed: ${err.message}\n`);
}

// Test 3: PDF generation
console.log('3. Testing POST /api/generate-book (Arabic name + space theme)...');
try {
  const response = await fetch('http://localhost:5000/api/generate-book', {
    method: 'POST',
    headers: {
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
    },
    body: body,
  });

  console.log(`   Response status: ${response.status}`);
  console.log(`   Content-Type: ${response.headers.get('content-type')}`);
  console.log(`   Content-Disposition: ${response.headers.get('content-disposition')}`);

  if (response.ok) {
    const arrayBuffer = await response.arrayBuffer();
    const pdfBuffer = Buffer.from(arrayBuffer);
    const outputPath = path.join(__dirname, 'test-output.pdf');
    fs.writeFileSync(outputPath, pdfBuffer);

    const header = pdfBuffer.slice(0, 5).toString('ascii');
    console.log(`   PDF size: ${pdfBuffer.length} bytes`);
    console.log(`   PDF header: ${header}`);
    console.log(`   Valid PDF: ${header.startsWith('%PDF')}`);
    console.log(`   ✅ PDF generated and saved to: ${outputPath}\n`);
  } else {
    const text = await response.text();
    console.error(`   ❌ Error: ${text}\n`);
  }
} catch (err) {
  console.error(`   ❌ Request failed: ${err.message}\n`);
}

// Cleanup
if (fs.existsSync(dummyImagePath)) {
  fs.unlinkSync(dummyImagePath);
}

console.log('=== All tests complete ===');
