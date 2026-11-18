import * as Crypto from 'expo-crypto';
import { executeQuery } from '../database/database';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { secureContentManager } from '../utils/secureContentManager';
import { CURRENT_CLIENT_CONFIG } from '../config/clientConfig';

export interface License {
  id?: number;
  license_key: string;
  user_id: number;
  class_id: number;
  device_id: string;
  activated_at?: string;
  expires_at?: string;
  is_active: boolean;
}

export class LicenseService {
  // Generate hardware-bound unique device ID for client licensing
  static getDeviceId = async (): Promise<string> => {
    try {
      let deviceId = await AsyncStorage.getItem('device_id');
      if (!deviceId) {
        // Attempt to fetch hardware fingerprint
        deviceId = await secureContentManager.getDeviceFingerprint();
        if (!deviceId || deviceId === 'default-device-fp') {
          deviceId = Math.random().toString(36).substring(2, 15) + 
                     Math.random().toString(36).substring(2, 15);
        }
        await AsyncStorage.setItem('device_id', deviceId);
      }
      return deviceId;
    } catch (error) {
      console.error('Error getting device ID:', error);
      return 'unknown-device';
    }
  };

  static generateLicenseKey = async (userId: number, classId: number): Promise<string> => {
    const deviceId = await LicenseService.getDeviceId();
    const timestamp = Date.now().toString();
    const random = Math.random().toString(36).substring(7);
    
    const data = `${userId}-${classId}-${deviceId}-${timestamp}-${random}`;
    const hash = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      data
    );
    
    const formatted = hash.substring(0, 16).toUpperCase();
    return formatted.replace(/(.{4})/g, '$1-').replace(/-$/, '');
  };

  static computeKeyMac = async (secret: string, payload: string): Promise<string> => {
    const text = `${secret}:${payload}:${secret}`;
    const hash = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      text
    );
    return hash.toUpperCase();
  };

  /**
   * Cryptographically verify an offline license key against the device ID and client secrets.
   */
  static verifyOfflineLicenseKey = async (
    rawKey: string,
    deviceId: string,
    targetClassId: number
  ): Promise<{ valid: boolean; classId: number; isAllClasses: boolean; expiresAt: string | null }> => {
    const normalized = rawKey.trim().toUpperCase().replace(/[^A-Z0-9-]/g, '');
    const parts = normalized.split('-');

    if (parts.length < 4) {
      return { valid: false, classId: targetClassId, isAllClasses: false, expiresAt: null };
    }

    const classCode = parts[0];
    const enteredMac = parts.slice(1).join('');

    let keyClassId = targetClassId;
    let isAll = false;

    if (classCode === 'CALL') {
      isAll = true;
      keyClassId = 0;
    } else if (classCode.startsWith('CL')) {
      const parsed = parseInt(classCode.substring(2), 10);
      if (!isNaN(parsed)) {
        keyClassId = parsed;
      }
    }

    // Class specific mismatch check
    if (!isAll && keyClassId !== targetClassId) {
      return { valid: false, classId: keyClassId, isAllClasses: false, expiresAt: null };
    }

    const normDevice = deviceId.trim().toLowerCase();
    const clientId = CURRENT_CLIENT_CONFIG.clientId;
    const clientSecret = CURRENT_CLIENT_CONFIG.clientSecret;
    const masterSecret = CURRENT_CLIENT_CONFIG.masterSecret;

    // 1. Check with client secret (lifetime)
    const payloadLifetime = `${normDevice}|${classCode}|lifetime|${clientId}`;
    const mac1 = await LicenseService.computeKeyMac(clientSecret, payloadLifetime);
    if (mac1.substring(0, 12) === enteredMac) {
      return { valid: true, classId: keyClassId, isAllClasses: isAll, expiresAt: null };
    }

    // 2. Check with master secret fallback
    const mac2 = await LicenseService.computeKeyMac(masterSecret, payloadLifetime);
    if (mac2.substring(0, 12) === enteredMac) {
      return { valid: true, classId: keyClassId, isAllClasses: isAll, expiresAt: null };
    }

    return { valid: false, classId: keyClassId, isAllClasses: false, expiresAt: null };
  };

  static activateLicense = async (
    licenseKey: string,
    userId: number,
    classId: number
  ): Promise<boolean> => {
    try {
      const deviceId = await LicenseService.getDeviceId();
      const cleanKey = licenseKey.trim().toUpperCase();

      // Check if this class is allowed in this client build
      if (!CURRENT_CLIENT_CONFIG.allowedClasses.includes(classId) && classId !== 0) {
        console.warn(`Class ${classId} not permitted in client config ${CURRENT_CLIENT_CONFIG.clientId}`);
        return false;
      }
      
      // 1. First check if a pre-seeded / existing database key matches
      const existing = await executeQuery(
        `SELECT * FROM licenses 
         WHERE license_key = ? 
         AND (class_id = ? OR class_id = 0)
         AND is_active = 1 
         AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)`,
        [cleanKey, classId]
      );

      if (existing.length > 0) {
        if (existing[0].user_id && existing[0].user_id !== userId) return false;

        await executeQuery(
          `UPDATE licenses 
           SET user_id = ?, device_id = ?, activated_at = CURRENT_TIMESTAMP
           WHERE license_key = ?`,
          [userId, deviceId, cleanKey]
        );

        await AsyncStorage.setItem('active_license', JSON.stringify({
          licenseKey: cleanKey,
          userId,
          classId,
          activatedAt: new Date().toISOString()
        }));

        return true;
      }

      // 2. Cryptographic Offline Signature Verification
      const verification = await LicenseService.verifyOfflineLicenseKey(cleanKey, deviceId, classId);
      if (!verification.valid) {
        return false;
      }

      // If valid, insert active license record(s) into database
      if (verification.isAllClasses) {
        // Unlock all classes 1 through 10
        for (const c of CURRENT_CLIENT_CONFIG.allowedClasses) {
          await executeQuery(
            `INSERT OR REPLACE INTO licenses (license_key, user_id, class_id, device_id, activated_at, expires_at, is_active)
             VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, NULL, 1)`,
            [`${cleanKey}_C${c}`, userId, c, deviceId]
          );
        }
      } else {
        await executeQuery(
          `INSERT OR REPLACE INTO licenses (license_key, user_id, class_id, device_id, activated_at, expires_at, is_active)
           VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, ?, 1)`,
          [cleanKey, userId, classId, deviceId, verification.expiresAt]
        );
      }

      await AsyncStorage.setItem('active_license', JSON.stringify({
        licenseKey: cleanKey,
        userId,
        classId: verification.isAllClasses ? 0 : classId,
        activatedAt: new Date().toISOString()
      }));

      return true;
    } catch (error) {
      console.error('License activation error:', error);
      return false;
    }
  };

  // Generates a random, unassigned license key (not tied to any user yet).
  // Used by the admin panel when creating new licenses to sell/distribute.
  static generateStandaloneKey = async (): Promise<string> => {
    const random = Math.random().toString(36).substring(2) + Date.now().toString(36);
    const hash = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      random
    );
    const formatted = hash.substring(0, 16).toUpperCase();
    return formatted.replace(/(.{4})/g, '$1-').replace(/-$/, '');
  };

  // Admin: create a single unassigned license for a class, optionally with an expiry date.
  // expiresAt should be an ISO date string (e.g. '2027-04-30') or null for a lifetime license.
  static createLicense = async (
    classId: number,
    expiresAt: string | null
  ): Promise<string> => {
    const licenseKey = await LicenseService.generateStandaloneKey();

    await executeQuery(
      `INSERT INTO licenses (license_key, class_id, expires_at, is_active)
       VALUES (?, ?, ?, 1)`,
      [licenseKey, classId, expiresAt]
    );

    return licenseKey;
  };

  // Admin: create many unassigned licenses at once for a class.
  static createBulkLicenses = async (
    classId: number,
    count: number,
    expiresAt: string | null
  ): Promise<string[]> => {
    const keys: string[] = [];
    for (let i = 0; i < count; i++) {
      const key = await LicenseService.createLicense(classId, expiresAt);
      keys.push(key);
    }
    return keys;
  };

  // Student-side gate check: does this user have an active, non-expired license
  // for this specific class? Used to lock/unlock class content.
  static isClassLicensed = async (
    userId: number,
    classId: number
  ): Promise<boolean> => {
    try {
      // 1. Verify class is permitted in this client-specific APK build
      if (!CURRENT_CLIENT_CONFIG.allowedClasses.includes(classId)) {
        return false;
      }

      // 2. Check for active license for this specific class or curriculum pass (class_id = 0)
      const result = await executeQuery(
        `SELECT id FROM licenses
         WHERE user_id = ?
         AND (class_id = ? OR class_id = 0)
         AND is_active = 1
         AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
         LIMIT 1`,
        [userId, classId]
      );
      return result.length > 0;
    } catch (error) {
      console.error('Error checking class license:', error);
      return false;
    }
  };

  static checkLicense = async (userId: number): Promise<boolean> => {
    try {
      const stored = await AsyncStorage.getItem('active_license');
      if (!stored) return false;

      const license = JSON.parse(stored);
      
      const result = await executeQuery(
        `SELECT * FROM licenses 
         WHERE user_id = ? 
         AND license_key = ?
         AND is_active = 1 
         AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)`,
        [userId, license.licenseKey]
      );

      return result.length > 0;
    } catch (error) {
      console.error('License check error:', error);
      return false;
    }
  };

  static deactivateLicense = async (userId: number): Promise<void> => {
    try {
      await executeQuery(
        `UPDATE licenses 
         SET user_id = NULL, device_id = NULL, activated_at = NULL
         WHERE user_id = ?`,
        [userId]
      );
      await AsyncStorage.removeItem('active_license');
    } catch (error) {
      console.error('License deactivation error:', error);
    }
  };
}