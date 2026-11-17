#!/usr/bin/env node

/**
 * SSC Board Content Packager & Encryptor CLI
 *
 * Encrypts raw video (.mp4) and textbook (.pdf) files using AES-256-CTR
 * for offline distribution to clients, preventing unauthorized access or piracy.
 *
 * Usage:
 *   node scripts/pack-content.js --input ./raw_content --output ./dist/offline_content
 *
 * Options:
 *   --input,  -i   Input directory containing raw files/folders (default: ./raw_content)
 *   --output, -o   Output directory for encrypted packages (default: ./offline_content)
 *   --client, -c   Client ID (default from clientConfig.ts)
 *   --secret, -s   Client Secret (default from clientConfig.ts)
 *   --master, -m   Master DRM Secret (default from clientConfig.ts)
 *   --help,   -h   Show this help message
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Default credentials matching CURRENT_CLIENT_CONFIG
const DEFAULT_CONFIG = {
  clientId: 'ssc_softspire_default',
  clientSecret: 'Sec4$9Xk8#mQ2!vL7pW9@zR1',
  masterSecret: 'SSC_MASTER_DRM_PROTECTION_KEY_2026',
};

const MAGIC_HEADER = Buffer.from([0x53, 0x53, 0x43, 0x45]); // "SSCE"
const VERSION_BYTES = Buffer.from([0x00, 0x01]); // v1.0

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    inputDir: path.resolve(process.cwd(), 'raw_content'),
    outputDir: path.resolve(process.cwd(), 'offline_content'),
    clientId: DEFAULT_CONFIG.clientId,
    clientSecret: DEFAULT_CONFIG.clientSecret,
    masterSecret: DEFAULT_CONFIG.masterSecret,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--help' || arg === '-h') {
      console.log(`
SSC Board Offline Content Packager
Usage: node scripts/pack-content.js [options]

Options:
  -i, --input    Input directory with raw files (default: ./raw_content)
  -o, --output   Output directory for .enc files (default: ./offline_content)
  -c, --client   Client ID (default: ${DEFAULT_CONFIG.clientId})
  -s, --secret   Client Secret
  -m, --master   Master DRM Secret
  -h, --help     Show this message
      `);
      process.exit(0);
    } else if (arg === '--input' || arg === '-i') {
      options.inputDir = path.resolve(process.cwd(), args[++i]);
    } else if (arg === '--output' || arg === '-o') {
      options.outputDir = path.resolve(process.cwd(), args[++i]);
    } else if (arg === '--client' || arg === '-c') {
      options.clientId = args[++i];
    } else if (arg === '--secret' || arg === '-s') {
      options.clientSecret = args[++i];
    } else if (arg === '--master' || arg === '-m') {
      options.masterSecret = args[++i];
    }
  }

  return options;
}

function deriveKey(masterSecret, clientId, clientSecret) {
  const combined = `${masterSecret}:${clientId}:${clientSecret}`;
  return crypto.createHash('sha256').update(combined, 'utf8').digest();
}

function deriveClientHashPrefix(clientId) {
  const hash = crypto.createHash('sha256').update(clientId, 'utf8').digest();
  return hash.subarray(0, 10); // 10 bytes prefix
}

/**
 * Encrypt a single file using AES-256-CTR with stream pipeline.
 */
function encryptFile(srcFile, destFile, key, clientHashPrefix) {
  return new Promise((resolve, reject) => {
    try {
      const iv = crypto.randomBytes(16);
      const header = Buffer.concat([
        MAGIC_HEADER,        // 4 bytes
        VERSION_BYTES,       // 2 bytes
        clientHashPrefix,    // 10 bytes
        iv,                  // 16 bytes
      ]);                    // Total: 32 bytes

      fs.mkdirSync(path.dirname(destFile), { recursive: true });

      const readStream = fs.createReadStream(srcFile);
      const writeStream = fs.createWriteStream(destFile);
      const cipher = crypto.createCipheriv('aes-256-ctr', key, iv);
      const hashStream = crypto.createHash('sha256');

      // Write 32-byte header first
      writeStream.write(header);

      readStream.on('data', (chunk) => {
        hashStream.update(chunk);
      });

      readStream
        .pipe(cipher)
        .pipe(writeStream);

      writeStream.on('finish', () => {
        const rawSha256 = hashStream.digest('hex');
        const rawSize = fs.statSync(srcFile).size;
        const encSize = fs.statSync(destFile).size;

        resolve({
          rawSize,
          encSize,
          sha256: rawSha256,
        });
      });

      readStream.on('error', reject);
      writeStream.on('error', reject);
      cipher.on('error', reject);
    } catch (err) {
      reject(err);
    }
  });
}

function walkDir(dir, fileList = []) {
  if (!fs.existsSync(dir)) return fileList;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      walkDir(fullPath, fileList);
    } else {
      fileList.push(fullPath);
    }
  }
  return fileList;
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

async function main() {
  const options = parseArgs();
  console.log('='.repeat(60));
  console.log('   SSC BOARD OFFLINE CONTENT PACKAGER & ENCRYPTOR');
  console.log('='.repeat(60));
  console.log(`Client ID:      ${options.clientId}`);
  console.log(`Input Directory:  ${options.inputDir}`);
  console.log(`Output Directory: ${options.outputDir}`);
  console.log('='.repeat(60));

  if (!fs.existsSync(options.inputDir)) {
    console.error(`Error: Input directory does not exist: ${options.inputDir}`);
    console.log(`\nPlease create "${options.inputDir}" and place raw .mp4 and .pdf files inside.`);
    process.exit(1);
  }

  const allFiles = walkDir(options.inputDir);
  const eligibleFiles = allFiles.filter(f => {
    const ext = path.extname(f).toLowerCase();
    return ext === '.mp4' || ext === '.pdf';
  });

  if (eligibleFiles.length === 0) {
    console.log(`No .mp4 or .pdf files found in ${options.inputDir}.`);
    process.exit(0);
  }

  console.log(`Found ${eligibleFiles.length} file(s) to encrypt...\n`);

  const key = deriveKey(options.masterSecret, options.clientId, options.clientSecret);
  const clientHash = deriveClientHashPrefix(options.clientId);

  fs.mkdirSync(options.outputDir, { recursive: true });

  const manifest = {
    clientId: options.clientId,
    generatedAt: new Date().toISOString(),
    files: [],
  };

  let totalRawBytes = 0;
  let totalEncBytes = 0;
  let successCount = 0;

  for (let i = 0; i < eligibleFiles.length; i++) {
    const srcFile = eligibleFiles[i];
    const relPath = path.relative(options.inputDir, srcFile);
    const destFile = path.join(options.outputDir, `${relPath}.enc`);

    process.stdout.write(`[${i + 1}/${eligibleFiles.length}] Encrypting ${relPath}... `);

    try {
      const result = await encryptFile(srcFile, destFile, key, clientHash);
      totalRawBytes += result.rawSize;
      totalEncBytes += result.encSize;
      successCount++;

      manifest.files.push({
        relativePath: relPath.replace(/\\/g, '/'),
        encryptedPath: `${relPath.replace(/\\/g, '/')}.enc`,
        rawSize: result.rawSize,
        encSize: result.encSize,
        sha256: result.sha256,
      });

      console.log(`OK (${formatBytes(result.rawSize)} -> ${formatBytes(result.encSize)})`);
    } catch (err) {
      console.log(`FAILED: ${err.message}`);
    }
  }

  // Save manifest
  const manifestPath = path.join(options.outputDir, 'content-manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');

  // Also create encrypted manifest
  const encManifestPath = path.join(options.outputDir, 'content-manifest.json.enc');
  await encryptFile(manifestPath, encManifestPath, key, clientHash);

  console.log('\n' + '='.repeat(60));
  console.log('   PACKAGING COMPLETE');
  console.log('='.repeat(60));
  console.log(`Total Files Encrypted: ${successCount}/${eligibleFiles.length}`);
  console.log(`Total Original Size:   ${formatBytes(totalRawBytes)}`);
  console.log(`Total Encrypted Size:  ${formatBytes(totalEncBytes)}`);
  console.log(`Manifest Location:     ${manifestPath}`);
  console.log(`Encrypted Manifest:    ${encManifestPath}`);
  console.log('\nDeployment Instructions:');
  console.log('1. Copy all files in the output folder to the client Android device:');
  console.log(`   adb push "${options.outputDir}/." /sdcard/Android/data/com.sscboard.learning/files/offline_content/`);
  console.log('2. The app will automatically detect encrypted files and stream them on-the-fly.');
  console.log('='.repeat(60));
}

if (require.main === module) {
  main().catch(err => {
    console.error('Fatal packager error:', err);
    process.exit(1);
  });
}

module.exports = {
  encryptFile,
  deriveKey,
  deriveClientHashPrefix,
  DEFAULT_CONFIG,
};
