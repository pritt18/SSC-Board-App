import * as Crypto from 'expo-crypto';
import { executeQuery } from '../database/database';
import AsyncStorage from '@react-native-async-storage/async-storage';
// Remove expo-device import - use AsyncStorage instead

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
  // Generate unique device ID
  static getDeviceId = async (): Promise<string> => {
    try {
      let deviceId = await AsyncStorage.getItem('device_id');
      if (!deviceId) {
        deviceId = Math.random().toString(36).substring(2, 15) + 
                   Math.random().toString(36).substring(2, 15);
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

  static activateLicense = async (
    licenseKey: string,
    userId: number,
    classId: number
  ): Promise<boolean> => {
    try {
      const deviceId = await LicenseService.getDeviceId();
      
      const existing = await executeQuery(
        `SELECT * FROM licenses 
         WHERE license_key = ? 
         AND class_id = ?
         AND is_active = 1 
         AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)`,
        [licenseKey, classId]
      );

      if (existing.length === 0) return false;
      if (existing[0].user_id && existing[0].user_id !== userId) return false;

      await executeQuery(
        `UPDATE licenses 
         SET user_id = ?, device_id = ?, activated_at = CURRENT_TIMESTAMP
         WHERE license_key = ?`,
        [userId, deviceId, licenseKey]
      );

      await AsyncStorage.setItem('active_license', JSON.stringify({
        licenseKey,
        userId,
        classId,
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
      const result = await executeQuery(
        `SELECT * FROM licenses
         WHERE user_id = ?
         AND class_id = ?
         AND is_active = 1
         AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)`,
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