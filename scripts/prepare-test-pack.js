/**
 * Prepare test offline content pack for emulator testing
 */

const fs = require('fs');
const path = require('path');

const baseDir = path.resolve(__dirname, '..', 'test_offline_pack');
const rawDir = path.join(baseDir, 'raw');
const encDir = path.join(baseDir, 'encrypted');

fs.mkdirSync(path.join(rawDir, 'videos'), { recursive: true });
fs.mkdirSync(path.join(rawDir, 'pdfs'), { recursive: true });
fs.mkdirSync(encDir, { recursive: true });

// Copy sample video
const sampleVideoSrc = path.resolve(__dirname, '..', 'assets', 'videos', 'sample-video.mp4');
const sampleVideoDest = path.join(rawDir, 'videos', 'sample-video.mp4');
if (fs.existsSync(sampleVideoSrc)) {
  fs.copyFileSync(sampleVideoSrc, sampleVideoDest);
  console.log('Copied sample-video.mp4 to raw videos');
}

// Minimal valid PDF file
const minimalPdf = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>
endobj
4 0 obj
<< /Length 73 >>
stream
BT
/F1 24 Tf
100 700 Td
(SSC Board App - Offline Encrypted PDF Test) Tj
ET
endstream
endobj
5 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000244 00000 n 
0000000366 00000 n 
trailer
<< /Size 6 /Root 1 0 R >>
startxref
443
%%EOF
`;

const samplePdfDest = path.join(rawDir, 'pdfs', 'sample_book.pdf');
fs.writeFileSync(samplePdfDest, minimalPdf, 'utf8');
console.log('Created valid test PDF at raw pdfs');

console.log('Test content prepared in:', rawDir);
