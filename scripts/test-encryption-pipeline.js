/**
 * End-to-End Test for Offline Content Encryption & Streaming Pipeline
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { encryptFile, deriveKey, deriveClientHashPrefix, DEFAULT_CONFIG } = require('./pack-content');

async function runTest() {
  console.log('--- Testing Offline Encryption Pipeline ---');

  const testDir = path.resolve(__dirname, '..', 'scratch', 'pipeline_test');
  const rawDir = path.join(testDir, 'raw');
  const encDir = path.join(testDir, 'enc');
  fs.mkdirSync(rawDir, { recursive: true });
  fs.mkdirSync(encDir, { recursive: true });

  // 1. Create a simulated video payload (100 KB with binary patterns)
  const sampleVideoData = Buffer.alloc(100 * 1024);
  for (let i = 0; i < sampleVideoData.length; i++) {
    sampleVideoData[i] = (i * 37 + 13) % 256;
  }
  const sampleVideoPath = path.join(rawDir, 'test_video.mp4');
  fs.writeFileSync(sampleVideoPath, sampleVideoData);

  // 2. Encrypt using AES-256-CTR
  const key = deriveKey(DEFAULT_CONFIG.masterSecret, DEFAULT_CONFIG.clientId, DEFAULT_CONFIG.clientSecret);
  const clientHash = deriveClientHashPrefix(DEFAULT_CONFIG.clientId);
  const encVideoPath = path.join(encDir, 'test_video.mp4.enc');

  console.log('1. Encrypting sample video...');
  const encResult = await encryptFile(sampleVideoPath, encVideoPath, key, clientHash);
  console.log('   Raw size:', encResult.rawSize, 'Encrypted size:', encResult.encSize);
  console.log('   Raw SHA-256:', encResult.sha256);

  // 3. Verify Header
  const encData = fs.readFileSync(encVideoPath);
  const magic = encData.subarray(0, 4).toString('utf8');
  if (magic !== 'SSCE') {
    throw new Error(`Magic bytes mismatch: expected SSCE, got ${magic}`);
  }
  console.log('2. Verified Magic Bytes:', magic);

  // 4. Test Decrypting Entire File
  const baseIv = encData.subarray(16, 32);
  const ciphertext = encData.subarray(32);
  const decipher = crypto.createDecipheriv('aes-256-ctr', key, baseIv);
  const decryptedAll = Buffer.concat([decipher.update(ciphertext), decipher.final()]);

  if (!decryptedAll.equals(sampleVideoData)) {
    throw new Error('Full decrypted data does NOT match original!');
  }
  console.log('3. Full Decryption SHA-256 Matches Original Perfectly!');

  // 5. Test Random Range Seeking (Simulating ExoPlayer HTTP 206 Partial Content)
  console.log('4. Testing Range Seeking (ExoPlayer Range: bytes=45123-78901)...');
  const rangeStart = 45123;
  const rangeEnd = 78901;
  const expectedSlice = sampleVideoData.subarray(rangeStart, rangeEnd + 1);

  // Calculate CTR block offset
  const blockIndex = Math.floor(rangeStart / 16);
  const blockOffset = rangeStart % 16;
  const ivBigInt = BigInt('0x' + baseIv.toString('hex'));
  const newIvBigInt = ivBigInt + BigInt(blockIndex);
  let hex = newIvBigInt.toString(16).padStart(32, '0');
  if (hex.length > 32) hex = hex.slice(-32);
  const rangeIv = Buffer.from(hex, 'hex');

  const rangeDecipher = crypto.createDecipheriv('aes-256-ctr', key, rangeIv);
  const cipherSub = ciphertext.subarray(blockIndex * 16);
  const decryptedStreamChunk = Buffer.concat([rangeDecipher.update(cipherSub), rangeDecipher.final()]);
  const finalStreamedBytes = decryptedStreamChunk.subarray(blockOffset, blockOffset + expectedSlice.length);

  if (!finalStreamedBytes.equals(expectedSlice)) {
    throw new Error('Range decrypted slice does NOT match expected slice!');
  }
  console.log('   Range bytes matched perfectly! Length:', finalStreamedBytes.length);

  console.log('\n--- ALL DRM CRYPTOGRAPHIC PIPELINE CHECKS PASSED SUCCESSFULLY ---');
}

runTest().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
