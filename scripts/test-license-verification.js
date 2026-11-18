const assert = require('assert');
const { generateHardwareLockedKey, computeKeyMac } = require('./generate-license');

const testDeviceId = '7f4a2b1c8e90d1f4';
const clientSecret = 'Sec4$9Xk8#mQ2!vL7pW9@zR1';
const masterSecret = 'SSC_MASTER_DRM_PROTECTION_KEY_2026';
const clientId = 'ssc_softspire_default';

console.log('Testing Offline Cryptographic Licensing Pipeline...\n');

// 1. Generate Class 10 Key
const c10Result = generateHardwareLockedKey({
  deviceId: testDeviceId,
  classId: 10,
  clientId,
  clientSecret,
  expires: 'lifetime',
});

console.log('Class 10 Key generated:', c10Result.licenseKey);
assert(c10Result.licenseKey.startsWith('CL10-'), 'Key must start with CL10-');

// 2. Simulate In-App Verification
function simulateInAppVerify(rawKey, devId, targetClass) {
  const parts = rawKey.trim().toUpperCase().split('-');
  if (parts.length < 4) return false;

  const classCode = parts[0];
  const enteredMac = parts.slice(1).join('');

  let keyClassId = targetClass;
  let isAll = false;
  if (classCode === 'CALL') {
    isAll = true;
    keyClassId = 0;
  } else if (classCode.startsWith('CL')) {
    keyClassId = parseInt(classCode.substring(2), 10);
  }

  if (!isAll && keyClassId !== targetClass) return false;

  const payload = `${devId.trim().toLowerCase()}|${classCode}|lifetime|${clientId}`;
  const mac1 = computeKeyMac(clientSecret, payload);
  if (mac1.substring(0, 12) === enteredMac) return true;

  const mac2 = computeKeyMac(masterSecret, payload);
  if (mac2.substring(0, 12) === enteredMac) return true;

  return false;
}

// Test A: Valid device & class 10 -> MUST PASS
const validTest = simulateInAppVerify(c10Result.licenseKey, testDeviceId, 10);
assert.strictEqual(validTest, true, 'Valid device & class 10 must verify');
console.log('✓ Valid device and matching class: PASSED');

// Test B: Different device -> MUST FAIL
const wrongDeviceTest = simulateInAppVerify(c10Result.licenseKey, 'other_device_456', 10);
assert.strictEqual(wrongDeviceTest, false, 'Wrong device must be rejected');
console.log('✓ Wrong device protection: PASSED');

// Test C: Different class -> MUST FAIL
const wrongClassTest = simulateInAppVerify(c10Result.licenseKey, testDeviceId, 9);
assert.strictEqual(wrongClassTest, false, 'Wrong class must be rejected');
console.log('✓ Wrong class protection: PASSED');

// Test D: Tampered key character -> MUST FAIL
const tamperedKey = c10Result.licenseKey.substring(0, 18) + (c10Result.licenseKey[18] === 'A' ? 'B' : 'A');
const tamperedTest = simulateInAppVerify(tamperedKey, testDeviceId, 10);
assert.strictEqual(tamperedTest, false, 'Tampered key must be rejected');
console.log('✓ Tamper detection: PASSED');

// Test E: All Classes Pass (CALL) -> MUST UNLOCK ANY CLASS
const allPass = generateHardwareLockedKey({
  deviceId: testDeviceId,
  classId: 'all',
  clientId,
  clientSecret,
  expires: 'lifetime',
});
console.log('\nAll Classes Pass generated:', allPass.licenseKey);
assert(allPass.licenseKey.startsWith('CALL-'), 'Key must start with CALL-');

for (let c = 1; c <= 10; c++) {
  const verified = simulateInAppVerify(allPass.licenseKey, testDeviceId, c);
  assert.strictEqual(verified, true, `All classes pass must verify for class ${c}`);
}
console.log('✓ All-classes curriculum pass unlocks classes 1 to 10: PASSED');

console.log('\n===========================================');
console.log('ALL CRYPTOGRAPHIC TESTS PASSED SUCCESSFULLY');
console.log('===========================================');
