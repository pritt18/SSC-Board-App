import * as Crypto from 'expo-crypto';
import * as FileSystem from 'expo-file-system/legacy';

const IV_SIZE = 16;

export const generateKey = async (password: string): Promise<Uint8Array> => {
  const keyMaterial = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    password
  );
  
  const keyBytes = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    keyBytes[i] = keyMaterial.charCodeAt(i % keyMaterial.length) || 0;
  }
  return keyBytes;
};

export const encryptFile = async (
  filePath: string,
  key: Uint8Array
): Promise<string> => {
  try {
    const fileContent = await FileSystem.readAsStringAsync(filePath, {
      encoding: FileSystem.EncodingType.Base64,
    });

    const iv = crypto.getRandomValues(new Uint8Array(IV_SIZE));
    const dataBuffer = Uint8Array.from(atob(fileContent), c => c.charCodeAt(0));
    
    const encrypted = new Uint8Array(dataBuffer.length);
    for (let i = 0; i < dataBuffer.length; i++) {
      encrypted[i] = dataBuffer[i] ^ key[i % key.length] ^ iv[i % iv.length];
    }
    
    const combined = new Uint8Array(iv.length + encrypted.length);
    combined.set(iv);
    combined.set(encrypted, iv.length);
    
    const base64 = btoa(String.fromCharCode(...combined));
    const encryptedPath = filePath + '.enc';
    await FileSystem.writeAsStringAsync(encryptedPath, base64, {
      encoding: FileSystem.EncodingType.Base64,
    });
    
    return encryptedPath;
  } catch (error) {
    console.error('Encryption error:', error);
    throw error;
  }
};

export const decryptFile = async (
  encryptedPath: string,
  key: Uint8Array
): Promise<string> => {
  try {
    const encryptedBase64 = await FileSystem.readAsStringAsync(encryptedPath, {
      encoding: FileSystem.EncodingType.Base64,
    });
    
    const encryptedBytes = Uint8Array.from(atob(encryptedBase64), c => c.charCodeAt(0));
    const iv = encryptedBytes.slice(0, IV_SIZE);
    const encryptedData = encryptedBytes.slice(IV_SIZE);
    
    const decrypted = new Uint8Array(encryptedData.length);
    for (let i = 0; i < encryptedData.length; i++) {
      decrypted[i] = encryptedData[i] ^ key[i % key.length] ^ iv[i % iv.length];
    }
    
    const base64 = btoa(String.fromCharCode(...decrypted));
    const tempPath = FileSystem.cacheDirectory + 'temp_decrypted';
    await FileSystem.writeAsStringAsync(tempPath, base64, {
      encoding: FileSystem.EncodingType.Base64,
    });
    
    return tempPath;
  } catch (error) {
    console.error('Decryption error:', error);
    throw error;
  }
};