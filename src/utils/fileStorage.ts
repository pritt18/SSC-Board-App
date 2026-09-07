import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';

// -----------------------------------------------------------------
// Cross-platform file storage helper.
//
// Native (Android/iOS): files are copied into the app's own
// documentDirectory (a real, persistent filesystem) — unchanged from
// before. The "reference" we hand back and store in the database is
// just the file:// path.
//
// Web: there is no persistent native filesystem to copy into.
// Instead, the picked file's bytes are read and saved into the
// browser's IndexedDB (which can hold much more than localStorage —
// typically hundreds of MB to a few GB depending on the browser).
// The "reference" stored in the database is a small string like
// "idb://1699999999-abcd" that points at that IndexedDB record.
//
// Whenever code needs to actually *use* a file (open/view it), call
// resolveFileUri() — on native it just returns the path as-is; on
// web it reads the bytes back out of IndexedDB and hands back a
// temporary blob: URL that the current page can use (e.g. as a
// WebView/<iframe> source).
// -----------------------------------------------------------------

const DB_NAME = 'ssc_board_files';
const STORE_NAME = 'files';
const DB_VERSION = 1;

const isWeb = Platform.OS === 'web';

const openIndexedDb = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is not available in this browser.'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

const idbPut = async (id: string, name: string, blob: Blob): Promise<void> => {
  const db = await openIndexedDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put({ id, name, blob });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

const idbGet = async (id: string): Promise<{ name: string; blob: Blob } | null> => {
  const db = await openIndexedDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).get(id);
    req.onsuccess = () => resolve(req.result ? { name: req.result.name, blob: req.result.blob } : null);
    req.onerror = () => reject(req.error);
  });
};

const idbDelete = async (id: string): Promise<void> => {
  const db = await openIndexedDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

export const IDB_PREFIX = 'idb://';

/**
 * Saves a picked file (from expo-document-picker) into permanent
 * storage and returns a reference string to save in the database.
 */
export const saveFile = async (
  sourceUri: string,
  fileName: string,
  folder: string = 'pdfs'
): Promise<string> => {
  if (isWeb) {
    const response = await fetch(sourceUri);
    const blob = await response.blob();
    const id = `${folder}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    await idbPut(id, fileName, blob);
    return `${IDB_PREFIX}${id}`;
  }

  await FileSystem.makeDirectoryAsync(
    `${FileSystem.documentDirectory}${folder}/`,
    { intermediates: true }
  ).catch(() => {});

  const safeName = `${Date.now()}_${fileName.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
  const destPath = `${FileSystem.documentDirectory}${folder}/${safeName}`;

  await FileSystem.copyAsync({ from: sourceUri, to: destPath });
  return destPath;
};

/**
 * Turns a stored reference (file:// path OR idb://... reference) into
 * something the current screen can actually load/display.
 * On native this is a no-op. On web it reads the bytes back out of
 * IndexedDB and returns a fresh blob: URL.
 */
export const resolveFileUri = async (storedRef: string): Promise<string> => {
  if (!storedRef) return storedRef;

  if (storedRef.startsWith(IDB_PREFIX)) {
    const id = storedRef.slice(IDB_PREFIX.length);
    const record = await idbGet(id);
    if (!record) {
      throw new Error('This file could not be found in browser storage.');
    }
    return URL.createObjectURL(record.blob);
  }

  // Already a native file:// path (or some other direct URL) — use as-is.
  return storedRef;
};

/**
 * Deletes a previously-saved file. Safe to call even if the
 * underlying file is already missing (fails silently in that case).
 */
export const deleteFile = async (storedRef: string): Promise<void> => {
  if (!storedRef) return;
  try {
    if (storedRef.startsWith(IDB_PREFIX)) {
      await idbDelete(storedRef.slice(IDB_PREFIX.length));
    } else if (!isWeb) {
      await FileSystem.deleteAsync(storedRef, { idempotent: true });
    }
  } catch (error) {
    console.warn('Could not delete stored file (continuing anyway):', error);
  }
};

/**
 * Returns free disk space in bytes, or null if that information isn't
 * available on this platform (web has no such concept).
 */
export const getFreeSpaceBytes = async (): Promise<number | null> => {
  if (isWeb) return null;
  try {
    return await FileSystem.getFreeDiskStorageAsync();
  } catch (error) {
    console.warn('Could not check free disk space:', error);
    return null;
  }
};
