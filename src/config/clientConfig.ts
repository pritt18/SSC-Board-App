/**
 * Client Configuration & Cryptographic Identity
 *
 * This configuration defines the client-specific settings baked into the APK.
 * The build script (scripts/build-client-apk.js) updates this file when
 * generating customized APKs for schools, distributors, or specific organizations.
 */

export interface ClientConfig {
  clientId: string;
  clientName: string;
  clientSecret: string;
  masterSecret: string;
  offlineSubdir: string;
  watermarkText: string;
  allowedClasses: number[];
  allowOnlineFallback: boolean;
  version: string;
}

export const CURRENT_CLIENT_CONFIG: ClientConfig = {
  clientId: 'ssc_softspire_default',
  clientName: 'SSC Board Learning App',
  clientSecret: 'Sec4$9Xk8#mQ2!vL7pW9@zR1',
  masterSecret: 'SSC_MASTER_DRM_PROTECTION_KEY_2026',
  offlineSubdir: 'offline_content',
  watermarkText: 'SSC BOARD - SOFTSPIRE',
  allowedClasses: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
  allowOnlineFallback: true,
  version: '1.0.0',
};
