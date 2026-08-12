const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add support for additional file types
if (!config.resolver.assetExts.includes('srt')) {
  config.resolver.assetExts.push('srt');
}
if (!config.resolver.assetExts.includes('pdf')) {
  config.resolver.assetExts.push('pdf');
}
if (!config.resolver.assetExts.includes('enc')) {
  config.resolver.assetExts.push('enc');
}

// Required for expo-sqlite to run in the browser (web build) — it loads
// a WASM SQLite engine and needs SharedArrayBuffer, which browsers only
// allow on "cross-origin isolated" pages (hence the COEP/COOP headers).
if (!config.resolver.assetExts.includes('wasm')) {
  config.resolver.assetExts.push('wasm');
}

const originalEnhanceMiddleware = config.server.enhanceMiddleware;
config.server.enhanceMiddleware = (middleware, metroServer) => {
  const withOriginal = originalEnhanceMiddleware
    ? originalEnhanceMiddleware(middleware, metroServer)
    : middleware;

  return (req, res, next) => {
    res.setHeader('Cross-Origin-Embedder-Policy', 'credentialless');
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    return withOriginal(req, res, next);
  };
};

module.exports = config;