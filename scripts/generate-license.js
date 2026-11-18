#!/usr/bin/env node

/**
 * ============================================================================
 * SSC Board App - Cryptographic Offline License Key Generator CLI
 * ============================================================================
 *
 * Generates hardware-locked, tamper-proof offline license activation keys.
 * Keys are cryptographically bound to:
 *   - Student Device Hardware Fingerprint (SHA-256 of Android ID + Hardware)
 *   - Target Class (e.g., Class 10 or All Classes)
 *   - Client Organization Secret (e.g., Pune Model School or Softspire Default)
 *   - Expiration Policy (Lifetime or Specific Date)
 *
 * Usage:
 *   node scripts/generate-license.js --device <deviceId> --class 10
 *   node scripts/generate-license.js --device <deviceId> --class all --client school_pune_model_001
 *   node scripts/generate-license.js --device <deviceId> --class 9 --expires 2027-04-30
 *   node scripts/generate-license.js --generic --class 10 --count 5
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    device: null,
    classId: null,
    client: 'ssc_softspire_default',
    expires: 'lifetime',
    secret: null,
    generic: false,
    count: 1,
    output: null,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--device' && i + 1 < args.length) options.device = args[++i];
    else if (arg === '--class' && i + 1 < args.length) options.classId = args[++i];
    else if (arg === '--client' && i + 1 < args.length) options.client = args[++i];
    else if (arg === '--expires' && i + 1 < args.length) options.expires = args[++i];
    else if (arg === '--secret' && i + 1 < args.length) options.secret = args[++i];
    else if (arg === '--count' && i + 1 < args.length) options.count = parseInt(args[++i], 10) || 1;
    else if (arg === '--output' && i + 1 < args.length) options.output = args[++i];
    else if (arg === '--generic') options.generic = true;
    else if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    }
  }

  return options;
}

function printHelp() {
  console.log(`
SSC Board Offline License Generator

Usage:
  node scripts/generate-license.js [options]

Options:
  --device <id>         Target device hardware ID (displayed in student's app)
  --class <id|all>      Target class ID (1-12) or 'all' for full curriculum unlock
  --client <id>         Client profile ID (default: 'ssc_softspire_default')
  --expires <date>      'lifetime' or date 'YYYY-MM-DD' (default: 'lifetime')
  --secret <str>        Override client secret (otherwise loaded from clients/<id>.json)
  --generic             Generate unassigned pre-seed database keys
  --count <n>           Number of keys to generate (for generic keys)
  --output <file>       Save generated keys to a file (JSON or TXT)
  --help, -h            Show this help screen
`);
}

function loadClientConfig(clientId) {
  const clientsDir = path.join(__dirname, '..', 'clients');
  if (fs.existsSync(clientsDir)) {
    const files = fs.readdirSync(clientsDir);
    for (const file of files) {
      if (file.endsWith('.json')) {
        try {
          const content = JSON.parse(fs.readFileSync(path.join(clientsDir, file), 'utf8'));
          if (content.clientId === clientId || file.replace('.json', '') === clientId) {
            return content;
          }
        } catch (e) {}
      }
    }
  }

  // Fallback defaults
  if (clientId === 'ssc_softspire_default') {
    return {
      clientId: 'ssc_softspire_default',
      clientName: 'SSC Board Learning App',
      clientSecret: 'Sec4$9Xk8#mQ2!vL7pW9@zR1',
      masterSecret: 'SSC_MASTER_DRM_PROTECTION_KEY_2026',
    };
  }

  return null;
}

function computeKeyMac(secret, payload) {
  return crypto
    .createHash('sha256')
    .update(`${secret}:${payload}:${secret}`)
    .digest('hex')
    .toUpperCase();
}

function generateHardwareLockedKey({ deviceId, classId, clientId, clientSecret, expires }) {
  const normDevice = deviceId.trim().toLowerCase();
  const isAll = classId === 0 || classId === 'all' || classId === 'ALL';
  const classCode = isAll ? 'CALL' : `CL${String(classId).padStart(2, '0')}`;
  
  const payload = `${normDevice}|${classCode}|${expires}|${clientId}`;
  const mac = computeKeyMac(clientSecret, payload);

  const p1 = mac.substring(0, 4);
  const p2 = mac.substring(4, 8);
  const p3 = mac.substring(8, 12);

  const licenseKey = `${classCode}-${p1}-${p2}-${p3}`;

  return {
    licenseKey,
    classCode,
    targetClass: isAll ? 'All Classes (Curriculum Pass)' : `Class ${classId}`,
    deviceId: normDevice,
    clientId,
    expires,
    payload,
    type: 'HARDWARE_LOCKED',
  };
}

function generateGenericKey(classId) {
  const isAll = classId === 0 || classId === 'all' || classId === 'ALL';
  const classCode = isAll ? 'CALL' : `CL${String(classId).padStart(2, '0')}`;
  const randomBytes = crypto.randomBytes(6).toString('hex').toUpperCase();
  const p1 = randomBytes.substring(0, 4);
  const p2 = randomBytes.substring(4, 8);
  const p3 = crypto.randomBytes(2).toString('hex').toUpperCase();

  return `${classCode}-${p1}-${p2}-${p3}`;
}

async function main() {
  const opts = parseArgs();

  console.log('='.repeat(65));
  console.log('  SSC BOARD APP - CRYPTOGRAPHIC OFFLINE LICENSE GENERATOR');
  console.log('='.repeat(65));

  const clientConfig = loadClientConfig(opts.client);
  const clientSecret = opts.secret || clientConfig?.clientSecret || 'Sec4$9Xk8#mQ2!vL7pW9@zR1';
  const clientName = clientConfig?.clientName || opts.client;

  if (opts.generic) {
    if (!opts.classId) {
      console.error('Error: Please specify --class <id|all> for generic keys.');
      process.exit(1);
    }

    console.log(`Client Profile : ${clientName} (${opts.client})`);
    console.log(`Mode           : Generic Database Pre-Seed Keys`);
    console.log(`Class Target   : ${opts.classId === 'all' ? 'All Classes' : `Class ${opts.classId}`}`);
    console.log(`Count          : ${opts.count}`);
    console.log('-'.repeat(65));

    const keys = [];
    for (let i = 0; i < opts.count; i++) {
      const k = generateGenericKey(opts.classId);
      keys.push(k);
      console.log(`  [${i + 1}] ${k}`);
    }

    if (opts.output) {
      fs.writeFileSync(opts.output, JSON.stringify(keys, null, 2), 'utf8');
      console.log(`\nSaved ${keys.length} keys to ${opts.output}`);
    }

    console.log('='.repeat(65));
    return;
  }

  // Hardware-locked mode
  if (!opts.device) {
    console.error('Error: Missing --device <deviceId>.');
    console.error('Student device ID can be viewed under: Profile -> Offline Storage & DRM');
    console.error('or on the License Activation Screen.');
    console.error('\nUse --help for usage instructions.');
    process.exit(1);
  }

  if (!opts.classId) {
    console.error('Error: Missing --class <id|all>. (e.g. --class 10 or --class all)');
    process.exit(1);
  }

  const result = generateHardwareLockedKey({
    deviceId: opts.device,
    classId: opts.classId,
    clientId: opts.client,
    clientSecret,
    expires: opts.expires,
  });

  console.log(`Client Profile : ${clientName} (${result.clientId})`);
  console.log(`Target Device  : ${result.deviceId}`);
  console.log(`Target Class   : ${result.targetClass}`);
  console.log(`Validity       : ${result.expires === 'lifetime' ? 'Lifetime (Permanent Offline)' : result.expires}`);
  console.log('-'.repeat(65));
  console.log(`\n  🔑 ACTIVATION KEY:  ${result.licenseKey}\n`);
  console.log('-'.repeat(65));
  console.log('Instructions for Student / Client:');
  console.log('  1. Open the SSC Board App on the student device.');
  console.log(`  2. Select ${result.targetClass} or navigate to Profile -> Activate.`);
  console.log(`  3. Verify that the Device ID matches "${result.deviceId.substring(0, 16)}...".`);
  console.log(`  4. Type the Activation Key: ${result.licenseKey}`);
  console.log('  5. Tap "Activate". Content unlocks instantly with zero internet required!');
  console.log('='.repeat(65));

  if (opts.output) {
    fs.writeFileSync(opts.output, JSON.stringify(result, null, 2), 'utf8');
    console.log(`Saved license details to ${opts.output}`);
  }
}

if (require.main === module) {
  main().catch((err) => {
    console.error('Execution error:', err);
    process.exit(1);
  });
}

module.exports = {
  generateHardwareLockedKey,
  computeKeyMac,
  generateGenericKey,
};
