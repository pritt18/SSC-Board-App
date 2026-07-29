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

module.exports = config;