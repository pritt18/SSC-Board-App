import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { encryptFile, generateKey } from './encryption';
import { CURRENT_CLIENT_CONFIG } from '../config/clientConfig';

/**
 * Export Protected SSC Board Database
 *
 * Encrypts SQLite database with AES/DRM key before sharing so that
 * raw database files and proprietary license records cannot be pirated or opened directly.
 */
export const exportDatabase = async () => {
  try {
    const databasePath = `${FileSystem.documentDirectory}SQLite/sscboard.db`;
    const fileInfo = await FileSystem.getInfoAsync(databasePath);

    if (!fileInfo.exists) {
      console.log('Database file not found:', databasePath);
      return;
    }

    const sharingAvailable = await Sharing.isAvailableAsync();
    if (!sharingAvailable) {
      console.log('Sharing is not available on this device');
      return;
    }

    // Derive client key and encrypt database file
    const keySecret = `${CURRENT_CLIENT_CONFIG.masterSecret}:${CURRENT_CLIENT_CONFIG.clientId}:${CURRENT_CLIENT_CONFIG.clientSecret}`;
    const encryptionKey = await generateKey(keySecret);
    const encryptedPath = await encryptFile(databasePath, encryptionKey);

    await Sharing.shareAsync(encryptedPath, {
      mimeType: 'application/octet-stream',
      dialogTitle: 'Export Protected SSC Board Database (.db.enc)',
      UTI: 'public.data',
    });
  } catch (error) {
    console.error('Error exporting database:', error);
  }
};
