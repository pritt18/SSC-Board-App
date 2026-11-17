import { NativeModules, Platform } from 'react-native';
import { CURRENT_CLIENT_CONFIG, ClientConfig } from '../config/clientConfig';
import * as Crypto from 'expo-crypto';

const { SecureContentModule } = NativeModules;

export interface StreamServerInfo {
  port: number;
  sessionToken: string;
  contentDir: string;
  host: string;
}

export interface OfflineFileInfo {
  path: string;
  name: string;
  size: number;
  modified: number;
}

class SecureContentManager {
  private serverInfo: StreamServerInfo | null = null;
  private isInitializing: boolean = false;
  private config: ClientConfig = CURRENT_CLIENT_CONFIG;
  private knownFilesCache: Set<string> = new Set();
  private lastCacheRefresh: number = 0;

  /**
   * Initialize the secure streaming server and cryptographic engine.
   */
  async initialize(customConfig?: ClientConfig): Promise<StreamServerInfo | null> {
    if (this.serverInfo) {
      return this.serverInfo;
    }

    if (customConfig) {
      this.config = customConfig;
    }

    if (Platform.OS !== 'android' || !SecureContentModule) {
      console.log('[SecureContentManager] Native DRM module not available on this platform (or in web/expo go).');
      return null;
    }

    if (this.isInitializing) {
      // Wait for ongoing initialization
      await new Promise((resolve) => setTimeout(resolve, 500));
      return this.serverInfo;
    }

    this.isInitializing = true;
    try {
      const res = await SecureContentModule.startDecryptionServer(
        this.config.masterSecret,
        this.config.clientId,
        this.config.clientSecret
      );

      this.serverInfo = {
        port: res.port,
        sessionToken: res.sessionToken,
        contentDir: res.contentDir,
        host: res.host || '127.0.0.1',
      };

      console.log(`[SecureContentManager] Server ready at http://127.0.0.1:${this.serverInfo.port}`);
      await this.refreshFileList();
      return this.serverInfo;
    } catch (error) {
      console.error('[SecureContentManager] Failed to start decryption server:', error);
      return null;
    } finally {
      this.isInitializing = false;
    }
  }

  /**
   * Refresh list of cached offline files.
   */
  async refreshFileList(): Promise<string[]> {
    if (Platform.OS !== 'android' || !SecureContentModule) return [];

    try {
      const files: OfflineFileInfo[] = await SecureContentModule.listOfflineFiles('');
      this.knownFilesCache.clear();
      for (const f of files) {
        this.knownFilesCache.add(f.path.toLowerCase());
        this.knownFilesCache.add(f.name.toLowerCase());
      }
      this.lastCacheRefresh = Date.now();
      return Array.from(this.knownFilesCache);
    } catch (e) {
      console.warn('[SecureContentManager] Error listing offline files:', e);
      return [];
    }
  }

  /**
   * Get target absolute directory where offline content files should be placed on device.
   */
  async getContentDirectory(): Promise<string> {
    if (Platform.OS === 'android' && SecureContentModule) {
      try {
        return await SecureContentModule.getContentDirectory();
      } catch (e) {
        console.warn('Error getting content directory:', e);
      }
    }
    return '/sdcard/Android/data/com.sscboard.learning/files/offline_content';
  }

  /**
   * Hardware-bound device fingerprint for client licensing.
   */
  async getDeviceFingerprint(): Promise<string> {
    if (Platform.OS === 'android' && SecureContentModule) {
      try {
        const fp = await SecureContentModule.getDeviceFingerprint();
        if (fp && fp.length > 8) return fp;
      } catch (e) {
        console.warn('Native fingerprint error, falling back:', e);
      }
    }

    // Fallback for web / tests
    return Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      `GENERIC_DEVICE_${Platform.OS}_${this.config.clientId}`
    );
  }

  /**
   * Check if an offline encrypted video exists for the given video URL or ID.
   * Looks for matching candidate file names:
   * 1. Direct path or URL as .enc
   * 2. video_<id>.mp4.enc
   * 3. <driveId>.mp4.enc
   */
  async resolveOfflineVideo(videoUrl: string, videoId?: number): Promise<string | null> {
    if (Platform.OS !== 'android' || !SecureContentModule) return null;

    if (!this.serverInfo) {
      await this.initialize();
    }
    if (!this.serverInfo) return null;

    // Refresh cache if stale (> 30s)
    if (Date.now() - this.lastCacheRefresh > 30000) {
      await this.refreshFileList();
    }

    const candidates = this.generateCandidates(videoUrl, videoId, 'mp4');

    for (const cand of candidates) {
      try {
        const exists = await SecureContentModule.checkFileExists(cand);
        if (exists) {
          const streamUrl = await SecureContentModule.getStreamUrl(cand);
          return streamUrl;
        }
      } catch (e) {
        // Continue checking next candidate
      }
    }

    return null;
  }

  /**
   * Check if an offline encrypted PDF exists for the given PDF URL or ID.
   * If found, returns stream URL `http://127.0.0.1:<port>/stream?file=...`
   */
  async resolveOfflinePdf(pdfUrl: string, pdfId?: number): Promise<string | null> {
    if (Platform.OS !== 'android' || !SecureContentModule) return null;

    if (!this.serverInfo) {
      await this.initialize();
    }
    if (!this.serverInfo) return null;

    if (Date.now() - this.lastCacheRefresh > 30000) {
      await this.refreshFileList();
    }

    const candidates = this.generateCandidates(pdfUrl, pdfId, 'pdf');

    for (const cand of candidates) {
      try {
        const exists = await SecureContentModule.checkFileExists(cand);
        if (exists) {
          const streamUrl = await SecureContentModule.getStreamUrl(cand);
          return streamUrl;
        }
      } catch (e) {
        // Continue checking
      }
    }

    return null;
  }

  /**
   * Helper to generate candidate file paths inside offline_content folder.
   */
  private generateCandidates(url: string, id: number | undefined, ext: 'mp4' | 'pdf'): string[] {
    const list: string[] = [];
    const folder = ext === 'mp4' ? 'videos' : 'pdfs';

    // 1. If explicit .enc file path was provided
    if (url.endsWith('.enc')) {
      list.push(url);
      list.push(`${folder}/${url}`);
    }

    // 2. ID-based candidate
    if (id !== undefined) {
      list.push(`${folder}/${ext}_${id}.${ext}.enc`);
      list.push(`${ext}_${id}.${ext}.enc`);
      list.push(`${folder}/${id}.${ext}.enc`);
    }

    // 3. Basename candidate
    const cleanUrl = url.split('?')[0];
    const baseName = cleanUrl.split('/').pop();
    if (baseName && baseName.length > 2) {
      const nameWithoutExt = baseName.replace(/\.(mp4|pdf)$/i, '');
      list.push(`${folder}/${nameWithoutExt}.${ext}.enc`);
      list.push(`${folder}/${baseName}.enc`);
      list.push(`${nameWithoutExt}.${ext}.enc`);
    }

    // 4. Drive ID candidate
    let driveId: string | null = null;
    const driveMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/) || url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (driveMatch && driveMatch[1]) {
      driveId = driveMatch[1];
    } else if (/^[a-zA-Z0-9_-]{25,50}$/.test(url.trim())) {
      driveId = url.trim();
    }

    if (driveId) {
      list.push(`${folder}/${driveId}.${ext}.enc`);
      list.push(`${driveId}.${ext}.enc`);
    }

    return list;
  }

  /**
   * Stop the background streaming server.
   */
  async stop(): Promise<void> {
    if (Platform.OS === 'android' && SecureContentModule) {
      try {
        await SecureContentModule.stopDecryptionServer();
      } catch (e) {
        console.warn('Error stopping server:', e);
      }
    }
    this.serverInfo = null;
  }
}

export const secureContentManager = new SecureContentManager();
